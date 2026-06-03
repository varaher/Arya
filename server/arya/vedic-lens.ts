import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaGoals } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getLanguageInstruction } from "./language-instruction";
import { checkCalendarKaalConflict } from "./calendar-kaal-bridge";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const PLANETS = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const DURATIONS = [7, 20, 6, 10, 7, 18, 16, 19, 17];
const NAKSHATRAS = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
  "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
  "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Moola","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha",
  "Purva Bhadrapada","Uttara Bhadrapada","Revati",
];
const NAKSHATRA_LORDS = [
  "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
  "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
  "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
];

export function computeKundliProfile(birthDateStr: string): { nakshatra: string; dashaLord: string; dashaYearsLeft: string } {
  try {
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return { nakshatra: "Jyeshtha", dashaLord: "Jupiter", dashaYearsLeft: "4.2" };

    const startOfYear = new Date(birth.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((birth.getTime() - startOfYear.getTime()) / 86400000);
    const nakshatraIdx = dayOfYear % 27;
    const nakshatra = NAKSHATRAS[nakshatraIdx];

    const startingPlanetName = NAKSHATRA_LORDS[nakshatraIdx];
    let startingPlanetIdx = PLANETS.indexOf(startingPlanetName);

    const now = new Date();
    const ageYears = (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    let elapsed = ageYears % 120;
    let idx = startingPlanetIdx;
    for (let i = 0; i < 9; i++) {
      if (elapsed <= DURATIONS[idx % 9]) break;
      elapsed -= DURATIONS[idx % 9];
      idx = (idx + 1) % 9;
    }
    const lord = PLANETS[idx % 9];
    const yearsLeft = Math.max(0.5, +(DURATIONS[idx % 9] - elapsed).toFixed(1));

    return { nakshatra, dashaLord: lord, dashaYearsLeft: String(yearsLeft) };
  } catch {
    return { nakshatra: "Jyeshtha", dashaLord: "Jupiter", dashaYearsLeft: "4.2" };
  }
}

const DAY_RULERS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
const PLANET_EMOJIS: Record<string, string> = {
  Sun: "☀️", Moon: "🌙", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

export interface WeekDay {
  date: string;
  dayName: string;
  dayFullName: string;
  dayDate: number;
  isToday: boolean;
  energy: "Peak" | "High" | "Mid" | "Rest";
  theme: string;
  bestWindow: string;
  quality: string;
  avoid: string;
}

export interface VedicBriefing {
  userName: string;
  planetaryPills: Array<{ emoji: string; text: string; tone: "good" | "caution" | "watch" }>;
  aryaInsight: string;
  muhurat: { startTime: string; endTime: string; purpose: string };
  cosmicCards: Array<{ tone: "good" | "caution" | "watch"; label: string; text: string; source: string }>;
  guidance: { money: string; relationships: string; body: string };
  dasha: { lord: string; yearsLeft: number; chapterText: string };
  weekDays: WeekDay[];
  venusPhase: string;
  calendarWarning?: string | null;
  calendarAdvice?: string | null;
}

// ── Week forecast: deterministic, seeded by dasha lord + rashi ──────────────
const WEEK_THEMES = [
  "Clarity & decisions",
  "Communication & connection",
  "Strategy & focus",
  "Rest & reflection",
  "Momentum & action",
  "Relationships & trust",
  "Completion & review",
];

const BEST_WINDOWS = [
  "9:00 AM – 11:00 AM",
  "10:30 AM – 12:30 PM",
  "7:00 AM – 9:00 AM",
  "11:00 AM – 1:00 PM",
  "8:00 AM – 10:00 AM",
  "2:00 PM – 4:00 PM",
  "6:00 PM – 8:00 PM",
];

const AVOID_PHRASES = [
  "Major financial commitments",
  "Confrontational conversations",
  "Starting too many things at once",
  "Rushing important decisions",
  "Overcommitting your time",
  "Arguments and reactive debates",
  "Strenuous physical activity",
];

// Energy compatibility: dasha lord × day of week → energy level
const ENERGY_MAP: Record<string, ("Peak" | "High" | "Mid" | "Rest")[]> = {
  Jupiter: ["Mid", "High", "Mid", "High", "Peak", "High", "Rest"],
  Venus:   ["Mid", "High", "Rest", "High", "Mid",  "Peak", "Mid"],
  Sun:     ["Peak","Mid", "High", "Rest", "Mid",  "High", "Mid"],
  Moon:    ["High","Peak","Mid",  "High", "Rest", "Mid",  "High"],
  Mars:    ["Mid", "Rest","Peak", "Mid",  "High", "Rest", "High"],
  Rahu:    ["High","Mid", "High", "Peak", "Mid",  "Rest", "High"],
  Saturn:  ["Rest","High","Mid",  "High", "Rest", "Mid",  "Peak"],
  Mercury: ["Mid", "High","Rest", "Peak", "High", "Mid",  "High"],
  Ketu:    ["High","Rest","Mid",  "High", "Peak", "High", "Rest"],
};

function generateWeekForecast(dashaLord: string, rashi: string): WeekDay[] {
  const today = new Date();
  const todayDate = today.getDate();
  const energyRow = ENERGY_MAP[dashaLord] || ENERGY_MAP.Jupiter;
  const rashiSeed = rashi ? (rashi.charCodeAt(0) % 7) : 0;

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(todayDate + i);
    const dayOfWeek = date.getDay();
    const themeIdx = (dayOfWeek + rashiSeed) % 7;
    const energy = energyRow[dayOfWeek];
    const quality = energy === "Peak" ? "Strong momentum — use it" :
                   energy === "High"  ? "Good energy — move forward" :
                   energy === "Mid"   ? "Steady pace — maintain focus" :
                   "Recovery day — rest is productive";

    return {
      date: date.toISOString().split("T")[0],
      dayName: date.toLocaleDateString("en-IN", { weekday: "short" }),
      dayFullName: date.toLocaleDateString("en-IN", { weekday: "long" }),
      dayDate: date.getDate(),
      isToday: i === 0,
      energy,
      theme: WEEK_THEMES[themeIdx],
      bestWindow: BEST_WINDOWS[themeIdx],
      quality,
      avoid: AVOID_PHRASES[themeIdx],
    };
  });
}

// ── Venus cycle: synodic period ≈ 584 days ────────────────────────────────────
function getVenusPhase(): string {
  const today = new Date();
  const reference = new Date("2023-08-13"); // Venus inferior conjunction reference
  const days = Math.floor((today.getTime() - reference.getTime()) / 86400000);
  const pos = ((days % 584) + 584) % 584;

  if (pos < 146) return "Morning Star — rising energy, the best time to start something that matters";
  if (pos < 263) return "Superior conjunction — deep inner work, what you build quietly now is solid";
  if (pos < 438) return "Evening Star — harvest, completion, and deepening relationships";
  return "Retrograde phase — reflection and revisiting, not retreat — course correction";
}

function sampleBriefing(name: string, rashi?: string, lang = "en"): VedicBriefing {
  const today = new Date();
  const dayRuler = DAY_RULERS[today.getDay()];
  const weekDays = generateWeekForecast("Jupiter", rashi || "Mesh");
  const venusPhase = getVenusPhase();

  if (lang === "hi") {
    return {
      userName: name,
      planetaryPills: [
        { emoji: "☿", text: "संचार के लिए अच्छा दिन", tone: "good" },
        { emoji: "♄", text: "देरी में धैर्य रखें", tone: "caution" },
        { emoji: "♃", text: "निर्णय अधिक स्पष्ट लगेंगे", tone: "good" },
        { emoji: "♂", text: "शाम 6 बजे के बाद विवाद से बचें", tone: "watch" },
      ],
      aryaInsight: `आप हाल ही में सामान्य से अधिक केंद्रित रहे हैं। आज की ऊर्जा उस स्पष्टता को सहारा देती है। जो आप पहले से जानते हैं उस पर भरोसा करें — आपकी अंतर्दृष्टि अभी बहुत सटीक है।`,
      muhurat: { startTime: "10:15 AM", endTime: "11:45 AM", purpose: "कुछ नया शुरू करने के लिए" },
      cosmicCards: [
        { tone: "good", label: "आज की शक्ति", text: `"आज आपकी सोच असाधारण रूप से स्पष्ट है। अगर आप किसी निर्णय पर अटके हैं — यह उसे लेने का अच्छा दिन है।"`, source: `${dayRuler} प्रभाव${rashi ? ` · ${rashi}` : ""}` },
        { tone: "caution", label: "सावधानी से संभालें", text: `"आज अपने आसपास के लोगों के साथ थोड़ा अधिक धैर्य रखें।"`, source: "शनि गोचर" },
      ],
      guidance: {
        money: "नियमित खर्च के लिए ठीक है। बड़े वित्तीय निर्णय कुछ दिन टालें।",
        relationships: "आज कुछ ऐसा कहने का अच्छा दिन है जो आप कहना चाहते थे।",
        body: "ऊर्जा मध्यम है। शारीरिक रूप से बहुत अधिक जोर न दें।",
      },
      dasha: { lord: "Jupiter", yearsLeft: 4.2, chapterText: "आप बृहस्पति काल में हैं — एक ऐसा समय जब आपकी अंतर्दृष्टि तेज होती है और अवसर खुद चले आते हैं। अभी सामान्य से अधिक खुद पर भरोसा करें।" },
      weekDays,
      venusPhase,
    };
  }

  return {
    userName: name,
    planetaryPills: [
      { emoji: "☿", text: "Good for communication", tone: "good" },
      { emoji: "♄", text: "Be patient with delays", tone: "caution" },
      { emoji: "♃", text: "Decisions feel clearer", tone: "good" },
      { emoji: "♂", text: "Avoid arguments after 6pm", tone: "watch" },
    ],
    aryaInsight: `You've been more focused than usual lately. Today's energy supports that clarity. Trust what you already know — your instincts are well-calibrated right now.`,
    muhurat: { startTime: "10:15 AM", endTime: "11:45 AM", purpose: "starting something new" },
    cosmicCards: [
      { tone: "good", label: "Strength today", text: `"Your thinking is unusually clear today. If you've been sitting on a decision — this is a good day to make it."`, source: `${dayRuler} influence${rashi ? ` · ${rashi} Rashi` : ""}` },
      { tone: "caution", label: "Handle with care", text: `"Be a little more patient than usual with people around you today. Small misunderstandings can feel bigger than they are."`, source: "Saturn transit" },
    ],
    guidance: {
      money: "Fine for routine expenses. Avoid big financial commitments — wait a few days when the energy settles.",
      relationships: "A good day to say something kind you've been meaning to say. Small gestures land well today.",
      body: "Energy is moderate. Don't push too hard physically. Rest if you feel it — your body is asking for it.",
    },
    dasha: { lord: "Jupiter", yearsLeft: 4.2, chapterText: "You're in a Jupiter chapter — a time when your instincts are sharper and opportunities tend to find you. Trust yourself more than usual right now. This is a period for expansion, not retreat." },
    weekDays,
    venusPhase,
  };
}

export async function generateVedicBriefing(userId: string): Promise<VedicBriefing> {
  let user: { name: string; rashi: string | null; nakshatra: string | null; dashaLord: string | null; dashaYearsLeft: string | null; vedicLensEnabled: boolean; uiLanguage: string | null } | null = null;
  try {
    const rows = await db.select({
      name: aryaUsers.name,
      rashi: aryaUsers.rashi,
      nakshatra: aryaUsers.nakshatra,
      dashaLord: aryaUsers.dashaLord,
      dashaYearsLeft: aryaUsers.dashaYearsLeft,
      vedicLensEnabled: (aryaUsers as any).vedicLensEnabled,
      uiLanguage: aryaUsers.uiLanguage,
    }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
    user = rows[0] || null;
  } catch (err: any) {
    console.error("[VedicBriefing] User query failed:", err?.message);
    return sampleBriefing("friend");
  }

  if (!user) return sampleBriefing("friend");

  const lang = user.uiLanguage || "en";
  const firstName = user.name?.split(" ")[0] || user.name || "friend";
  const rashi = user.rashi || null;
  const dashaLord = user.dashaLord || "Jupiter";
  const dashaYearsLeft = parseFloat(user.dashaYearsLeft || "4.0");

  const weekDays = generateWeekForecast(dashaLord, rashi || "Mesh");
  const venusPhase = getVenusPhase();

  if (!user.vedicLensEnabled || !rashi) {
    return { ...sampleBriefing(user.name, rashi || undefined, lang), weekDays, venusPhase };
  }

  let goalsTitles = "none specified";
  let moodLine = "";
  try {
    const { buildLightContext } = await import("./context-builder");
    const ctx = await buildLightContext(userId);
    goalsTitles = ctx.topGoals.join("; ") || "none specified";
    if (ctx.moodScore) {
      const moodLabels: Record<number, string> = { 1: "struggling", 2: "low", 3: "neutral", 4: "calm and focused", 5: "energised" };
      moodLine = `- Mood today: ${moodLabels[ctx.moodScore] || "present"}`;
    }
  } catch (err: any) {
    console.error("[VedicBriefing] Context query failed:", err?.message);
    try {
      const activeGoals = await db.select({ title: aryaGoals.title }).from(aryaGoals)
        .where(and(eq(aryaGoals.userId, userId), eq(aryaGoals.status, "active"))).limit(3);
      goalsTitles = activeGoals.map(g => g.title).join("; ") || "none specified";
    } catch {}
  }

  const today = new Date();
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  const dayRuler = DAY_RULERS[today.getDay()];
  const dateStr = today.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const langInstruction = getLanguageInstruction(lang, firstName);

  const prompt = `You are a Vedic astrology scholar grounded in four classical texts:
1. Brihat Parashara Hora Shastra — the mathematics of time: nakshatras, dasha cycles, planetary periods
2. Phaladeepika — the practical art of timing: muhurta, when to act, transit effects
3. Saravali — the human dimension: how dasha periods feel from inside, nakshatra psychology
4. Thirukkural — the language of wisdom: precise, actionable, never vague

You generate practical daily cosmic briefings. The user feels wisdom — they never see technical terms or source names.

${langInstruction}

User context:
- Name: ${user.name}
- Rashi (Moon sign): ${rashi}
- Current Dasha lord: ${dashaLord} (${dashaYearsLeft} years remaining)
- Nakshatra: ${user.nakshatra || "unknown"}
- Today: ${dayName}, ${dateStr}
- Day ruler: ${dayRuler}
- Active goals: ${goalsTitles}
${moodLine}

CRITICAL RULES:
1. Never be fatalistic, scary, or use technical Jyotish terms in the output text
2. Every insight must end with something the user can DO — an action, not just a prediction
3. Plain language only — "your thinking is clearer today" not "Mercury is exalted"
4. Be warm, like a wise elder speaking — not a fortune teller
5. The dasha chapter text should feel like life wisdom for this planetary period — 2-3 sentences
6. Think like Thirukkural: concise, precise, actionable — no padding

Return ONLY valid JSON matching this exact structure:
{
  "planetaryPills": [
    {"emoji": "☿", "text": "Good for communication", "tone": "good"},
    {"emoji": "♄", "text": "Be patient with delays", "tone": "caution"},
    {"emoji": "♃", "text": "Instincts are sharp today", "tone": "good"},
    {"emoji": "♂", "text": "Avoid confrontations after 6pm", "tone": "watch"}
  ],
  "aryaInsight": "Personal blended insight connecting cosmic energy with the user's specific life and goals (2-3 sentences, warm, specific to their goals and dasha)",
  "muhurat": {
    "startTime": "HH:MM AM/PM",
    "endTime": "HH:MM AM/PM",
    "purpose": "brief description of what this window is good for"
  },
  "cosmicCards": [
    {
      "tone": "good",
      "label": "Strength today",
      "text": "Italicized insight in quotes — what this means practically",
      "source": "Planet influence · Rashi · Classical text"
    },
    {
      "tone": "caution",
      "label": "Handle with care",
      "text": "Italicized caution in quotes — what to watch and what to do about it",
      "source": "Planet transit · Classical text"
    }
  ],
  "guidance": {
    "money": "One practical sentence about finances today",
    "relationships": "One warm sentence about relationships today",
    "body": "One grounded sentence about physical energy today"
  },
  "dasha": {
    "lord": "${dashaLord}",
    "yearsLeft": ${dashaYearsLeft},
    "chapterText": "2-3 sentences on this dasha period as a life chapter — growth, decisions, energy — ending with empowerment. Speak to this person's actual goals."
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" } as any,
      max_tokens: 1000,
    } as any);

    const parsed = JSON.parse((response as any).choices[0].message.content || "{}");
    const validTone = (t: unknown): "good" | "caution" | "watch" =>
      (t === "good" || t === "caution" || t === "watch") ? t : "caution";

    const briefingResult: VedicBriefing = {
      userName: user.name,
      planetaryPills: (parsed.planetaryPills || []).map((p: any) => ({
        emoji: p.emoji || "✦",
        text: p.text || "",
        tone: validTone(p.tone),
      })),
      aryaInsight: parsed.aryaInsight || "",
      muhurat: parsed.muhurat || { startTime: "10:15 AM", endTime: "11:45 AM", purpose: "starting something new" },
      cosmicCards: (parsed.cosmicCards || []).map((c: any) => ({
        tone: validTone(c.tone),
        label: c.label || "",
        text: c.text || "",
        source: c.source || "",
      })),
      guidance: parsed.guidance || { money: "", relationships: "", body: "" },
      dasha: parsed.dasha || { lord: dashaLord, yearsLeft: dashaYearsLeft, chapterText: "" },
      weekDays,
      venusPhase,
      calendarWarning: null,
      calendarAdvice: null,
    };

    // Connection 4 — inject calendar vs KAAL conflict warning
    try {
      const calWarn = await checkCalendarKaalConflict(userId);
      if (calWarn.hasConflict) {
        briefingResult.calendarWarning = calWarn.warningText;
        briefingResult.calendarAdvice = calWarn.adviceText;
      }
    } catch {}

    return briefingResult;
  } catch {
    return { ...sampleBriefing(user.name, rashi), weekDays, venusPhase };
  }
}
