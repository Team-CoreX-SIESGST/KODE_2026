import mongoose from 'mongoose';

const codedValueSchema = new mongoose.Schema(
    {
        code: { type: String, trim: true },
        display: { type: String, trim: true },
        system: { type: String, trim: true }
    },
    { _id: false }
);

const vitalSignsSchema = new mongoose.Schema(
    {
        bpSystolic: { type: Number, min: 0 },
        bpDiastolic: { type: Number, min: 0 },
        pulse: { type: Number, min: 0 },
        temperatureC: { type: Number },
        respiratoryRate: { type: Number, min: 0 },
        spo2: { type: Number, min: 0, max: 100 },
        weightKg: { type: Number, min: 0 }
    },
    { _id: false }
);

const maternalSymptomsSchema = new mongoose.Schema(
    {
        swelling: { type: Boolean, default: false },
        fever: { type: Boolean, default: false },
        bleeding: { type: Boolean, default: false },
        headache: { type: Boolean, default: false },
        blurredVision: { type: Boolean, default: false },
        severeAbdominalPain: { type: Boolean, default: false },
        convulsions: { type: Boolean, default: false },
        reducedFetalMovement: { type: Boolean, default: false },
        leakingFluid: { type: Boolean, default: false },
        pallor: { type: Boolean, default: false },
        breathlessness: { type: Boolean, default: false },
        other: [{ type: String, trim: true }]
    },
    { _id: false }
);

const maternalObservationSchema = new mongoose.Schema(
    {
        gestationalAgeWeeks: { type: Number, min: 0, max: 45 },
        muacCm: { type: Number, min: 0 },
        fetalMovement: {
            type: String,
            enum: ['NORMAL', 'REDUCED', 'ABSENT', 'UNKNOWN'],
            default: 'UNKNOWN'
        },
        fetalHeartRateBpm: { type: Number, min: 0 },
        urineProtein: {
            type: String,
            enum: ['NEGATIVE', 'TRACE', 'ONE_PLUS', 'TWO_PLUS', 'THREE_PLUS', 'UNKNOWN'],
            default: 'UNKNOWN'
        },
        bloodSugarMgDl: { type: Number, min: 0 },
        hemoglobinGdl: { type: Number, min: 0 }
    },
    { _id: false }
);

const neonatalSymptomsSchema = new mongoose.Schema(
    {
        fever: { type: Boolean, default: false },
        hypothermia: { type: Boolean, default: false },
        fastBreathing: { type: Boolean, default: false },
        chestIndrawing: { type: Boolean, default: false },
        notFeeding: { type: Boolean, default: false },
        lethargy: { type: Boolean, default: false },
        convulsions: { type: Boolean, default: false },
        jaundice: { type: Boolean, default: false },
        umbilicalRedness: { type: Boolean, default: false },
        other: [{ type: String, trim: true }]
    },
    { _id: false }
);

const neonatalObservationSchema = new mongoose.Schema(
    {
        ageDays: { type: Number, min: 0 },
        birthWeightKg: { type: Number, min: 0 },
        currentWeightKg: { type: Number, min: 0 },
        temperatureC: { type: Number },
        breathingRate: { type: Number, min: 0 }
    },
    { _id: false }
);

const assessmentFactorSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, trim: true },
        label: { type: String, trim: true },
        severity: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'LOW'
        },
        weight: { type: Number, default: 0 },
        reason: { type: String, trim: true },
        explanation: { type: String, trim: true },
        recommendation: { type: String, trim: true },
        source: {
            type: String,
            enum: ['CURRENT_VISIT', 'HISTORY', 'COMBINATION', 'EMERGENCY_OVERRIDE'],
            default: 'CURRENT_VISIT'
        }
    },
    { _id: false }
);

const referralSchema = new mongoose.Schema(
    {
        urgency: {
            type: String,
            enum: ['ROUTINE', 'MONITOR_CLOSELY', 'WITHIN_24_HOURS', 'IMMEDIATE'],
            default: 'ROUTINE'
        },
        message: { type: String, trim: true },
        followUpWindowHours: { type: Number, min: 0 }
    },
    { _id: false }
);

const assessmentSchema = new mongoose.Schema(
    {
        riskLevel: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            required: true
        },
        score: { type: Number, required: true },
        identifiedConditions: [{ type: String, trim: true }],
        reasons: [{ type: String, trim: true }],
        clinicalExplanation: [{ type: String, trim: true }],
        recommendedAction: { type: String, trim: true },
        referral: { type: referralSchema },
        alerts: [{ type: String, trim: true }],
        factors: [assessmentFactorSchema],
        trendSummary: { type: mongoose.Schema.Types.Mixed },
        language: { type: String, default: 'en', trim: true },
        engineVersion: { type: String, required: true },
        evaluatedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const clinicalVisitSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PatientData',
            required: true,
            index: true
        },
        patientAbhaId: { type: String, required: true, trim: true, index: true },
        visitType: {
            type: String,
            enum: ['MATERNAL', 'NEONATAL'],
            default: 'MATERNAL',
            index: true
        },
        visitDate: { type: Date, default: Date.now, index: true },
        capturedBy: { type: mongoose.Schema.Types.ObjectId },
        capturedByRole: {
            type: String,
            enum: ['anm', 'patient', 'system'],
            default: 'anm'
        },
        clientGeneratedId: { type: String, trim: true, index: true, sparse: true },
        source: {
            type: String,
            enum: ['ONLINE', 'OFFLINE_SYNC'],
            default: 'ONLINE'
        },
        syncStatus: {
            type: String,
            enum: ['RECEIVED', 'DUPLICATE_IGNORED'],
            default: 'RECEIVED'
        },
        clinicalCoding: {
            encounterType: { type: codedValueSchema },
            observations: [codedValueSchema]
        },
        maternal: {
            vitals: { type: vitalSignsSchema },
            symptoms: { type: maternalSymptomsSchema },
            observations: { type: maternalObservationSchema }
        },
        neonatal: {
            symptoms: { type: neonatalSymptomsSchema },
            observations: { type: neonatalObservationSchema }
        },
        assessment: { type: assessmentSchema, required: true },
        rawInput: { type: mongoose.Schema.Types.Mixed }
    },
    { timestamps: true }
);

clinicalVisitSchema.index({ patient: 1, visitDate: -1 });
clinicalVisitSchema.index({ patient: 1, visitType: 1, visitDate: -1 });
clinicalVisitSchema.index(
    { clientGeneratedId: 1 },
    { unique: true, sparse: true }
);

const ClinicalVisit = mongoose.model('ClinicalVisit', clinicalVisitSchema);

export default ClinicalVisit;
