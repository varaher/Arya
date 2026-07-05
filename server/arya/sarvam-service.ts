import { Buffer } from "node:buffer";
import { writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

const SARVAM_BASE_URL = "https://api.sarvam.ai";

function getApiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}

export const SUPPORTED_LANGUAGES = [
  { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
  { code: "bn-IN", name: "Bengali", native: "বাংলা" },
  { code: "ta-IN", name: "Tamil", native: "தமிழ்" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు" },
  { code: "mr-IN", name: "Marathi", native: "मराठी" },
  { code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", name: "Malayalam", native: "മലയാളം" },
  { code: "gu-IN", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "od-IN", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "en-IN", name: "English", native: "English" },
] as const;

export type SarvamLanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

export interface TranscriptionResult {
  transcript: string;
  languageCode: SarvamLanguageCode;
  confidence?: number;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TTSResult {
  audioBase64: string;
  format: string;
}

export async function sarvamSpeechToText(
  audioBuffer: Buffer,
  languageCode: SarvamLanguageCode | "unknown" = "unknown"
): Promise<TranscriptionResult> {
  const tempPath = join(tmpdir(), `sarvam-stt-${randomUUID()}.wav`);
  await writeFile(tempPath, audioBuffer);

  try {
    const fileData = await readFile(tempPath);
    const blob = new Blob([fileData], { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("model", "saaras:v3");
    formData.append("language_code", languageCode);

    const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: "POST",
      headers: {
        "API-Subscription-Key": getApiKey(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam STT failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    return {
      transcript: data.transcript || "",
      languageCode: data.language_code || languageCode,
      confidence: data.confidence,
    };
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

export async function sarvamTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  // Clean and truncate — same rules as TTS; Sarvam translate also rejects markdown/emoji
  const cleanedInput = text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[#*_`~>\[\]()!|]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1000);

  if (!cleanedInput) {
    return { translatedText: text, sourceLanguage, targetLanguage };
  }

  const response = await fetch(`${SARVAM_BASE_URL}/translate`, {
    method: "POST",
    headers: {
      "API-Subscription-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: cleanedInput,
      source_language_code: sourceLanguage,
      target_language_code: targetLanguage,
      model: "mayura:v1",
      enable_preprocessing: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam translate failed (${response.status}): ${errorText}`);
  }

  const data = await response.json() as any;
  return {
    translatedText: data.translated_text || "",
    sourceLanguage,
    targetLanguage,
  };
}

export async function sarvamTextToSpeech(
  text: string,
  languageCode: SarvamLanguageCode = "hi-IN"
): Promise<TTSResult> {
  const speaker = getSpeakerForLanguage(languageCode);

  // Strip anything that could cause a 400: emoji, control chars, zero-width chars,
  // markdown symbols, leading/trailing whitespace; hard-cap at 500 chars.
  const cleanedText = text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")   // emoji (supplementary planes)
    .replace(/[\u2600-\u27BF]/g, "")           // misc symbols
    .replace(/[\u0000-\u001F\u007F]/g, " ")    // control chars
    .replace(/[\u200B-\u200D\uFEFF]/g, "")     // zero-width chars
    .replace(/[#*_`~>\[\]()!|]/g, "")          // markdown
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 500);

  // Guard: Sarvam returns 400 if inputs[0] is empty
  if (!cleanedText) {
    console.warn(`[Sarvam TTS] text was empty after cleaning — skipping Sarvam, fallback will handle`);
    throw new Error("Sarvam TTS: cleaned text is empty");
  }

  console.log(`[Sarvam TTS] REQUEST lang=${languageCode} speaker=${speaker} chars=${cleanedText.length}`);

  let response = await callSarvamTTS(cleanedText, languageCode, speaker);

  // ── Auto-fix: if Sarvam retired the speaker, parse the error and retry ──
  if (!response.ok && response.status === 400) {
    const errorText = await response.text();
    let errorBody: any = {};
    try { errorBody = JSON.parse(errorText); } catch {}

    const errMsg: string = errorBody?.error?.message || errorText || "";

    if (errMsg.toLowerCase().includes("not recognized") && errMsg.toLowerCase().includes("available speakers")) {
      const available = parseAvailableSpeakers(errMsg);
      const replacement = pickFemaleSpeaker(available);

      if (replacement) {
        console.warn(`[Sarvam TTS] Speaker '${speaker}' retired. Auto-switching to '${replacement}' for ${languageCode}`);
        console.warn(`[Sarvam TTS] Available speakers from error: ${available.join(", ")}`);

        // Update runtime map so all subsequent calls for this language use the new speaker
        TTS_SPEAKERS[languageCode] = replacement;

        // Retry once with the replacement speaker
        response = await callSarvamTTS(cleanedText, languageCode, replacement);

        if (response.ok) {
          console.log(`[Sarvam TTS] Auto-fix succeeded — '${replacement}' works for ${languageCode}`);
        } else {
          const retryError = await response.text();
          console.error(`[Sarvam TTS] Auto-fix failed on retry: ${retryError}`);
          throw new Error(`Sarvam TTS failed after auto-fix (${response.status}): ${retryError}`);
        }
      } else {
        console.error(`[Sarvam TTS] FAILED — could not parse replacement speaker from: ${errMsg}`);
        throw new Error(`Sarvam TTS failed (${response.status}): ${errorText}`);
      }
    } else {
      // Non-speaker error — log and throw for OpenAI fallback to handle
      console.error(`[Sarvam TTS] FAILED status=${response.status} lang=${languageCode} speaker=${speaker}`);
      console.error(`[Sarvam TTS] error body: ${errorText}`);
      throw new Error(`Sarvam TTS failed (${response.status}): ${errorText}`);
    }
  } else if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sarvam TTS] FAILED status=${response.status} lang=${languageCode} speaker=${speaker}`);
    throw new Error(`Sarvam TTS failed (${response.status}): ${errorText}`);
  }

  const data = await response.json() as any;
  const audioBase64 = data.audios?.[0] || "";
  return {
    audioBase64,
    format: "wav",
  };
}

export async function sarvamSpeechToTextTranslate(
  audioBuffer: Buffer
): Promise<{ transcript: string; translatedText: string; detectedLanguage: string }> {
  const tempPath = join(tmpdir(), `sarvam-sttt-${randomUUID()}.wav`);
  await writeFile(tempPath, audioBuffer);

  try {
    const fileData = await readFile(tempPath);
    const blob = new Blob([fileData], { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("model", "saaras:v2");

    const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text-translate`, {
      method: "POST",
      headers: {
        "API-Subscription-Key": getApiKey(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam STT+Translate failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    return {
      transcript: data.transcript || "",
      translatedText: data.translated_text || data.transcript || "",
      detectedLanguage: data.language_code || "unknown",
    };
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

/**
 * STEP ZERO — Sarvam language identification for typed text.
 * POST /text-lid — returns a BCP-47 code like "hi-IN".
 * Resolves null on any error so callers always fall back to Unicode detection.
 * Never throws — designed to race against a timeout in the calling code.
 */
export async function sarvamDetectLanguage(text: string): Promise<string | null> {
  // Very short text is unreliable — let Unicode detection handle it
  if (!text || text.trim().length < 8) return null;

  try {
    const key = process.env.SARVAM_API_KEY;
    if (!key) return null;

    const response = await fetch(`${SARVAM_BASE_URL}/text-lid`, {
      method: "POST",
      headers: {
        "API-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text.slice(0, 500) }),
    });

    if (!response.ok) return null;

    const data = await response.json() as any;
    // Response shape: { language_code: "hi-IN" } or { detected_language: "hi-IN" }
    return data.language_code || data.detected_language || null;
  } catch {
    return null;
  }
}

export function isIndianLanguage(langCode: string): boolean {
  if (!langCode || langCode === "en-IN" || langCode === "unknown") return false;
  return SUPPORTED_LANGUAGES.some(l => l.code === langCode && l.code !== "en-IN");
}

export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code;
}

// Female voices for bulbul:v2 — ARYA is always female, no exceptions
// Updated May 2026 — Sarvam retired meera/ananya/pavithra; new speaker list applies globally
// This map is mutable at runtime — auto-fix can update it when Sarvam retires a speaker
const TTS_SPEAKERS: Record<string, string> = {
  "hi-IN": "priya",
  "mr-IN": "priya",
  "pa-IN": "simran",
  "ta-IN": "kavitha",
  "te-IN": "anushka",
  "kn-IN": "anushka",
  "ml-IN": "anushka",
  "bn-IN": "priya",
  "gu-IN": "priya",
  "od-IN": "priya",
  "en-IN": "priya",
};

// Known female speaker names — prefer these when auto-selecting from error message
const KNOWN_FEMALE_SPEAKERS = new Set([
  "anushka", "manisha", "vidya", "arya", "ritu", "priya", "neha",
  "pooja", "simran", "kavya", "ishita", "shreya", "roopa", "tanya",
  "shruti", "suhani", "kavitha", "rupali",
]);

export function getSpeakerForLanguage(langCode: string): string {
  return TTS_SPEAKERS[langCode] || "priya";
}

/**
 * Parse Sarvam's "not recognized" error and extract available speakers.
 * Error format: "Speaker 'X' is not recognized. Available speakers are: a, b, c"
 */
function parseAvailableSpeakers(errorMessage: string): string[] {
  const match = errorMessage.match(/Available speakers are:\s*(.+)/i);
  if (!match) return [];
  return match[1].split(",").map(s => s.trim()).filter(Boolean);
}

/**
 * Pick the best female speaker from a list of available ones.
 * Prefers known female names; falls back to first available.
 */
function pickFemaleSpeaker(available: string[]): string | null {
  const female = available.find(s => KNOWN_FEMALE_SPEAKERS.has(s));
  return female || available[0] || null;
}

/**
 * Execute a single TTS API call. Returns the raw Response.
 */
async function callSarvamTTS(
  cleanedText: string,
  languageCode: string,
  speaker: string
): Promise<Response> {
  return fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: {
      "API-Subscription-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [cleanedText],
      target_language_code: languageCode,
      speaker,
      model: "bulbul:v3",
      enable_preprocessing: false,
    }),
  });
}

/**
 * Sarvam OCR — extracts text from an image (supports Indian scripts + English).
 * Primary path for document scanning; caller should fall back to GPT-4o vision on error.
 */
export async function sarvamOCR(imageBuffer: Buffer, mimeType: string = "image/jpeg"): Promise<string> {
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const blob = new Blob([imageBuffer], { type: mimeType });

  const formData = new FormData();
  formData.append("file", blob, `document.${ext}`);

  const response = await fetch(`${SARVAM_BASE_URL}/v1/ocr`, {
    method: "POST",
    headers: {
      "api-subscription-key": getApiKey(),
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sarvam OCR failed (${response.status}): ${errText}`);
  }

  const data = await response.json() as any;

  // Sarvam OCR response: { pages: [{ page_number, text }] } or { text: "..." }
  let extractedText = "";
  if (Array.isArray(data.pages)) {
    extractedText = data.pages.map((p: any) => (p.text || "").trim()).filter(Boolean).join("\n\n");
  } else if (typeof data.text === "string") {
    extractedText = data.text.trim();
  }

  if (!extractedText) throw new Error("Sarvam OCR returned empty text");
  return extractedText;
}
