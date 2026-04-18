import AnmAccount from '../models/AnmAccount.js';
import Patient from '../models/Patient.js';
import { signToken } from '../utils/jwt.js';
import { AppError, asyncHandler } from '../utils/errors.js';

const generateToken = (id) => signToken({ id, role: 'anm' }, { expiresIn: '30d' });

const parseLocation = (locationCoordinates) => {
    if (!locationCoordinates) return null;
    const latitude = Number(locationCoordinates.latitude);
    const longitude = Number(locationCoordinates.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
    return { latitude, longitude };
};

const serializeAnm = (anm, includeToken = false) => {
    const response = {
        _id: anm._id,
        name: anm.name,
        username: anm.username,
        phoneNumber: anm.phoneNumber || null,
        facilityName: anm.facilityName || null,
        serviceArea: anm.serviceArea || null,
        locationCoordinates: anm.locationCoordinates
    };

    if (includeToken) {
        response.token = generateToken(anm._id);
    }

    return response;
};

export const registerAnm = asyncHandler(async (req, res) => {
    const { name, username, password, phoneNumber, facilityName, serviceArea, locationCoordinates } =
        req.validatedBody || req.body;
    const parsedLocation = parseLocation(locationCoordinates);

    if (!parsedLocation) {
        throw new AppError('Valid locationCoordinates are required', 400, 'VALIDATION_ERROR');
    }

    const existing = await AnmAccount.findOne({ username: username.toLowerCase() });
    if (existing) {
        throw new AppError('ANM account already exists', 409, 'ANM_EXISTS');
    }

    const anm = await AnmAccount.create({
        name,
        username,
        password,
        phoneNumber,
        facilityName,
        serviceArea,
        locationCoordinates: parsedLocation
    });

    res.status(201).json(serializeAnm(anm, true));
});

export const loginAnm = asyncHandler(async (req, res) => {
    const { username, password } = req.validatedBody || req.body;
    const anm = await AnmAccount.findOne({ username: username.toLowerCase() });

    if (!anm || !(await anm.matchPassword(password))) {
        throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
    }

    res.json(serializeAnm(anm, true));
});

export const updateAnm = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const updates = {};

    if (payload.name) updates.name = payload.name;
    if (payload.phoneNumber) updates.phoneNumber = payload.phoneNumber;
    if (payload.facilityName) updates.facilityName = payload.facilityName;
    if (payload.serviceArea) updates.serviceArea = payload.serviceArea;

    if (payload.locationCoordinates) {
        const parsedLocation = parseLocation(payload.locationCoordinates);
        if (!parsedLocation) {
            throw new AppError('Invalid locationCoordinates', 400, 'VALIDATION_ERROR');
        }
        updates.locationCoordinates = parsedLocation;
    }

    if (!Object.keys(updates).length) {
        throw new AppError('No valid ANM fields were provided for update', 400, 'VALIDATION_ERROR');
    }

    const anm = await AnmAccount.findByIdAndUpdate(req.user._id, updates, { new: true });
    if (!anm) {
        throw new AppError('ANM account not found', 404, 'ANM_NOT_FOUND');
    }

    res.json(serializeAnm(anm));
});

export const getAnmMe = asyncHandler(async (req, res) => {
    res.json(serializeAnm(req.user));
});

export const getAnmPatients = asyncHandler(async (req, res) => {
    const patients = await Patient.find({ anmWorkerId: req.user._id }).select(
        'abha_profile locationCoordinates anmWorkerAssignedAt cdssSummary pregnancyDetails demographicData'
    );

    const results = patients.map((patient) => ({
        _id: patient._id,
        name: patient?.abha_profile?.name || 'Patient',
        healthIdNumber: patient?.abha_profile?.healthIdNumber || null,
        locationCoordinates: patient.locationCoordinates,
        assignedAt: patient.anmWorkerAssignedAt || null,
        latestRiskLevel: patient.cdssSummary?.latestRiskLevel || 'LOW',
        latestAssessmentAt: patient.cdssSummary?.latestAssessmentAt || null
    }));

    res.json({ count: results.length, results });
});
