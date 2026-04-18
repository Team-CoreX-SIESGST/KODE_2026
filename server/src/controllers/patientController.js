import Patient from '../models/Patient.js';
import { AppError, asyncHandler } from '../utils/errors.js';

const parseLocation = (locationCoordinates, latitude, longitude) => {
    const coords = locationCoordinates || { latitude, longitude };
    if (!coords) return null;
    const lat = Number(coords.latitude);
    const lng = Number(coords.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { latitude: lat, longitude: lng };
};

const removeEmpty = (obj = {}) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );

const serializePatient = (patient) => {
    const abha = patient?.abha_profile || {};
    return {
        _id: patient._id,
        name: abha.name || abha.firstName || 'Patient',
        abhaId: abha.healthIdNumber,
        healthId: abha.healthId,
        phoneNumber: abha.mobile,
        demographicData: patient.demographicData || {},
        pregnancyDetails: patient.pregnancyDetails || {},
        locationCoordinates: patient.locationCoordinates || null,
        cdssSummary: patient.cdssSummary || null
    };
};

export const registerPatient = asyncHandler(async (req, res) => {
    const {
        name,
        abhaId,
        healthId,
        phoneNumber,
        locationCoordinates,
        latitude,
        longitude,
        demographicData,
        pregnancyDetails
    } = req.validatedBody || req.body;

    const existing = await Patient.findOne({
        'abha_profile.healthIdNumber': abhaId
    });
    if (existing) {
        throw new AppError('Patient already exists', 409, 'PATIENT_EXISTS');
    }

    const patient = await Patient.create({
        abha_profile: {
            healthIdNumber: abhaId,
            healthId,
            name,
            mobile: phoneNumber
        },
        demographicData: demographicData ? removeEmpty(demographicData) : undefined,
        pregnancyDetails: pregnancyDetails
            ? {
                  ...removeEmpty(pregnancyDetails),
                  lastUpdatedAt: new Date()
              }
            : undefined,
        locationCoordinates: parseLocation(locationCoordinates, latitude, longitude)
    });

    res.status(201).json({
        message: 'Patient registered. Use OTP verification to obtain a patient token.',
        patient: serializePatient(patient)
    });
});

export const updatePatient = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const updates = {};

    if (payload.name) updates['abha_profile.name'] = payload.name;
    if (payload.phoneNumber) updates['abha_profile.mobile'] = payload.phoneNumber;

    if (payload.demographicData && typeof payload.demographicData === 'object') {
        updates.demographicData = removeEmpty(payload.demographicData);
    }

    if (payload.pregnancyDetails && typeof payload.pregnancyDetails === 'object') {
        updates.pregnancyDetails = {
            ...removeEmpty(payload.pregnancyDetails),
            lastUpdatedAt: new Date()
        };
    }

    if (payload.locationCoordinates || payload.latitude !== undefined || payload.longitude !== undefined) {
        const parsedLocation = parseLocation(payload.locationCoordinates, payload.latitude, payload.longitude);
        if (!parsedLocation) {
            throw new AppError('Invalid locationCoordinates', 400, 'VALIDATION_ERROR');
        }
        updates.locationCoordinates = parsedLocation;
    }

    if (!Object.keys(updates).length) {
        throw new AppError('No valid patient fields were provided for update', 400, 'VALIDATION_ERROR');
    }

    const patient = await Patient.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    if (!patient) {
        throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    res.json(serializePatient(patient));
});

export const getPatientMe = asyncHandler(async (req, res) => {
    res.json(serializePatient(req.user));
});
