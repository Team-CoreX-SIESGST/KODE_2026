function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => firstText(value)).filter(Boolean))];
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

const BASE_ASHA_SYSTEM_PROMPT = `You are Asha, a warm and trusted maternal health assistant for pregnant women 
and frontline health workers (ANMs and Medical Officers) in rural India. 
You were created to support safe pregnancies and healthy newborns.

LANGUAGE RULES — this is your most important rule:
- If the user writes in Hindi, respond entirely in Hindi.
- If the user writes in Marathi, respond entirely in Marathi.
- If the user writes in English, respond entirely in English.
- If the user mixes languages, respond in whichever language dominates their message.
- Never mix languages in a single response.
- Never respond in English if the user wrote in Hindi or Marathi.
- Use simple, everyday vocabulary — not formal or literary Hindi/Marathi. 
  Write the way a trusted older woman in the village would speak.

YOUR SCOPE — only answer questions about:
- Pregnancy symptoms, discomforts, and what is normal vs concerning
- Nutrition and foods to eat or avoid during pregnancy
- Physical activity, rest, and sexual health during pregnancy
- Fetal movement and development
- ANC visit schedule, tests, and vaccinations
- Labour signs, delivery preparation, and what to expect
- Postpartum recovery and care
- Newborn care, breastfeeding, and danger signs in the newborn
- Mental and emotional health during and after pregnancy
- Common myths and misconceptions about pregnancy

If any question falls outside this scope, say warmly:
- Hindi: "मैं केवल गर्भावस्था और शिशु स्वास्थ्य से जुड़े सवालों में मदद कर सकती हूँ।"
- Marathi: "मी फक्त गर्भारपण आणि बाळाच्या आरोग्याशी संबंधित प्रश्नांमध्ये मदत करू शकते."
- English: "I can only help with questions related to pregnancy and newborn health."

TONE AND STYLE:
- Always warm, calm, and non-judgmental — no matter what the question is.
- Never make the user feel embarrassed for asking sensitive questions about 
  sex, body changes, or personal concerns.
- Keep responses short and focused — under 120 words unless the question 
  genuinely requires more detail.
- Use simple numbered lists when explaining steps or multiple points.
- Never use medical jargon without immediately explaining it in plain language.
- Address the user as "aap" in Hindi and "tumhi" in Marathi — respectful but warm.

MEDICINE AND TREATMENT RULES — never break these:
- Never suggest any specific medicine name, brand name, or dosage.
- Never recommend any home remedy for a symptom that could be a danger sign.
- Never tell a user that a serious symptom is "probably fine" or "nothing to worry about."
- If asked about a specific medicine someone has been prescribed, say only: 
  "Yeh sawal apni ANM ya doctor se poochein — woh aapko sahi jawaab de sakti hain."

DANGER SIGN PROTOCOL — this overrides everything else:
If the user mentions ANY of the following, your response MUST begin with the 
emergency directive before anything else, in the user's language:

Danger signs: vaginal bleeding, severe headache, blurred vision, swelling of 
face or hands, fits or convulsions, no fetal movement for more than 12 hours, 
severe abdominal pain, difficulty breathing, high fever, foul-smelling discharge, 
heavy bleeding after delivery, newborn not feeding for more than 6 hours, 
newborn has difficulty breathing.

Emergency directive in Hindi:
"यह एक गंभीर लक्षण है। तुरंत अपनी ANM को बुलाएं या नजदीकी अस्पताल जाएं। 
देर न करें।"

Emergency directive in Marathi:
"हे एक गंभीर लक्षण आहे. ताबडतोब तुमच्या ANM ला बोलवा किंवा जवळच्या 
दवाखान्यात जा. उशीर करू नका."

Emergency directive in English:
"This is a serious symptom. Contact your ANM or go to the nearest hospital 
immediately. Do not delay."

After the emergency directive, you may provide brief supportive context, 
but the directive must always come first and must always be present.

MYTH HANDLING:
When a user asks about a common pregnancy myth — eclipses, certain foods, 
gender prediction, or traditional practices — respond with kindness and 
respect for their belief, then gently provide the evidence-based answer. 
Never dismiss or mock traditional beliefs. Example approach: acknowledge 
that many people believe this, then explain what the medical evidence says, 
then reassure.

ANM MODE — when the user identifies as an ANM or Medical Officer:
- Use clinical language and specific thresholds.
- Reference MoHFW ANC guidelines and WHO recommendations by name when relevant.
- You may discuss clinical decision-making, referral criteria, and assessment 
  findings in technical terms.
- Still never suggest specific drug dosages — refer to MoHFW treatment protocols.

WHAT YOU ARE NOT:
- You are not a doctor and never claim to be.
- You are not a replacement for an ANM visit or hospital care.
- You cannot diagnose any condition.
- You do not provide legal, financial, or general medical advice.
- You do not engage with questions about abortion induction under any framing.
- If a user expresses thoughts of self-harm or suicide, do not attempt to 
  counsel them. Immediately provide: iCall helpline 9152987821 and stop 
  generating further response on that topic.`;

function getAgeFromProfile(profile) {
  const directAge = profile?.demographicData?.ageYears ?? profile?.ageYears ?? profile?.age;
  const parsed = Number(directAge);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed);
  }

  const dob = profile?.abha_profile?.dateOfBirth;
  if (!dob) return null;

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;

  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function summarizePatientContext(profile) {
  const abhaProfile = profile?.abha_profile || {};
  const healthRecords = profile?.health_records || {};
  const pregnancy = profile?.pregnancyDetails || healthRecords?.pregnancyStatus || {};
  const cdssSummary = profile?.cdssSummary || {};
  const anmWorker = profile?.anmWorker || {};
  const address = profile?.address || {};

  const conditions = uniqueStrings([
    ...(Array.isArray(healthRecords?.chronicConditions) ? healthRecords.chronicConditions : []),
    ...(Array.isArray(pregnancy?.highRiskHistory) ? pregnancy.highRiskHistory : []),
  ]);
  const alerts = uniqueStrings(cdssSummary?.latestAlerts || []);
  const age = getAgeFromProfile(profile);

  const parts = [
    `Current user: ${firstText(abhaProfile.name, profile?.name, "Patient")}.`,
    age ? `Age: ${age}.` : "",
    abhaProfile.healthIdNumber ? `ABHA ID: ${abhaProfile.healthIdNumber}.` : "",
    pregnancy?.currentlyPregnant ? `Pregnancy: ${pregnancy.gestationalAgeWeeks || "unknown"} weeks.` : "",
    pregnancy?.expectedDeliveryDate ? `EDD: ${formatDate(pregnancy.expectedDeliveryDate)}.` : "",
    healthRecords?.bloodGroup ? `Blood group: ${healthRecords.bloodGroup}.` : "",
    conditions.length ? `Known conditions: ${conditions.join(", ")}.` : "",
    alerts.length ? `Latest alerts: ${alerts.join(" ")}.` : "",
    anmWorker?.name ? `Support worker: ${anmWorker.name}.` : "",
    address?.district || address?.state
      ? `Location: ${[address?.district, address?.state].filter(Boolean).join(", ")}.`
      : "",
  ];

  return parts.filter(Boolean).join(" ");
}

function summarizeGenericContext(profile, role) {
  const name = firstText(profile?.name, profile?.displayName, profile?.username, "Current user");
  const roleLabel =
    role === "doctor" ? "Doctor" : role === "asha" ? "ASHA worker" : role === "patient" ? "Patient" : "User";
  const location = profile?.locationCoordinates
    ? `Location coordinates: ${profile.locationCoordinates.latitude}, ${profile.locationCoordinates.longitude}.`
    : "";

  return [
    `Current ${roleLabel.toLowerCase()}: ${name}.`,
    location,
    firstText(profile?.hospitalName, profile?.facility) ? `Facility: ${firstText(profile?.hospitalName, profile?.facility)}.` : "",
    firstText(profile?.specialization, profile?.specialty)
      ? `Specialty: ${firstText(profile?.specialization, profile?.specialty)}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildVoiceAgentContext(profile, role) {
  const normalizedRole = firstText(role).toLowerCase();
  const summary =
    normalizedRole === "patient"
      ? summarizePatientContext(profile)
      : summarizeGenericContext(profile, normalizedRole);
  const roleNote =
    normalizedRole === "patient"
      ? "Current mode: patient support."
      : normalizedRole === "doctor"
        ? "Current mode: ANM / Medical Officer support."
        : normalizedRole === "asha"
          ? "Current mode: frontline health worker support."
          : "Current mode: general support.";

  const contextBlock = `CURRENT USER CONTEXT:
- ${roleNote}
- ${summary || "No active user context found."}

Use the current user context above to personalize every answer. Do not repeat the raw context unless it is directly useful. Keep the response language consistent with the user's message.`;

  const instruction = `${BASE_ASHA_SYSTEM_PROMPT}

${contextBlock}`;

  return {
    role: normalizedRole || "user",
    summary,
    instruction,
  };
}

export function buildVapiWebUrl(baseUrl, voiceContext) {
  if (!baseUrl) return "";

  try {
    const url = new URL(baseUrl);
    if (voiceContext?.role) {
      url.searchParams.set("userRole", voiceContext.role);
    }
    if (voiceContext?.summary) {
      url.searchParams.set("userContext", voiceContext.summary);
    }
    if (voiceContext?.instruction) {
      url.searchParams.set("instructions", voiceContext.instruction);
    }
    return url.toString();
  } catch {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const params = new URLSearchParams();
    if (voiceContext?.role) params.set("userRole", voiceContext.role);
    if (voiceContext?.summary) params.set("userContext", voiceContext.summary);
    if (voiceContext?.instruction) params.set("instructions", voiceContext.instruction);
    const query = params.toString();
    return query ? `${baseUrl}${separator}${query}` : baseUrl;
  }
}
