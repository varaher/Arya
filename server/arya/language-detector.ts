/**
 * ARYA Language Detector
 * ─────────────────────────────────────────────────────────────────────
 * Script-based detection using Unicode ranges — zero API calls, <1ms.
 * Covers all 25 ARYA languages. Feeds into auto language profile update
 * so ARYA learns what language each user actually writes in over time.
 */

import { db } from "../db";
import { aryaUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { ChatMessage } from "./chat-engine";

// ── Unicode script → language code ─────────────────────────────────────
// Order matters: check more specific patterns before broad ones.
// CJK disambiguation: Chinese and Japanese share Kanji (U+4E00-9FFF),
// so check for Hiragana/Katakana first to identify Japanese.
const SCRIPT_PATTERNS: Array<{ lang: string; pattern: RegExp }> = [
  { lang: "ko", pattern: /[\uAC00-\uD7AF]/ },              // Korean Hangul
  { lang: "ja", pattern: /[\u3040-\u30FF]/ },              // Japanese Hiragana/Katakana
  { lang: "zh", pattern: /[\u4E00-\u9FFF]/ },              // CJK (Chinese after ja check)
  { lang: "ru", pattern: /[\u0400-\u04FF]/ },              // Cyrillic (Russian)
  { lang: "ar", pattern: /[\u0600-\u06FF]/ },              // Arabic
  { lang: "he", pattern: /[\u0590-\u05FF]/ },              // Hebrew
  { lang: "ta", pattern: /[\u0B80-\u0BFF]/ },              // Tamil
  { lang: "te", pattern: /[\u0C00-\u0C7F]/ },              // Telugu
  { lang: "kn", pattern: /[\u0C80-\u0CFF]/ },              // Kannada
  { lang: "ml", pattern: /[\u0D00-\u0D7F]/ },              // Malayalam
  { lang: "od", pattern: /[\u0B00-\u0B7F]/ },              // Odia
  { lang: "bn", pattern: /[\u0980-\u09FF]/ },              // Bengali
  { lang: "gu", pattern: /[\u0A80-\u0AFF]/ },              // Gujarati
  { lang: "pa", pattern: /[\u0A00-\u0A7F]/ },              // Gurmukhi (Punjabi)
  { lang: "hi", pattern: /[\u0900-\u097F]/ },              // Devanagari → Hindi/Marathi/Sanskrit
];

// Latin-script languages (fr, es, de, pt, id, tr, sw, en) are the fallback
// when no non-Latin script is detected. We leave them as 'en' in detection
// since distinguishing Latin-script languages needs more text + word lists
// — not worth the complexity for our use case.

/**
 * Convert a Sarvam-style BCP-47 language tag (e.g. "hi-IN", "ta-IN", "ml-IN")
 * into the short code used throughout ARYA (e.g. "hi", "ta", "ml").
 * If the code is already short or unrecognised, it is returned as-is.
 */
export function sarvamLangToShort(sarvamCode: string): string {
  if (!sarvamCode) return "en";
  // Full lookup table for all 11 Sarvam-supported languages.
  // Keys are Sarvam's exact BCP-47 codes; values are ARYA's short codes.
  const SARVAM_MAP: Record<string, string> = {
    "hi-IN": "hi",   // Hindi
    "ta-IN": "ta",   // Tamil
    "te-IN": "te",   // Telugu
    "kn-IN": "kn",   // Kannada
    "ml-IN": "ml",   // Malayalam
    "bn-IN": "bn",   // Bengali
    "gu-IN": "gu",   // Gujarati
    "mr-IN": "mr",   // Marathi (shares Devanagari with hi — treated separately)
    "pa-IN": "pa",   // Punjabi (Gurmukhi script)
    "or-IN": "od",   // Odia — Sarvam uses "or-IN"; ARYA uses "od"
    "en-IN": "en",   // English (Indian accent)
    // Safety aliases — Sarvam sometimes returns short codes without region
    "hi": "hi", "ta": "ta", "te": "te", "kn": "kn", "ml": "ml",
    "bn": "bn", "gu": "gu", "mr": "mr", "pa": "pa", "or": "od", "en": "en",
    // Urdu guard — Sarvam occasionally misdetects Hindi as Urdu
    "ur-IN": "hi", "ur": "hi",
  };
  return SARVAM_MAP[sarvamCode] ?? sarvamCode.split("-")[0].toLowerCase();
}

// ── Stopword signatures for Latin-script languages ──────────────────────────
// Each entry lists high-frequency words unique to that language that are
// extremely unlikely to appear in English. Two matches = confident detection.
// Words are lowercased; matching is done on the lowercased input.
const LATIN_STOPWORDS: Array<{ lang: string; words: string[] }> = [
  // French — distinctive: articles, negation particle, prepositions
  { lang: "fr", words: ["le", "la", "les", "une", "des", "du", "pas", "est", "avec", "dans", "pour", "vous", "nous", "mais", "sont", "sur"] },
  // Spanish — distinctive: articles, ser/estar forms, prepositions
  { lang: "es", words: ["el", "ella", "los", "las", "una", "del", "que", "por", "para", "con", "pero", "como", "muy", "todo", "este", "esta"] },
  // German — distinctive: articles (der/die/das), conjunctions, pronouns
  { lang: "de", words: ["der", "die", "das", "und", "ich", "ist", "nicht", "ein", "eine", "mit", "für", "auf", "auch", "sind", "haben", "wird"] },
  // Portuguese — distinctive: articles and prepositions that differ from Spanish
  { lang: "pt", words: ["uma", "você", "para", "com", "não", "isso", "essa", "esse", "aqui", "também", "porque", "quando", "mais", "por"] },
  // Turkish — distinctive: postpositions, suffixes encoded as standalone words
  { lang: "tr", words: ["bir", "bu", "ve", "için", "ama", "ben", "sen", "ile", "çok", "daha", "olan", "gibi", "bunu", "kadar", "değil"] },
  // Indonesian — distinctive: particles and determiners absent in English
  { lang: "id", words: ["yang", "dan", "di", "ini", "itu", "tidak", "ada", "dengan", "untuk", "dari", "saya", "kami", "mereka", "juga", "sudah"] },
  // Swahili — distinctive: noun class prefixes encoded as words
  { lang: "sw", words: ["na", "ya", "wa", "ni", "kwa", "la", "za", "katika", "hii", "hilo", "kuwa", "pia", "sana", "lakini", "kama"] },
];

/**
 * Detect Latin-script language by stopword matching.
 * Requires 2+ matches to avoid false positives from borrowed words.
 * Returns a language code or null if confidence is too low.
 */
function detectLatinScriptLanguage(text: string): string | null {
  const lower = text.toLowerCase();
  // Tokenise into whole words — punctuation stripped
  const words = new Set(lower.match(/\b[a-záéíóúüñàâäèêëîïôùûüçœæøåßãõ]+\b/g) ?? []);
  if (words.size === 0) return null;

  let bestLang: string | null = null;
  let bestCount = 0;

  for (const { lang, words: stopwords } of LATIN_STOPWORDS) {
    const matches = stopwords.filter(w => words.has(w)).length;
    if (matches >= 2 && matches > bestCount) {
      bestCount = matches;
      bestLang = lang;
    }
  }

  return bestLang; // null if no language reached the threshold
}

/**
 * Detect the script/language of a text string.
 * Returns a language code from ARYA's 25-language set, or 'en' as default.
 *
 * Detection strategy:
 *  1. Unicode script ranges  — covers 15 non-Latin scripts (instant, zero cost)
 *  2. Stopword matching      — covers 7 Latin-script international languages
 *  3. Default to "en"        — English and any unrecognised Latin-script text
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length < 2) return "en";

  // Step 1 — non-Latin script detection (fastest path)
  for (const { lang, pattern } of SCRIPT_PATTERNS) {
    if (pattern.test(text)) return lang;
  }

  // Step 2 — Latin-script language detection via stopwords
  // Only attempt on messages long enough to have reliable stopword evidence
  if (text.trim().length >= 8) {
    const latinLang = detectLatinScriptLanguage(text);
    if (latinLang) return latinLang;
  }

  return "en"; // English or undetected Latin-script
}

/**
 * Build a language context string for the system prompt.
 * Looks at the recent conversation history + current message to determine
 * if the user has a consistent detected language, then instructs ARYA to
 * respond in that language.
 *
 * @param history  - conversation history (ChatMessage[])
 * @param currentDetected - language detected from the current incoming message
 * @param uiLang   - the user's manually set UI language preference
 * @returns a string to inject into the system prompt, or "" if no action needed
 */
export function buildLanguageInstruction(
  history: ChatMessage[],
  currentDetected: string,
  uiLang: string
): string {
  if (currentDetected === "en") return ""; // Latin-script: base prompt handles it

  // Count detections across last 6 user messages in history
  const recentUserMessages = history
    .filter((m) => m.role === "user")
    .slice(-6)
    .map((m) => m.content);

  const detectionCounts: Record<string, number> = { [currentDetected]: 1 };
  for (const msg of recentUserMessages) {
    const d = detectLanguage(msg);
    if (d !== "en") detectionCounts[d] = (detectionCounts[d] || 0) + 1;
  }

  // Find dominant non-English language
  let dominant = "en";
  let maxCount = 0;
  for (const [lang, count] of Object.entries(detectionCounts)) {
    if (count > maxCount) { maxCount = count; dominant = lang; }
  }

  if (dominant === "en" || maxCount < 2) return "";

  // Build instruction
  const LANG_NAMES: Record<string, string> = {
    hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam",
    bn: "Bengali", mr: "Marathi", gu: "Gujarati", pa: "Punjabi", od: "Odia",
    sa: "Sanskrit", ar: "Arabic", he: "Hebrew", ja: "Japanese", zh: "Chinese",
    ko: "Korean", ru: "Russian", tr: "Turkish", id: "Indonesian", sw: "Swahili",
    fr: "French", es: "Spanish", de: "German", pt: "Portuguese",
  };

  const langName = LANG_NAMES[dominant] || dominant.toUpperCase();
  return `DETECTED LANGUAGE — THIS SESSION: The user is writing in ${langName}. Respond in ${langName}. Do not switch to English unless the user does first.`;
}

// ── Switch-cooldown tracker (in-memory, per process) ───────────────────────
// Stores the timestamp of the last preferredLanguage switch per userId.
// Prevents accidental language flips from one-off words typed in another script.
const lastSwitchTimestamp = new Map<string, number>();
const SWITCH_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Auto-update the user's preferredLanguage in arya_users once we have
 * enough evidence (3+ messages in same detected language in this session).
 * Fires async — never blocks the response.
 *
 * Edge cases handled:
 *  - Short messages (< 3 chars): skipped — "OK", "👍", emoji can't be trusted
 *  - Cooldown: if the language switched less than 10 min ago, skip again —
 *    prevents one-off English words flipping back from a non-English preference
 */
export async function autoUpdateLanguagePreference(
  userId: string | null | undefined,
  detectedLang: string,
  history: ChatMessage[],
  currentMessageLength: number = 99   // caller passes userMessage.length
): Promise<void> {
  if (!userId || detectedLang === "en") return;

  // Edge case 2 — short message: can't trust the detection
  if (currentMessageLength < 3) return;

  try {
    const recentUserMessages = history
      .filter((m) => m.role === "user")
      .slice(-8);

    let count = 1; // current message already counted
    for (const msg of recentUserMessages) {
      // Also skip short historical messages when counting evidence
      if (msg.content.trim().length >= 3 && detectLanguage(msg.content) === detectedLang) count++;
    }

    // Need 3+ messages of evidence before updating
    if (count < 3) return;

    // Read current preference to determine if this is actually a switch
    const [user] = await db
      .select({ preferredLanguage: aryaUsers.preferredLanguage })
      .from(aryaUsers)
      .where(eq(aryaUsers.id, userId))
      .limit(1);

    const currentLang = (user as any)?.preferredLanguage ?? "en";
    if (currentLang === detectedLang) return; // no change needed

    // Edge case 3 — cooldown: don't switch if we switched less than 10 min ago
    const lastSwitch = lastSwitchTimestamp.get(userId) ?? 0;
    if (Date.now() - lastSwitch < SWITCH_COOLDOWN_MS) {
      console.log(`[LanguageDetector] Switch cooldown active for user ${userId} — skipping ${currentLang} → ${detectedLang}`);
      return;
    }

    await db
      .update(aryaUsers)
      .set({ preferredLanguage: detectedLang } as any)
      .where(eq(aryaUsers.id, userId));

    lastSwitchTimestamp.set(userId, Date.now());
    console.log(`[LanguageDetector] preferredLanguage ${currentLang} → ${detectedLang} for user ${userId}`);
  } catch (err) {
    // Non-critical — never surface errors here
    console.error("[LanguageDetector] Auto-update failed:", err);
  }
}
