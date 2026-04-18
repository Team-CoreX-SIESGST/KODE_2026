import express from 'express';
import { getReferralHistory, submitReferralOutcome } from '../controllers/referralController.js';
import { protectAnm } from '../middleware/roleAuth.js';

const router = express.Router();

// All referral routes require ANM authentication
router.use(protectAnm);

/**
 * POST /api/cdss/patients/:patientId/visits/:visitId/referral-outcome
 * ANM submits whether a referral was accepted or refused.
 * Returns a bilingual negotiation script when refused.
 */
router.post('/patients/:patientId/visits/:visitId/referral-outcome', submitReferralOutcome);

/**
 * GET /api/cdss/patients/:patientId/referral-history
 * Returns all visits with referral outcomes for a patient,
 * including the escalation flag where applicable.
 */
router.get('/patients/:patientId/referral-history', getReferralHistory);

export default router;
