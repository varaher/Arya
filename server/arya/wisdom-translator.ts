// ═══════════════════════════════════════════════════════════════════════════════
//  ARYA WISDOM TRANSLATOR
//  Takes a retrieved wisdom principle and renders it in ARYA's natural voice,
//  personalised to this specific person in this specific moment.
//
//  The gold standard: the user should never be able to tell whether what
//  ARYA said came from a 3,000-year-old text or from ARYA's own observation.
//  If they can tell — the delivery failed. If they can't — it worked.
// ═══════════════════════════════════════════════════════════════════════════════

import OpenAI from "openai";
import type { WisdomEntry } from "./wisdom-retriever";

interface UserContext {
  firstName: string;
  currentSituation: string;
  whatTheyJustSaid: string;
  relevantMemory?: string;
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openaiClient;
}

export async function translateWisdomToARYAVoice(
  wisdom: WisdomEntry,
  userContext: UserContext,
  language: string,
): Promise<string | null> {
  try {
    const openai = getOpenAI();

    const langInstruction = language !== "en"
      ? `Deliver entirely in ${language} — not in English.`
      : "";

    const prompt = `You are rendering a piece of wisdom into ARYA's natural speaking voice.

ARYA's rules — never break these:
1. NEVER cite any source. Not "ancient wisdom says", not "there's a tradition that", not "as the texts say". Just say it as ARYA's own insight.
2. Connect directly to what this person just shared. Use their name if it flows naturally.
3. Make it feel discovered, not delivered. Not "here is some wisdom." Say it directly, or begin with "Something worth sitting with..." or "One question keeps coming back..."
4. End with a question that opens, not a conclusion that closes.
5. Match weight to moment — light for light, deep for deep.
6. 2-4 sentences maximum. No preamble.

The wisdom insight to render (INTERNAL — never hint at source):
"${wisdom.principle}"

${userContext.firstName ? `Their name: ${userContext.firstName}` : ""}
Their situation: ${userContext.currentSituation}
What they just said: "${userContext.whatTheyJustSaid.slice(0, 300)}"
${userContext.relevantMemory ? `Relevant memory: ${userContext.relevantMemory}` : ""}

${langInstruction}

Respond with ONLY the translated wisdom — nothing else.`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 150,
      temperature: 0.75,
    });

    return resp.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

// ── Batch translate a single arya_principle into multiple languages ──────────
// Used by seed scripts to pre-fill language_variants.
// Returns a partial record — only languages that succeeded.
export async function batchTranslateWisdomEntry(
  principle: string,
  languages: string[],
): Promise<Record<string, string>> {
  const openai = getOpenAI();

  const LANG_NAMES: Record<string, string> = {
    hi: "Hindi (Devanagari script)",
    ta: "Tamil (Tamil script)",
    te: "Telugu (Telugu script)",
    ml: "Malayalam (Malayalam script)",
    kn: "Kannada (Kannada script)",
    bn: "Bengali (Bengali script)",
    gu: "Gujarati (Gujarati script)",
    pa: "Punjabi (Gurmukhi script)",
    or: "Odia (Odia script)",
    mr: "Marathi (Devanagari script)",
    en: "English",
  };

  const langsNeeded = languages.filter(l => l !== "en" && LANG_NAMES[l]);
  if (!langsNeeded.length) return { en: principle };

  const prompt = `Translate this wisdom insight into each language listed. Return ONLY valid JSON.

RULES:
- Never cite any source or text. This is ARYA's direct insight.
- Warm, natural, spoken idiom — not formal literary style.
- 2-4 sentences max per language.
- Use the correct script for each language.

Insight: "${principle}"

Languages (use these exact keys): ${langsNeeded.map(l => `"${l}" (${LANG_NAMES[l]})`).join(", ")}

Return: {"${langsNeeded[0]}": "...", ...}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
      temperature: 0.3,
    });
    const raw = resp.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    return { en: principle, ...parsed };
  } catch {
    return { en: principle };
  }
}
