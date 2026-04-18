import { getText, localizeCondition, normalizeLanguage } from './localization.js';

export const CDSS_ENGINE_VERSION = 'cdss-mnh-rules-v1';

const RISK_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const REFERRAL_BY_RISK = {
    LOW: { urgency: 'ROUTINE', followUpWindowHours: 720 },
    MEDIUM: { urgency: 'MONITOR_CLOSELY', followUpWindowHours: 72 },
    HIGH: { urgency: 'WITHIN_24_HOURS', followUpWindowHours: 24 },
    CRITICAL: { urgency: 'IMMEDIATE', followUpWindowHours: 0 }
};

const bool = (value) => value === true;
const numberOrNull = (value) => (typeof value === 'number' && !Number.isNaN(value) ? value : null);

const maxRisk = (a, b) => (RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b);

const scoreToRisk = (score) => {
    if (score >= 70) return 'CRITICAL';
    if (score >= 40) return 'HIGH';
    if (score >= 20) return 'MEDIUM';
    return 'LOW';
};

const createFactor = ({
    code,
    severity,
    weight,
    source = 'CURRENT_VISIT',
    reason,
    explanation,
    recommendation,
    language
}) => ({
    code,
    label: localizeCondition(code, language),
    severity,
    weight,
    source,
    reason,
    explanation,
    recommendation
});

const addFactor = (factors, input) => {
    factors.push(createFactor(input));
};

const getMaternalTemperature = (visit) => numberOrNull(visit?.maternal?.vitals?.temperatureC);
const getMaternalSystolic = (visit) => numberOrNull(visit?.maternal?.vitals?.bpSystolic);
const getMaternalDiastolic = (visit) => numberOrNull(visit?.maternal?.vitals?.bpDiastolic);
const hasMaternalFever = (visit) =>
    bool(visit?.maternal?.symptoms?.fever) || (getMaternalTemperature(visit) ?? 0) >= 38;

const getNeonatalTemperature = (visit) => numberOrNull(visit?.neonatal?.observations?.temperatureC);
const hasNeonatalFever = (visit) =>
    bool(visit?.neonatal?.symptoms?.fever) || (getNeonatalTemperature(visit) ?? 0) >= 38;

const hasNeonatalHypothermia = (visit) =>
    bool(visit?.neonatal?.symptoms?.hypothermia) || (getNeonatalTemperature(visit) ?? 99) < 35.5;

const increasingTrend = (values, minimumIncrease) => {
    const clean = values.filter((value) => typeof value === 'number' && !Number.isNaN(value));
    if (clean.length < 3) return false;
    const lastThree = clean.slice(-3);
    return lastThree[2] > lastThree[1] && lastThree[1] >= lastThree[0] && lastThree[2] - lastThree[0] >= minimumIncrease;
};

const repeatedCount = (items, predicate) => items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);

const evaluateMaternal = ({ currentVisit, history, language }) => {
    const factors = [];
    const alerts = [];
    const trendSummary = {};
    const vitals = currentVisit?.maternal?.vitals || {};
    const symptoms = currentVisit?.maternal?.symptoms || {};
    const observations = currentVisit?.maternal?.observations || {};
    const systolic = numberOrNull(vitals.bpSystolic);
    const diastolic = numberOrNull(vitals.bpDiastolic);
    const temperatureC = numberOrNull(vitals.temperatureC);
    const muacCm = numberOrNull(observations.muacCm);
    const hemoglobinGdl = numberOrNull(observations.hemoglobinGdl);
    const urineProtein = observations.urineProtein;
    let emergencyRisk = 'LOW';

    if ((systolic !== null && systolic >= 160) || (diastolic !== null && diastolic >= 110)) {
        emergencyRisk = maxRisk(emergencyRisk, 'CRITICAL');
        addFactor(factors, {
            code: 'SEVERE_HYPERTENSION',
            severity: 'CRITICAL',
            weight: 70,
            source: 'EMERGENCY_OVERRIDE',
            reason: `BP is ${systolic ?? '-'} / ${diastolic ?? '-'} mmHg.`,
            explanation: 'Very high blood pressure in pregnancy can lead to seizures, stroke, placental complications, and maternal or fetal death.',
            recommendation: 'Stabilize if trained, keep the patient under observation, and arrange immediate referral.',
            language
        });
    } else if ((systolic !== null && systolic >= 140) || (diastolic !== null && diastolic >= 90)) {
        addFactor(factors, {
            code: 'SEVERE_HYPERTENSION',
            severity: 'HIGH',
            weight: 25,
            reason: `BP is ${systolic ?? '-'} / ${diastolic ?? '-'} mmHg.`,
            explanation: 'Hypertension during pregnancy can progress to pre-eclampsia and needs prompt assessment.',
            recommendation: 'Repeat BP, check danger signs, and plan referral if symptoms or proteinuria are present.',
            language
        });
    }

    if (bool(symptoms.convulsions)) {
        emergencyRisk = maxRisk(emergencyRisk, 'CRITICAL');
        addFactor(factors, {
            code: 'ECLAMPSIA_WARNING',
            severity: 'CRITICAL',
            weight: 80,
            source: 'EMERGENCY_OVERRIDE',
            reason: 'Convulsions were reported in the current visit.',
            explanation: 'Convulsions in pregnancy can indicate eclampsia, which is life-threatening.',
            recommendation: 'Treat as an emergency and arrange immediate referral.',
            language
        });
    }

    if (bool(symptoms.bleeding)) {
        emergencyRisk = maxRisk(emergencyRisk, 'CRITICAL');
        addFactor(factors, {
            code: 'ANTEPARTUM_BLEEDING',
            severity: 'CRITICAL',
            weight: 70,
            source: 'EMERGENCY_OVERRIDE',
            reason: 'Bleeding was reported during pregnancy.',
            explanation: 'Bleeding can signal placental problems or severe maternal risk and may deteriorate quickly.',
            recommendation: 'Do not delay care; arrange immediate referral.',
            language
        });
    }

    if (observations.fetalMovement === 'ABSENT') {
        emergencyRisk = maxRisk(emergencyRisk, 'CRITICAL');
        addFactor(factors, {
            code: 'REDUCED_FETAL_MOVEMENT',
            severity: 'CRITICAL',
            weight: 65,
            source: 'EMERGENCY_OVERRIDE',
            reason: 'Fetal movement is absent.',
            explanation: 'Absent fetal movement can indicate fetal distress or fetal compromise.',
            recommendation: 'Arrange immediate fetal assessment and referral.',
            language
        });
    } else if (observations.fetalMovement === 'REDUCED' || bool(symptoms.reducedFetalMovement)) {
        addFactor(factors, {
            code: 'REDUCED_FETAL_MOVEMENT',
            severity: 'HIGH',
            weight: 30,
            reason: 'Reduced fetal movement was reported.',
            explanation: 'Reduced movement may be an early warning of fetal distress.',
            recommendation: 'Refer for fetal assessment within 24 hours.',
            language
        });
    }

    if (hasMaternalFever(currentVisit)) {
        addFactor(factors, {
            code: 'MATERNAL_FEVER',
            severity: temperatureC !== null && temperatureC >= 39 ? 'HIGH' : 'MEDIUM',
            weight: temperatureC !== null && temperatureC >= 39 ? 30 : 18,
            reason: `Fever is present${temperatureC !== null ? ` with temperature ${temperatureC} C` : ''}.`,
            explanation: 'Fever in pregnancy may indicate infection and can increase maternal and fetal risk.',
            recommendation: 'Assess infection signs, hydration, and refer if fever is high or persistent.',
            language
        });
    }

    if (muacCm !== null && muacCm < 21) {
        addFactor(factors, {
            code: 'MATERNAL_UNDERNUTRITION',
            severity: 'HIGH',
            weight: 30,
            reason: `MUAC is ${muacCm} cm.`,
            explanation: 'Very low MUAC suggests severe undernutrition and higher risk for poor maternal and newborn outcomes.',
            recommendation: 'Provide nutrition support and refer for further evaluation.',
            language
        });
    } else if (muacCm !== null && muacCm < 23) {
        addFactor(factors, {
            code: 'MATERNAL_UNDERNUTRITION',
            severity: 'MEDIUM',
            weight: 15,
            reason: `MUAC is ${muacCm} cm.`,
            explanation: 'Low MUAC suggests undernutrition and needs nutrition counseling and follow-up.',
            recommendation: 'Give nutrition counseling and monitor MUAC.',
            language
        });
    }

    if (hemoglobinGdl !== null && hemoglobinGdl < 7) {
        emergencyRisk = maxRisk(emergencyRisk, 'HIGH');
        addFactor(factors, {
            code: 'SEVERE_ANEMIA',
            severity: 'HIGH',
            weight: 35,
            reason: `Hemoglobin is ${hemoglobinGdl} g/dL.`,
            explanation: 'Severe anemia increases the risk of heart failure, bleeding complications, and poor fetal growth.',
            recommendation: 'Refer urgently for anemia management.',
            language
        });
    }

    const hasHypertension = (systolic !== null && systolic >= 140) || (diastolic !== null && diastolic >= 90);
    const hasPreeclampsiaSymptoms =
        bool(symptoms.headache) ||
        bool(symptoms.blurredVision) ||
        bool(symptoms.swelling) ||
        urineProtein === 'TWO_PLUS' ||
        urineProtein === 'THREE_PLUS';

    if (hasHypertension && hasPreeclampsiaSymptoms) {
        emergencyRisk = maxRisk(emergencyRisk, 'HIGH');
        addFactor(factors, {
            code: 'POSSIBLE_PREECLAMPSIA',
            severity: 'HIGH',
            weight: 30,
            source: 'COMBINATION',
            reason: 'High BP is present with headache, visual symptoms, swelling, or proteinuria.',
            explanation: 'The combination suggests possible pre-eclampsia, which can progress rapidly.',
            recommendation: 'Refer within 24 hours or immediately if severe symptoms develop.',
            language
        });
    }

    if (bool(symptoms.severeAbdominalPain) && bool(symptoms.bleeding)) {
        addFactor(factors, {
            code: 'ANTEPARTUM_BLEEDING',
            severity: 'CRITICAL',
            weight: 25,
            source: 'COMBINATION',
            reason: 'Bleeding is combined with severe abdominal pain.',
            explanation: 'This combination can indicate serious obstetric complications.',
            recommendation: 'Immediate referral is required.',
            language
        });
    }

    const orderedHistory = [...history].reverse();
    const systolicTrend = [...orderedHistory.map(getMaternalSystolic), systolic].filter((value) => value !== null);
    const diastolicTrend = [...orderedHistory.map(getMaternalDiastolic), diastolic].filter((value) => value !== null);
    trendSummary.bpSystolic = systolicTrend;
    trendSummary.bpDiastolic = diastolicTrend;

    if (increasingTrend(systolicTrend, 10) || increasingTrend(diastolicTrend, 8)) {
        alerts.push('BP is increasing over time - risk may increase.');
        addFactor(factors, {
            code: 'RISING_BP',
            severity: 'MEDIUM',
            weight: 12,
            source: 'HISTORY',
            reason: 'The last visits show a rising BP pattern.',
            explanation: 'A rising BP trend can precede hypertensive disorders in pregnancy.',
            recommendation: 'Repeat BP, monitor closely, and escalate if danger signs appear.',
            language
        });
    }

    const priorFeverCount = repeatedCount(history, hasMaternalFever);
    if (hasMaternalFever(currentVisit) && priorFeverCount >= 1) {
        alerts.push('Fever is repeated across visits - assess for persistent infection.');
        addFactor(factors, {
            code: 'REPEATED_FEVER',
            severity: 'MEDIUM',
            weight: 12,
            source: 'HISTORY',
            reason: 'Fever was present in the current visit and at least one previous visit.',
            explanation: 'Persistent fever can indicate untreated infection.',
            recommendation: 'Refer or consult if fever persists or is associated with weakness, pain, or dehydration.',
            language
        });
    }

    return { factors, alerts, emergencyRisk, trendSummary };
};

const evaluateNeonatal = ({ currentVisit, history, language }) => {
    const factors = [];
    const alerts = [];
    const trendSummary = {};
    const symptoms = currentVisit?.neonatal?.symptoms || {};
    const observations = currentVisit?.neonatal?.observations || {};
    const birthWeightKg = numberOrNull(observations.birthWeightKg);
    const currentWeightKg = numberOrNull(observations.currentWeightKg);
    const breathingRate = numberOrNull(observations.breathingRate);
    let emergencyRisk = 'LOW';

    if (birthWeightKg !== null && birthWeightKg < 1.5) {
        emergencyRisk = maxRisk(emergencyRisk, 'CRITICAL');
        addFactor(factors, {
            code: 'VERY_LOW_BIRTH_WEIGHT',
            severity: 'CRITICAL',
            weight: 70,
            source: 'EMERGENCY_OVERRIDE',
            reason: `Birth weight is ${birthWeightKg} kg.`,
            explanation: 'Very low birth weight newborns are at high risk of hypothermia, infection, breathing problems, and feeding difficulty.',
            recommendation: 'Arrange immediate referral for newborn care.',
            language
        });
    } else if (birthWeightKg !== null && birthWeightKg < 2.5) {
        addFactor(factors, {
            code: 'LOW_BIRTH_WEIGHT',
            severity: 'HIGH',
            weight: 35,
            reason: `Birth weight is ${birthWeightKg} kg.`,
            explanation: 'Low birth weight increases the risk of infection, hypothermia, and feeding problems.',
            recommendation: 'Keep warm, support feeding, and refer if any danger sign is present.',
            language
        });
    }

    if (bool(symptoms.convulsions) || (bool(symptoms.notFeeding) && bool(symptoms.lethargy))) {
        emergencyRisk = maxRisk(emergencyRisk, 'CRITICAL');
        addFactor(factors, {
            code: 'NEONATAL_DANGER_SIGNS',
            severity: 'CRITICAL',
            weight: 75,
            source: 'EMERGENCY_OVERRIDE',
            reason: 'Convulsions, poor feeding with lethargy, or severe danger signs are present.',
            explanation: 'These are neonatal danger signs that can indicate sepsis or severe illness.',
            recommendation: 'Arrange immediate referral.',
            language
        });
    }

    if (bool(symptoms.chestIndrawing) || bool(symptoms.fastBreathing) || (breathingRate !== null && breathingRate >= 60)) {
        emergencyRisk = maxRisk(emergencyRisk, bool(symptoms.chestIndrawing) ? 'CRITICAL' : 'HIGH');
        addFactor(factors, {
            code: 'NEONATAL_BREATHING_DISTRESS',
            severity: bool(symptoms.chestIndrawing) ? 'CRITICAL' : 'HIGH',
            weight: bool(symptoms.chestIndrawing) ? 60 : 35,
            source: bool(symptoms.chestIndrawing) ? 'EMERGENCY_OVERRIDE' : 'CURRENT_VISIT',
            reason: `Breathing concern is present${breathingRate !== null ? ` with rate ${breathingRate}/min` : ''}.`,
            explanation: 'Breathing difficulty in a newborn can worsen quickly and may require oxygen or urgent treatment.',
            recommendation: 'Refer urgently; immediate referral if chest indrawing is present.',
            language
        });
    }

    if (hasNeonatalFever(currentVisit) || hasNeonatalHypothermia(currentVisit)) {
        addFactor(factors, {
            code: 'NEONATAL_FEVER',
            severity: 'HIGH',
            weight: 30,
            reason: 'Newborn temperature is abnormal or fever/hypothermia is reported.',
            explanation: 'Temperature instability in newborns can be a sign of infection or poor thermal protection.',
            recommendation: 'Keep warm and refer within 24 hours, or immediately if other danger signs are present.',
            language
        });
    }

    const orderedHistory = [...history].reverse();
    const weightTrend = [
        ...orderedHistory
            .map((visit) => numberOrNull(visit?.neonatal?.observations?.currentWeightKg))
            .filter((value) => value !== null),
        currentWeightKg
    ].filter((value) => value !== null);
    trendSummary.currentWeightKg = weightTrend;

    if (weightTrend.length >= 3 && weightTrend[weightTrend.length - 1] <= weightTrend[0]) {
        alerts.push('Newborn weight is not improving over time.');
        addFactor(factors, {
            code: 'POOR_WEIGHT_TREND',
            severity: 'MEDIUM',
            weight: 12,
            source: 'HISTORY',
            reason: 'Recent newborn weights do not show expected improvement.',
            explanation: 'Poor weight gain can indicate feeding problems or illness.',
            recommendation: 'Assess feeding, hydration, and refer if danger signs are present.',
            language
        });
    }

    const priorFeverCount = repeatedCount(history, (visit) => hasNeonatalFever(visit) || hasNeonatalHypothermia(visit));
    if ((hasNeonatalFever(currentVisit) || hasNeonatalHypothermia(currentVisit)) && priorFeverCount >= 1) {
        alerts.push('Temperature abnormality is repeated across newborn visits.');
        addFactor(factors, {
            code: 'NEONATAL_FEVER',
            severity: 'HIGH',
            weight: 12,
            source: 'HISTORY',
            reason: 'Abnormal temperature is repeated across visits.',
            explanation: 'Repeated temperature abnormality can indicate ongoing infection or thermal instability.',
            recommendation: 'Refer for newborn evaluation.',
            language
        });
    }

    return { factors, alerts, emergencyRisk, trendSummary };
};

export const evaluateClinicalRisk = ({ currentVisit, history = [], language = 'en' }) => {
    const lang = normalizeLanguage(language);
    const text = getText(lang);
    const visitType = currentVisit?.visitType === 'NEONATAL' ? 'NEONATAL' : 'MATERNAL';
    const result =
        visitType === 'NEONATAL'
            ? evaluateNeonatal({ currentVisit, history, language: lang })
            : evaluateMaternal({ currentVisit, history, language: lang });

    const score = result.factors.reduce((sum, factor) => sum + Number(factor.weight || 0), 0);
    const scoreRisk = scoreToRisk(score);
    const riskLevel = maxRisk(scoreRisk, result.emergencyRisk);
    const uniqueConditionCodes = [...new Set(result.factors.map((factor) => factor.code))];
    const referralBase = REFERRAL_BY_RISK[riskLevel];

    return {
        riskLevel,
        score,
        identifiedConditions: uniqueConditionCodes.map((code) => localizeCondition(code, lang)),
        reasons: result.factors.map((factor) => factor.reason),
        clinicalExplanation: [...new Set(result.factors.map((factor) => factor.explanation))],
        recommendedAction: text.recommendedAction[riskLevel],
        referral: {
            ...referralBase,
            message: text.referral[riskLevel]
        },
        alerts: result.alerts,
        factors: result.factors,
        trendSummary: result.trendSummary,
        language: lang,
        engineVersion: CDSS_ENGINE_VERSION,
        evaluatedAt: new Date()
    };
};
