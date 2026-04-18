import express from 'express';
import {
    getAnmMe,
    getAnmPatients,
    loginAnm,
    registerAnm,
    updateAnm
} from '../controllers/anmController.js';
import { protectAnm } from '../middleware/roleAuth.js';
import { validateBody } from '../middleware/validate.js';
import { validateAnmLogin, validateAnmRegister, validateAnmUpdate } from '../validators/requestValidators.js';

const router = express.Router();

router.post('/register', validateBody(validateAnmRegister), registerAnm);
router.post('/login', validateBody(validateAnmLogin), loginAnm);
router.put('/update', protectAnm, validateBody(validateAnmUpdate), updateAnm);
router.get('/me', protectAnm, getAnmMe);
router.get('/patients', protectAnm, getAnmPatients);

export default router;
