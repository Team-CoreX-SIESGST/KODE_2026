import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import ClinicalVisit from '../models/ClinicalVisit.js';
import { evaluateClinicalRisk } from '../utils/cdss/decisionEngine.js';
import { getAssessmentChecklist as buildChecklist } from '../utils/cdss/checklists.js';
import { normalizeLanguage } from '../utils/cdss/localization.js';
import { AppError, asyncHandler } from '../utils/errors.js';

const HISTORY_LIMIT = 5;
const RISK_PRIORITY = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const normalizeAbhaId = (value) => String(value || '').trim();
const normalizeVisitType = (value) =>
    String(value || 'MATERNAL').toUpperCase() === 'NEONATAL' ? 'NEONATAL' : 'MATERNAL';

const removeEmpty = (obj = {}) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );

const buildPatientUpdates = ({ demographicData, pregnancyDetails, address, locationCoordinates, name, phoneNumber }) => {
    const updates = {};
    if (name) updates['abha_profile.name'] = name;
    if (phoneNumber) updates['abha_profile.mobile'] = phoneNumber;
    if (demographicData && typeof demographicData === 'object') {
        updates.demographicData = removeEmpty(demographicData);
    }
    if (pregnancyDetails && typeof pregnancyDetails === 'object') {
        updates.pregnancyDetails = {
            ...removeEmpty(pregnancyDetails),
            lastUpdatedAt: new Date()
        };
    }
    if (address && typeof address === 'object') {
        updates.address = removeEmpty(address);
    }
    if (locationCoordinates?.latitude !== undefined && locationCoordinates?.longitude !== undefined) {
        const latitude = Number(locationCoordinates.latitude);
        const longitude = Number(locationCoordinates.longitude);
        if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
            updates.locationCoordinates = { latitude, longitude };
        }
    }
    return updates;
};

const toPatientSummary = (patient, latestVisit = null) => ({
    _id: patient._id,
    abhaId: patient?.abha_profile?.healthIdNumber,
    healthId: patient?.abha_profile?.healthId,
    name: patient?.abha_profile?.name || patient?.abha_profile?.firstName || 'Patient',
    phoneNumber: patient?.abha_profile?.mobile || patient?.demographicData?.phoneNumber || null,
    demographicData: patient.demographicData || {},
    pregnancyDetails: patient.pregnancyDetails || {},
    locationCoordinates: patient.locationCoordinates || null,
    cdssSummary: patient.cdssSummary || null,
    latestAssessment: latestVisit
        ? {
              visitId: latestVisit._id,
              visitType: latestVisit.visitType,
              visitDate: latestVisit.visitDate,
              riskLevel: latestVisit.assessment?.riskLevel,
              score: latestVisit.assessment?.score,
              recommendedAction: latestVisit.assessment?.recommendedAction,
              alerts: latestVisit.assessment?.alerts || []
          }
        : null
});

const findPatientByIdOrAbha = async ({ patientId, abhaId }) => {
    if (patientId) {
        if (!isObjectId(patientId)) return null;
        return Patient.findById(patientId);
    }
    const normalizedAbha = normalizeAbhaId(abhaId);
    if (!normalizedAbha) return null;
    return Patient.findOne({ 'abha_profile.healthIdNumber': normalizedAbha });
};

const isAdminUser = (user, authRole) => authRole === 'admin' || user?.isAdmin === true;

const assertAnmAccess = (patient, user, authRole) => {
    if (!patient) {
        throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }
    if (isAdminUser(user, authRole)) return;
    if (patient.anmWorkerId && String(patient.anmWorkerId) !== String(user?._id)) {
        throw new AppError(
            'You are not authorized to access this patient record',
            403,
            'PATIENT_ACCESS_FORBIDDEN'
        );
    }
};

const assignPatientToAnm = async (patient, user) => {
    if (!user?._id || patient.anmWorkerId) return patient;
    patient.anmWorkerId = user._id;
    patient.anmWorkerAssignedAt = new Date();
    patient.anmWorker = {
        name: user.name,
        contact: user.username,
        serviceArea: user.serviceArea || ''
    };
    await patient.save();
    return patient;
};

const normalizeClinicalInput = (body = {}) => {
    const visitType = normalizeVisitType(body.visitType);
    const maternalInput = body.maternal || {};
    const neonatalInput = body.neonatal || {};

    const maternal = {
        vitals: removeEmpty(maternalInput.vitals || body.vitals || {}),
        symptoms: removeEmpty(maternalInput.symptoms || body.symptoms || {}),
        observations: removeEmpty({
            ...(maternalInput.observations || body.observations || {}),
            gestationalAgeWeeks:
                maternalInput?.observations?.gestationalAgeWeeks ??
                body?.observations?.gestationalAgeWeeks ??
                body?.pregnancyDetails?.gestationalAgeWeeks
        })
    };

    const neonatal = {
        symptoms: removeEmpty(neonatalInput.symptoms || body.neonatalSymptoms || {}),
        observations: removeEmpty(neonatalInput.observations || body.neonatalObservations || {})
    };

    return {
        visitType,
        visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
        clientGeneratedId: body.clientGeneratedId ? String(body.clientGeneratedId).trim() : undefined,
        source: body.source === 'OFFLINE_SYNC' ? 'OFFLINE_SYNC' : 'ONLINE',
        maternal,
        neonatal,
        rawInput: body
    };
};

const getVisitHistory = async (patientId, visitType, beforeDate = new Date()) =>
    ClinicalVisit.find({
        patient: patientId,
        visitType,
        visitDate: { $lt: beforeDate }
    })
        .sort({ visitDate: -1 })
        .limit(HISTORY_LIMIT);

const storeVisit = async ({ patient, body, capturedBy, capturedByRole = 'anm', language = 'en' }) => {
    const clinicalInput = normalizeClinicalInput(body);

    if (clinicalInput.clientGeneratedId) {
        const existing = await ClinicalVisit.findOne({ clientGeneratedId: clinicalInput.clientGeneratedId });
        if (existing) {
            if (String(existing.patient) !== String(patient._id)) {
                throw new AppError(
                    'clientGeneratedId already belongs to another patient',
                    409,
                    'SYNC_CONFLICT'
                );
            }
            return { visit: existing, duplicate: true };
        }
    }

    const history = await getVisitHistory(patient._id, clinicalInput.visitType, clinicalInput.visitDate);
    const currentVisitForEvaluation = {
        ...clinicalInput,
        patient: patient._id,
        patientAbhaId: patient?.abha_profile?.healthIdNumber
    };
    const assessment = evaluateClinicalRisk({
        currentVisit: currentVisitForEvaluation,
        history,
        language
    });

    const visit = await ClinicalVisit.create({
        patient: patient._id,
        patientAbhaId: patient?.abha_profile?.healthIdNumber,
        visitType: clinicalInput.visitType,
        visitDate: clinicalInput.visitDate,
        capturedBy,
        capturedByRole,
        clientGeneratedId: clinicalInput.clientGeneratedId,
        source: clinicalInput.source,
        maternal: clinicalInput.maternal,
        neonatal: clinicalInput.neonatal,
        assessment,
        rawInput: clinicalInput.rawInput
    });

    patient.cdssSummary = {
        latestRiskLevel: assessment.riskLevel,
        latestVisit: visit._id,
        latestAssessmentAt: assessment.evaluatedAt,
        priorityScore: RISK_PRIORITY[assessment.riskLevel] || 0,
        latestAlerts: assessment.alerts || []
    };
    await patient.save();

    return { visit, duplicate: false };
};

export const getAssessmentChecklist = asyncHandler(async (req, res) => {
    const checklist = buildChecklist(req.query.type, req.query.language);
    res.json(checklist);
});

export const createOrFetchCdssPatient = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const abhaId = normalizeAbhaId(payload?.abhaId || payload?.healthIdNumber);
    const updates = buildPatientUpdates(payload || {});
    let patient = await Patient.findOne({ 'abha_profile.healthIdNumber': abhaId });
    let created = false;

    if (!patient) {
        patient = await Patient.create({
            abha_profile: {
                healthIdNumber: abhaId,
                healthId: payload?.healthId,
                name: payload?.name,
                mobile: payload?.phoneNumber
            },
            ...('demographicData' in updates ? { demographicData: updates.demographicData } : {}),
            ...('pregnancyDetails' in updates ? { pregnancyDetails: updates.pregnancyDetails } : {}),
            ...('address' in updates ? { address: updates.address } : {}),
            ...('locationCoordinates' in updates ? { locationCoordinates: updates.locationCoordinates } : {}),
            anmWorkerId: req.user?._id,
            anmWorkerAssignedAt: req.user?._id ? new Date() : undefined,
            anmWorker: req.user?._id
                ? {
                      name: req.user.name,
                      contact: req.user.username,
                      serviceArea: req.user.serviceArea || ''
                  }
                : undefined
        });
        created = true;
    } else {
        assertAnmAccess(patient, req.user, req.authRole);

        if (Object.keys(updates).length) {
            patient = await Patient.findByIdAndUpdate(patient._id, { $set: updates }, { new: true });
        }

        if (!patient.anmWorkerId) {
            await assignPatientToAnm(patient, req.user);
        }
    }

    const latestVisit = await ClinicalVisit.findOne({ patient: patient._id }).sort({ visitDate: -1 });
    res.status(created ? 201 : 200).json({
        created,
        patient: toPatientSummary(patient, latestVisit)
    });
});

export const createCdssVisit = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const patient = await findPatientByIdOrAbha({
        patientId: req.params.patientId,
        abhaId: payload?.abhaId
    });

    assertAnmAccess(patient, req.user, req.authRole);
    await assignPatientToAnm(patient, req.user);

    const language = normalizeLanguage(payload?.language || req.query.language);
    const { visit, duplicate } = await storeVisit({
        patient,
        body: payload,
        capturedBy: req.user?._id,
        capturedByRole: 'anm',
        language
    });

    res.status(duplicate ? 200 : 201).json({
        duplicate,
        visitId: visit._id,
        patient: toPatientSummary(patient, visit),
        assessment: visit.assessment,
        visit
    });
});

export const syncCdssVisits = asyncHandler(async (req, res) => {
    const visits = Array.isArray((req.validatedBody || req.body)?.visits) ? (req.validatedBody || req.body).visits : [];
    const results = [];

    for (const item of visits) {
        try {
            let patient = await findPatientByIdOrAbha({
                patientId: item.patientId,
                abhaId: item.abhaId || item.healthIdNumber
            });

            if (patient) {
                assertAnmAccess(patient, req.user, req.authRole);
                if (!patient.anmWorkerId) {
                    await assignPatientToAnm(patient, req.user);
                }
            }

            if (!patient && item.abhaId) {
                const patientPayload = item.patient || item;
                const updates = buildPatientUpdates(patientPayload);
                patient = await Patient.create({
                    abha_profile: {
                        healthIdNumber: normalizeAbhaId(item.abhaId),
                        healthId: patientPayload.healthId || item.healthId,
                        name: patientPayload.name || item.name,
                        mobile: patientPayload.phoneNumber || item.phoneNumber
                    },
                    ...('demographicData' in updates ? { demographicData: updates.demographicData } : {}),
                    ...('pregnancyDetails' in updates ? { pregnancyDetails: updates.pregnancyDetails } : {}),
                    ...('address' in updates ? { address: updates.address } : {}),
                    ...('locationCoordinates' in updates ? { locationCoordinates: updates.locationCoordinates } : {}),
                    anmWorkerId: req.user?._id,
                    anmWorkerAssignedAt: req.user?._id ? new Date() : undefined,
                    anmWorker: req.user?._id
                        ? {
                              name: req.user.name,
                              contact: req.user.username,
                              serviceArea: req.user.serviceArea || ''
                          }
                        : undefined
                });
            }

            if (!patient) {
                results.push({
                    clientGeneratedId: item.clientGeneratedId || null,
                    status: 'FAILED',
                    message: 'Patient not found and ABHA ID was not provided'
                });
                continue;
            }

            const language = normalizeLanguage(item.language || req.body?.language || req.query.language);
            const { visit, duplicate } = await storeVisit({
                patient,
                body: { ...item, source: 'OFFLINE_SYNC' },
                capturedBy: req.user?._id,
                capturedByRole: 'anm',
                language
            });

            results.push({
                clientGeneratedId: item.clientGeneratedId || null,
                status: duplicate ? 'DUPLICATE_IGNORED' : 'SYNCED',
                visitId: visit._id,
                patientId: patient._id,
                riskLevel: visit.assessment?.riskLevel,
                score: visit.assessment?.score
            });
        } catch (error) {
            results.push({
                clientGeneratedId: item.clientGeneratedId || null,
                status: 'FAILED',
                message: error.message
            });
        }
    }

    res.json({
        count: results.length,
        results
    });
});

export const getCdssDashboard = asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const patients = await Patient.find({ anmWorkerId: req.user._id })
        .sort({ 'cdssSummary.priorityScore': -1, 'cdssSummary.latestAssessmentAt': -1, updatedAt: -1 })
        .limit(limit);

    const latestVisits = await ClinicalVisit.find({
        patient: { $in: patients.map((patient) => patient._id) }
    }).sort({ visitDate: -1 });

    const latestVisitMap = new Map();
    latestVisits.forEach((visit) => {
        const key = String(visit.patient);
        if (!latestVisitMap.has(key)) latestVisitMap.set(key, visit);
    });

    const results = patients
        .map((patient) => toPatientSummary(patient, latestVisitMap.get(String(patient._id))))
        .sort(
            (a, b) =>
                (RISK_PRIORITY[b.latestAssessment?.riskLevel] || RISK_PRIORITY[b.cdssSummary?.latestRiskLevel] || 0) -
                (RISK_PRIORITY[a.latestAssessment?.riskLevel] || RISK_PRIORITY[a.cdssSummary?.latestRiskLevel] || 0)
        );

    res.json({
        count: results.length,
        results
    });
});

export const listCdssVisits = asyncHandler(async (req, res) => {
    const patient = await findPatientByIdOrAbha({
        patientId: req.params.patientId,
        abhaId: req.query.abhaId
    });
    assertAnmAccess(patient, req.user, req.authRole);

    const visitType = req.query.type ? normalizeVisitType(req.query.type) : null;
    const visits = await ClinicalVisit.find({
        patient: patient._id,
        ...(visitType ? { visitType } : {})
    })
        .sort({ visitDate: -1 })
        .limit(100);

    res.json({
        patient: toPatientSummary(patient, visits[0]),
        count: visits.length,
        results: visits
    });
});

export const getCdssTimeline = asyncHandler(async (req, res) => {
    const patient = await findPatientByIdOrAbha({
        patientId: req.params.patientId,
        abhaId: req.query.abhaId
    });
    assertAnmAccess(patient, req.user, req.authRole);

    const visitType = req.query.type ? normalizeVisitType(req.query.type) : null;
    const visits = await ClinicalVisit.find({
        patient: patient._id,
        ...(visitType ? { visitType } : {})
    }).sort({ visitDate: 1 });

    const maternalVisits = visits.filter((visit) => visit.visitType === 'MATERNAL');
    const neonatalVisits = visits.filter((visit) => visit.visitType === 'NEONATAL');

    res.json({
        patient: toPatientSummary(patient, visits[visits.length - 1]),
        timeline: visits.map((visit) => ({
            visitId: visit._id,
            visitDate: visit.visitDate,
            visitType: visit.visitType,
            riskLevel: visit.assessment?.riskLevel,
            score: visit.assessment?.score,
            conditions: visit.assessment?.identifiedConditions || [],
            alerts: visit.assessment?.alerts || []
        })),
        trends: {
            maternal: {
                bpSystolic: maternalVisits.map((visit) => visit.maternal?.vitals?.bpSystolic).filter(Boolean),
                bpDiastolic: maternalVisits.map((visit) => visit.maternal?.vitals?.bpDiastolic).filter(Boolean),
                temperatureC: maternalVisits.map((visit) => visit.maternal?.vitals?.temperatureC).filter(Boolean),
                muacCm: maternalVisits.map((visit) => visit.maternal?.observations?.muacCm).filter(Boolean),
                fetalMovement: maternalVisits.map((visit) => visit.maternal?.observations?.fetalMovement).filter(Boolean)
            },
            neonatal: {
                birthWeightKg: neonatalVisits.map((visit) => visit.neonatal?.observations?.birthWeightKg).filter(Boolean),
                currentWeightKg: neonatalVisits
                    .map((visit) => visit.neonatal?.observations?.currentWeightKg)
                    .filter(Boolean),
                temperatureC: neonatalVisits.map((visit) => visit.neonatal?.observations?.temperatureC).filter(Boolean),
                breathingRate: neonatalVisits.map((visit) => visit.neonatal?.observations?.breathingRate).filter(Boolean)
            }
        }
    });
});
