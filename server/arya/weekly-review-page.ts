import OpenAI from "openai";
import { db } from "../db";
import {
  aryaUsers, aryaGoals, aryaMoodCheckins, aryaNitiSessions, aryaMemory,
} from "@shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { getLanguageInstruction } from "./language-instruction";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MOOD_EMOJIS = ["", "😔", "😟", "😐", "🙂", "😊"];
const DAY_SHORTS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const INTENTION_CHIPS_EN = [
  "Be more present",
  "Finish what I started",
  "Rest without guilt",
  "Have one hard conversation",
  "Move my body every day",
  "Call someone I care about",
];

const INTENTION_CHIPS_HI = [
  "और उपस्थित रहूँ",
  "जो शुरू किया वो पूरा करूँ",
  "बिना guilt के आराम करूँ",
  "एक ज़रूरी बात कहूँ",
  "रोज़ शरीर को हिलाऊँ",
  "किसी अपने को call करूँ",
];

function getIntentionChips(lang: string): string[] {
  return lang === "hi" ? INTENTION_CHIPS_HI : INTENTION_CHIPS_EN;
}

const COSMIC_THEMES_EN = [
  {
    name: "Mercury",
    summary: "A Mercury week — the mind was sharper than usual, decisions moved faster. If you had any important conversations this week, they mattered more than they appeared to. Communication was the hidden engine.",
    nextHint: "Next week slows down. Use it for depth, not speed.",
    stars: 4,
  },
  {
    name: "Saturn",
    summary: "Saturn energy dominated this week — slower, heavier, but more durable. The things you built quietly will outlast what others launched loudly. Discipline that nobody saw is still discipline.",
    nextHint: "Jupiter energy rises next week. What you planted now has room to grow.",
    stars: 3,
  },
  {
    name: "Jupiter",
    summary: "A Jupiter week — expansion was available to those who reached for it. Opportunities likely appeared in unexpected places. The question is whether you let them in or waited for certainty first.",
    nextHint: "Saturn follows Jupiter. Next week is for consolidating what opened up.",
    stars: 5,
  },
  {
    name: "Mars",
    summary: "Mars drove this week — high energy, possible friction, a tendency to push. If things felt more urgent than usual, that's Mars. The useful question is whether the urgency was real or manufactured.",
    nextHint: "Venus energy softens next week. Let it.",
    stars: 3,
  },
  {
    name: "Venus",
    summary: "Venus shaped this week — ease, creativity, and relationships were more available than usual. If something felt unexpectedly smooth, that wasn't luck. If you neglected relationships, this was the week that cost.",
    nextHint: "A more inward week follows. Good for reflection, less for external push.",
    stars: 4,
  },
  {
    name: "Moon",
    summary: "A lunar week — emotions ran closer to the surface, intuition was stronger than logic. The things that surfaced mid-week were showing you something real. What you felt was data, not weakness.",
    nextHint: "Solar energy returns next week — more outward, more visible.",
    stars: 4,
  },
  {
    name: "Sun",
    summary: "Sun energy led this week — confidence, visibility, leadership were all amplified. If you stepped forward, it landed. If you held back, the window was open and unused. Both are information.",
    nextHint: "A Mercury week follows — communications and decisions will dominate.",
    stars: 5,
  },
];

const COSMIC_THEMES_HI = [
  {
    name: "Mercury",
    summary: "Mercury का हफ्ता — दिमाग़ सामान्य से तेज़ था, फ़ैसले जल्दी हुए। इस हफ्ते जो भी ज़रूरी बातचीत हुई, वो दिखने से ज़्यादा मायने रखती थी। communication ही असली engine था।",
    nextHint: "अगला हफ्ता धीमा होगा। उसे गहराई के लिए इस्तेमाल करो, तेज़ी के लिए नहीं।",
    stars: 4,
  },
  {
    name: "Saturn",
    summary: "Saturn की energy थी इस हफ्ते — धीमी, भारी, लेकिन टिकाऊ। जो तुमने चुपचाप बनाया वो उनसे ज़्यादा चलेगा जिन्होंने शोर में launch किया। जो discipline किसी ने नहीं देखी, वो भी discipline है।",
    nextHint: "Jupiter अगले हफ्ते उठेगा। जो अभी बोया है उसे बढ़ने की जगह मिलेगी।",
    stars: 3,
  },
  {
    name: "Jupiter",
    summary: "Jupiter का हफ्ता — जो पहुँचना चाहते थे उनके लिए विस्तार उपलब्ध था। अवसर अचानक आए होंगे। सवाल यह है — क्या तुमने उन्हें अंदर आने दिया या पक्केपन का इंतज़ार करते रहे?",
    nextHint: "Jupiter के बाद Saturn आता है। अगला हफ्ता जो खुला उसे समेटने का है।",
    stars: 5,
  },
  {
    name: "Mars",
    summary: "Mars ने इस हफ्ते चलाया — ऊर्जा ज़्यादा, घर्षण भी, धकेलने की प्रवृत्ति भी। अगर चीज़ें सामान्य से ज़्यादा urgent लगीं, तो वो Mars था। काम का सवाल यह है — urgency असली थी या बनाई हुई?",
    nextHint: "Venus अगले हफ्ते नरम करेगी। होने दो उसे।",
    stars: 3,
  },
  {
    name: "Venus",
    summary: "Venus ने इस हफ्ते आकार दिया — सहजता, रचनात्मकता और रिश्ते सामान्य से ज़्यादा उपलब्ध थे। अगर कुछ अप्रत्याशित रूप से आसान लगा, वो luck नहीं था। अगर रिश्तों को नज़रअंदाज़ किया, तो इस हफ्ते की कीमत वो था।",
    nextHint: "एक अंतर्मुखी हफ्ता आएगा। reflection के लिए अच्छा, बाहरी धक्के के लिए कम।",
    stars: 4,
  },
  {
    name: "Moon",
    summary: "चंद्र हफ्ता — भावनाएँ सतह के करीब थीं, सहज-ज्ञान तर्क से मज़बूत था। हफ्ते के बीच जो उभरा वो कुछ असली दिखा रहा था। जो तुमने महसूस किया वो data था, कमज़ोरी नहीं।",
    nextHint: "अगले हफ्ते Solar energy लौटेगी — ज़्यादा बाहरी, ज़्यादा दृश्यमान।",
    stars: 4,
  },
  {
    name: "Sun",
    summary: "Sun की energy थी इस हफ्ते — आत्मविश्वास, दृश्यता, नेतृत्व सब amplify हुए। अगर आगे बढ़े तो असर हुआ। अगर रुके रहे तो खिड़की खुली थी और अनइस्तेमाल गई। दोनों ही जानकारी हैं।",
    nextHint: "Mercury का हफ्ता आएगा — बातचीत और फ़ैसले हावी होंगे।",
    stars: 5,
  },
];

function getCosmicThemes(lang: string) {
  return lang === "hi" ? COSMIC_THEMES_HI : COSMIC_THEMES_EN;
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatWeekLabel(monday: Date, sunday: Date): string {
  const fmt = (d: Date, y?: boolean) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(y ? { year: "numeric" } : {}) });
  return `${fmt(monday)} — ${fmt(sunday, true)}`;
}

function getCosmicWeek() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  return COSMIC_THEMES[weekNum % COSMIC_THEMES.length];
}

export interface WeeklyLetterData {
  weekLabel: string;
  userName: string;
  headline: string;
  moodArc: {
    days: { day: string; dayShort: string; mood: number; energy: number; emoji: string; hasData: boolean }[];
    aryaRead: string;
    avgMood: number;
    checkInCount: number;
  };
  goals: {
    total: number;
    active: number;
    activeThisWeek: number;
    bestStreak: { title: string; count: number } | null;
    items: { id: string; title: string; progress: number; streak: number; activeThisWeek: boolean }[];
  };
  aryaNoticed: { insight: string; confidence: string };
  businessRecap: {
    sessions: { id: number; sessionType: string; philosopher: string | null; title: string | null; createdAt: string }[];
    hasData: boolean;
  };
  cosmicWeek: { name: string; summary: string; nextHint: string; stars: number };
  aryaQuestion: string;
  intentionChips: string[];
  savedIntention?: string;
}

export async function getWeeklyLetter(userId: string): Promise<WeeklyLetterData> {
  const { monday } = getWeekBounds();
  const { monday: mon, sunday: sun } = getWeekBounds();

  const [userRows, allGoals, moodRows, nitiSessions, memories] = await Promise.all([
    db.select({ name: aryaUsers.name, uiLanguage: aryaUsers.uiLanguage }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1),
    db.select({
      id: aryaGoals.id,
      title: aryaGoals.title,
      status: aryaGoals.status,
      progress: aryaGoals.progress,
      streakCount: aryaGoals.streakCount,
      lastActivityAt: aryaGoals.lastActivityAt,
    }).from(aryaGoals).where(eq(aryaGoals.userId, userId)),
    db.select({
      mood: aryaMoodCheckins.mood,
      energy: aryaMoodCheckins.energy,
      createdAt: aryaMoodCheckins.createdAt,
    }).from(aryaMoodCheckins).where(and(eq(aryaMoodCheckins.userId, userId), gte(aryaMoodCheckins.createdAt, mon))),
    db.select({
      id: aryaNitiSessions.id,
      sessionType: aryaNitiSessions.sessionType,
      philosopher: aryaNitiSessions.philosopher,
      title: aryaNitiSessions.title,
      createdAt: aryaNitiSessions.createdAt,
    }).from(aryaNitiSessions)
      .where(and(eq(aryaNitiSessions.userId, userId), gte(aryaNitiSessions.createdAt, mon)))
      .orderBy(desc(aryaNitiSessions.createdAt)),
    db.select({ key: aryaMemory.key, value: aryaMemory.value, category: aryaMemory.category })
      .from(aryaMemory).where(eq(aryaMemory.tenantId, userId))
      .orderBy(desc(aryaMemory.updatedAt)).limit(8),
  ]);

  const firstName = userRows[0]?.name?.split(" ")[0] || "friend";
  const lang = (userRows[0] as any)?.uiLanguage || "en";
  const langInstruction = getLanguageInstruction(lang, firstName);

  const dayMoods = DAY_SHORTS.map((dayShort, i) => {
    const dayDate = new Date(mon);
    dayDate.setDate(mon.getDate() + i);
    const dayStr = dayDate.toDateString();
    const checkin = moodRows.find(m => new Date(m.createdAt).toDateString() === dayStr);
    return {
      day: dayDate.toLocaleDateString("en-IN", { weekday: "short" }),
      dayShort,
      mood: checkin?.mood || 0,
      energy: checkin?.energy || 0,
      emoji: checkin ? (MOOD_EMOJIS[checkin.mood] || "😐") : "",
      hasData: !!checkin,
    };
  });

  const checkIns = dayMoods.filter(d => d.hasData);
  const avgMood = checkIns.length > 0 ? checkIns.reduce((s, d) => s + d.mood, 0) / checkIns.length : 0;
  const moodRead = lang === "hi"
    ? checkIns.length === 0
      ? "इस हफ्ते कोई मूड check-in नहीं — कुछ पढ़ने को नहीं है।"
      : avgMood >= 4 ? "numbers के हिसाब से वाकई अच्छा हफ्ता था। इसे क्या बना रहा था?"
      : avgMood >= 3 ? "बीच का हफ्ता — न नीचे, न ऊपर। इसमें कुछ examine करने लायक है।"
      : "भावनात्मक रूप से कठिन हफ्ता था। यह data है, failure नहीं।"
    : checkIns.length === 0
      ? "No mood check-ins this week — nothing to read from."
      : avgMood >= 4 ? "A genuinely good week by the numbers. What made it that way?"
      : avgMood >= 3 ? "A middle-ground week — not low, not high. Something worth examining there."
      : "A harder week, emotionally. That's data, not failure.";

  const activeGoals = allGoals.filter(g => g.status === "active");
  const activeThisWeek = activeGoals.filter(g => g.lastActivityAt && g.lastActivityAt >= mon).length;
  const bestStreak = activeGoals.reduce<{ title: string; count: number } | null>((best, g) => {
    const c = g.streakCount || 0;
    return c > (best?.count || 0) ? { title: g.title, count: c } : best;
  }, null);

  const goalsCtx = activeGoals.length > 0
    ? activeGoals.slice(0, 5).map(g => `"${g.title}" — ${g.progress}% progress, ${g.streakCount || 0}-day streak`).join("; ")
    : "No active goals";
  const moodCtx = checkIns.length > 0
    ? `Average mood ${avgMood.toFixed(1)}/5 across ${checkIns.length} days`
    : "No mood data";
  const nitiCtx = nitiSessions.length > 0
    ? nitiSessions.map(s => s.sessionType.replace(/_/g, " ")).join(", ") + " sessions this week"
    : "No business sessions";
  const memCtx = memories.slice(0, 4).map(m => `${m.key}: ${m.value.slice(0, 80)}`).join("; ");

  const defaultHeadline = lang === "hi"
    ? "यह हफ्ता चुपचाप गुज़रा — पंक्तियों के बीच पढ़ने लायक है।"
    : "This week wrote itself quietly — worth reading between the lines.";
  const defaultAryaNoticed = lang === "hi"
    ? "ARYA ने देखा: जो तुम कहते हो कि ज़रूरी है और जहाँ तुम्हारा समय असल में जाता है — उस gap को बंद करना अभी बाकी है।"
    : "Something ARYA noticed: the gap between what you say matters and where your time actually goes is still waiting to be closed.";
  const defaultAryaQuestion = lang === "hi"
    ? "इस हफ्ते क्या था जिससे तुम बचे, और अगले हफ्ते उसका सामना करना होगा?"
    : "What did you avoid this week that you'll need to face next week?";

  let headline = defaultHeadline;
  let aryaNoticed = defaultAryaNoticed;
  let aryaQuestion = defaultAryaQuestion;

  const jsonInstruction = lang === "hi"
    ? `Generate ALL three values in Hindi. Warm friend tone using "तुम". Keep "ARYA" in English.
"headline": एक वाक्य — इस हफ्ते की भावना, सारांश नहीं। Max 18 शब्द। नाम से शुरू मत करो।
"aryaNoticed": "ARYA ने देखा:" से शुरू करो। 2-3 वाक्य। Goals, mood और behaviour को जोड़ने वाला specific pattern। Uncomfortable, honest — generic wisdom नहीं।
"aryaQuestion": इस हफ्ते की specific घटनाओं पर आधारित एक reflection question। सीधे पूछो, कोई preamble नहीं।`
    : `"headline": One sentence capturing the CHARACTER of this week — a feeling, not a summary. Max 18 words. Never start with their name.
"aryaNoticed": Start with 'Something ARYA noticed:'. 2-3 sentences. A specific pattern connecting their goals, mood, and behaviour. Uncomfortable, honest, specific — not generic wisdom.
"aryaQuestion": One reflection question specific to this exact week's events. The single most useful question. Ask it directly, no preamble.`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `You are ARYA — ${firstName}'s personal thinking partner. Generate three pieces of their Sunday weekly review.

${langInstruction}

Week data for ${firstName}:
- Goals: ${goalsCtx}
- Mood: ${moodCtx}
- Business sessions: ${nitiCtx}
- Known about them: ${memCtx || "early days — not much yet"}

Return ONLY valid JSON with exactly these three keys:
{
  ${jsonInstruction}
}`,
      }],
      response_format: { type: "json_object" } as any,
      max_tokens: 320,
      temperature: 0.8,
    } as any);
    const parsed = JSON.parse((resp as any).choices[0].message.content || "{}");
    if (parsed.headline) headline = parsed.headline;
    if (parsed.aryaNoticed) aryaNoticed = parsed.aryaNoticed;
    if (parsed.aryaQuestion) aryaQuestion = parsed.aryaQuestion;
  } catch {}

  const intentionMemory = memories.find(m => m.key === "weekly_intention");

  return {
    weekLabel: formatWeekLabel(mon, sun),
    userName: firstName,
    headline,
    moodArc: { days: dayMoods, aryaRead: moodRead, avgMood, checkInCount: checkIns.length },
    goals: {
      total: allGoals.length,
      active: activeGoals.length,
      activeThisWeek,
      bestStreak,
      items: activeGoals.slice(0, 6).map(g => ({
        id: g.id,
        title: g.title,
        progress: g.progress,
        streak: g.streakCount || 0,
        activeThisWeek: !!(g.lastActivityAt && g.lastActivityAt >= mon),
      })),
    },
    aryaNoticed: {
      insight: aryaNoticed,
      confidence: memCtx ? "clear" : "forming",
    },
    businessRecap: {
      sessions: nitiSessions.map(s => ({
        id: s.id,
        sessionType: s.sessionType,
        philosopher: s.philosopher,
        title: s.title,
        createdAt: s.createdAt.toISOString(),
      })),
      hasData: nitiSessions.length > 0,
    },
    cosmicWeek: getCosmicThemes(lang)[Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % getCosmicThemes(lang).length],
    aryaQuestion,
    intentionChips: getIntentionChips(lang),
    savedIntention: intentionMemory?.value,
  };
}

export async function saveWeeklyIntention(userId: string, intention: string): Promise<void> {
  try {
    await db.delete(aryaMemory).where(and(eq(aryaMemory.tenantId, userId), eq(aryaMemory.key, "weekly_intention")));
    await db.insert(aryaMemory).values({
      tenantId: userId,
      category: "context",
      key: "weekly_intention",
      value: intention,
      source: "explicit",
      confidence: "1.00",
    });
  } catch (e) {
    console.error("[WeeklyReview] saveIntention error:", e);
  }
}

export async function saveReflectionAnswer(userId: string, question: string, answer: string): Promise<void> {
  try {
    const weekNum = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
    await db.insert(aryaMemory).values({
      tenantId: userId,
      category: "context",
      key: `weekly_reflection_${weekNum}`,
      value: `Q: ${question}\nA: ${answer}`,
      source: "explicit",
      confidence: "1.00",
    });
  } catch (e) {
    console.error("[WeeklyReview] saveAnswer error:", e);
  }
}
