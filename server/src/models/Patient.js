import mongoose from 'mongoose';

const abhaProfileSchema = new mongoose.Schema(
    {
        healthIdNumber: { type: String, required: true },
        healthId: { type: String, index: true },
        name: { type: String, trim: true },
        firstName: { type: String, trim: true },
        middleName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        gender: { type: String, trim: true },
        dateOfBirth: { type: String, trim: true },
        yearOfBirth: { type: String, trim: true },
        monthOfBirth: { type: String, trim: true },
        dayOfBirth: { type: String, trim: true },
        mobile: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        profilePhoto: { type: String },
        kycPhoto: { type: String },
        authMethods: [{ type: String, trim: true }],
        kycVerified: { type: Boolean, default: false },
        verificationStatus: { type: String, trim: true },
        verificationSource: { type: String, trim: true },
        abha_id_card: { type: String, trim: true }
    },
    { _id: false }
);

const addressSchema = new mongoose.Schema(
    {
        addressLine: { type: String, trim: true },
        village: { type: String, trim: true },
        subDistrict: { type: String, trim: true },
        district: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        country: { type: String, trim: true }
    },
    { _id: false }
);

const demographicSchema = new mongoose.Schema(
    {
        ageYears: { type: Number },
        maritalStatus: { type: String, trim: true },
        education: { type: String, trim: true },
        occupation: { type: String, trim: true },
        phoneNumber: { type: String, trim: true },
        emergencyContactName: { type: String, trim: true },
        emergencyContactPhone: { type: String, trim: true },
        village: { type: String, trim: true },
        block: { type: String, trim: true },
        district: { type: String, trim: true }
    },
    { _id: false }
);

const pregnancyDetailsSchema = new mongoose.Schema(
    {
        currentlyPregnant: { type: Boolean, default: true },
        gravida: { type: Number },
        parity: { type: Number },
        abortions: { type: Number },
        livingChildren: { type: Number },
        lastMenstrualPeriod: { type: String, trim: true },
        expectedDeliveryDate: { type: String, trim: true },
        gestationalAgeWeeks: { type: Number },
        highRiskHistory: [{ type: String, trim: true }],
        previousCSection: { type: Boolean, default: false },
        multiplePregnancy: { type: Boolean, default: false },
        lastUpdatedAt: { type: Date }
    },
    { _id: false }
);

const cdssSummarySchema = new mongoose.Schema(
    {
        latestRiskLevel: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'LOW'
        },
        latestVisit: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalVisit' },
        latestAssessmentAt: { type: Date },
        priorityScore: { type: Number, default: 0 },
        latestAlerts: [{ type: String, trim: true }]
    },
    { _id: false }
);

const healthRecordsSchema = new mongoose.Schema(
    {
        bloodGroup: { type: String, trim: true },
        height_cm: { type: Number },
        weight_kg: { type: Number },
        bmi: { type: Number },
        allergies: [{ type: String, trim: true }],
        chronicConditions: [{ type: String, trim: true }],
        disabilities: [{ type: String, trim: true }],
        organDonor: { type: Boolean, default: false },
        vaccinationRecord: { type: mongoose.Schema.Types.Mixed },
        pregnancyStatus: { type: mongoose.Schema.Types.Mixed }
    },
    { _id: false }
);

const anmWorkerSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        contact: { type: String, trim: true },
        serviceArea: { type: String, trim: true }
    },
    { _id: false }
);

const patientSchema = new mongoose.Schema(
    {
        abha_profile: { type: abhaProfileSchema, required: true },
        demographicData: { type: demographicSchema },
        pregnancyDetails: { type: pregnancyDetailsSchema },
        cdssSummary: { type: cdssSummarySchema },
        address: { type: addressSchema },
        health_records: { type: healthRecordsSchema },
        anmWorker: { type: anmWorkerSchema },
        anmWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnmAccount' },
        anmWorkerAssignedAt: { type: Date },
        locationCoordinates: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },
    {
        timestamps: true
    }
);

patientSchema.index({ 'abha_profile.healthIdNumber': 1 }, { unique: true });

const Patient = mongoose.model('PatientData', patientSchema, 'patients_data');

export default Patient;
