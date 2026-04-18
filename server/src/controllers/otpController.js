import bcrypt from 'bcrypt';
import twilio from 'twilio';
import OtpRequest from '../models/OtpRequest.js';
import Patient from '../models/Patient.js';
import { signToken } from '../utils/jwt.js';

const OTP_TTL_MINUTES = 5;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const DEFAULT_COUNTRY_CODE = '+91';

const generateToken = (id) => signToken({ id, role: 'patient' }, { expiresIn: '30d' });

const normalizePhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.slice(-10);
};

const toE164 = (phone, countryCode = DEFAULT_COUNTRY_CODE) => `${countryCode}${phone}`;

const getTwilioClient = () => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials are not configured');
    }
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

const serializePatient = (patient) => ({
    _id: patient._id,
    name: patient?.abha_profile?.name || patient?.abha_profile?.firstName || 'Patient',
    abhaId: patient?.abha_profile?.healthIdNumber,
    healthId: patient?.abha_profile?.healthId,
    phoneNumber: patient?.abha_profile?.mobile,
    locationCoordinates: patient.locationCoordinates,
    token: generateToken(patient._id)
});

// @desc    Send OTP to ABHA-linked patient mobile number
// @route   POST /api/patient/otp/send
// @access  Public
export const sendPatientOtp = async (req, res) => {
    try {
        const phone = normalizePhone(req.body?.phoneNumber);
        if (!phone) {
            return res.status(400).json({ message: 'Valid phone number is required' });
        }

        const patient = await Patient.findOne({
            'abha_profile.mobile': { $regex: new RegExp(`${phone}$`) }
        });
        if (!patient) {
            return res.status(404).json({ message: 'No patient found for this mobile number' });
        }

        const cooldownAfter = new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000);
        const recent = await OtpRequest.findOne({
            phoneNumber: phone,
            role: 'patient',
            createdAt: { $gte: cooldownAfter }
        }).sort({ createdAt: -1 });

        if (recent) {
            return res.status(429).json({ message: 'Please wait before requesting another OTP' });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

        await OtpRequest.create({
            phoneNumber: phone,
            role: 'patient',
            otpHash,
            expiresAt
        });

        const fromNumber = process.env.TWILIO_FROM_NUMBER;
        if (!fromNumber) {
            return res.status(500).json({ message: 'Twilio from number is not configured' });
        }

        const client = getTwilioClient();
        await client.messages.create({
            to: toE164(phone),
            from: fromNumber,
            body: `Your CDSS OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`
        });

        return res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP and login patient
// @route   POST /api/patient/otp/verify
// @access  Public
export const verifyPatientOtp = async (req, res) => {
    try {
        const phone = normalizePhone(req.body?.phoneNumber);
        const otp = String(req.body?.otp || '').trim();

        if (!phone || otp.length < 4) {
            return res.status(400).json({ message: 'Phone number and OTP are required' });
        }

        const otpRequest = await OtpRequest.findOne({
            phoneNumber: phone,
            role: 'patient',
            verifiedAt: null,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!otpRequest) {
            return res.status(400).json({ message: 'OTP expired or not found' });
        }

        const matches = await bcrypt.compare(otp, otpRequest.otpHash);
        if (!matches) {
            otpRequest.attempts += 1;
            if (otpRequest.attempts >= OTP_MAX_ATTEMPTS) {
                otpRequest.expiresAt = new Date();
            }
            await otpRequest.save();
            return res.status(401).json({ message: 'Invalid OTP' });
        }

        otpRequest.verifiedAt = new Date();
        await otpRequest.save();

        const patient = await Patient.findOne({
            'abha_profile.mobile': { $regex: new RegExp(`${phone}$`) }
        });
        if (!patient) {
            return res.status(404).json({ message: 'No patient found for this mobile number' });
        }

        return res.json(serializePatient(patient));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
