import usersData from "../data/users.json";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://hawkathon-2026-five.vercel.app/").replace(
  /\/+$/,
  ""
);
const API_BASE_URL1 = (process.env.EXPO_PUBLIC_API_BASE_URL_1 || "https://hawkathon-2026.vercel.app/").replace(
  /\/+$/,
  ""
);

async function request(endpoint, method = "GET", body, token) {
  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export const apiHealth = () => request("/health");

function buildErrorFromPayload(payload, fallbackMessage) {
  if (payload && typeof payload === "object") {
    const message = payload.error || payload.message;
    if (typeof message === "string" && message.trim()) {
      return new Error(message);
    }
  }
  if (typeof payload === "string" && payload.trim()) {
    return new Error(payload);
  }
  return new Error(fallbackMessage);
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function createSseParser(onEvent) {
  let buffer = "";
  function emitBlock(rawBlock) {
    const block = rawBlock.trim();
    if (!block) return;
    const lines = block.split(/\r?\n/);
    let eventName = "message";
    const dataLines = [];
    lines.forEach((line) => {
      if (line.startsWith("event:")) eventName = line.slice(6).trim() || "message";
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    });
    if (!dataLines.length) return;
    const dataText = dataLines.join("\n").trim();
    if (!dataText) return;
    if (dataText === "[DONE]") {
      onEvent?.({ event: "done", data: null });
      return;
    }
    let payload;
    try {
      payload = JSON.parse(dataText);
    } catch {
      payload = { raw: dataText };
    }
    onEvent?.({ event: eventName, data: payload });
  }
  return {
    push(chunk = "") {
      if (!chunk) return;
      buffer += chunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      blocks.forEach(emitBlock);
    },
    flush() {
      if (buffer.trim()) emitBlock(buffer);
      buffer = "";
    },
  };
}

export async function sendChatMessage({ token, prompt, conversationId }) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL1}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, conversationId }),
  });
  const payload = await parseResponse(response);
  if (!response.ok) throw buildErrorFromPayload(payload, "Chat request failed");
  return payload;
}

export function streamChatMessage({ token, prompt, conversationId, options, onEvent, onComplete, onError }) {
  const xhr = new XMLHttpRequest();
  const parser = createSseParser(onEvent);
  let processedLength = 0;
  let settled = false;
  const requestBody = { prompt, options: { includeImageSearch: true, includeYouTube: true, ...(options || {}) } };
  if (conversationId) requestBody.conversationId = conversationId;
  function fail(error) { if (settled) return; settled = true; onError?.(error); }
  function complete() { if (settled) return; settled = true; onComplete?.(); }
  xhr.open("POST", `${API_BASE_URL1}/api/chat/stream`, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Accept", "text/event-stream");
  if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  xhr.onprogress = () => { if (xhr.readyState < XMLHttpRequest.LOADING) return; const nextText = xhr.responseText.slice(processedLength); processedLength = xhr.responseText.length; parser.push(nextText); };
  xhr.onreadystatechange = () => { if (xhr.readyState !== XMLHttpRequest.DONE) return; const nextText = xhr.responseText.slice(processedLength); processedLength = xhr.responseText.length; parser.push(nextText); parser.flush(); if (xhr.status >= 200 && xhr.status < 300) { complete(); return; } let payload = null; try { payload = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { payload = xhr.responseText; } fail(buildErrorFromPayload(payload, "Chat stream request failed")); };
  xhr.onerror = () => { fail(new Error("Network error while streaming chat response")); };
  xhr.send(JSON.stringify(requestBody));
  return () => { if (settled) return; settled = true; xhr.abort(); };
}

// PATIENT MOCKS
export const patientRegister = async (payload) => {
  const user = usersData.patientDetails.find(p => p.abha_profile.healthIdNumber === payload.abhaId) || usersData.patientDetails[0];
  return { token: user.abha_profile.healthIdNumber, ...user };
};
export const patientLogin = async (payload) => {
  const abhaId = payload.abhaId || payload.healthIdNumber;
  const loginEntry = usersData.loginDetails.find(l => l.abhaId === abhaId);
  if (!loginEntry || !loginEntry.isAllowed) throw new Error("ABHA ID not found or not allowed in dummy dataset.");
  const patient = usersData.patientDetails.find(p => p.abha_profile.healthIdNumber === abhaId);
  return { token: abhaId, ...patient };
};
export const sendPatientOtp = (payload) => Promise.resolve({ success: true });
export const verifyPatientOtp = (payload) => Promise.resolve({ success: true });
export async function uploadAbhaCard({ uri, name, type }) {
  const formData = new FormData();
  formData.append("abhaCard", { uri, name: name || `abha-card-${Date.now()}.jpg`, type: type || "image/jpeg" });
  const response = await fetch(`${API_BASE_URL}/api/patient/abha/ocr`, { method: "POST", headers: { Accept: "application/json" }, body: formData });
  const payload = await parseResponse(response);
  if (!response.ok) throw buildErrorFromPayload(payload, "ABHA OCR failed");
  return payload;
}
export const patientUpdate = (token, payload) => Promise.resolve({ success: true, ...payload });

function getPatientByToken(token) {
  return usersData.patientDetails.find((p) => p.abha_profile.healthIdNumber === token);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  }
  return false;
}

function toUrineProteinLabel(value) {
  const numeric = toNumber(value);
  if (numeric === null || numeric <= 0) return "NEGATIVE";
  if (numeric === 1) return "ONE_PLUS";
  if (numeric === 2) return "TWO_PLUS";
  return "THREE_PLUS";
}

function buildAssessmentSummary(record) {
  const factors = [];
  if (record.sbp || record.dbp) factors.push(`BP ${record.sbp || "?"}/${record.dbp || "?"} mmHg`);
  if (record.hb !== null && record.hb !== undefined && record.hb !== "") factors.push(`Hb ${record.hb} g/dL`);
  if (record.fhs) factors.push(`FHS ${record.fhs} bpm`);
  if (record.muac) factors.push(`MUAC ${record.muac} cm`);
  return factors.join(" | ");
}

function createVisitId() {
  return `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildVisitFromRecord(record) {
  const visitDate = record.date
    ? new Date(`${record.date}T09:00:00.000Z`).toISOString()
    : new Date().toISOString();

  const sbp = toNumber(record.sbp);
  const dbp = toNumber(record.dbp);
  const pulse = toNumber(record.maternalPulse);
  const temperatureC = toNumber(record.temperature);
  const weightKg = toNumber(record.weight);
  const gestationalAgeWeeks = toNumber(record.gestationalWeekage);
  const muacCm = toNumber(record.muac);
  const fetalHeartRateBpm = toNumber(record.fhs);
  const hemoglobinGdl = toNumber(record.hb);
  const urineProtein = toUrineProteinLabel(record.urineProtein);

  return {
    visitId: record.visitId || createVisitId(),
    visitType: "MATERNAL",
    visitDate,
    capturedByRole: "anm",
    source: "OFFLINE_ENTRY",
    syncStatus: "PENDING",
    maternal: {
      vitals: {
        bpSystolic: sbp,
        bpDiastolic: dbp,
        pulse,
        temperatureC,
        respiratoryRate: null,
        spo2: null,
        weightKg,
      },
      symptoms: {
        swelling: false,
        fever: temperatureC !== null ? temperatureC > 38 : false,
        bleeding: false,
        headache: false,
        blurredVision: false,
        severeAbdominalPain: false,
        convulsions: toBoolean(record.eclampsia),
        reducedFetalMovement: false,
        leakingFluid: false,
        pallor: hemoglobinGdl !== null ? hemoglobinGdl < 11 : false,
        breathlessness: false,
      },
      observations: {
        gestationalAgeWeeks,
        muacCm,
        fetalMovement: "NORMAL",
        fetalHeartRateBpm,
        urineProtein,
        bloodSugarMgDl: null,
        hemoglobinGdl,
        presentation: toBoolean(record.breech) ? "BREECH" : "CEPHALIC",
      },
    },
    assessment: {
      riskLevel: record.status || "PENDING",
      score: toNumber(record.score) || 0,
      engineVersion: "cdss-mnh-rules-v2",
      language: "en",
      identifiedConditions: Array.isArray(record.reasons) ? record.reasons : [],
      reasons: Array.isArray(record.reasons) ? record.reasons : [],
      clinicalExplanation: Array.isArray(record.hindiReasons) ? record.hindiReasons : [],
      recommendedAction: record.impression || buildAssessmentSummary(record),
      referral: {
        urgency: record.referralLevel === "EMERGENCY" ? "IMMEDIATE" : "ROUTINE",
        message: record.decision || "Follow ANC plan",
        followUpWindowHours: record.referralLevel === "EMERGENCY" ? 0 : 168,
      },
      alerts: record.emergencyType ? [record.emergencyType] : [],
      factors: [],
    },
    ancInputs: {
      sbp,
      dbp,
      fhs: fetalHeartRateBpm,
      hb: hemoglobinGdl,
      muac: muacCm,
      height: toNumber(record.height),
      weight: weightKg,
      weightGainPerMonth: toNumber(record.weightGainPerMonth),
      prevCsection: toBoolean(record.prevCsection),
      twins: toBoolean(record.twins),
      breech: toBoolean(record.breech),
      eclampsia: toBoolean(record.eclampsia),
      gdm: toBoolean(record.gdm),
      hiv: toBoolean(record.hiv),
      urineProtein: toNumber(record.urineProtein),
      urineGlucose: toBoolean(record.urineGlucose),
      maternalPulse: pulse,
      temperature: temperatureC,
      gestationalWeekage: gestationalAgeWeeks,
      gravida: toNumber(record.gravida),
      age: toNumber(record.age),
      missedVisits: toNumber(record.missedVisits),
    },
  };
}

function buildReportFromVisit(v) {
  const anc = v?.ancInputs || {};
  return {
    reportId: v.visitId || v.visitDate,
    testName: "Maternal ANC Assessment",
    date: new Date(v.visitDate).toLocaleDateString(),
    rawDate: v.visitDate,
    status: v.assessment ? v.assessment.riskLevel : "NORMAL",
    impression: v.assessment ? v.assessment.recommendedAction : "Routine checkup",
    ancInputs: anc,
    reasons: v.assessment?.reasons || [],
    hindiReasons: v.assessment?.clinicalExplanation || [],
    decision: v.assessment?.referral?.message || null,
  };
}

export const patientCreateRecord = async (token, record) => {
  const patient = getPatientByToken(token);
  if (!patient) throw new Error("Patient not found");

  const visit = buildVisitFromRecord(record);
  patient._visits = Array.isArray(patient._visits) ? patient._visits : [];
  patient._visits.unshift(visit);

  return { success: true, record: buildReportFromVisit(visit), visit };
};

export const patientUpdateRecord = async (token, reportId, updates) => {
  const patient = getPatientByToken(token);
  if (!patient) throw new Error("Patient not found");

  const index = (patient._visits || []).findIndex((visit) => (visit.visitId || visit.visitDate) === reportId);
  if (index === -1) throw new Error("Record not found");

  const existingVisit = patient._visits[index];
  const nextVisit = buildVisitFromRecord({
    ...updates,
    visitId: existingVisit.visitId || reportId,
  });
  nextVisit.visitDate = existingVisit.visitDate;
  patient._visits[index] = nextVisit;

  return { success: true, reportId, record: buildReportFromVisit(nextVisit), visit: nextVisit };
};
export const patientMe = async (token) => {
  const patient = usersData.patientDetails.find(p => p.abha_profile.healthIdNumber === token);
  if (!patient) throw new Error("Patient not found");
  return {
    ...patient,
    appointmentHistory: (patient._visits || []).map(v => ({
      _id: v.visitId || v.visitDate,
      doctorName: v.capturedByRole === 'anm' ? 'ANM Checkup' : 'Clinical Visit',
      preferredDate: new Date(v.visitDate).toLocaleDateString(),
      preferredTime: new Date(v.visitDate).toLocaleTimeString(),
      status: v.assessment ? v.assessment.riskLevel + " RISK" : "COMPLETED",
      summary: v.assessment ? v.assessment.recommendedAction : (v._note || "")
    })),
    reports: (patient._visits || []).map(buildReportFromVisit)
  };
};
export const patientAssignAshaWorker = (token, ashaId) => {
  const patient = usersData.patientDetails.find(p => p.abha_profile.healthIdNumber === token);
  return Promise.resolve({ success: true, ashaWorker: patient?.anmWorker || { name: "Aruna Patil" } });
};
export const patientAshaList = (token) => Promise.resolve({ results: [
  { _id: "asha1", name: "Aruna Patil", username: "aruna.patil", locationCoordinates: { latitude: 18.5, longitude: 73.8 } }
]});

// DOCTOR MOCKS
export const doctorRegister = (payload) => request("/doctor/register", "POST", payload);
export const doctorLogin = (payload) => request("/doctor/login", "POST", payload);
export const sendDoctorOtp = (payload) => request("/doctor/otp/send", "POST", payload);
export const verifyDoctorOtp = (payload) => request("/doctor/otp/verify", "POST", payload);
export const doctorUpdate = (token, payload) => request("/doctor/update", "PUT", payload, token);
export const doctorMe = (token) => request("/doctor/me", "GET", null, token);
export const doctorNearby = (latitude, longitude, radiusKm = 10) => request(`/doctor/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`);
export const doctorAppointments = async (token) => ({
  results: usersData.patientDetails.map(p => ({
    _id: p.abha_profile.healthIdNumber,
    patientName: p.abha_profile.name,
    patientAbhaId: p.abha_profile.healthIdNumber,
    preferredDate: "2024-04-20",
    preferredTime: "10:30 AM",
    status: "CONFIRMED",
    hospitalName: "Maharashtra State Hospital"
  }))
});
export const doctorPastPatients = async (token) => ({
  results: usersData.patientDetails
});
export const doctorUpdateAppointmentStatus = (token, id, status) => request(`/doctor/appointments/${id}/status`, "PATCH", { status }, token);
export const doctorStartCall = (token, id, callType) => request(`/doctor/appointments/${id}/start-call`, "POST", callType ? { callType } : null, token);
export const doctorAddSummary = (token, id, payload) => request(`/doctor/appointments/${id}/summary`, "POST", payload, token);
export const doctorNotifications = (token) => request("/doctor/notifications", "GET", null, token);
export const doctorReadNotification = (token, id) => request(`/doctor/notifications/${id}/read`, "PATCH", null, token);

// ASHA MOCKS
export const ashaRegister = (payload) => request("/asha/register", "POST", payload);
export const ashaLogin = (payload) => request("/asha/login", "POST", payload);
export const ashaUpdate = (token, payload) => request("/asha/update", "PUT", payload, token);
export const ashaMe = (token) => request("/asha/me", "GET", null, token);
export const ashaPatients = async (token) => ({
  results: usersData.patientDetails
});

export const createAppointment = (token, payload) => request("/appointments", "POST", payload, token);
export const getMyAppointments = (token) => request("/appointments/my", "GET", null, token);
export const cancelAppointment = (token, id) => request(`/appointments/${id}/cancel`, "PATCH", null, token);
export const structureAppointment = (token, payload) => request("/appointments/ai/structure", "POST", payload, token);
export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/`, { method: "GET", headers: { Accept: "application/json,text/plain" } });
  const payload = await parseResponse(response);
  return { ok: response.ok, payload };
}
