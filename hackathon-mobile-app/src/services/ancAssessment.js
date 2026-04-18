export const ANC_NUMERIC_FIELDS = [
  { key: "sbp", label: "Systolic BP", placeholder: "140", suffix: "mmHg" },
  { key: "dbp", label: "Diastolic BP", placeholder: "90", suffix: "mmHg" },
  { key: "fhs", label: "Foetal Heart Rate", placeholder: "148", suffix: "bpm" },
  { key: "hb", label: "Haemoglobin", placeholder: "9.5", suffix: "g/dL" },
  { key: "muac", label: "MUAC", placeholder: "22.5", suffix: "cm" },
  { key: "height", label: "Height", placeholder: "152", suffix: "cm" },
  { key: "weight", label: "Weight", placeholder: "54", suffix: "kg" },
  { key: "weightGainPerMonth", label: "Weight Gain / Month", placeholder: "0.8", suffix: "kg" },
  { key: "maternalPulse", label: "Maternal Pulse", placeholder: "96", suffix: "/min" },
  { key: "temperature", label: "Temperature", placeholder: "37.1", suffix: "C" },
  { key: "gestationalWeekage", label: "Gestational Age", placeholder: "30", suffix: "weeks" },
  { key: "gravida", label: "Gravida", placeholder: "3", suffix: null },
  { key: "age", label: "Maternal Age", placeholder: "27", suffix: "years" },
  { key: "missedVisits", label: "Missed ANC Visits", placeholder: "0", suffix: null },
];

export const ANC_BOOLEAN_FIELDS = [
  { key: "prevCsection", label: "Previous C-section" },
  { key: "twins", label: "Twin pregnancy" },
  { key: "breech", label: "Breech / transverse lie" },
  { key: "eclampsia", label: "Eclampsia / convulsions" },
  { key: "gdm", label: "Gestational diabetes" },
  { key: "hiv", label: "HIV positive" },
];

export const URINE_PROTEIN_OPTIONS = [0, 1, 2];

export function toInputValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

export function sanitizeNumericInput(value) {
  return String(value || "").replace(/[^0-9.]/g, "");
}

export function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeAncInputs(source = {}) {
  const normalized = {};
  ANC_NUMERIC_FIELDS.forEach((field) => {
    normalized[field.key] = toNumberOrNull(source[field.key]);
  });
  ANC_BOOLEAN_FIELDS.forEach((field) => {
    normalized[field.key] = Boolean(source[field.key]);
  });
  normalized.urineProtein = toNumberOrNull(source.urineProtein);
  normalized.urineGlucose = Boolean(source.urineGlucose);
  return normalized;
}

export function riskTone(riskBand) {
  if (riskBand === "EMERGENCY" || riskBand === "HIGH") return "high";
  if (riskBand === "MEDIUM") return "medium";
  return "low";
}

export function statusLabel(result) {
  if (!result) return "Not assessed";
  if (result.riskBand === "EMERGENCY") return "Emergency referral";
  if (result.riskBand === "HIGH") return "High risk";
  if (result.riskBand === "MEDIUM") return "Medium risk watch";
  return "Low risk";
}
