import express from 'express';
import {
    registerPatient,
    updatePatient,
    getPatientMe
} from '../controllers/patientController.js';
import { protectPatient } from '../middleware/roleAuth.js';
import { sendPatientOtp, verifyPatientOtp } from '../controllers/otpController.js';
import { validateBody } from '../middleware/validate.js';
import {
    validatePatientOtpSend,
    validatePatientOtpVerify,
    validatePatientRegister,
    validatePatientUpdate
} from '../validators/requestValidators.js';

const router = express.Router();

router.post('/register', validateBody(validatePatientRegister), registerPatient);
router.post('/otp/send', validateBody(validatePatientOtpSend), sendPatientOtp);
router.post('/otp/verify', validateBody(validatePatientOtpVerify), verifyPatientOtp);
router.put('/update', protectPatient, validateBody(validatePatientUpdate), updatePatient);
router.get('/me', protectPatient, getPatientMe);

export default router;
