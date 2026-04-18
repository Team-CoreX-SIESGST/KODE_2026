import express from 'express';
import {
    getAnmMe,
    getAnmPatients,
    loginAnm,
    registerAnm,
    updateAnm
} from '../controllers/anmController.js';
import { protectAnm } from '../middleware/roleAuth.js';

const router = express.Router();

router.post('/register', registerAnm);
router.post('/login', loginAnm);
router.put('/update', protectAnm, updateAnm);
router.get('/me', protectAnm, getAnmMe);
router.get('/patients', protectAnm, getAnmPatients);

export default router;
