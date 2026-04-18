import { normalizeLanguage } from './localization.js';

const labels = {
    en: {
        maternalTitle: 'Maternal assessment checklist',
        neonatalTitle: 'Neonatal assessment checklist'
    },
    hi: {
        maternalTitle: 'मातृ जांच चेकलिस्ट',
        neonatalTitle: 'नवजात जांच चेकलिस्ट'
    }
};

const maternalSteps = [
    {
        key: 'identity',
        title: { en: 'Confirm patient', hi: 'रोगी की पुष्टि करें' },
        fields: [
            { key: 'abhaId', type: 'string', required: true, standard: 'ABHA.healthIdNumber' },
            { key: 'name', type: 'string', required: false },
            { key: 'ageYears', type: 'number', required: false }
        ]
    },
    {
        key: 'pregnancy',
        title: { en: 'Pregnancy details', hi: 'गर्भावस्था की जानकारी' },
        fields: [
            { key: 'gestationalAgeWeeks', type: 'number', required: false, unit: 'weeks' },
            { key: 'gravida', type: 'number', required: false },
            { key: 'parity', type: 'number', required: false },
            { key: 'lastMenstrualPeriod', type: 'date', required: false },
            { key: 'expectedDeliveryDate', type: 'date', required: false }
        ]
    },
    {
        key: 'vitals',
        title: { en: 'Vital signs', hi: 'महत्वपूर्ण संकेत' },
        fields: [
            { key: 'bpSystolic', type: 'number', required: true, unit: 'mmHg', standard: 'LOINC.8480-6' },
            { key: 'bpDiastolic', type: 'number', required: true, unit: 'mmHg', standard: 'LOINC.8462-4' },
            { key: 'pulse', type: 'number', required: false, unit: '/min' },
            { key: 'temperatureC', type: 'number', required: false, unit: 'C' },
            { key: 'respiratoryRate', type: 'number', required: false, unit: '/min' },
            { key: 'spo2', type: 'number', required: false, unit: '%' },
            { key: 'weightKg', type: 'number', required: false, unit: 'kg' }
        ]
    },
    {
        key: 'dangerSymptoms',
        title: { en: 'Danger symptoms', hi: 'खतरे के लक्षण' },
        fields: [
            { key: 'swelling', type: 'boolean', required: true },
            { key: 'fever', type: 'boolean', required: true },
            { key: 'bleeding', type: 'boolean', required: true },
            { key: 'headache', type: 'boolean', required: true },
            { key: 'blurredVision', type: 'boolean', required: true },
            { key: 'severeAbdominalPain', type: 'boolean', required: true },
            { key: 'convulsions', type: 'boolean', required: true },
            { key: 'reducedFetalMovement', type: 'boolean', required: true },
            { key: 'leakingFluid', type: 'boolean', required: false },
            { key: 'pallor', type: 'boolean', required: false },
            { key: 'breathlessness', type: 'boolean', required: false }
        ]
    },
    {
        key: 'clinicalIndicators',
        title: { en: 'Clinical indicators', hi: 'क्लिनिकल संकेतक' },
        fields: [
            { key: 'muacCm', type: 'number', required: false, unit: 'cm' },
            {
                key: 'fetalMovement',
                type: 'enum',
                required: true,
                values: ['NORMAL', 'REDUCED', 'ABSENT', 'UNKNOWN']
            },
            { key: 'fetalHeartRateBpm', type: 'number', required: false, unit: 'bpm' },
            {
                key: 'urineProtein',
                type: 'enum',
                required: false,
                values: ['NEGATIVE', 'TRACE', 'ONE_PLUS', 'TWO_PLUS', 'THREE_PLUS', 'UNKNOWN']
            },
            { key: 'hemoglobinGdl', type: 'number', required: false, unit: 'g/dL' }
        ]
    }
];

const neonatalSteps = [
    {
        key: 'identity',
        title: { en: 'Confirm mother or newborn record', hi: 'मां या नवजात रिकॉर्ड की पुष्टि करें' },
        fields: [
            { key: 'abhaId', type: 'string', required: true, standard: 'ABHA.healthIdNumber' },
            { key: 'newbornName', type: 'string', required: false }
        ]
    },
    {
        key: 'newbornMeasurements',
        title: { en: 'Newborn measurements', hi: 'नवजात माप' },
        fields: [
            { key: 'ageDays', type: 'number', required: true, unit: 'days' },
            { key: 'birthWeightKg', type: 'number', required: true, unit: 'kg' },
            { key: 'currentWeightKg', type: 'number', required: false, unit: 'kg' },
            { key: 'temperatureC', type: 'number', required: false, unit: 'C' },
            { key: 'breathingRate', type: 'number', required: false, unit: '/min' }
        ]
    },
    {
        key: 'newbornDangerSigns',
        title: { en: 'Newborn danger signs', hi: 'नवजात खतरे के संकेत' },
        fields: [
            { key: 'fever', type: 'boolean', required: true },
            { key: 'hypothermia', type: 'boolean', required: true },
            { key: 'fastBreathing', type: 'boolean', required: true },
            { key: 'chestIndrawing', type: 'boolean', required: true },
            { key: 'notFeeding', type: 'boolean', required: true },
            { key: 'lethargy', type: 'boolean', required: true },
            { key: 'convulsions', type: 'boolean', required: true },
            { key: 'jaundice', type: 'boolean', required: false },
            { key: 'umbilicalRedness', type: 'boolean', required: false }
        ]
    }
];

const localizeSteps = (steps, language) =>
    steps.map((step) => ({
        ...step,
        title: step.title[language] || step.title.en
    }));

export const getAssessmentChecklist = (type = 'maternal', language = 'en') => {
    const lang = normalizeLanguage(language);
    const isNeonatal = String(type).toLowerCase() === 'neonatal';
    return {
        type: isNeonatal ? 'NEONATAL' : 'MATERNAL',
        language: lang,
        title: isNeonatal ? labels[lang].neonatalTitle : labels[lang].maternalTitle,
        mode: 'STEP_BY_STEP',
        offlineCapable: true,
        steps: localizeSteps(isNeonatal ? neonatalSteps : maternalSteps, lang)
    };
};
