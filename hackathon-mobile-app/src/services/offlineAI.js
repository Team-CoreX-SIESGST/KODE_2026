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
  "Mujhe iske baare mein seedha jaankari nahi hai. Kuch aur pooch sakte hain — symptoms, hospital, medicines, ya government schemes?\n\nAap yeh pooch sakte hain:\n• \"Mujhe bukhaar hai kya karoon?\"\n• \"Hospital mein doctor hai kya?\"\n• \"Free medicine kahan milegi?\"",
  "Is sawaal ka jawab mere paas nahi hai, lekin main inme madad kar sakta hoon:\n• Symptoms & first aid\n• Nabha Civil Hospital info\n• Free medicines & lab tests\n• Maternal & child health\n• Government health schemes",
  "Samajh nahi paya. Kripya apna sawaal simple bhasha mein poochein ya neeche diye topics mein se kuch try karein:\n🏥 Hospital • 💊 Medicine • 🤒 Symptoms • 👶 Child Health • 🏛️ Schemes",
];

// ─── Follow-up suggestions by intent ─────────────────────────────────────────

const SUGGESTIONS = {
  symptom_checker: ["Hospital kahan hai?", "Free medicine milegi?", "Ambuance kaise bulaayen?"],
  hospital_status: ["OPD timing kya hai?", "Lab test free hai kya?", "Doctor se appointment?"],
  medicine_availability: ["Jan Aushadhi kya hai?", "Diabetes ki dawai?", "Hospital timing?"],
  emergency: ["Ambulance number kya hai?", "Nearest hospital?", "First aid tips?"],
  maternal_health: ["Baby ka teeka schedule?", "Janani Suraksha Yojana?", "Iron tablets?"],
  child_health: ["Malnutrition treatment?", "Anganwadi kya deta hai?", "Child vaccination?"],
  mental_health: ["Helpline number kya hai?", "Stress ke liye tips?"],
  government_schemes: ["Ayushman card kaise banaayen?", "Free ilaaj kaise milega?"],
  diabetes_hypertension: ["NCD clinic kahan hai?", "Diet tips diabetes ke liye?", "BP dawai?"],
  tuberculosis_tb: ["DOTS therapy kya hai?", "Nikshay Poshan Yojana?", "TB test free hai?"],
  first_aid: ["Ambulance kaise bulaayen?", "Bleeding rokne ka tarika?"],
  vaccination_immunization: ["Baby ka pehla teeka?", "Tetanus injection kab lein?"],
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
