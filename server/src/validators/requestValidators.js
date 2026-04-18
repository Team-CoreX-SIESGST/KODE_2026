import { AppError } from '../utils/errors.js';

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const ensureObject = (value, label) => {
    if (!isPlainObject(value)) {
        throw new AppError(`${label} must be an object`, 400, 'VALIDATION_ERROR');
    }
    return value;
};

const requireTrimmedString = (value, label, { minLength = 1 } = {}) => {
    if (typeof value !== 'string' || value.trim().length < minLength) {
        throw new AppError(`${label} is required`, 400, 'VALIDATION_ERROR');
    }
    return value.trim();
};

const optionalTrimmedString = (value, label) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') {
        throw new AppError(`${label} must be a string`, 400, 'VALIDATION_ERROR');
    }
    return value.trim();
};

const optionalBoolean = (value, label) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'boolean') {
        throw new AppError(`${label} must be true or false`, 400, 'VALIDATION_ERROR');
    }
    return value;
};

const optionalNumber = (value, label, { min = -Infinity, max = Infinity } = {}) => {
    if (value === undefined || value === null || value === '') return undefined;
    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue < min || numericValue > max) {
        throw new AppError(`${label} must be a valid number`, 400, 'VALIDATION_ERROR');
    }
    return numericValue;
};

const optionalEnum = (value, label, allowedValues) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (!allowedValues.includes(value)) {
        throw new AppError(`${label} must be one of ${allowedValues.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    return value;
};

const optionalDateString = (value, label) => {
    if (value === undefined || value === null || value === '') return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AppError(`${label} must be a valid date`, 400, 'VALIDATION_ERROR');
    }
    return value;
};

const optionalStringArray = (value, label) => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new AppError(`${label} must be an array of strings`, 400, 'VALIDATION_ERROR');
    }
    return value.map((item) => item.trim()).filter(Boolean);
};

const optionalLocation = (value) => {
    if (value === undefined) return undefined;
    const location = ensureObject(value, 'locationCoordinates');
    return {
        latitude: optionalNumber(location.latitude, 'locationCoordinates.latitude', { min: -90, max: 90 }),
        longitude: optionalNumber(location.longitude, 'locationCoordinates.longitude', { min: -180, max: 180 })
    };
};

const optionalDemographicData = (value) => {
    if (value === undefined) return undefined;
    const demographic = ensureObject(value, 'demographicData');
    return {
        ageYears: optionalNumber(demographic.ageYears, 'demographicData.ageYears', { min: 0, max: 120 }),
        maritalStatus: optionalTrimmedString(demographic.maritalStatus, 'demographicData.maritalStatus'),
        education: optionalTrimmedString(demographic.education, 'demographicData.education'),
        occupation: optionalTrimmedString(demographic.occupation, 'demographicData.occupation'),
        phoneNumber: optionalTrimmedString(demographic.phoneNumber, 'demographicData.phoneNumber'),
        emergencyContactName: optionalTrimmedString(
            demographic.emergencyContactName,
            'demographicData.emergencyContactName'
        ),
        emergencyContactPhone: optionalTrimmedString(
            demographic.emergencyContactPhone,
            'demographicData.emergencyContactPhone'
        ),
        village: optionalTrimmedString(demographic.village, 'demographicData.village'),
        block: optionalTrimmedString(demographic.block, 'demographicData.block'),
        district: optionalTrimmedString(demographic.district, 'demographicData.district')
    };
};

const optionalPregnancyDetails = (value) => {
    if (value === undefined) return undefined;
    const pregnancy = ensureObject(value, 'pregnancyDetails');
    return {
        currentlyPregnant: optionalBoolean(pregnancy.currentlyPregnant, 'pregnancyDetails.currentlyPregnant'),
        gravida: optionalNumber(pregnancy.gravida, 'pregnancyDetails.gravida', { min: 0, max: 20 }),
        parity: optionalNumber(pregnancy.parity, 'pregnancyDetails.parity', { min: 0, max: 20 }),
        abortions: optionalNumber(pregnancy.abortions, 'pregnancyDetails.abortions', { min: 0, max: 20 }),
        livingChildren: optionalNumber(pregnancy.livingChildren, 'pregnancyDetails.livingChildren', {
            min: 0,
            max: 20
        }),
        lastMenstrualPeriod: optionalDateString(
            pregnancy.lastMenstrualPeriod,
            'pregnancyDetails.lastMenstrualPeriod'
        ),
        expectedDeliveryDate: optionalDateString(
            pregnancy.expectedDeliveryDate,
            'pregnancyDetails.expectedDeliveryDate'
        ),
        gestationalAgeWeeks: optionalNumber(
            pregnancy.gestationalAgeWeeks,
            'pregnancyDetails.gestationalAgeWeeks',
            { min: 0, max: 45 }
        ),
        highRiskHistory: optionalStringArray(pregnancy.highRiskHistory, 'pregnancyDetails.highRiskHistory'),
        previousCSection: optionalBoolean(pregnancy.previousCSection, 'pregnancyDetails.previousCSection'),
        multiplePregnancy: optionalBoolean(pregnancy.multiplePregnancy, 'pregnancyDetails.multiplePregnancy')
    };
};

const optionalMaternalVisit = (value) => {
    if (value === undefined) return undefined;
    const maternal = ensureObject(value, 'maternal');
    const vitals = maternal.vitals ? ensureObject(maternal.vitals, 'maternal.vitals') : {};
    const symptoms = maternal.symptoms ? ensureObject(maternal.symptoms, 'maternal.symptoms') : {};
    const observations = maternal.observations
        ? ensureObject(maternal.observations, 'maternal.observations')
        : {};

    return {
        vitals: {
            bpSystolic: optionalNumber(vitals.bpSystolic, 'maternal.vitals.bpSystolic', { min: 0, max: 300 }),
            bpDiastolic: optionalNumber(vitals.bpDiastolic, 'maternal.vitals.bpDiastolic', { min: 0, max: 200 }),
            pulse: optionalNumber(vitals.pulse, 'maternal.vitals.pulse', { min: 0, max: 240 }),
            temperatureC: optionalNumber(vitals.temperatureC, 'maternal.vitals.temperatureC', { min: 25, max: 45 }),
            respiratoryRate: optionalNumber(vitals.respiratoryRate, 'maternal.vitals.respiratoryRate', {
                min: 0,
                max: 100
            }),
            spo2: optionalNumber(vitals.spo2, 'maternal.vitals.spo2', { min: 0, max: 100 }),
            weightKg: optionalNumber(vitals.weightKg, 'maternal.vitals.weightKg', { min: 0, max: 500 })
        },
        symptoms: {
            swelling: optionalBoolean(symptoms.swelling, 'maternal.symptoms.swelling'),
            fever: optionalBoolean(symptoms.fever, 'maternal.symptoms.fever'),
            bleeding: optionalBoolean(symptoms.bleeding, 'maternal.symptoms.bleeding'),
            headache: optionalBoolean(symptoms.headache, 'maternal.symptoms.headache'),
            blurredVision: optionalBoolean(symptoms.blurredVision, 'maternal.symptoms.blurredVision'),
            severeAbdominalPain: optionalBoolean(
                symptoms.severeAbdominalPain,
                'maternal.symptoms.severeAbdominalPain'
            ),
            convulsions: optionalBoolean(symptoms.convulsions, 'maternal.symptoms.convulsions'),
            reducedFetalMovement: optionalBoolean(
                symptoms.reducedFetalMovement,
                'maternal.symptoms.reducedFetalMovement'
            ),
            leakingFluid: optionalBoolean(symptoms.leakingFluid, 'maternal.symptoms.leakingFluid'),
            pallor: optionalBoolean(symptoms.pallor, 'maternal.symptoms.pallor'),
            breathlessness: optionalBoolean(symptoms.breathlessness, 'maternal.symptoms.breathlessness'),
            other: optionalStringArray(symptoms.other, 'maternal.symptoms.other')
        },
        observations: {
            gestationalAgeWeeks: optionalNumber(
                observations.gestationalAgeWeeks,
                'maternal.observations.gestationalAgeWeeks',
                { min: 0, max: 45 }
            ),
            muacCm: optionalNumber(observations.muacCm, 'maternal.observations.muacCm', { min: 0, max: 100 }),
            fetalMovement: optionalEnum(
                observations.fetalMovement,
                'maternal.observations.fetalMovement',
                ['NORMAL', 'REDUCED', 'ABSENT', 'UNKNOWN']
            ),
            fetalHeartRateBpm: optionalNumber(
                observations.fetalHeartRateBpm,
                'maternal.observations.fetalHeartRateBpm',
                { min: 0, max: 300 }
            ),
            urineProtein: optionalEnum(
                observations.urineProtein,
                'maternal.observations.urineProtein',
                ['NEGATIVE', 'TRACE', 'ONE_PLUS', 'TWO_PLUS', 'THREE_PLUS', 'UNKNOWN']
            ),
            bloodSugarMgDl: optionalNumber(
                observations.bloodSugarMgDl,
                'maternal.observations.bloodSugarMgDl',
                { min: 0, max: 1000 }
            ),
            hemoglobinGdl: optionalNumber(
                observations.hemoglobinGdl,
                'maternal.observations.hemoglobinGdl',
                { min: 0, max: 30 }
            )
        }
    };
};

const optionalNeonatalVisit = (value) => {
    if (value === undefined) return undefined;
    const neonatal = ensureObject(value, 'neonatal');
    const symptoms = neonatal.symptoms ? ensureObject(neonatal.symptoms, 'neonatal.symptoms') : {};
    const observations = neonatal.observations
        ? ensureObject(neonatal.observations, 'neonatal.observations')
        : {};
    return {
        symptoms: {
            fever: optionalBoolean(symptoms.fever, 'neonatal.symptoms.fever'),
            hypothermia: optionalBoolean(symptoms.hypothermia, 'neonatal.symptoms.hypothermia'),
            fastBreathing: optionalBoolean(symptoms.fastBreathing, 'neonatal.symptoms.fastBreathing'),
            chestIndrawing: optionalBoolean(symptoms.chestIndrawing, 'neonatal.symptoms.chestIndrawing'),
            notFeeding: optionalBoolean(symptoms.notFeeding, 'neonatal.symptoms.notFeeding'),
            lethargy: optionalBoolean(symptoms.lethargy, 'neonatal.symptoms.lethargy'),
            convulsions: optionalBoolean(symptoms.convulsions, 'neonatal.symptoms.convulsions'),
            jaundice: optionalBoolean(symptoms.jaundice, 'neonatal.symptoms.jaundice'),
            umbilicalRedness: optionalBoolean(symptoms.umbilicalRedness, 'neonatal.symptoms.umbilicalRedness'),
            other: optionalStringArray(symptoms.other, 'neonatal.symptoms.other')
        },
        observations: {
            ageDays: optionalNumber(observations.ageDays, 'neonatal.observations.ageDays', { min: 0, max: 60 }),
            birthWeightKg: optionalNumber(observations.birthWeightKg, 'neonatal.observations.birthWeightKg', {
                min: 0,
                max: 10
            }),
            currentWeightKg: optionalNumber(
                observations.currentWeightKg,
                'neonatal.observations.currentWeightKg',
                { min: 0, max: 10 }
            ),
            temperatureC: optionalNumber(observations.temperatureC, 'neonatal.observations.temperatureC', {
                min: 25,
                max: 45
            }),
            breathingRate: optionalNumber(
                observations.breathingRate,
                'neonatal.observations.breathingRate',
                { min: 0, max: 200 }
            )
        }
    };
};

const compact = (obj) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );

export const validateAnmRegister = (body) => {
    const payload = ensureObject(body, 'request body');
    return compact({
        name: requireTrimmedString(payload.name, 'name'),
        username: requireTrimmedString(payload.username, 'username'),
        password: requireTrimmedString(payload.password, 'password', { minLength: 6 }),
        phoneNumber: optionalTrimmedString(payload.phoneNumber, 'phoneNumber'),
        facilityName: optionalTrimmedString(payload.facilityName, 'facilityName'),
        serviceArea: optionalTrimmedString(payload.serviceArea, 'serviceArea'),
        locationCoordinates: optionalLocation(payload.locationCoordinates)
    });
};

export const validateAnmLogin = (body) => {
    const payload = ensureObject(body, 'request body');
    return {
        username: requireTrimmedString(payload.username, 'username'),
        password: requireTrimmedString(payload.password, 'password')
    };
};

export const validateAnmUpdate = (body) => {
    const payload = ensureObject(body, 'request body');
    return compact({
        name: optionalTrimmedString(payload.name, 'name'),
        phoneNumber: optionalTrimmedString(payload.phoneNumber, 'phoneNumber'),
        facilityName: optionalTrimmedString(payload.facilityName, 'facilityName'),
        serviceArea: optionalTrimmedString(payload.serviceArea, 'serviceArea'),
        locationCoordinates: optionalLocation(payload.locationCoordinates)
    });
};

export const validatePatientRegister = (body) => {
    const payload = ensureObject(body, 'request body');
    return compact({
        name: requireTrimmedString(payload.name, 'name'),
        abhaId: requireTrimmedString(payload.abhaId, 'abhaId'),
        healthId: optionalTrimmedString(payload.healthId, 'healthId'),
        phoneNumber: optionalTrimmedString(payload.phoneNumber, 'phoneNumber'),
        demographicData: optionalDemographicData(payload.demographicData),
        pregnancyDetails: optionalPregnancyDetails(payload.pregnancyDetails),
        locationCoordinates: payload.locationCoordinates
            ? optionalLocation(payload.locationCoordinates)
            : payload.latitude !== undefined || payload.longitude !== undefined
            ? {
                  latitude: optionalNumber(payload.latitude, 'latitude', { min: -90, max: 90 }),
                  longitude: optionalNumber(payload.longitude, 'longitude', { min: -180, max: 180 })
              }
            : undefined
    });
};

export const validatePatientUpdate = (body) => {
    const payload = ensureObject(body, 'request body');
    return compact({
        name: optionalTrimmedString(payload.name, 'name'),
        phoneNumber: optionalTrimmedString(payload.phoneNumber, 'phoneNumber'),
        demographicData: optionalDemographicData(payload.demographicData),
        pregnancyDetails: optionalPregnancyDetails(payload.pregnancyDetails),
        locationCoordinates: payload.locationCoordinates
            ? optionalLocation(payload.locationCoordinates)
            : payload.latitude !== undefined || payload.longitude !== undefined
            ? {
                  latitude: optionalNumber(payload.latitude, 'latitude', { min: -90, max: 90 }),
                  longitude: optionalNumber(payload.longitude, 'longitude', { min: -180, max: 180 })
              }
            : undefined
    });
};

export const validatePatientOtpSend = (body) => {
    const payload = ensureObject(body, 'request body');
    return { phoneNumber: requireTrimmedString(payload.phoneNumber, 'phoneNumber') };
};

export const validatePatientOtpVerify = (body) => {
    const payload = ensureObject(body, 'request body');
    return {
        phoneNumber: requireTrimmedString(payload.phoneNumber, 'phoneNumber'),
        otp: requireTrimmedString(payload.otp, 'otp', { minLength: 4 })
    };
};

export const validateCdssPatientUpsert = (body) => {
    const payload = ensureObject(body, 'request body');
    return compact({
        abhaId: requireTrimmedString(payload.abhaId || payload.healthIdNumber, 'abhaId'),
        healthId: optionalTrimmedString(payload.healthId, 'healthId'),
        name: optionalTrimmedString(payload.name, 'name'),
        phoneNumber: optionalTrimmedString(payload.phoneNumber, 'phoneNumber'),
        demographicData: optionalDemographicData(payload.demographicData),
        pregnancyDetails: optionalPregnancyDetails(payload.pregnancyDetails),
        address: payload.address ? ensureObject(payload.address, 'address') : undefined,
        locationCoordinates: optionalLocation(payload.locationCoordinates)
    });
};

export const validateCdssVisit = (body) => {
    const payload = ensureObject(body, 'request body');
    const visitType = optionalEnum(payload.visitType, 'visitType', ['MATERNAL', 'NEONATAL']) || 'MATERNAL';
    const visitDate = optionalDateString(payload.visitDate, 'visitDate');
    const maternal = optionalMaternalVisit(payload.maternal);
    const neonatal = optionalNeonatalVisit(payload.neonatal);

    if (visitType === 'MATERNAL' && !maternal) {
        throw new AppError('maternal data is required for MATERNAL visits', 400, 'VALIDATION_ERROR');
    }
    if (visitType === 'NEONATAL' && !neonatal) {
        throw new AppError('neonatal data is required for NEONATAL visits', 400, 'VALIDATION_ERROR');
    }

    return compact({
        visitType,
        language: optionalTrimmedString(payload.language, 'language'),
        visitDate,
        clientGeneratedId: optionalTrimmedString(payload.clientGeneratedId, 'clientGeneratedId'),
        source: optionalEnum(payload.source, 'source', ['ONLINE', 'OFFLINE_SYNC']),
        abhaId: optionalTrimmedString(payload.abhaId, 'abhaId'),
        maternal,
        neonatal
    });
};

export const validateCdssSync = (body) => {
    const payload = ensureObject(body, 'request body');
    if (!Array.isArray(payload.visits) || !payload.visits.length) {
        throw new AppError('visits must be a non-empty array', 400, 'VALIDATION_ERROR');
    }
    return {
        visits: payload.visits.map((visit) => {
            const visitPayload = ensureObject(visit, 'visits[]');
            const patient = visitPayload.patient ? validateCdssPatientUpsert(visitPayload.patient) : undefined;
            return compact({
                ...validateCdssVisit(visitPayload),
                patientId: optionalTrimmedString(visitPayload.patientId, 'patientId'),
                abhaId:
                    optionalTrimmedString(visitPayload.abhaId, 'abhaId') ||
                    optionalTrimmedString(visitPayload.healthIdNumber, 'healthIdNumber'),
                healthId: optionalTrimmedString(visitPayload.healthId, 'healthId'),
                name: optionalTrimmedString(visitPayload.name, 'name'),
                phoneNumber: optionalTrimmedString(visitPayload.phoneNumber, 'phoneNumber'),
                demographicData: optionalDemographicData(visitPayload.demographicData),
                pregnancyDetails: optionalPregnancyDetails(visitPayload.pregnancyDetails),
                locationCoordinates: optionalLocation(visitPayload.locationCoordinates),
                patient
            });
        })
    };
};
