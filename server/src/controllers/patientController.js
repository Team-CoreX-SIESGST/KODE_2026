import Patient from '../models/Patient.js';
import { signToken } from '../utils/jwt.js';

const generateToken = (id) => signToken({ id, role: 'patient' }, { expiresIn: '30d' });

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

const serializePatient = (patient, includeToken = false) => {
    const abha = patient?.abha_profile || {};
    const response = {
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

    if (includeToken) {
        response.token = generateToken(patient._id);
    }

    return response;
};

// @desc    Register patient by ABHA ID
// @route   POST /api/patient/register
// @access  Public
export const registerPatient = async (req, res) => {
    try {
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
        } = req.body;

        if (!name || !abhaId) {
            return res.status(400).json({ message: 'Name and ABHA ID are required' });
        }

        const existing = await Patient.findOne({
            'abha_profile.healthIdNumber': abhaId
        });
        if (existing) {
            return res.status(400).json({ message: 'Patient already exists' });
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

        return res.status(201).json(serializePatient(patient, true));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Login patient by ABHA ID
// @route   POST /api/patient/login
// @access  Public
export const loginPatient = async (req, res) => {
    try {
        const { abhaId } = req.body;
        if (!abhaId) {
            return res.status(400).json({ message: 'ABHA ID is required' });
        }

        const patient = await Patient.findOne({
            'abha_profile.healthIdNumber': String(abhaId).trim()
        });

        if (!patient) {
            return res.status(401).json({ message: 'Invalid ABHA ID' });
        }

        return res.json(serializePatient(patient, true));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Update patient demographic or pregnancy profile
// @route   PUT /api/patient/update
// @access  Private patient
export const updatePatient = async (req, res) => {
    try {
        const updates = {};
        if (req.body.name) updates['abha_profile.name'] = req.body.name;
        if (req.body.phoneNumber) updates['abha_profile.mobile'] = req.body.phoneNumber;

        if (req.body.demographicData && typeof req.body.demographicData === 'object') {
            updates.demographicData = removeEmpty(req.body.demographicData);
        }

        if (req.body.pregnancyDetails && typeof req.body.pregnancyDetails === 'object') {
            updates.pregnancyDetails = {
                ...removeEmpty(req.body.pregnancyDetails),
                lastUpdatedAt: new Date()
            };
        }

        if (req.body.locationCoordinates || req.body.latitude || req.body.longitude) {
            const parsedLocation = parseLocation(
                req.body.locationCoordinates,
                req.body.latitude,
                req.body.longitude
            );
            if (!parsedLocation) {
                return res.status(400).json({ message: 'Invalid locationCoordinates' });
            }
            updates.locationCoordinates = parsedLocation;
        }

        const patient = await Patient.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        return res.json(serializePatient(patient));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Get current patient profile
// @route   GET /api/patient/me
// @access  Private patient
export const getPatientMe = async (req, res) => {
    return res.json(serializePatient(req.user));
};
