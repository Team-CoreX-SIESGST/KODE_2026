import bcrypt from 'bcrypt';
import twilio from 'twilio';
import OtpRequest from '../models/OtpRequest.js';
import Patient from '../models/Patient.js';
import { signToken } from '../utils/jwt.js';
import { AppError, asyncHandler } from '../utils/errors.js';

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
        throw new AppError('Twilio credentials are not configured', 500, 'TWILIO_NOT_CONFIGURED');
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

export const sendPatientOtp = asyncHandler(async (req, res) => {
    const phone = normalizePhone((req.validatedBody || req.body)?.phoneNumber);
    if (!phone) {
        throw new AppError('Valid phone number is required', 400, 'VALIDATION_ERROR');
    }

    const patient = await Patient.findOne({
        'abha_profile.mobile': { $regex: new RegExp(`${phone}$`) }
    });
    if (!patient) {
        throw new AppError('No patient found for this mobile number', 404, 'PATIENT_NOT_FOUND');
    }

    const cooldownAfter = new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000);
    const recent = await OtpRequest.findOne({
        phoneNumber: phone,
        role: 'patient',
        createdAt: { $gte: cooldownAfter }
    }).sort({ createdAt: -1 });

    if (recent) {
        throw new AppError('Please wait before requesting another OTP', 429, 'OTP_RATE_LIMITED');
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
        throw new AppError('Twilio from number is not configured', 500, 'TWILIO_NOT_CONFIGURED');
    }

    const client = getTwilioClient();
    await client.messages.create({
        to: toE164(phone),
        from: fromNumber,
        body: `Your CDSS OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`
    });

    res.json({ message: 'OTP sent successfully' });
});

export const verifyPatientOtp = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const phone = normalizePhone(payload?.phoneNumber);
    const otp = String(payload?.otp || '').trim();

    if (!phone || otp.length < 4) {
        throw new AppError('Phone number and OTP are required', 400, 'VALIDATION_ERROR');
    }

    const otpRequest = await OtpRequest.findOne({
        phoneNumber: phone,
        role: 'patient',
        verifiedAt: null,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpRequest) {
        throw new AppError('OTP expired or not found', 400, 'OTP_NOT_FOUND');
    }

    const matches = await bcrypt.compare(otp, otpRequest.otpHash);
    if (!matches) {
        otpRequest.attempts += 1;
        if (otpRequest.attempts >= OTP_MAX_ATTEMPTS) {
            otpRequest.expiresAt = new Date();
        }
        await otpRequest.save();
        throw new AppError('Invalid OTP', 401, 'INVALID_OTP');
    }

    otpRequest.verifiedAt = new Date();
    await otpRequest.save();

    const patient = await Patient.findOne({
        'abha_profile.mobile': { $regex: new RegExp(`${phone}$`) }
    });
    if (!patient) {
        throw new AppError('No patient found for this mobile number', 404, 'PATIENT_NOT_FOUND');
    }

    res.json(serializePatient(patient));
});
