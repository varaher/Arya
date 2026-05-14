import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaMoodCheckins, aryaUsageBudget, aryaGoals, aryaNotifications } from "@shared/schema";
import { eq, and, gte, lt } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function groupByDayOfWeek<T extends { createdAt: Date }>(items: T[]): Record<number, T[]> {
  const groups: Record<number, T[]> = {};
  for (const item of items) {
    const day = new Date(item.createdAt).getDay();
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
  }
  return groups;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function generateUserPatterns(userId: string): Promise<string | null> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

    const [user] = await db.select({
      name: aryaUsers.name,
      createdAt: aryaUsers.createdAt,
    }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);

    if (!user) return null;

    // Only run for accounts 30+ days old
    const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 30) return null;

    const firstName = user.name?.split(" ")[0] || "friend";

    // Mood check-ins over 30 days
    const moodData = await db.select({
      mood: aryaMoodCheckins.mood,
      energy: aryaMoodCheckins.energy,
      createdAt: aryaMoodCheckins.createdAt,
    }).from(aryaMoodCheckins)
      .where(and(eq(aryaMoodCheckins.userId, userId), gte(aryaMoodCheckins.createdAt, thirtyDaysAgo)));

    // Usage budget (activity days)
    const usageData = await db.select({
      dateKey: aryaUsageBudget.dateKey,
      textChatCount: aryaUsageBudget.textChatCount,
      createdAt: aryaUsageBudget.createdAt,
    }).from(aryaUsageBudget)
      .where(and(eq(aryaUsageBudget.userId, userId), gte(aryaUsageBudget.createdAt, thirtyDaysAgo)));

    // Goals progress
    const goals = await db.select({
      title: aryaGoals.title,
      progress: aryaGoals.progress,
      streakCount: aryaGoals.streakCount,
      status: aryaGoals.status,
      lastActivityAt: aryaGoals.lastActivityAt,
    }).from(aryaGoals)
      .where(eq(aryaGoals.userId, userId));

    // Insufficient data
    if (moodData.length < 5 && usageData.length < 5) return null;

    // Analyse mood by day of week
    const moodByDay = groupByDayOfWeek(moodData);
    const moodAverages: { day: string; avgMood: number; avgEnergy: number; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const entries = moodByDay[d] || [];
      if (entries.length === 0) continue;
      moodAverages.push({
        day: DAYS[d],
        avgMood: average(entries.map(e => e.mood)),
        avgEnergy: average(entries.map(e => e.energy)),
        count: entries.length,
      });
    }
    moodAverages.sort((a, b) => b.avgMood - a.avgMood);
    const bestMoodDay = moodAverages[0];
    const worstMoodDay = moodAverages[moodAverages.length - 1];

    // Analyse usage by day of week
    const usageByDay: Record<number, number[]> = {};
    for (const u of usageData) {
      const date = new Date(u.createdAt);
      const day = date.getDay();
      if (!usageByDay[day]) usageByDay[day] = [];
      usageByDay[day].push(u.textChatCount);
    }
    const usageDayAverages = Object.entries(usageByDay).map(([day, counts]) => ({
      day: DAYS[Number(day)],
      avgChats: average(counts),
    }));
    usageDayAverages.sort((a, b) => b.avgChats - a.avgChats);
    const mostActiveDay = usageDayAverages[0];

    // Build context for GPT
    const moodSummary = moodAverages.length >= 2
      ? `Best mood day: ${bestMoodDay.day} (avg ${bestMoodDay.avgMood.toFixed(1)}/5), Hardest day: ${worstMoodDay.day} (avg ${worstMoodDay.avgMood.toFixed(1)}/5)`
      : "Limited mood data";

    const usageSummary = mostActiveDay
      ? `Most active ARYA usage: ${mostActiveDay.day} (avg ${mostActiveDay.avgChats.toFixed(1)} chats/week)`
      : "Limited usage data";

    const goalsSummary = goals.length > 0
      ? goals.map(g => `${g.title}: ${g.progress}% progress, ${g.streakCount}-day streak`).join("; ")
      : "No goals tracked yet";

    const prompt = `Based on 30 days of data for ${firstName}, generate a personal "Your Patterns" insight. Be specific, true, and slightly surprising. Keep it under 160 words.

Their data:
- ${moodSummary}
- ${usageSummary}
- Goals: ${goalsSummary}

Write 2–3 specific observations like:
"You come alive on [day] — your mood and energy are consistently highest then."
"Sunday nights tend to be harder for you."
"Your longest conversations with me happen on [day] — you're doing your deepest thinking then."

End with one sentence about why this matters for how they should structure their week.
Do NOT use generic advice. Only make claims the data supports. Sound like a wise friend who's been paying attention.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 220,
    } as any);

    return (response as any).choices?.[0]?.message?.content || null;
  } catch (err: any) {
    console.error("[PATTERNS ENGINE]", err.message);
    return null;
  }
}

export async function sendYourPatterns(
  sendPush: (userId: string, title: string, body: string, icon: string) => Promise<void>
): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
    const thirtyOneDaysAgo = new Date(Date.now() - (31 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgoFromMonth = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

    // Users whose account is 30+ days old
    const eligibleUsers = await db.select({
      id: aryaUsers.id,
      name: aryaUsers.name,
    }).from(aryaUsers)
      .where(and(eq(aryaUsers.isActive, true), lt(aryaUsers.createdAt, thirtyDaysAgo)));

    for (const user of eligibleUsers) {
      try {
        // Only send once per 30 days
        const recentPattern = await db.select({ id: aryaNotifications.id })
          .from(aryaNotifications)
          .where(and(
            eq(aryaNotifications.userId, user.id),
            eq(aryaNotifications.type, "your_patterns" as any),
            gte(aryaNotifications.createdAt, thirtyDaysAgoFromMonth)
          ))
          .limit(1);

        if (recentPattern.length > 0) continue;

        const insight = await generateUserPatterns(user.id);
        if (!insight) continue;

        const firstName = user.name?.split(" ")[0] || "there";

        await db.insert(aryaNotifications).values({
          userId: user.id,
          type: "your_patterns" as any,
          title: `📊 Your patterns — ${firstName}`,
          message: insight,
        });

        await sendPush(
          user.id,
          `📊 30 days in — here's what I've noticed, ${firstName}`,
          insight.slice(0, 120) + "…",
          "/icons/icon-192.png"
        );

        console.log(`[PATTERNS] Sent 30-day insight to ${firstName} (${user.id})`);
      } catch (err: any) {
        console.error(`[PATTERNS] Failed for user ${user.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[PATTERNS]", err.message);
  }
}
