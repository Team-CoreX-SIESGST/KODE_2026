import AnmAccount from '../models/AnmAccount.js';
import Patient from '../models/Patient.js';
import { signToken } from '../utils/jwt.js';

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

// @desc    Register ANM frontline worker
// @route   POST /api/anm/register
// @access  Public
export const registerAnm = async (req, res) => {
    try {
        const { name, username, password, phoneNumber, facilityName, serviceArea, locationCoordinates } = req.body;
        const parsedLocation = parseLocation(locationCoordinates);

        if (!name || !username || !password || !parsedLocation) {
            return res.status(400).json({ message: 'Name, username, password, and location are required' });
        }

        const existing = await AnmAccount.findOne({ username: username.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'ANM account already exists' });
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

        return res.status(201).json(serializeAnm(anm, true));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Login ANM frontline worker
// @route   POST /api/anm/login
// @access  Public
export const loginAnm = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const anm = await AnmAccount.findOne({ username: username.toLowerCase() });
        if (anm && (await anm.matchPassword(password))) {
            return res.json(serializeAnm(anm, true));
        }

        return res.status(401).json({ message: 'Invalid username or password' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Update ANM profile
// @route   PUT /api/anm/update
// @access  Private ANM
export const updateAnm = async (req, res) => {
    try {
        const updates = {};
        if (req.body.name) updates.name = req.body.name;
        if (req.body.phoneNumber) updates.phoneNumber = req.body.phoneNumber;
        if (req.body.facilityName) updates.facilityName = req.body.facilityName;
        if (req.body.serviceArea) updates.serviceArea = req.body.serviceArea;

        if (req.body.locationCoordinates) {
            const parsedLocation = parseLocation(req.body.locationCoordinates);
            if (!parsedLocation) {
                return res.status(400).json({ message: 'Invalid locationCoordinates' });
            }
            updates.locationCoordinates = parsedLocation;
        }

        const anm = await AnmAccount.findByIdAndUpdate(req.user._id, updates, { new: true });
        if (!anm) {
            return res.status(404).json({ message: 'ANM account not found' });
        }

        return res.json(serializeAnm(anm));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Get current ANM profile
// @route   GET /api/anm/me
// @access  Private ANM
export const getAnmMe = async (req, res) => {
    return res.json(serializeAnm(req.user));
};

// @desc    Get patients assigned to ANM
// @route   GET /api/anm/patients
// @access  Private ANM
export const getAnmPatients = async (req, res) => {
    try {
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

        return res.json({ count: results.length, results });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
