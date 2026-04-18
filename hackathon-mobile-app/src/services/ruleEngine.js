/**
 * AI-powered Clinical Decision Support Tool (CDST)
 * for ANMs and Medical Officers at rural PHCs and sub-centres in India.
 *
 * This module is designed for fully offline use with locally available inputs.
 * It applies hard override referral rules first, then falls back to weighted
 * risk scoring for explainable ANC triage.
 */

const DECISIONS = Object.freeze({
  NORMAL_DELIVERY: "NORMAL_DELIVERY",
  MEDIUM_RISK_WATCH: "MEDIUM_RISK_WATCH",
  REFER_CSECTION: "REFER_CSECTION",
  REFER_HIGH_RISK: "REFER_HIGH_RISK",
  EMERGENCY_REFERRAL: "EMERGENCY_REFERRAL",
});

const RISK_BANDS = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  EMERGENCY: "EMERGENCY",
});

const REFERRAL_LEVELS = Object.freeze({
  PHC: "PHC",
  CHC: "CHC",
  DISTRICT_HOSPITAL: "DISTRICT_HOSPITAL",
  EMERGENCY: "EMERGENCY",
});

/**
 * Metadata used by the explainability layer.
 * Each rule includes a short citation pointer so the UI can surface why the
 * recommendation was triggered.
 */
export const RULES_METADATA = Object.freeze({
  module: {
    name: "Maternal ANC Risk Rule Engine",
    version: "1.0.0",
    mode: "offline",
    audience: "ANMs and Medical Officers at rural PHCs and sub-centres in India",
  },
  sources: Object.freeze({
    WHO_SEVERE_HTN: {
      label: "WHO recommendations: drug treatment for severe hypertension in pregnancy (2018)",
      authority: "WHO",
      url: "https://www.who.int/publications-detail-redirect/9789241550437",
    },
    WHO_NON_SEVERE_HTN: {
      label: "WHO recommendations on drug treatment for non-severe hypertension in pregnancy (2020)",
      authority: "WHO",
      url: "https://www.who.int/publications/i/item/9789240008793",
    },
    WHO_ANAEMIA: {
      label: "WHO guideline on haemoglobin cutoffs to define anaemia in individuals and populations (2024)",
      authority: "WHO",
      url: "https://www.who.int/publications/i/item/9789240088542",
    },
    MOHFW_RCH_MANUAL: {
      label: "MoHFW RCH ANM User Manual: ANC schedule and high BP trigger",
      authority: "MoHFW India",
      url: "https://rch.mohfw.gov.in/RCH/App_Themes/PDF/UsermanualANM.pdf",
    },
    MOHFW_PMSMA: {
      label: "Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA): high-risk pregnancy tracking",
      authority: "MoHFW India",
      url: "https://pmsma.mohfw.gov.in/about-scheme/",
    },
    MOHFW_MISOPROSTOL: {
      label: "MoHFW Maternal Health Division: referral cautions for previous C-section, malpresentation, severe PIH, severe anaemia",
      authority: "MoHFW India",
      url: "https://nhm.gov.in/images/pdf/programmes/maternal-health/guidelines/Operational_Guidelines_and_Reference_Manual_for_Misoprostol_for_PPH-Nov.19_%202013-final.pdf",
    },
    CLIP: {
      label: "CLIP Working Group severe hypertension threshold used in pregnancy care studies",
      authority: "CLIP Trial / Working Group",
      url: "https://pubmed.ncbi.nlm.nih.gov/24832366/",
    },
    FHR_GUIDANCE: {
      label: "NICE fetal monitoring guidance: baseline FHR concern below 100 or above 160 bpm",
      authority: "NICE / NCBI Bookshelf",
      url: "https://www.ncbi.nlm.nih.gov/books/NBK589158/",
    },
    UNHCR_SPHERE_MUAC: {
      label: "UNHCR/Sphere guidance on MUAC risk thresholds in pregnancy",
      authority: "UNHCR / Sphere",
      url: "https://emergency.unhcr.org/sites/default/files/2024-05/SphereFS%2BN.pdf",
    },
    HEIGHT_RISK: {
      label: "WHO-referenced short maternal stature threshold commonly operationalized at <145 cm",
      authority: "WHO-supported literature",
      url: "https://journals.sagepub.com/doi/full/10.1177/09760016241245605",
    },
  }),
  rules: Object.freeze({
    hardOverrides: Object.freeze([
      {
        id: "eclampsia",
        type: "hard_override",
        decision: DECISIONS.EMERGENCY_REFERRAL,
        emergencyType: "ECLAMPSIA",
        citationKeys: ["MOHFW_RCH_MANUAL", "MOHFW_PMSMA"],
      },
      {
        id: "severe_hypertension",
        type: "hard_override",
        condition: "sbp >= 160 OR dbp >= 110",
        decision: DECISIONS.EMERGENCY_REFERRAL,
        emergencyType: "SEVERE_HYPERTENSION",
        citationKeys: ["WHO_SEVERE_HTN", "CLIP"],
      },
      {
        id: "acute_fetal_distress",
        type: "hard_override",
        condition: "fhs < 100 OR fhs > 180",
        decision: DECISIONS.EMERGENCY_REFERRAL,
        emergencyType: "ACUTE_FETAL_DISTRESS",
        citationKeys: ["FHR_GUIDANCE"],
      },
      {
        id: "severe_anaemia",
        type: "hard_override",
        condition: "hb < 7",
        decision: DECISIONS.EMERGENCY_REFERRAL,
        emergencyType: "SEVERE_ANAEMIA",
        citationKeys: ["WHO_ANAEMIA", "MOHFW_MISOPROSTOL"],
      },
      {
        id: "breech_or_transverse_after_36",
        type: "hard_override",
        condition: "breech === true AND gestationalWeekage >= 36",
        decision: DECISIONS.EMERGENCY_REFERRAL,
        emergencyType: "MALPRESENTATION_AFTER_36_WEEKS",
        citationKeys: ["MOHFW_MISOPROSTOL"],
      },
      {
        id: "twin_pregnancy",
        type: "hard_override",
        condition: "twins === true",
        decision: DECISIONS.EMERGENCY_REFERRAL,
        emergencyType: "TWIN_PREGNANCY",
        citationKeys: ["MOHFW_PMSMA"],
      },
      {
        id: "previous_c_section",
        type: "hard_override",
        condition: "prevCsection === true",
        decision: DECISIONS.EMERGENCY_REFERRAL,
        emergencyType: "PREVIOUS_C_SECTION",
        citationKeys: ["MOHFW_MISOPROSTOL"],
      },
    ]),
    weighted: Object.freeze([
      {
        id: "stage_2_htn",
        points: 2,
        condition: "sbp 140-159 OR dbp 90-109",
        citationKeys: ["WHO_NON_SEVERE_HTN", "MOHFW_RCH_MANUAL"],
      },
      {
        id: "stage_1_htn",
        points: 1,
        condition: "sbp 130-139 OR dbp 80-89",
        citationKeys: ["WHO_NON_SEVERE_HTN"],
      },
      {
        id: "moderate_anaemia",
        points: 2,
        condition: "hb 7-10.9",
        citationKeys: ["WHO_ANAEMIA"],
      },
      {
        id: "borderline_fhs",
        points: 2,
        condition: "fhs 100-119 OR 161-180",
        citationKeys: ["FHR_GUIDANCE"],
      },
      {
        id: "muac_moderate",
        points: 1,
        condition: "muac 21-22.9",
        citationKeys: ["UNHCR_SPHERE_MUAC"],
      },
      {
        id: "muac_severe",
        points: 2,
        condition: "muac < 21",
        citationKeys: ["UNHCR_SPHERE_MUAC"],
      },
      {
        id: "gdm",
        points: 2,
        condition: "gdm === true",
        citationKeys: ["MOHFW_PMSMA"],
      },
      {
        id: "hiv",
        points: 2,
        condition: "hiv === true",
        citationKeys: ["MOHFW_PMSMA"],
      },
      {
        id: "short_maternal_height",
        points: 1,
        condition: "height < 145",
        citationKeys: ["HEIGHT_RISK", "MOHFW_PMSMA"],
      },
      {
        id: "proteinuria_with_bp_elevation",
        points: 1,
        condition: "urineProtein >= 1 AND (sbp >= 130 OR dbp >= 80)",
        citationKeys: ["WHO_NON_SEVERE_HTN", "MOHFW_RCH_MANUAL"],
      },
      {
        id: "tachycardia_or_fever",
        points: 1,
        condition: "maternalPulse > 100 OR temperature > 38",
        citationKeys: ["MOHFW_PMSMA"],
      },
      {
        id: "primigravida_age_risk",
        points: 1,
        condition: "gravida === 1 AND (age < 18 OR age > 35)",
        citationKeys: ["MOHFW_PMSMA"],
      },
      {
        id: "poor_weight_gain",
        points: 1,
        condition: "gestationalWeekage > 12 AND weightGainPerMonth < 1",
        citationKeys: ["MOHFW_PMSMA"],
      },
      {
        id: "missed_anc_visits",
        points: 1,
        condition: "missedVisits > 2",
        citationKeys: ["MOHFW_PMSMA", "MOHFW_RCH_MANUAL"],
      },
    ]),
    riskBands: Object.freeze([
      {
        id: "low",
        minScore: 0,
        maxScore: 2,
        riskBand: RISK_BANDS.LOW,
        decision: DECISIONS.NORMAL_DELIVERY,
        referralLevel: REFERRAL_LEVELS.PHC,
      },
      {
        id: "medium",
        minScore: 3,
        maxScore: 5,
        riskBand: RISK_BANDS.MEDIUM,
        decision: DECISIONS.MEDIUM_RISK_WATCH,
        referralLevel: REFERRAL_LEVELS.PHC,
      },
      {
        id: "high",
        minScore: 6,
        maxScore: null,
        riskBand: RISK_BANDS.HIGH,
        decision: DECISIONS.REFER_HIGH_RISK,
        referralLevel: REFERRAL_LEVELS.CHC,
      },
    ]),
  }),
});

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  }

  return false;
}

function normalizeInputs(patientInputs) {
  const source = patientInputs && typeof patientInputs === "object" ? patientInputs : {};

  return {
    sbp: toNumber(source.sbp),
    dbp: toNumber(source.dbp),
    fhs: toNumber(source.fhs),
    hb: toNumber(source.hb),
    muac: toNumber(source.muac),
    height: toNumber(source.height),
    weight: toNumber(source.weight),
    weightGainPerMonth: toNumber(source.weightGainPerMonth),
    prevCsection: toBoolean(source.prevCsection),
    twins: toBoolean(source.twins),
    breech: toBoolean(source.breech),
    eclampsia: toBoolean(source.eclampsia),
    gdm: toBoolean(source.gdm),
    hiv: toBoolean(source.hiv),
    urineProtein: toNumber(source.urineProtein),
    urineGlucose: toBoolean(source.urineGlucose),
    maternalPulse: toNumber(source.maternalPulse),
    temperature: toNumber(source.temperature),
    gestationalWeekage: toNumber(source.gestationalWeekage),
    gravida: toNumber(source.gravida),
    age: toNumber(source.age),
    missedVisits: toNumber(source.missedVisits),
  };
}

function extractAgeYears(profile) {
  const directAge = toNumber(profile?.demographicData?.ageYears ?? profile?.age);
  if (directAge !== null) {
    return directAge;
  }

  const dob = profile?.abha_profile?.dateOfBirth;
  if (!dob) {
    return null;
  }

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function mapUrineProtein(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value).trim().toUpperCase();
  if (normalized === "ONE_PLUS" || normalized === "1+") return 1;
  if (normalized === "TWO_PLUS" || normalized === "2+") return 2;
  if (normalized === "THREE_PLUS" || normalized === "3+") return 3;
  if (normalized === "NEGATIVE" || normalized === "NIL" || normalized === "0") return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasConditionText(profile, matcher) {
  const sources = [
    ...(Array.isArray(profile?.health_records?.chronicConditions) ? profile.health_records.chronicConditions : []),
    ...(Array.isArray(profile?.pregnancyDetails?.highRiskHistory) ? profile.pregnancyDetails.highRiskHistory : []),
  ];

  return sources.some((item) => matcher(String(item || "").toLowerCase()));
}

/**
 * Build rule-engine inputs from the patient profile shape used in the app.
 *
 * @param {Object} profile
 * @returns {ReturnType<typeof normalizeInputs>}
 */
export function buildPatientInputsFromProfile(profile) {
  const visits = Array.isArray(profile?._visits) ? [...profile._visits] : [];
  visits.sort((a, b) => new Date(b?.visitDate || 0).getTime() - new Date(a?.visitDate || 0).getTime());

  const latestVisit = visits[0] || {};
  const previousVisit = visits[1] || {};
  const latestVitals = latestVisit?.maternal?.vitals || {};
  const latestObs = latestVisit?.maternal?.observations || {};
  const latestSymptoms = latestVisit?.maternal?.symptoms || {};
  const previousVitals = previousVisit?.maternal?.vitals || {};
  const previousObs = previousVisit?.maternal?.observations || {};
  const pregnancy = profile?.pregnancyDetails || {};
  const records = profile?.health_records || {};

  let weightGainPerMonth = null;
  const latestWeight = toNumber(latestVitals?.weightKg ?? records?.weight_kg);
  const previousWeight = toNumber(previousVitals?.weightKg);
  const latestWeeks = toNumber(latestObs?.gestationalAgeWeeks ?? pregnancy?.gestationalAgeWeeks);
  const previousWeeks = toNumber(previousObs?.gestationalAgeWeeks);
  if (latestWeight !== null && previousWeight !== null && latestWeeks !== null && previousWeeks !== null && latestWeeks > previousWeeks) {
    const monthSpan = (latestWeeks - previousWeeks) / 4;
    if (monthSpan > 0) {
      weightGainPerMonth = Number(((latestWeight - previousWeight) / monthSpan).toFixed(1));
    }
  }

  return normalizeInputs({
    sbp: latestVitals?.bpSystolic,
    dbp: latestVitals?.bpDiastolic,
    fhs: latestObs?.fetalHeartRateBpm,
    hb: latestObs?.hemoglobinGdl,
    muac: latestObs?.muacCm,
    height: records?.height_cm,
    weight: latestWeight,
    weightGainPerMonth,
    prevCsection: pregnancy?.previousCSection,
    twins: pregnancy?.multiplePregnancy,
    breech: latestObs?.presentation ? String(latestObs.presentation).toLowerCase() !== "cephalic" : false,
    eclampsia: latestSymptoms?.convulsions,
    gdm: hasConditionText(profile, (text) => text.includes("gestational diabetes") || text.includes("gdm")),
    hiv: hasConditionText(profile, (text) => text.includes("hiv")),
    urineProtein: mapUrineProtein(latestObs?.urineProtein),
    urineGlucose: false,
    maternalPulse: latestVitals?.pulse,
    temperature: latestVitals?.temperatureC,
    gestationalWeekage: latestWeeks ?? pregnancy?.gestationalAgeWeeks,
    gravida: pregnancy?.gravida,
    age: extractAgeYears(profile),
    missedVisits: pregnancy?.missedAncVisits ?? 0,
  });
}

function hasAnyBPElevation(inputs) {
  return (inputs.sbp !== null && inputs.sbp >= 130) || (inputs.dbp !== null && inputs.dbp >= 80);
}

function buildEmergencyResponse(emergencyMatches) {
  return {
    decision: DECISIONS.EMERGENCY_REFERRAL,
    score: 0,
    riskBand: RISK_BANDS.EMERGENCY,
    reasons: emergencyMatches.map((item) => item.reason),
    hindiReasons: emergencyMatches.map((item) => item.hindiReason),
    emergencyType: emergencyMatches[0]?.emergencyType || null,
    nextVisitWeeks: 0,
    referralLevel: REFERRAL_LEVELS.EMERGENCY,
  };
}

function deriveBand(score) {
  if (score >= 6) {
    return RISK_BANDS.HIGH;
  }
  if (score >= 3) {
    return RISK_BANDS.MEDIUM;
  }
  return RISK_BANDS.LOW;
}

function deriveDecision(riskBand, inputs, score) {
  if (riskBand === RISK_BANDS.HIGH) {
    if ((inputs.prevCsection || (inputs.breech && inputs.gestationalWeekage !== null && inputs.gestationalWeekage >= 36)) && score >= 6) {
      return DECISIONS.REFER_CSECTION;
    }
    return DECISIONS.REFER_HIGH_RISK;
  }

  if (riskBand === RISK_BANDS.MEDIUM) {
    return DECISIONS.MEDIUM_RISK_WATCH;
  }

  return DECISIONS.NORMAL_DELIVERY;
}

function deriveReferralLevel(riskBand, score) {
  if (riskBand === RISK_BANDS.HIGH) {
    return score >= 8 ? REFERRAL_LEVELS.DISTRICT_HOSPITAL : REFERRAL_LEVELS.CHC;
  }

  return REFERRAL_LEVELS.PHC;
}

function deriveNextVisitWeeks(riskBand, gestationalWeekage) {
  if (riskBand === RISK_BANDS.EMERGENCY) {
    return 0;
  }

  if (riskBand === RISK_BANDS.HIGH) {
    return 1;
  }

  if (riskBand === RISK_BANDS.MEDIUM) {
    return gestationalWeekage !== null && gestationalWeekage >= 36 ? 1 : 2;
  }

  if (gestationalWeekage !== null && gestationalWeekage >= 36) {
    return 1;
  }

  if (gestationalWeekage !== null && gestationalWeekage >= 28) {
    return 2;
  }

  return 4;
}

function pushReason(bucket, points, reason, hindiReason) {
  bucket.score += points;
  bucket.reasons.push(reason);
  bucket.hindiReasons.push(hindiReason);
}

/**
 * Assess maternal ANC risk using hard override rules and weighted scoring.
 *
 * @param {Object} patientInputs Flat input object with vitals, history, and ANC fields.
 * @param {number|string|null|undefined} patientInputs.sbp
 * @param {number|string|null|undefined} patientInputs.dbp
 * @param {number|string|null|undefined} patientInputs.fhs
 * @param {number|string|null|undefined} patientInputs.hb
 * @param {number|string|null|undefined} patientInputs.muac
 * @param {number|string|null|undefined} patientInputs.height
 * @param {number|string|null|undefined} patientInputs.weight
 * @param {number|string|null|undefined} patientInputs.weightGainPerMonth
 * @param {boolean|number|string|null|undefined} patientInputs.prevCsection
 * @param {boolean|number|string|null|undefined} patientInputs.twins
 * @param {boolean|number|string|null|undefined} patientInputs.breech
 * @param {boolean|number|string|null|undefined} patientInputs.eclampsia
 * @param {boolean|number|string|null|undefined} patientInputs.gdm
 * @param {boolean|number|string|null|undefined} patientInputs.hiv
 * @param {number|string|null|undefined} patientInputs.urineProtein
 * @param {boolean|number|string|null|undefined} patientInputs.urineGlucose
 * @param {number|string|null|undefined} patientInputs.maternalPulse
 * @param {number|string|null|undefined} patientInputs.temperature
 * @param {number|string|null|undefined} patientInputs.gestationalWeekage
 * @param {number|string|null|undefined} patientInputs.gravida
 * @param {number|string|null|undefined} patientInputs.age
 * @param {number|string|null|undefined} patientInputs.missedVisits
 * @returns {{
 *   decision: "NORMAL_DELIVERY" | "MEDIUM_RISK_WATCH" | "REFER_CSECTION" | "REFER_HIGH_RISK" | "EMERGENCY_REFERRAL",
 *   score: number,
 *   riskBand: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
 *   reasons: string[],
 *   hindiReasons: string[],
 *   emergencyType: string | null,
 *   nextVisitWeeks: number,
 *   referralLevel: "PHC" | "CHC" | "DISTRICT_HOSPITAL" | "EMERGENCY"
 * }}
 */
export function assess(patientInputs) {
  const inputs = normalizeInputs(patientInputs);
  const emergencyMatches = [];

  if (inputs.eclampsia) {
    emergencyMatches.push({
      emergencyType: "ECLAMPSIA",
      reason: "Eclampsia flag is positive. This is a seizure emergency and needs immediate referral.",
      hindiReason: "एक्लेम्प्सिया का संकेत सकारात्मक है। यह दौरे की आपातस्थिति है और तुरंत रेफरल जरूरी है।",
    });
  }

  if ((inputs.sbp !== null && inputs.sbp >= 160) || (inputs.dbp !== null && inputs.dbp >= 110)) {
    emergencyMatches.push({
      emergencyType: "SEVERE_HYPERTENSION",
      reason: `Blood pressure is in the severe range (${inputs.sbp ?? "?"}/${inputs.dbp ?? "?"} mmHg). Immediate referral is required.`,
      hindiReason: `रक्तचाप गंभीर स्तर पर है (${inputs.sbp ?? "?"}/${inputs.dbp ?? "?"} mmHg)। तुरंत रेफरल आवश्यक है।`,
    });
  }

  if ((inputs.fhs !== null && inputs.fhs < 100) || (inputs.fhs !== null && inputs.fhs > 180)) {
    emergencyMatches.push({
      emergencyType: "ACUTE_FETAL_DISTRESS",
      reason: `Foetal heart rate is critically abnormal at ${inputs.fhs} bpm, suggesting acute foetal distress.`,
      hindiReason: `भ्रूण की हृदयगति ${inputs.fhs} bpm है, जो तीव्र भ्रूण संकट का संकेत देती है।`,
    });
  }

  if (inputs.hb !== null && inputs.hb < 7) {
    emergencyMatches.push({
      emergencyType: "SEVERE_ANAEMIA",
      reason: `Haemoglobin is ${inputs.hb} g/dL, which indicates severe anaemia requiring hospital care.`,
      hindiReason: `हीमोग्लोबिन ${inputs.hb} g/dL है, जो गंभीर एनीमिया दर्शाता है और अस्पताल देखभाल आवश्यक है।`,
    });
  }

  if (inputs.breech && inputs.gestationalWeekage !== null && inputs.gestationalWeekage >= 36) {
    emergencyMatches.push({
      emergencyType: "MALPRESENTATION_AFTER_36_WEEKS",
      reason: `Breech/transverse lie is present after 36 weeks (${inputs.gestationalWeekage} weeks). Planned C-section referral is needed.`,
      hindiReason: `${inputs.gestationalWeekage} सप्ताह के बाद ब्रीच/ट्रांसवर्स प्रस्तुति है। नियोजित सिजेरियन रेफरल आवश्यक है।`,
    });
  }

  if (inputs.twins) {
    emergencyMatches.push({
      emergencyType: "TWIN_PREGNANCY",
      reason: "Twin pregnancy is beyond routine PHC delivery scope and needs referral planning.",
      hindiReason: "जुड़वां गर्भावस्था नियमित PHC प्रसव की सीमा से बाहर है और रेफरल योजना आवश्यक है।",
    });
  }

  if (inputs.prevCsection) {
    emergencyMatches.push({
      emergencyType: "PREVIOUS_C_SECTION",
      reason: "Previous C-section history requires repeat surgical delivery planning and referral.",
      hindiReason: "पिछले सिजेरियन का इतिहास है, इसलिए दोबारा शल्य प्रसव की योजना और रेफरल आवश्यक है।",
    });
  }

  if (emergencyMatches.length > 0) {
    return buildEmergencyResponse(emergencyMatches);
  }

  const state = {
    score: 0,
    reasons: [],
    hindiReasons: [],
  };

  if ((inputs.sbp !== null && inputs.sbp >= 140 && inputs.sbp <= 159) || (inputs.dbp !== null && inputs.dbp >= 90 && inputs.dbp <= 109)) {
    pushReason(
      state,
      2,
      `Blood pressure is in stage 2 hypertension range (${inputs.sbp ?? "?"}/${inputs.dbp ?? "?"} mmHg).`,
      `रक्तचाप स्टेज 2 हाइपरटेंशन की सीमा में है (${inputs.sbp ?? "?"}/${inputs.dbp ?? "?"} mmHg)।`
    );
  } else if ((inputs.sbp !== null && inputs.sbp >= 130 && inputs.sbp <= 139) || (inputs.dbp !== null && inputs.dbp >= 80 && inputs.dbp <= 89)) {
    pushReason(
      state,
      1,
      `Blood pressure is in stage 1 hypertension range (${inputs.sbp ?? "?"}/${inputs.dbp ?? "?"} mmHg).`,
      `रक्तचाप स्टेज 1 हाइपरटेंशन की सीमा में है (${inputs.sbp ?? "?"}/${inputs.dbp ?? "?"} mmHg)।`
    );
  }

  if (inputs.hb !== null && inputs.hb >= 7 && inputs.hb <= 10.9) {
    pushReason(
      state,
      2,
      `Haemoglobin is ${inputs.hb} g/dL, which indicates moderate anaemia.`,
      `हीमोग्लोबिन ${inputs.hb} g/dL है, जो मध्यम एनीमिया दर्शाता है।`
    );
  }

  if ((inputs.fhs !== null && inputs.fhs >= 100 && inputs.fhs <= 119) || (inputs.fhs !== null && inputs.fhs >= 161 && inputs.fhs <= 180)) {
    pushReason(
      state,
      2,
      `Foetal heart rate is borderline abnormal at ${inputs.fhs} bpm and needs closer observation.`,
      `भ्रूण की हृदयगति ${inputs.fhs} bpm है, जो सीमा रेखा पर असामान्य है और नजदीकी निगरानी चाहिए।`
    );
  }

  if (inputs.muac !== null && inputs.muac < 21) {
    pushReason(
      state,
      2,
      `MUAC is ${inputs.muac} cm, suggesting severe maternal undernutrition.`,
      `MUAC ${inputs.muac} सेमी है, जो गंभीर मातृ कुपोषण का संकेत देता है।`
    );
  } else if (inputs.muac !== null && inputs.muac >= 21 && inputs.muac <= 22.9) {
    pushReason(
      state,
      1,
      `MUAC is ${inputs.muac} cm, suggesting moderate maternal undernutrition.`,
      `MUAC ${inputs.muac} सेमी है, जो मध्यम मातृ कुपोषण का संकेत देता है।`
    );
  }

  if (inputs.gdm) {
    pushReason(
      state,
      2,
      "Gestational diabetes is present and raises pregnancy risk.",
      "गर्भावधि मधुमेह मौजूद है और गर्भावस्था का जोखिम बढ़ाता है।"
    );
  }

  if (inputs.hiv) {
    pushReason(
      state,
      2,
      "HIV positive status requires higher-risk follow-up and referral linkage.",
      "HIV पॉजिटिव स्थिति में उच्च जोखिम फॉलो-अप और रेफरल समन्वय की आवश्यकता है।"
    );
  }

  if (inputs.height !== null && inputs.height < 145) {
    pushReason(
      state,
      1,
      `Maternal height is ${inputs.height} cm, which may increase cephalopelvic disproportion risk.`,
      `माँ की लंबाई ${inputs.height} सेमी है, जिससे प्रसव में अनुपात असंगति का जोखिम बढ़ सकता है।`
    );
  }

  if (inputs.urineProtein !== null && inputs.urineProtein >= 1 && hasAnyBPElevation(inputs)) {
    pushReason(
      state,
      1,
      "Urine protein is present with elevated blood pressure, increasing pre-eclampsia concern.",
      "बढ़े हुए रक्तचाप के साथ मूत्र में प्रोटीन है, जिससे प्री-एक्लेम्प्सिया की चिंता बढ़ती है।"
    );
  }

  if ((inputs.maternalPulse !== null && inputs.maternalPulse > 100) || (inputs.temperature !== null && inputs.temperature > 38)) {
    const parts = [];
    const hindiParts = [];

    if (inputs.maternalPulse !== null && inputs.maternalPulse > 100) {
      parts.push(`maternal pulse is ${inputs.maternalPulse}/min`);
      hindiParts.push(`मातृ नाड़ी ${inputs.maternalPulse}/मिनट है`);
    }

    if (inputs.temperature !== null && inputs.temperature > 38) {
      parts.push(`temperature is ${inputs.temperature}°C`);
      hindiParts.push(`तापमान ${inputs.temperature}°C है`);
    }

    pushReason(
      state,
      1,
      `${parts.join(" and ")}, which suggests illness or physiological stress.`,
      `${hindiParts.join(" और ")}, जो बीमारी या शारीरिक तनाव का संकेत देता है।`
    );
  }

  if (inputs.gravida !== null && inputs.gravida === 1 && inputs.age !== null && (inputs.age < 18 || inputs.age > 35)) {
    pushReason(
      state,
      1,
      `Primigravida age is ${inputs.age} years, which is an age-related obstetric risk.`,
      `प्राइमिग्रैविडा की आयु ${inputs.age} वर्ष है, जो आयु-संबंधित प्रसूति जोखिम है।`
    );
  }

  if (inputs.gestationalWeekage !== null && inputs.gestationalWeekage > 12 && inputs.weightGainPerMonth !== null && inputs.weightGainPerMonth < 1) {
    pushReason(
      state,
      1,
      `Weight gain is only ${inputs.weightGainPerMonth} kg/month after the first trimester.`,
      `पहली तिमाही के बाद वजन बढ़ना केवल ${inputs.weightGainPerMonth} किग्रा/माह है।`
    );
  }

  if (inputs.missedVisits !== null && inputs.missedVisits > 2) {
    pushReason(
      state,
      1,
      `${inputs.missedVisits} ANC visits have been missed, so follow-up intensity should increase.`,
      `${inputs.missedVisits} ANC विज़िट छूट चुकी हैं, इसलिए फॉलो-अप बढ़ाना चाहिए।`
    );
  }

  const riskBand = deriveBand(state.score);
  const decision = deriveDecision(riskBand, inputs, state.score);

  if (state.reasons.length === 0) {
    state.reasons.push("No high-risk rule was triggered from the available inputs.");
    state.hindiReasons.push("उपलब्ध जानकारी के आधार पर कोई उच्च-जोखिम नियम सक्रिय नहीं हुआ।");
  }

  return {
    decision,
    score: state.score,
    riskBand,
    reasons: state.reasons,
    hindiReasons: state.hindiReasons,
    emergencyType: null,
    nextVisitWeeks: deriveNextVisitWeeks(riskBand, inputs.gestationalWeekage),
    referralLevel: deriveReferralLevel(riskBand, state.score),
  };
}

export default assess;
