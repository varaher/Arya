import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaGoals, aryaNotifications } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateWeeklyReview(userId: string): Promise<string> {
  try {
    const [user] = await db.select({ name: aryaUsers.name })
      .from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const goals = await db.select({
      title: aryaGoals.title,
      progress: aryaGoals.progress,
      streakCount: aryaGoals.streakCount,
      status: aryaGoals.status,
      updatedAt: aryaGoals.updatedAt,
    }).from(aryaGoals)
      .where(eq(aryaGoals.userId, userId))
      .limit(10);

    const activeGoals = goals.filter(g => g.status === "active");
    const completedGoals = goals.filter(g => g.status === "completed" && g.updatedAt && g.updatedAt >= weekAgo);

    const firstName = user?.name?.split(" ")[0] || "friend";

    const goalsText = activeGoals.length > 0
      ? activeGoals.map(g => `• ${g.title}: ${g.progress}% progress, ${g.streakCount} day streak`).join("\n")
      : "No active goals this week.";

    const completedText = completedGoals.length > 0
      ? completedGoals.map(g => `• ${g.title} ✅`).join("\n")
      : "";

    const prompt = `Generate a warm, insightful weekly review for ${firstName}. Keep it under 200 words.

Active goals progress this week:
${goalsText}
${completedText ? `\nCompleted this week:\n${completedText}` : ""}

Write a genuine, personal weekly review:
1. Acknowledge what they worked on (name specific goals)
2. Celebrate any streaks or progress honestly  
3. One gentle nudge for the coming week
4. End with a motivating thought

Be warm and honest — don't be fake positive if progress was low. Sound like a trusted mentor who truly cares.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 250,
    } as any);

    return (response as any).choices?.[0]?.message?.content || `Hey ${firstName}, another week done. Reflect on what you did, learn from what you didn't, and step forward with clarity. 🌱`;
  } catch {
    return "Another week complete. Take a moment to reflect on your progress, celebrate small wins, and set a clear intention for the week ahead.";
  }
}

export async function sendWeeklyReviews(sendPush: (userId: string, title: string, body: string, icon: string) => Promise<void>): Promise<void> {
  try {
    const users = await db.select({
      id: aryaUsers.id,
      name: aryaUsers.name,
      weeklyReviewEnabled: (aryaUsers as any).weeklyReviewEnabled,
    }).from(aryaUsers).where(eq(aryaUsers.isActive, true));

    const eligible = users.filter((u: any) => u.weeklyReviewEnabled);
    console.log(`[WEEKLY REVIEW] Sending to ${eligible.length} users`);

    for (const user of eligible) {
      try {
        const review = await generateWeeklyReview(user.id);
        const firstName = user.name?.split(" ")[0] || "there";

        await db.insert(aryaNotifications).values({
          userId: user.id,
          type: "weekly_review" as any,
          title: `📊 Your Weekly Review`,
          message: review.slice(0, 500),
        }).catch(() => {});

        await sendPush(user.id, `📊 Weekly Review, ${firstName}`, review.slice(0, 120) + "...", "/icons/icon-192.png");
      } catch (err: any) {
        console.error(`[WEEKLY REVIEW] Failed for user ${user.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[WEEKLY REVIEW] Error:", err.message);
  }
}
