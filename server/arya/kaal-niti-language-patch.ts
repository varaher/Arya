// ============================================================
// KAAL AND NITI LANGUAGE PATCH
// server/arya/kaal-niti-language-patch.ts
//
// Server-side language instruction builders.
// Client-side constants (DRISHYA_WORLD_NAMES, NITI_IMPACT_TAGS)
// live in client/src/lib/kaal-niti-language-patch.ts
// ============================================================

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिंदी) — warm, literary, not formal textbook Hindi',
  ml: 'Malayalam (മലയാളം) — intimate, grounded in Kerala life',
  ta: 'Tamil (தமிழ்) — precise, restrained, with emotional depth',
  te: 'Telugu (తెలుగు) — lyrical, warm',
  kn: 'Kannada (ಕನ್ನಡ) — direct, philosophical',
  bn: 'Bengali (বাংলা) — emotionally rich, literary',
  mr: 'Marathi (मराठी) — warm, practical',
  gu: 'Gujarati (ગુજરાતી) — warm, clear',
  pa: 'Punjabi (ਪੰਜਾਬੀ) — direct, energetic',
  or: 'Odia (ଓଡ଼ିଆ) — quiet, devotional',
};

// ── KAAL backend generation language instruction ──────────────
// Append to whatever GPT-4o prompt generates the vedic briefing
// content (todayInsight, strengthToday, handleWithCare, etc.).

export function buildKaalLanguageInstruction(language: string): string {
  if (language === 'en' || !language) return '';
  const langName = LANG_NAMES[language] || language;

  return `
LANGUAGE INSTRUCTION FOR KAAL:
Generate ALL text fields in ${langName}.
This includes: todayInsight, strengthToday, handleWithCare,
guidanceMoney, guidanceRelationships, guidanceBody, cycleDescription.

The tone should feel like a wise, warm elder speaking in that
language — not a translation of English. Use the natural rhythms
and expressions of ${langName}.

KAAL carries the weight of Indian timing tradition.
In ${langName}, that tradition has its own vocabulary and register.
Use it naturally. Do not translate from English sentence structure —
compose fresh in ${langName}.
`;
}

// ── NITI system prompt language addition ──────────────────────
// Append to the END of NITI_CONVERSATION_PROMPT and to the
// structured-mode system prompt. Must be last instruction.

export function buildNitiLanguageInstruction(language: string): string {
  if (language === 'en' || !language) return '';
  const langName = LANG_NAMES[language] || language;

  return `

## LANGUAGE INSTRUCTION — CRITICAL

Respond entirely in ${langName}.

Every word of your Niti response must be in ${langName}.
The push-back question must be in ${langName}.
The analysis must be in ${langName}.
If you suggest directions, state them in ${langName}.

Do NOT switch to English at any point.
Do NOT include English phrases in parentheses.
Do NOT explain that you are responding in ${langName}.
Just respond in ${langName} as naturally as you would in English.

NITI's character does not change with the language.
The directness, the refusal to flatter, the push-back question —
all of these remain exactly the same.
Only the language changes. The character does not.

For business terms (ROI, KPI, B2B, PMF etc.) that exist in English:
Use the term naturally without translation — they are understood
in ${langName} business contexts as loan words.
`;
}

// ── NITI thinking journal language addition ───────────────────
// Append to the journal summary generation prompt.

export function buildJournalLanguageInstruction(language: string): string {
  if (language === 'en' || !language) return '';
  const langName = LANG_NAMES[language]?.split(' — ')[0] || language;

  return `
Generate the Thinking Journal entry in ${langName}.
The summary, insights, and follow-up question should all be in ${langName}.
Keep the same structure but express it naturally in that language.
`;
}
