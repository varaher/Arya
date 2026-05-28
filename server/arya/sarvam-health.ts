const SARVAM_BASE_URL = "https://api.sarvam.ai";

function getApiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY not configured");
  return key;
}

export interface SarvamHealthResult {
  checkedAt: string;
  working: string[];
  broken: Array<{ speaker: string; error: string }>;
  currentMapStatus: Record<string, { speaker: string; healthy: boolean }>;
  allHealthy: boolean;
}

// All speakers to probe — full list from Sarvam's last known error response
const ALL_KNOWN_SPEAKERS = [
  "priya", "anushka", "kavitha", "simran", "manisha", "vidya",
  "arya", "ritu", "neha", "pooja", "kavya", "ishita", "shreya",
  "roopa", "tanya", "shruti", "suhani", "rupali",
  "rahul", "rohan", "amit", "dev", "varun", "kabir",
];

// What we're currently using per language
const CURRENT_MAP: Record<string, string> = {
  "hi-IN": "priya", "mr-IN": "priya", "pa-IN": "simran",
  "ta-IN": "kavitha", "te-IN": "anushka", "kn-IN": "anushka",
  "ml-IN": "anushka", "bn-IN": "priya", "gu-IN": "priya",
  "od-IN": "priya", "en-IN": "priya",
};

async function testSpeaker(speaker: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
      method: "POST",
      headers: {
        "API-Subscription-Key": getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: ["hello"],
        target_language_code: "hi-IN",
        speaker,
        model: "bulbul:v2",
        enable_preprocessing: false,
      }),
    });

    if (response.ok) return { ok: true };

    let errMsg = `HTTP ${response.status}`;
    try {
      const body = await response.json() as any;
      errMsg = body?.error?.message || errMsg;
    } catch {}
    return { ok: false, error: errMsg };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function runSarvamHealthCheck(): Promise<SarvamHealthResult> {
  console.log("[Sarvam Health] Starting daily speaker health check…");

  const working: string[] = [];
  const broken: Array<{ speaker: string; error: string }> = [];

  for (const speaker of ALL_KNOWN_SPEAKERS) {
    const result = await testSpeaker(speaker);
    if (result.ok) {
      working.push(speaker);
    } else {
      broken.push({ speaker, error: result.error || "unknown" });
    }
  }

  // Check each currently-used speaker against results
  const currentMapStatus: Record<string, { speaker: string; healthy: boolean }> = {};
  for (const [lang, speaker] of Object.entries(CURRENT_MAP)) {
    const healthy = working.includes(speaker);
    currentMapStatus[lang] = { speaker, healthy };
    if (!healthy) {
      console.error(`[Sarvam Health] ❌ ALERT: speaker '${speaker}' used for ${lang} is BROKEN`);
    }
  }

  const allHealthy = Object.values(currentMapStatus).every(v => v.healthy);

  if (allHealthy) {
    console.log(`[Sarvam Health] ✅ All current speakers healthy. Working total: ${working.length}/${ALL_KNOWN_SPEAKERS.length}`);
  } else {
    const broken_langs = Object.entries(currentMapStatus)
      .filter(([, v]) => !v.healthy)
      .map(([lang, v]) => `${lang}:${v.speaker}`)
      .join(", ");
    console.error(`[Sarvam Health] ❌ Broken speakers in use: ${broken_langs}`);
    console.error(`[Sarvam Health] Working speakers available: ${working.join(", ")}`);
  }

  return {
    checkedAt: new Date().toISOString(),
    working,
    broken,
    currentMapStatus,
    allHealthy,
  };
}
