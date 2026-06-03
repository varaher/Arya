import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaNotifications } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getLanguageInstruction } from "./language-instruction";
import { fetchMarketNews, fetchLatestNews } from "./news-service";
import { buildUserContext } from "./context-builder";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MOOD_LABELS: Record<number, string> = { 1: "awful", 2: "low", 3: "okay", 4: "good", 5: "great" };

export async function generateMorningBriefing(userId: string): Promise<string> {
  try {
    const [ctx, marketNews, generalNews] = await Promise.all([
      buildUserContext(userId),
      fetchMarketNews().catch(() => []),
      fetchLatestNews().catch(() => []),
    ]);

    const firstName = ctx.firstName;
    const uiLang = ctx.language || "en";
    const langInstruction = getLanguageInstruction(uiLang, firstName);

    const now = new Date();
    const day = now.toLocaleDateString("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });

    const fallbackBriefing = uiLang === "hi"
      ? `सुप्रभात, ${firstName}! आज का दिन शानदार हो। अपने goals पर एक नज़र डालो और एक छोटा कदम आगे बढ़ाओ। 🌅`
      : uiLang === "ta"
      ? `காலை வணக்கம், ${firstName}! இன்றை நாளை சிறப்பாக ஆக்கு. உன் goals-ஐ ஒரு முறை பார்த்து ஒரு சின்ன அடி எடுத்து வை. 🌅`
      : uiLang === "te"
      ? `శుభోదయం, ${firstName}! ఈ రోజు చాలా బాగుంటుంది. నీ goals ఒకసారి చూసి ఒక చిన్న అడుగు వెయ్యి. 🌅`
      : uiLang === "ml"
      ? `ശുഭ പ്രഭാതം, ${firstName}! ഇന്ന് ഒരു നല്ല ദിവസം ആകട്ടെ. നിന്റെ goals ഒരു തവണ നോക്കി ഒരു ചെറിയ ചുവടെടുക്കൂ. 🌅`
      : uiLang === "bn"
      ? `শুভ সকাল, ${firstName}! আজকের দিনটা দারুণ হোক। তোমার goals একবার দেখো আর একটা ছোট পদক্ষেপ নাও। 🌅`
      : uiLang === "mr"
      ? `शुभ प्रभात, ${firstName}! आजचा दिवस जबरदस्त जाऊ दे. तुझ्या goals वर एक नजर टाक आणि एक छोटं पाऊल टाक. 🌅`
      : uiLang === "gu"
      ? `શુભ સવાર, ${firstName}! આજનો દિવસ અદ્ભુત રહે. તારા goals એક વાર જો અને એક નાનું પગલું ભર. 🌅`
      : `Good morning, ${firstName}! Ready to make today count? Check your goals and stay focused. 🌅`;

    const topMarket = marketNews.slice(0, 3).map(h => `• ${h.title} (${h.source})`).join("\n");
    const topIndia = generalNews.filter(h => h.category === "india").slice(0, 3).map(h => `• ${h.title}`).join("\n");

    const goalsText = ctx.goals.topThree.length > 0
      ? ctx.goals.topThree.map(g => `• ${g.title} — ${g.progress}% done${g.streakCount > 0 ? `, ${g.streakCount}-day streak` : ""}${g.isOverdue ? " ⚠ OVERDUE" : ""}`).join("\n")
      : "No active goals yet.";

    const calendarText = ctx.calendar.todayEvents.length > 0
      ? ctx.calendar.todayEvents.map(e => `• ${e.summary} at ${e.start}`).join("\n")
      : "No meetings today.";

    const moodLine = ctx.mood.checkedInToday
      ? `Yesterday's mood: ${MOOD_LABELS[ctx.mood.score!] || "okay"} (${ctx.mood.score}/5), energy ${ctx.mood.energy}/5`
      : "";

    const kaalLine = ctx.kaal.hasProfile
      ? `Vedic cycle: ${ctx.kaal.rashi} / ${ctx.kaal.nakshatra}${ctx.kaal.dashaLord ? ` · Dasha: ${ctx.kaal.dashaLord}` : ""}`
      : "";

    const overdueNote = ctx.goals.overdue.length > 0
      ? `⚠ OVERDUE GOALS: ${ctx.goals.overdue.map(g => g.title).join(", ")}`
      : "";

    const voiceTheme = ctx.voiceNotes.recent.length > 0
      ? `Recent voice notes theme: ${ctx.voiceNotes.recent[0].summary || ctx.voiceNotes.recent[0].transcript.slice(0, 80)}`
      : "";

    const prompt = `Generate a warm, concise morning briefing for ${firstName} on this ${day}. Keep it under 180 words, personal and energizing.

${langInstruction}

Their active goals:
${goalsText}
${overdueNote ? `\n${overdueNote}` : ""}

Today's calendar:
${calendarText}
${ctx.calendar.tomorrowEvents.length > 0 ? `\nTomorrow: ${ctx.calendar.tomorrowEvents.map(e => e.summary).join(", ")}` : ""}

${moodLine}
${kaalLine}
${voiceTheme}

Top India news today:
${topIndia}

Market pulse:
${topMarket}

Write a natural morning briefing: start with a warm greeting using their name. If they have meetings today, mention the most important one. If any goal is overdue, gently name it. Briefly touch on 1 news item. Remind them of their top goal. End with one short motivating thought. No bullet points — warm flowing sentences like a personal advisor who knows them well.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 220,
    } as any);

    return (response as any).choices?.[0]?.message?.content || fallbackBriefing;
  } catch {
    return "Good morning! Today is a fresh start. Check your goals and take one small step forward. 🌅";
  }
}

export async function sendMorningBriefings(sendPush: (userId: string, title: string, body: string, icon: string) => Promise<void>): Promise<void> {
  try {
    const users = await db.select({
      id: aryaUsers.id,
      name: aryaUsers.name,
      uiLanguage: aryaUsers.uiLanguage,
      morningBriefingEnabled: (aryaUsers as any).morningBriefingEnabled,
    }).from(aryaUsers)
      .where(eq(aryaUsers.isActive, true));

    const eligible = users.filter((u: any) => u.morningBriefingEnabled);
    console.log(`[BRIEFING] Sending morning briefings to ${eligible.length} users`);

    for (const user of eligible) {
      try {
        const briefing = await generateMorningBriefing(user.id);
        const firstName = user.name?.split(" ")[0] || "there";

        const lang = (user as any)?.uiLanguage || "en";
        const notifTitle = lang === "hi" ? `सुप्रभात, ${firstName}! ☀️`
          : lang === "ta" ? `காலை வணக்கம், ${firstName}! ☀️`
          : lang === "te" ? `శుభోదయం, ${firstName}! ☀️`
          : lang === "ml" ? `ശുഭ പ്രഭാതം, ${firstName}! ☀️`
          : lang === "bn" ? `শুভ সকাল, ${firstName}! ☀️`
          : lang === "mr" ? `शुभ प्रभात, ${firstName}! ☀️`
          : lang === "gu" ? `શુભ સવાર, ${firstName}! ☀️`
          : lang === "pa" ? `ਸ਼ੁਭ ਸਵੇਰ, ${firstName}! ☀️`
          : lang === "od" ? `ଶୁଭ ସକାଳ, ${firstName}! ☀️`
          : lang === "sa" ? `शुभं प्रभातम्, ${firstName}! ☀️`
          : `Good morning, ${firstName}! ☀️`;
        await db.insert(aryaNotifications).values({
          userId: user.id,
          type: "morning_briefing" as any,
          title: notifTitle,
          message: briefing.slice(0, 500),
        }).catch(() => {});

        await sendPush(user.id, `☀️ ${notifTitle}`, briefing.slice(0, 120) + "...", "/icons/icon-192.png");
      } catch (err: any) {
        console.error(`[BRIEFING] Failed for user ${user.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[BRIEFING] Error:", err.message);
  }
}
