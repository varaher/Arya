import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaGoals, aryaNotifications, aryaMoodCheckins } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateWeeklyReview(userId: string): Promise<string> {
  try {
    const [user] = await db.select({
      name: aryaUsers.name,
      futureYouLetter: (aryaUsers as any).futureYouLetter,
    }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const goals = await db.select({
      title: aryaGoals.title,
      progress: aryaGoals.progress,
      streakCount: aryaGoals.streakCount,
      status: aryaGoals.status,
      updatedAt: aryaGoals.updatedAt,
    }).from(aryaGoals).where(eq(aryaGoals.userId, userId)).limit(10);

    const moodData = await db.select({
      mood: aryaMoodCheckins.mood,
      energy: aryaMoodCheckins.energy,
      createdAt: aryaMoodCheckins.createdAt,
    }).from(aryaMoodCheckins)
      .where(and(eq(aryaMoodCheckins.userId, userId), gte(aryaMoodCheckins.createdAt, weekAgo)));

    const activeGoals = goals.filter(g => g.status === "active");
    const completedGoals = goals.filter(g => g.status === "completed" && g.updatedAt && g.updatedAt >= weekAgo);
    const firstName = user?.name?.split(" ")[0] || "friend";

    const goalsText = activeGoals.length > 0
      ? activeGoals.map(g => `"${g.title}" — ${g.progress}% progress, ${g.streakCount}-day streak`).join("\n")
      : "No active goals this week.";

    const completedText = completedGoals.length > 0
      ? completedGoals.map(g => `"${g.title}" — completed this week`).join("\n") : "";

    const avgMood = moodData.length > 0
      ? (moodData.reduce((s, m) => s + m.mood, 0) / moodData.length).toFixed(1) : null;
    const moodText = avgMood
      ? `Average mood: ${avgMood}/5 across ${moodData.length} check-ins this week`
      : "No mood check-ins this week";

    const futureLetterContext = (user as any)?.futureYouLetter
      ? `\nThe letter they once wrote about who they want to become:\n"${((user as any).futureYouLetter as string).slice(0, 350)}"`
      : "";

    const prompt = `You are ARYA — ${firstName}'s personal thinking partner. Write their Sunday weekly review. Under 200 words. Write it as a STORY, not a report.

NEVER say "you completed X out of Y goals." NEVER use bullet points. This is a letter.

Instead, write like this:
- "This was the week you decided to..."
- "Something shifted in how you showed up for [goal]."
- "The streak on [goal] isn't just a number — it's evidence of who you're becoming."
- If progress was low: "You pulled back this week. That's data, not failure."

Their data:
Goals: ${goalsText}
${completedText ? `Completed: ${completedText}` : ""}
Mood: ${moodText}
${futureLetterContext}

Rules:
- Name their goals by actual title
- Reference their mood data if meaningful
- If they wrote a future letter, echo one phrase back — briefly, not loudly
- End with exactly ONE sentence they'll carry into the week. Make it true, not motivational-poster true.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 280,
    } as any);

    return (response as any).choices?.[0]?.message?.content
      || `${firstName}, another week written into your story. What you chose — and didn't choose — this week is information. Use it.`;
  } catch {
    return "Another week complete. What you chose this week tells you something about who you're becoming. Sit with that before the next one begins.";
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
