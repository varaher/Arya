import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaGoals, aryaNotifications } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function generateShareToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

interface ReflectionContent {
  userName: string;
  period: string;
  workedOn: string;
  struggle: string;
  win: string;
  currentGoal: string | null;
  goalProgress: number | null;
}

async function generateReflectionContent(userId: string): Promise<ReflectionContent | null> {
  try {
    const [user] = await db.select({
      name: aryaUsers.name,
    }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);

    if (!user) return null;

    const goals = await db.select({
      title: aryaGoals.title,
      progress: aryaGoals.progress,
      streakCount: aryaGoals.streakCount,
      status: aryaGoals.status,
    }).from(aryaGoals)
      .where(eq(aryaGoals.userId, userId))
      .limit(10);

    const activeGoals = goals.filter(g => g.status === "active");
    const completedGoals = goals.filter(g => g.status === "completed");
    const firstName = user.name?.split(" ")[0] || "friend";

    const goalsText = activeGoals.length > 0
      ? activeGoals.map(g => `"${g.title}" — ${g.progress}% done, ${g.streakCount}-day streak`).join("; ")
      : "No active goals";

    const now = new Date();
    const weekStart = getWeekStart();
    const period = `${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

    const prompt = `${firstName} is sharing their weekly growth reflection with someone they trust. Based on their data, write THREE short, honest sentences — one for each section. Keep each under 30 words. Be specific, warm, and real — not corporate.

Their data:
Active goals: ${goalsText}
${completedGoals.length > 0 ? `Recently completed: ${completedGoals.map(g => g.title).join(", ")}` : ""}

Write exactly this JSON (no markdown, no extra keys):
{
  "workedOn": "<what they showed up for this week — name a specific goal>",
  "struggle": "<one honest thing they found hard or are working through>",
  "win": "<one genuine thing worth celebrating, even if small>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 200,
      response_format: { type: "json_object" },
    } as any);

    const raw = (response as any).choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const primaryGoal = activeGoals.sort((a, b) => (b.streakCount || 0) - (a.streakCount || 0))[0] || null;

    return {
      userName: user.name || "A friend",
      period,
      workedOn: parsed.workedOn || "Showing up consistently this week",
      struggle: parsed.struggle || "Finding balance between doing and resting",
      win: parsed.win || "Kept going even when it was hard",
      currentGoal: primaryGoal?.title || null,
      goalProgress: primaryGoal?.progress ?? null,
    };
  } catch (err: any) {
    console.error("[REFLECTION SHARE] Content generation failed:", err.message);
    return null;
  }
}

export async function generateWeeklyReflectionShares(
  sendPush: (userId: string, title: string, body: string, icon: string) => Promise<void>
): Promise<void> {
  try {
    const users = await db.select({
      id: aryaUsers.id,
      name: aryaUsers.name,
      reflectionShareEnabled: (aryaUsers as any).reflectionShareEnabled,
      reflectionSharePaused: (aryaUsers as any).reflectionSharePaused,
      reflectionShareName: (aryaUsers as any).reflectionShareName,
      reflectionShareContact: (aryaUsers as any).reflectionShareContact,
    }).from(aryaUsers)
      .where(eq(aryaUsers.isActive, true));

    const eligible = users.filter((u: any) =>
      u.reflectionShareEnabled && !u.reflectionSharePaused && u.reflectionShareName
    );

    console.log(`[REFLECTION SHARE] Generating for ${eligible.length} users`);

    for (const user of eligible) {
      try {
        const content = await generateReflectionContent(user.id);
        if (!content) continue;

        const token = generateShareToken();
        const weekStart = getWeekStart();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Store the share record
        await db.execute(
          `INSERT INTO arya_reflection_shares (user_id, share_token, week_start, content, expires_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (share_token) DO NOTHING`,
          [user.id, token, weekStart.toISOString().slice(0, 10), JSON.stringify(content), expiresAt.toISOString()]
        );

        const firstName = user.name?.split(" ")[0] || "there";
        const recipientName = (user as any).reflectionShareName;
        const shareUrl = `${process.env.APP_URL || "https://aryaai.in"}/reflection/${token}`;

        // In-app notification with the link
        await db.insert(aryaNotifications).values({
          userId: user.id,
          type: "weekly_review" as any,
          title: `Your week is ready to share with ${recipientName}`,
          message: `Your weekly reflection is ready. Share it with ${recipientName}: ${shareUrl}`,
        }).catch(() => {});

        await sendPush(
          user.id,
          `Share your week with ${recipientName} 🔗`,
          `Tap to see your weekly reflection and share the link`,
          "/icons/icon-192.png"
        );

        console.log(`[REFLECTION SHARE] Created share for ${firstName} → ${recipientName}`);
      } catch (err: any) {
        console.error(`[REFLECTION SHARE] Failed for user ${user.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[REFLECTION SHARE]", err.message);
  }
}

export async function getReflectionByToken(token: string): Promise<{
  content: ReflectionContent;
  weekStart: string;
  viewedAt: string | null;
  expired: boolean;
} | null> {
  try {
    const rows = await db.execute(
      `SELECT content, week_start, viewed_at, expires_at, is_active FROM arya_reflection_shares WHERE share_token = $1 LIMIT 1`,
      [token]
    );

    const row = (rows as any).rows?.[0];
    if (!row || !row.is_active) return null;

    const expired = new Date(row.expires_at) < new Date();

    // Mark as viewed if first time
    if (!row.viewed_at && !expired) {
      await db.execute(
        `UPDATE arya_reflection_shares SET viewed_at = NOW() WHERE share_token = $1`,
        [token]
      );
    }

    return {
      content: row.content as ReflectionContent,
      weekStart: row.week_start,
      viewedAt: row.viewed_at ? new Date(row.viewed_at).toISOString() : null,
      expired,
    };
  } catch (err: any) {
    console.error("[REFLECTION SHARE] Fetch failed:", err.message);
    return null;
  }
}
