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
    formData.append("model", "saarika:v2.5");
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
  const response = await fetch(`${SARVAM_BASE_URL}/translate`, {
    method: "POST",
    headers: {
      "API-Subscription-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      source_language_code: sourceLanguage,
      target_language_code: targetLanguage,
      speaker_gender: "Female",
      model: "mayura:v1",
      mode: "code-mixed",
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

  const payload = {
    inputs: [cleanedText],
    target_language_code: languageCode,
    speaker: speaker,
    model: "bulbul:v2",
    pitch: 0,
    pace: 1.0,
    loudness: 1.0,
    speech_sample_rate: 22050,
    enable_preprocessing: true,
  };

  console.log(`[Sarvam TTS] lang=${languageCode} speaker=${speaker} chars=${cleanedText.length} preview="${cleanedText.slice(0, 60)}"`);

  const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: {
      "API-Subscription-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sarvam TTS] 400 detail — lang:${languageCode} speaker:${speaker} chars:${cleanedText.length} preview:"${cleanedText.slice(0,80)}" error:${errorText}`);
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

export function isIndianLanguage(langCode: string): boolean {
  if (!langCode || langCode === "en-IN" || langCode === "unknown") return false;
  return SUPPORTED_LANGUAGES.some(l => l.code === langCode && l.code !== "en-IN");
}

export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code;
}

// Female voices for bulbul:v2 — ARYA is always female, no exceptions
const TTS_SPEAKERS: Record<string, string> = {
  "hi-IN": "meera",
  "mr-IN": "meera",
  "pa-IN": "meera",
  "ta-IN": "pavithra",
  "te-IN": "ananya",
  "kn-IN": "ananya",
  "ml-IN": "ananya",
  "bn-IN": "ananya",
  "gu-IN": "ananya",
  "od-IN": "ananya",
  "en-IN": "ananya",
};

export function getSpeakerForLanguage(langCode: string): string {
  return TTS_SPEAKERS[langCode] || "ananya";
}
