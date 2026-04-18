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
  if (!text) {
    return null;
  }

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
    if (!block) {
      return;
    }

    const lines = block.split(/\r?\n/);
    let eventName = "message";
    const dataLines = [];

    lines.forEach((line) => {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim() || "message";
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    });

    if (!dataLines.length) {
      return;
    }

    const dataText = dataLines.join("\n").trim();
    if (!dataText) {
      return;
    }

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
      if (!chunk) {
        return;
      }
      buffer += chunk;

      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      blocks.forEach(emitBlock);
    },
    flush() {
      if (buffer.trim()) {
        emitBlock(buffer);
      }
      buffer = "";
    },
  };
}

export async function sendChatMessage({ token, prompt, conversationId }) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL1}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt,
      conversationId,
    }),
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw buildErrorFromPayload(payload, "Chat request failed");
  }

  return payload;
}

export function streamChatMessage({
  token,
  prompt,
  conversationId,
  options,
  onEvent,
  onComplete,
  onError,
}) {
  const xhr = new XMLHttpRequest();
  const parser = createSseParser(onEvent);
  let processedLength = 0;
  let settled = false;

  const requestBody = {
    prompt,
    options: {
      includeImageSearch: true,
      includeYouTube: true,
      ...(options || {}),
    },
  };

  if (conversationId) {
    requestBody.conversationId = conversationId;
  }

  function fail(error) {
    if (settled) {
      return;
    }
    settled = true;
    onError?.(error);
  }

  function complete() {
    if (settled) {
      return;
    }
    settled = true;
    onComplete?.();
  }

  xhr.open("POST", `${API_BASE_URL1}/api/chat/stream`, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Accept", "text/event-stream");
  if (token) {
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  }

  xhr.onprogress = () => {
    if (xhr.readyState < XMLHttpRequest.LOADING) {
      return;
    }
    const nextText = xhr.responseText.slice(processedLength);
    processedLength = xhr.responseText.length;
    parser.push(nextText);
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== XMLHttpRequest.DONE) {
      return;
    }

    const nextText = xhr.responseText.slice(processedLength);
    processedLength = xhr.responseText.length;
    parser.push(nextText);
    parser.flush();

    if (xhr.status >= 200 && xhr.status < 300) {
      complete();
      return;
    }

    let payload = null;
    try {
      payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch {
      payload = xhr.responseText;
    }
    fail(buildErrorFromPayload(payload, "Chat stream request failed"));
  };

  xhr.onerror = () => {
    fail(new Error("Network error while streaming chat response"));
  };

  xhr.send(JSON.stringify(requestBody));

  return () => {
    if (settled) {
      return;
    }
    settled = true;
    xhr.abort();
  };
}

export const patientRegister = (payload) =>
  request("/patient/register", "POST", payload);
export const patientLogin = (payload) =>
  request("/patient/login", "POST", payload);
export const sendPatientOtp = (payload) =>
  request("/patient/otp/send", "POST", payload);
export const verifyPatientOtp = (payload) =>
  request("/patient/otp/verify", "POST", payload);
export async function uploadAbhaCard({ uri, name, type }) {
  const formData = new FormData();
  formData.append("abhaCard", {
    uri,
    name: name || `abha-card-${Date.now()}.jpg`,
    type: type || "image/jpeg",
  });

  const response = await fetch(`${API_BASE_URL}/api/patient/abha/ocr`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw buildErrorFromPayload(payload, "ABHA OCR failed");
  }
  return payload;
}
export const patientUpdate = (token, payload) =>
  request("/patient/update", "PUT", payload, token);
export const patientMe = (token) => request("/patient/me", "GET", null, token);
export const patientAssignAshaWorker = (token, ashaId) =>
  request("/patient/asha/assign", "POST", ashaId ? { ashaId } : null, token);
export const patientAshaList = (token) =>
  request("/patient/asha/list", "GET", null, token);

export const doctorRegister = (payload) =>
  request("/doctor/register", "POST", payload);
export const doctorLogin = (payload) =>
  request("/doctor/login", "POST", payload);
export const sendDoctorOtp = (payload) =>
  request("/doctor/otp/send", "POST", payload);
export const verifyDoctorOtp = (payload) =>
  request("/doctor/otp/verify", "POST", payload);
export const doctorUpdate = (token, payload) =>
  request("/doctor/update", "PUT", payload, token);
export const doctorMe = (token) => request("/doctor/me", "GET", null, token);
export const doctorNearby = (latitude, longitude, radiusKm = 10) =>
  request(
    `/doctor/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`
  );
export const doctorAppointments = (token) =>
  request("/doctor/appointments", "GET", null, token);
export const doctorPastPatients = (token) =>
  request("/doctor/past-patients", "GET", null, token);
export const doctorUpdateAppointmentStatus = (token, id, status) =>
  request(`/doctor/appointments/${id}/status`, "PATCH", { status }, token);
export const doctorStartCall = (token, id, callType) =>
  request(
    `/doctor/appointments/${id}/start-call`,
    "POST",
    callType ? { callType } : null,
    token
  );
export const doctorAddSummary = (token, id, payload) =>
  request(`/doctor/appointments/${id}/summary`, "POST", payload, token);
export const doctorNotifications = (token) =>
  request("/doctor/notifications", "GET", null, token);
export const doctorReadNotification = (token, id) =>
  request(`/doctor/notifications/${id}/read`, "PATCH", null, token);

export const ashaRegister = (payload) =>
  request("/asha/register", "POST", payload);
export const ashaLogin = (payload) =>
  request("/asha/login", "POST", payload);
export const ashaUpdate = (token, payload) =>
  request("/asha/update", "PUT", payload, token);
export const ashaMe = (token) => request("/asha/me", "GET", null, token);
export const ashaPatients = (token) =>
  request("/asha/patients", "GET", null, token);

export const createAppointment = (token, payload) =>
  request("/appointments", "POST", payload, token);
export const getMyAppointments = (token) =>
  request("/appointments/my", "GET", null, token);
export const cancelAppointment = (token, id) =>
  request(`/appointments/${id}/cancel`, "PATCH", null, token);
export const structureAppointment = (token, payload) =>
  request("/appointments/ai/structure", "POST", payload, token);
export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/`, {
    method: "GET",
    headers: { Accept: "application/json,text/plain" },
  });
  const payload = await parseResponse(response);
  return {
    ok: response.ok,
    payload,
  };
}
