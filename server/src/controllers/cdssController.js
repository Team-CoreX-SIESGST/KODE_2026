import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import ClinicalVisit from '../models/ClinicalVisit.js';
import { evaluateClinicalRisk } from '../utils/cdss/decisionEngine.js';
import { getAssessmentChecklist as buildChecklist } from '../utils/cdss/checklists.js';
import { normalizeLanguage } from '../utils/cdss/localization.js';

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
                throw new Error('clientGeneratedId already belongs to another patient');
            }
            existing.syncStatus = 'DUPLICATE_IGNORED';
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

export const getAssessmentChecklist = (req, res) => {
    const checklist = buildChecklist(req.query.type, req.query.language);
    res.json(checklist);
};

// @desc    Create or fetch a CDSS patient by ABHA ID
// @route   POST /api/cdss/patients
// @access  Private frontline worker
export const createOrFetchCdssPatient = async (req, res) => {
    try {
        const abhaId = normalizeAbhaId(req.body?.abhaId || req.body?.healthIdNumber);
        if (!abhaId) {
            return res.status(400).json({ message: 'ABHA ID is required' });
        }

        const updates = buildPatientUpdates(req.body || {});
        let patient = await Patient.findOne({ 'abha_profile.healthIdNumber': abhaId });
        let created = false;

        if (!patient) {
            patient = await Patient.create({
                abha_profile: {
                    healthIdNumber: abhaId,
                    healthId: req.body?.healthId,
                    name: req.body?.name,
                    mobile: req.body?.phoneNumber
                },
                ...('demographicData' in updates ? { demographicData: updates.demographicData } : {}),
                ...('pregnancyDetails' in updates ? { pregnancyDetails: updates.pregnancyDetails } : {}),
                ...('address' in updates ? { address: updates.address } : {}),
                ...('locationCoordinates' in updates ? { locationCoordinates: updates.locationCoordinates } : {})
            });
            created = true;
        } else if (Object.keys(updates).length) {
            patient = await Patient.findByIdAndUpdate(patient._id, { $set: updates }, { new: true });
        }

        if (req.user?._id && !patient.anmWorkerId) {
            patient.anmWorkerId = req.user._id;
            patient.anmWorkerAssignedAt = new Date();
            patient.anmWorker = {
                name: req.user.name,
                contact: req.user.username,
                serviceArea: req.user.serviceArea || ''
            };
            await patient.save();
        }

        const latestVisit = await ClinicalVisit.findOne({ patient: patient._id }).sort({ visitDate: -1 });
        return res.status(created ? 201 : 200).json({
            created,
            patient: toPatientSummary(patient, latestVisit)
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Store visit, analyze history, and return explainable CDSS output
// @route   POST /api/cdss/patients/:patientId/visits
// @access  Private frontline worker
export const createCdssVisit = async (req, res) => {
    try {
        const patient = await findPatientByIdOrAbha({
            patientId: req.params.patientId,
            abhaId: req.body?.abhaId
        });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const language = normalizeLanguage(req.body?.language || req.query.language);
        const { visit, duplicate } = await storeVisit({
            patient,
            body: req.body,
            capturedBy: req.user?._id,
            capturedByRole: 'anm',
            language
        });

        return res.status(duplicate ? 200 : 201).json({
            duplicate,
            visitId: visit._id,
            patient: toPatientSummary(patient, visit),
            assessment: visit.assessment,
            visit
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk sync offline visits captured on device
// @route   POST /api/cdss/sync/visits
// @access  Private frontline worker
export const syncCdssVisits = async (req, res) => {
    try {
        const visits = Array.isArray(req.body?.visits) ? req.body.visits : [];
        if (!visits.length) {
            return res.status(400).json({ message: 'visits array is required' });
        }

        const results = [];
        for (const item of visits) {
            try {
                let patient = await findPatientByIdOrAbha({
                    patientId: item.patientId,
                    abhaId: item.abhaId || item.healthIdNumber
                });

                if (!patient && item.abhaId) {
                    const updates = buildPatientUpdates(item.patient || item);
                    patient = await Patient.create({
                        abha_profile: {
                            healthIdNumber: normalizeAbhaId(item.abhaId),
                            name: item.patient?.name || item.name,
                            mobile: item.patient?.phoneNumber || item.phoneNumber
                        },
                        ...('demographicData' in updates ? { demographicData: updates.demographicData } : {}),
                        ...('pregnancyDetails' in updates ? { pregnancyDetails: updates.pregnancyDetails } : {})
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

                if (req.user?._id && !patient.anmWorkerId) {
                    patient.anmWorkerId = req.user._id;
                    patient.anmWorkerAssignedAt = new Date();
                    patient.anmWorker = {
                        name: req.user.name,
                        contact: req.user.username,
                        serviceArea: req.user.serviceArea || ''
                    };
                    await patient.save();
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

        return res.json({
            count: results.length,
            results
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Dashboard for prioritizing assigned patients
// @route   GET /api/cdss/dashboard
// @access  Private frontline worker
export const getCdssDashboard = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const filter = { anmWorkerId: req.user._id };
        const patients = await Patient.find(filter)
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

        return res.json({
            count: results.length,
            results
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    List patient visits
// @route   GET /api/cdss/patients/:patientId/visits
// @access  Private frontline worker
export const listCdssVisits = async (req, res) => {
    try {
        const patient = await findPatientByIdOrAbha({
            patientId: req.params.patientId,
            abhaId: req.query.abhaId
        });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const visitType = req.query.type ? normalizeVisitType(req.query.type) : null;
        const filter = {
            patient: patient._id,
            ...(visitType ? { visitType } : {})
        };
        const visits = await ClinicalVisit.find(filter).sort({ visitDate: -1 }).limit(100);

        return res.json({
            patient: toPatientSummary(patient, visits[0]),
            count: visits.length,
            results: visits
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Risk timeline and vital trends
// @route   GET /api/cdss/patients/:patientId/timeline
// @access  Private frontline worker
export const getCdssTimeline = async (req, res) => {
    try {
        const patient = await findPatientByIdOrAbha({
            patientId: req.params.patientId,
            abhaId: req.query.abhaId
        });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const visitType = req.query.type ? normalizeVisitType(req.query.type) : null;
        const visits = await ClinicalVisit.find({
            patient: patient._id,
            ...(visitType ? { visitType } : {})
        }).sort({ visitDate: 1 });

        const maternalVisits = visits.filter((visit) => visit.visitType === 'MATERNAL');
        const neonatalVisits = visits.filter((visit) => visit.visitType === 'NEONATAL');

        return res.json({
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
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
