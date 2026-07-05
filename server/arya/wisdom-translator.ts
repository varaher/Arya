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
