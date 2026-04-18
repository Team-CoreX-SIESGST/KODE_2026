import express from 'express';
import {
    registerPatient,
    loginPatient,
    updatePatient,
    getPatientMe
} from '../controllers/patientController.js';
import { protectPatient } from '../middleware/roleAuth.js';
import { sendPatientOtp, verifyPatientOtp } from '../controllers/otpController.js';

const router = express.Router();

router.post('/register', registerPatient);
router.post('/login', loginPatient);
router.post('/otp/send', sendPatientOtp);
router.post('/otp/verify', verifyPatientOtp);
router.put('/update', protectPatient, updatePatient);
router.get('/me', protectPatient, getPatientMe);

export default router;
