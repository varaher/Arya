import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaGoals, aryaNotifications } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { fetchMarketNews, fetchLatestNews } from "./news-service";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateMorningBriefing(userId: string): Promise<string> {
  try {
    const [user] = await db.select({
      name: aryaUsers.name,
      preferredLanguage: aryaUsers.preferredLanguage,
    }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);

    const activeGoals = await db.select({
      title: aryaGoals.title,
      progress: aryaGoals.progress,
      streakCount: aryaGoals.streakCount,
    }).from(aryaGoals)
      .where(and(eq(aryaGoals.userId, userId), eq(aryaGoals.status, "active")))
      .limit(3);

    const [marketNews, generalNews] = await Promise.all([
      fetchMarketNews().catch(() => []),
      fetchLatestNews().catch(() => []),
    ]);

    const topMarket = marketNews.slice(0, 3).map(h => `• ${h.title} (${h.source})`).join("\n");
    const topIndia = generalNews.filter(h => h.category === "india").slice(0, 3).map(h => `• ${h.title}`).join("\n");

    const goalsText = activeGoals.length > 0
      ? activeGoals.map(g => `• ${g.title} — ${g.progress}% done, ${g.streakCount} day streak`).join("\n")
      : "No active goals yet.";

    const firstName = user?.name?.split(" ")[0] || "friend";
    const now = new Date();
    const day = now.toLocaleDateString("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });

    const prompt = `Generate a warm, concise morning briefing for ${firstName} on this ${day}. Keep it under 150 words, personal and energizing.

Their active goals:
${goalsText}

Top India news today:
${topIndia}

Market pulse:
${topMarket}

Write a natural morning briefing: start with a warm greeting using their name, briefly mention 1-2 relevant news items, remind them of their most important goal with encouragement, and end with one short motivating thought. No bullet points in the final output — write flowing, warm sentences like a personal advisor.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 200,
    } as any);

    return (response as any).choices?.[0]?.message?.content || `Good morning, ${firstName}! Ready to make today count? Check your goals and stay focused. 🌅`;
  } catch {
    return "Good morning! Today is a fresh start. Check your goals and take one small step forward. 🌅";
  }
}

export async function sendMorningBriefings(sendPush: (userId: string, title: string, body: string, icon: string) => Promise<void>): Promise<void> {
  try {
    const users = await db.select({
      id: aryaUsers.id,
      name: aryaUsers.name,
      morningBriefingEnabled: (aryaUsers as any).morningBriefingEnabled,
    }).from(aryaUsers)
      .where(eq(aryaUsers.isActive, true));

    const eligible = users.filter((u: any) => u.morningBriefingEnabled);
    console.log(`[BRIEFING] Sending morning briefings to ${eligible.length} users`);

    for (const user of eligible) {
      try {
        const briefing = await generateMorningBriefing(user.id);
        const firstName = user.name?.split(" ")[0] || "there";

        await db.insert(aryaNotifications).values({
          userId: user.id,
          type: "morning_briefing" as any,
          title: `Good morning, ${firstName}! ☀️`,
          message: briefing.slice(0, 500),
        }).catch(() => {});

        await sendPush(user.id, `☀️ Good morning, ${firstName}!`, briefing.slice(0, 120) + "...", "/icons/icon-192.png");
      } catch (err: any) {
        console.error(`[BRIEFING] Failed for user ${user.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[BRIEFING] Error:", err.message);
  }
}
