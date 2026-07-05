// ═══════════════════════════════════════════════════════════════════════════════
//  ARYA SITUATION CLASSIFIER
//  Detects the human situation and emotional state from a user message.
//  Maps to wisdom domains so the right knowledge is retrieved.
//  Fast, focused — uses gpt-4o-mini with JSON mode.
// ═══════════════════════════════════════════════════════════════════════════════

import OpenAI from "openai";

export interface SituationProfile {
  primarySituation: string;
  secondarySituations: string[];
  emotionalState: string;
  gunaState: "tamas" | "rajas" | "sattva" | "mixed";
  urgency: "immediate" | "reflective" | "background";
  wisdomNeeded: boolean;
}

const SITUATION_TAXONOMY: Record<string, string[]> = {
  career_decision:       ["duty_vs_desire", "fear_of_failure", "identity"],
  business_decision:     ["strategy", "trust", "risk", "leadership"],
  relationship_decision: ["love", "duty", "letting_go", "boundaries"],
  financial_decision:    ["security_vs_growth", "greed", "contentment"],
  feeling_stuck:         ["tamas", "inertia", "lost_direction"],
  feeling_overwhelmed:   ["rajas", "too_much", "scattered"],
  grief_and_loss:        ["karuna", "impermanence", "letting_go"],
  anger_and_conflict:    ["raudra", "injustice", "ego"],
  anxiety_and_fear:      ["bhayanaka", "uncertainty", "control"],
  loneliness:            ["disconnection", "longing", "belonging"],
  failure:               ["shame", "resilience", "learning"],
  betrayal:              ["trust_broken", "justice", "forgiveness"],
  ambition_and_purpose:  ["dharma", "calling", "right_action"],
  seeking_clarity:       ["viveka", "discernment", "truth"],
  wanting_to_change:     ["habit", "discipline", "transformation"],
  creative_block:        ["fear_of_expression", "perfectionism"],
  family_conflict:       ["duty", "love", "boundaries", "forgiveness"],
  friendship_difficulty: ["trust", "loyalty", "letting_go"],
  romantic_struggle:     ["love", "desire", "attachment", "longing"],
  parenting_challenge:   ["guidance", "letting_go", "love"],
  meaning_and_purpose:   ["dharma", "identity", "calling"],
  mortality_awareness:   ["impermanence", "what_matters", "legacy"],
  identity_confusion:    ["self_knowledge", "roles_vs_self"],
  spiritual_questioning: ["doubt", "faith", "direct_experience"],
};

const CLASSIFIER_PROMPT = `You are an internal classifier for ARYA, a personal assistant. 
Analyse the user message and return a JSON object — no other text.

Classify:
- primarySituation: one key from this list: ${Object.keys(SITUATION_TAXONOMY).join(", ")}, or "none"
- secondarySituations: array of 0-2 more keys from the same list
- emotionalState: one of: anxiety, grief, anger, confusion, joy, loneliness, fear, love, emptiness, seeking, peace, shame, frustration, overwhelm, none
- gunaState: "tamas" (stuck/heavy/avoidant), "rajas" (driven/agitated/restless), "sattva" (clear/seeking/balanced), or "mixed"
- urgency: "immediate" (crisis/urgent task), "reflective" (open question, exploring), "background" (casual)
- wisdomNeeded: true only if ALL of these apply:
    (a) the user has shared something genuine — a real struggle or open question
    (b) it is NOT a quick task request, factual question, or casual chat
    (c) urgency is "reflective"
    (d) primarySituation is not "none"

Return ONLY valid JSON. Example:
{"primarySituation":"career_decision","secondarySituations":["feeling_stuck"],"emotionalState":"anxiety","gunaState":"rajas","urgency":"reflective","wisdomNeeded":true}`;

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

export async function classifySituation(
  userMessage: string,
  recentHistory: string = "",
): Promise<SituationProfile> {
  const fallback: SituationProfile = {
    primarySituation: "none",
    secondarySituations: [],
    emotionalState: "none",
    gunaState: "mixed",
    urgency: "background",
    wisdomNeeded: false,
  };

  if (!userMessage || userMessage.trim().length < 15) return fallback;

  try {
    const openai = getOpenAI();
    const contextBlock = recentHistory
      ? `Recent context:\n${recentHistory.slice(-400)}\n\nUser just said:`
      : "User said:";

    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: CLASSIFIER_PROMPT },
        { role: "user", content: `${contextBlock}\n"${userMessage.slice(0, 500)}"` },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 120,
      temperature: 0.1,
    });

    const raw = resp.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      primarySituation: parsed.primarySituation || "none",
      secondarySituations: Array.isArray(parsed.secondarySituations) ? parsed.secondarySituations : [],
      emotionalState: parsed.emotionalState || "none",
      gunaState: parsed.gunaState || "mixed",
      urgency: parsed.urgency || "background",
      wisdomNeeded: !!parsed.wisdomNeeded,
    };
  } catch {
    return fallback;
  }
}

export function getSituationTags(profile: SituationProfile): string[] {
  const primary = SITUATION_TAXONOMY[profile.primarySituation] || [];
  const secondary = profile.secondarySituations.flatMap(s => SITUATION_TAXONOMY[s] || []);
  return [...new Set([profile.primarySituation, ...profile.secondarySituations, ...primary, ...secondary])];
}
