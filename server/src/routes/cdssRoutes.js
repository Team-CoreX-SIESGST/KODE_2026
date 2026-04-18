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

const router = express.Router();

router.get('/checklist', getAssessmentChecklist);

router.use(protectAnm);

router.post('/patients', createOrFetchCdssPatient);
router.get('/dashboard', getCdssDashboard);
router.post('/sync/visits', syncCdssVisits);
router.post('/patients/:patientId/visits', createCdssVisit);
router.get('/patients/:patientId/visits', listCdssVisits);
router.get('/patients/:patientId/timeline', getCdssTimeline);

export default router;
