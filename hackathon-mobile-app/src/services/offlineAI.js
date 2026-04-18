/**
 * Offline AI Engine — ArogyaGram
 *
 * Uses keyword frequency + token overlap scoring to match
 * user queries to intents in qa-engine.json without any network call.
 * Completely works offline.
 */

import qaEngine from "../data/qa-engine.json";

// ─── Tokenizer ────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "hai", "kya", "ho", "ka", "ki", "ke", "se", "mein", "ko", "aur", "ya",
  "the", "a", "an", "is", "are", "was", "were", "it", "in", "on", "at",
  "of", "to", "for", "with", "that", "this", "my", "me", "i", "you", "we",
  "nahi", "bhi", "he", "be", "do", "if", "na", "koi",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// ─── Build reverse index at module load ──────────────────────────────────────

const intentIndex = qaEngine.intents.map((intent) => ({
  tag: intent.tag,
  responses: intent.responses,
  tokenSets: intent.patterns.map((p) => new Set(tokenize(p))),
  allTokens: [...new Set(intent.patterns.flatMap(tokenize))],
}));

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreIntent(queryTokens, intentEntry) {
  if (queryTokens.length === 0) return 0;

  let totalScore = 0;

  for (const patternSet of intentEntry.tokenSets) {
    let matches = 0;
    for (const qt of queryTokens) {
      if (patternSet.has(qt)) matches++;
      // Partial prefix match (handles transliteration variations)
      else {
        for (const pt of patternSet) {
          if (pt.startsWith(qt) || qt.startsWith(pt)) {
            matches += 0.5;
            break;
          }
        }
      }
    }
    const jaccard =
      matches / (queryTokens.length + patternSet.size - matches);
    totalScore = Math.max(totalScore, jaccard);
  }

  return totalScore;
}

// ─── Fuzzy keyword in intent tokens ──────────────────────────────────────────

function keywordBoost(queryTokens, intentEntry) {
  let boost = 0;
  for (const qt of queryTokens) {
    for (const it of intentEntry.allTokens) {
      if (it === qt) boost += 1.5;
      else if (it.includes(qt) || qt.includes(it)) boost += 0.6;
    }
  }
  return boost / Math.max(queryTokens.length, 1);
}

// ─── Pick a random response ───────────────────────────────────────────────────

function pickResponse(responses) {
  return responses[Math.floor(Math.random() * responses.length)];
}

// ─── Fallback messages ───────────────────────────────────────────────────────

const FALLBACKS = [
  "Mujhe iske baare mein seedha jaankari nahi hai. Mauli se poochein:\n\nAap yeh pooch sakte hain:\n• \"Mera agla ANC checkup kab hai?\"\n• \"IFA tablet kab leni chahiye?\"\n• \"Baby ki movement kam ho gayi — kya karein?\"\n• \"JSY/JSSK scheme kya milta hai?\"",
  "Is sawaal ka jawab mere paas nahi hai. Main inme madad kar sakta hoon:\n• ANC checkup schedule\n• Pregnancy supplements (IFA, Calcium, TT)\n• Emergency obstetric guidance\n• Government schemes (JSY, JSSK, PMSMA, PM-JAY)\n• Newborn care aur vaccination",
  "Samajh nahi paya. Kripya apna sawaal simple bhasha mein poochein:\n🤰 ANC • 💊 Supplements • 🚨 Emergency • 👶 Newborn • 🏛️ Schemes\n\nYa seedha ASHA worker se milein.",
];

// ─── Follow-up suggestions by intent ─────────────────────────────────────────

const SUGGESTIONS = {
  anc_schedule: ["PMSMA kab hoga?", "IFA tablet kab leni chahiye?", "High risk mein checkup schedule?"],
  risk_assessment: ["ANC checkup kab hai?", "BP check kaise karein?", "Hemoglobin badhane ka tarika?"],
  emergency_obstetric: ["Ambulance 108 number", "Rajindra Hospital kaise jaayein?", "JSSK mein transport FREE hai?"],
  antenatal_supplements: ["IFA tablet se ulti aati hai — kya karein?", "Calcium kab leni chahiye?", "TT injection kab lagaye?"],
  maternal_symptoms: ["BP high hai kya karein?", "Hemoglobin check kaise hoga?", "Hospital kab jaana zaroori hai?"],
  newborn_care: ["Baby ka pehla teeka kab?", "Breastfeeding kaise shuru karein?", "Jaundice newborn mein?"],
  government_maternal_schemes: ["JSY mein paise kaise milenge?", "Ayushman card kaise banaayen?", "PMSMA kab hota hai?"],
  abha_health_records: ["ABHA card kaise banwayen?", "Purane ANC records kahan hain?"],
  asha_anm_support: ["ASHA worker ka number chahiye", "ANM clinic kab khulti hai?", "Anganwadi se kya milega?"],
  maternal_nutrition: ["Anemia ke liye kya khayein?", "Pregnancy mein kya nahi khaana?", "Protein wala sasta khaana?"],
  referral_transport_maternal: ["Ambulance 108 FREE hai?", "Rajindra Hospital Patiala kaise?", "JSSK transport claim kaise karein?"],
  general_greeting: ["ANC schedule batao", "Emergency number kya hai?", "Government schemes pregnancy mein?"],
  emergency_contact: ["108 ambulance", "104 helpline", "Nabha Civil Hospital number"],
  hospital_status: ["OPD timing kya hai?", "Lab test free hai kya?", "PMSMA schedule?"],
  symptom_checker: ["Fever pregnancy mein dangerous hai?", "Baby ki movement kam ho gayi", "Ambulance kaise bulaayen?"],
};

// ─── Main entry point ─────────────────────────────────────────────────────────

export function offlineMatch(userQuery) {
  const queryTokens = tokenize(userQuery);

  if (queryTokens.length === 0) {
    return {
      text: FALLBACKS[0],
      tag: null,
      suggestions: ["Symptoms poochein", "Hospital info", "Emergency help"],
    };
  }

  const scored = intentIndex.map((entry) => ({
    entry,
    score: scoreIntent(queryTokens, entry) + keywordBoost(queryTokens, entry) * 0.4,
  }));

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const THRESHOLD = 0.08;

  if (best.score < THRESHOLD) {
    return {
      text: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)],
      tag: null,
      suggestions: ["Symptoms poochein", "Hospital info", "Emergency help"],
    };
  }

  return {
    text: pickResponse(best.entry.responses),
    tag: best.entry.tag,
    suggestions: SUGGESTIONS[best.entry.tag] || [],
    confidence: Math.round(Math.min(best.score * 100, 99)),
  };
}

/**
 * Simulates a streaming typewriter effect — calls `onChunk` character by
 * character and resolves when done. Returns an abort function.
 */
export function streamOfflineResponse(text, { onChunk, onDone, charsPerTick = 3, tickMs = 18 }) {
  let cancelled = false;
  let i = 0;

  function tick() {
    if (cancelled) return;
    if (i >= text.length) {
      onDone?.();
      return;
    }
    const slice = text.slice(i, i + charsPerTick);
    onChunk(slice);
    i += charsPerTick;
    setTimeout(tick, tickMs);
  }

  setTimeout(tick, 80); // initial delay to feel "thinking"

  return () => {
    cancelled = true;
  };
}
