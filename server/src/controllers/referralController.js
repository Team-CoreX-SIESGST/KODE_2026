import mongoose from 'mongoose';
import ClinicalVisit from '../models/ClinicalVisit.js';
import Patient from '../models/Patient.js';
import { getAllLanguageScripts, getNegotiationScript } from '../utils/cdss/negotiationScripts.js';
import { AppError, asyncHandler } from '../utils/errors.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const ESCALATION_THRESHOLD = 2; // negotiationAttempts >= this → escalated

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

/**
 * Resolves a patient by MongoDB _id, enforcing ANM ownership.
 * Throws an AppError if not found or not accessible.
 */
const assertPatientAccess = async (patientId, user, authRole) => {
    if (!isObjectId(patientId)) {
        throw new AppError('Invalid patient ID', 400, 'INVALID_PATIENT_ID');
    }
    const patient = await Patient.findById(patientId);
    if (!patient) {
        throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }
    const isAdmin = authRole === 'admin' || user?.isAdmin === true;
    if (!isAdmin && patient.anmWorkerId && String(patient.anmWorkerId) !== String(user?._id)) {
        throw new AppError(
            'You are not authorized to access this patient record',
            403,
            'PATIENT_ACCESS_FORBIDDEN'
        );
    }
    return patient;
};

/**
 * Shapes a visit document into the referral history entry format.
 */
const toReferralHistoryEntry = (visit) => ({
    visitId: visit._id,
    visitDate: visit.visitDate,
    visitType: visit.visitType,
    riskLevel: visit.assessment?.riskLevel,
    referralUrgency: visit.assessment?.referral?.urgency,
    referralOutcome: visit.referralOutcome,
    escalated: visit.escalated || false
});

// ─── Exported Handlers ────────────────────────────────────────────────────────

/**
 * POST /api/cdss/patients/:patientId/visits/:visitId/referral-outcome
 *
 * ANM submits whether the referral was accepted or refused.
 * If refused, refusalReason is required.
 * Increments negotiationAttempts on every submission.
 * Sets escalated = true when negotiationAttempts >= ESCALATION_THRESHOLD.
 * Returns the updated referralOutcome and a bilingual negotiation script.
 */
export const submitReferralOutcome = asyncHandler(async (req, res) => {
    const { patientId, visitId } = req.params;

    await assertPatientAccess(patientId, req.user, req.authRole);

    if (!isObjectId(visitId)) {
        throw new AppError('Invalid visit ID', 400, 'INVALID_VISIT_ID');
    }

    const visit = await ClinicalVisit.findOne({ _id: visitId, patient: patientId });
    if (!visit) {
        throw new AppError('Visit not found for this patient', 404, 'VISIT_NOT_FOUND');
    }

    const { status, refusalReason, refusalNote, language = 'en' } = req.body;

    // ── Validate status ───────────────────────────────────────────────────────
    const VALID_STATUSES = ['ACCEPTED', 'REFUSED', 'PENDING'];
    if (!status || !VALID_STATUSES.includes(status)) {
        throw new AppError(
            `status is required and must be one of: ${VALID_STATUSES.join(', ')}`,
            400,
            'INVALID_REFERRAL_STATUS'
        );
    }

    // ── Validate refusalReason when refused ───────────────────────────────────
    const VALID_REASONS = ['HUSBAND_AWAY', 'COST', 'FEAR', 'TRANSPORT', 'FAMILY_PRESSURE', 'OTHER'];
    if (status === 'REFUSED') {
        if (!refusalReason || !VALID_REASONS.includes(refusalReason)) {
            throw new AppError(
                `refusalReason is required when status is REFUSED. Must be one of: ${VALID_REASONS.join(', ')}`,
                400,
                'REFUSAL_REASON_REQUIRED'
            );
        }
    }

    // ── Mutate referralOutcome ────────────────────────────────────────────────
    visit.referralOutcome = visit.referralOutcome || {};
    visit.referralOutcome.status = status;

    if (status === 'REFUSED') {
        visit.referralOutcome.refusalReason = refusalReason;
        if (refusalNote !== undefined) visit.referralOutcome.refusalNote = refusalNote;
    }

    if (status === 'ACCEPTED') {
        visit.referralOutcome.resolvedAt = new Date();
    }

    // ── Increment negotiation attempts ────────────────────────────────────────
    const currentAttempts = (visit.referralOutcome.negotiationAttempts || 0) + 1;
    visit.referralOutcome.negotiationAttempts = currentAttempts;

    // ── Set escalation flag ───────────────────────────────────────────────────
    const shouldEscalate = currentAttempts >= ESCALATION_THRESHOLD && status !== 'ACCEPTED';
    if (shouldEscalate) {
        visit.escalated = true;
    }
    if (status === 'ACCEPTED') {
        visit.escalated = false;
    }

    // Mongoose requires markModified for nested mixed/subdocument changes
    visit.markModified('referralOutcome');
    await visit.save();

    // ── Build negotiation script ──────────────────────────────────────────────
    let negotiationScript = null;
    if (status === 'REFUSED' && refusalReason) {
        // Return scripts in both languages for convenience; ANM app can pick
        negotiationScript = getAllLanguageScripts(refusalReason);
    }

    res.status(200).json({
        visitId: visit._id,
        referralOutcome: visit.referralOutcome,
        escalated: visit.escalated,
        escalationThreshold: ESCALATION_THRESHOLD,
        negotiationScript
    });
});

/**
 * GET /api/cdss/patients/:patientId/referral-history
 *
 * Returns all visits for a patient that have a non-default referral outcome
 * (i.e. ANM has submitted at least one outcome update).
 * Includes the escalation flag on each entry.
 */
export const getReferralHistory = asyncHandler(async (req, res) => {
    const { patientId } = req.params;

    const patient = await assertPatientAccess(patientId, req.user, req.authRole);

    const visits = await ClinicalVisit.find({
        patient: patientId,
        'referralOutcome.negotiationAttempts': { $gt: 0 }
    })
        .sort({ visitDate: -1 })
        .select('visitId visitDate visitType assessment.riskLevel assessment.referral referralOutcome escalated');

    const hasEscalation = visits.some((v) => v.escalated);

    res.json({
        patientId: patient._id,
        patientName: patient?.abha_profile?.name || patient?.abha_profile?.firstName || 'Patient',
        hasEscalation,
        count: visits.length,
        results: visits.map(toReferralHistoryEntry)
    });
});

/**
 * Enriches a list of patient summaries with REFERRAL_ESCALATED tags.
 * Designed to be called from getCdssDashboard without modifying its core logic.
 *
 * @param {Array} patientSummaries - Array of objects produced by toPatientSummary()
 * @param {string[]} patientIds - Corresponding MongoDB _id strings
 * @returns {Promise<Array>} - Same array with escalationTag added; escalated patients sorted first
 */
export const enrichWithEscalationTags = async (patientSummaries, patientIds) => {
    if (!patientIds.length) return patientSummaries;

    const escalatedVisits = await ClinicalVisit.find({
        patient: { $in: patientIds },
        escalated: true
    }).select('patient');

    const escalatedSet = new Set(escalatedVisits.map((v) => String(v.patient)));

    const enriched = patientSummaries.map((summary) => ({
        ...summary,
        escalationTag: escalatedSet.has(String(summary._id)) ? 'REFERRAL_ESCALATED' : null
    }));

    // Escalated patients bubble to the very top
    enriched.sort((a, b) => {
        if (a.escalationTag && !b.escalationTag) return -1;
        if (!a.escalationTag && b.escalationTag) return 1;
        return 0;
    });

    return enriched;
};
