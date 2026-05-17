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
 * Detect the script/language of a text string.
 * Returns a language code from ARYA's 25-language set, or 'en' as default.
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length < 2) return "en";
  for (const { lang, pattern } of SCRIPT_PATTERNS) {
    if (pattern.test(text)) return lang;
  }
  return "en"; // Latin-script or unknown → default English
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

/**
 * Auto-update the user's preferredLanguage in arya_users once we have
 * enough evidence (3+ messages in same detected language in this session).
 * Fires async — never blocks the response.
 */
export async function autoUpdateLanguagePreference(
  userId: string | null | undefined,
  detectedLang: string,
  history: ChatMessage[]
): Promise<void> {
  if (!userId || detectedLang === "en") return;

  try {
    const recentUserMessages = history
      .filter((m) => m.role === "user")
      .slice(-8);

    let count = 1; // current message already detected
    for (const msg of recentUserMessages) {
      if (detectLanguage(msg.content) === detectedLang) count++;
    }

    // 3+ messages in same language → update preference silently
    if (count >= 3) {
      await db
        .update(aryaUsers)
        .set({ preferredLanguage: detectedLang } as any)
        .where(eq(aryaUsers.id, userId));
      console.log(`[LanguageDetector] Auto-updated preferredLanguage → ${detectedLang} for user ${userId}`);
    }
  } catch (err) {
    // Non-critical — never surface errors here
    console.error("[LanguageDetector] Auto-update failed:", err);
  }
}
