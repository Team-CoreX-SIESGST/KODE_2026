import express from 'express';
import {
    createCdssVisit,
    createOrFetchCdssPatient,
    getAssessmentChecklist,
    getCdssDashboard,
    getCdssTimeline,
    listCdssVisits,
    syncCdssVisits
} from '../controllers/cdssController.js';
import { protectAnm } from '../middleware/roleAuth.js';
import { validateBody } from '../middleware/validate.js';
import { validateCdssPatientUpsert, validateCdssSync, validateCdssVisit } from '../validators/requestValidators.js';
import referralRoutes from './referralRoutes.js';

const router = express.Router();

router.get('/checklist', getAssessmentChecklist);

router.use(protectAnm);

router.post('/patients', validateBody(validateCdssPatientUpsert), createOrFetchCdssPatient);
router.get('/dashboard', getCdssDashboard);
router.post('/sync/visits', validateBody(validateCdssSync), syncCdssVisits);
router.post('/patients/:patientId/visits', validateBody(validateCdssVisit), createCdssVisit);
router.get('/patients/:patientId/visits', listCdssVisits);
router.get('/patients/:patientId/timeline', getCdssTimeline);

// Referral outcome tracking routes (new addition — does not modify existing routes above)
router.use('/', referralRoutes);

export default router;
