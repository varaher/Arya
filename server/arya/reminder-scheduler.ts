import webpush from "web-push";
import { db } from "../db";
import { aryaReminders, aryaAppSettings, aryaPushSubscriptions, aryaUsers, aryaNotifications } from "@shared/schema";
import { eq, and, lte, isNull, or } from "drizzle-orm";
import { fetchLatestNews, getNewsDigestText } from "./news-service";
import { sendMorningBriefings } from "./morning-briefing";
import { sendWeeklyReviews } from "./weekly-review";
import { checkSilentUsers } from "./silence-detection";
import { sendYourPatterns } from "./patterns-engine";
import { generateWeeklyReflectionShares } from "./reflection-share";

let vapidPublicKey: string | null = null;
let isInitialized = false;

export async function initVapidKeys(): Promise<void> {
  if (isInitialized) return;

  try {
    const [pubRow] = await db.select().from(aryaAppSettings).where(eq(aryaAppSettings.key, "vapid_public_key")).limit(1);
    const [prvRow] = await db.select().from(aryaAppSettings).where(eq(aryaAppSettings.key, "vapid_private_key")).limit(1);

    let publicKey: string;
    let privateKey: string;

    if (pubRow && prvRow) {
      publicKey = pubRow.value;
      privateKey = prvRow.value;
    } else {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
      await db.insert(aryaAppSettings).values({ key: "vapid_public_key", value: publicKey });
      await db.insert(aryaAppSettings).values({ key: "vapid_private_key", value: privateKey });
      console.log("[VAPID] Generated and stored new VAPID keys");
    }

    webpush.setVapidDetails("mailto:arya@varahgroup.com", publicKey, privateKey);
    vapidPublicKey = publicKey;
    isInitialized = true;
    console.log("[VAPID] Keys loaded. Push notifications ready.");
  } catch (err: any) {
    console.error("[VAPID] Failed to initialize:", err.message);
  }
}

export function getVapidPublicKey(): string | null {
  return vapidPublicKey;
}

function getNextScheduledAt(reminder: typeof aryaReminders.$inferSelect): Date | null {
  const now = new Date();
  switch (reminder.recurrence) {
    case "once":
      return null;
    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "daily": {
      const next = new Date(reminder.scheduledAt);
      while (next <= now) next.setDate(next.getDate() + 1);
      return next;
    }
    case "weekly": {
      const next = new Date(reminder.scheduledAt);
      while (next <= now) next.setDate(next.getDate() + 7);
      return next;
    }
    case "custom": {
      const mins = reminder.recurrenceMinutes || 60;
      return new Date(now.getTime() + mins * 60 * 1000);
    }
    default:
      return null;
  }
}

async function sendPushToUser(userId: string, title: string, body: string, icon: string): Promise<void> {
  const subs = await db.select().from(aryaPushSubscriptions).where(eq(aryaPushSubscriptions.userId, userId));
  const payload = JSON.stringify({ title, body, icon, url: "/" });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.delete(aryaPushSubscriptions).where(eq(aryaPushSubscriptions.id, sub.id));
      }
    }
  }
}

function getReminderIcon(type: string): string {
  const icons: Record<string, string> = {
    alarm: "⏰",
    water: "💧",
    work: "💼",
    medicine: "💊",
    exercise: "🏃",
    reminder: "🔔",
    custom: "🔔",
  };
  return icons[type] || "🔔";
}

async function checkAndFireReminders(): Promise<void> {
  try {
    const now = new Date();
    const dueReminders = await db
      .select()
      .from(aryaReminders)
      .where(
        and(
          eq(aryaReminders.isActive, true),
          lte(aryaReminders.scheduledAt, now),
          or(
            isNull(aryaReminders.lastTriggeredAt),
            lte(aryaReminders.lastTriggeredAt, aryaReminders.scheduledAt)
          )
        )
      );

    for (const reminder of dueReminders) {
      const icon = getReminderIcon(reminder.type);
      await sendPushToUser(reminder.userId, `${icon} ${reminder.title}`, reminder.message, "/icons/icon-192.png");

      const nextAt = getNextScheduledAt(reminder);
      if (nextAt) {
        await db.update(aryaReminders)
          .set({ scheduledAt: nextAt, lastTriggeredAt: now })
          .where(eq(aryaReminders.id, reminder.id));
      } else {
        await db.update(aryaReminders)
          .set({ isActive: false, lastTriggeredAt: now })
          .where(eq(aryaReminders.id, reminder.id));
      }
    }
  } catch (err: any) {
    console.error("[SCHEDULER]", err.message);
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let newsDigestInterval: ReturnType<typeof setInterval> | null = null;
let morningBriefingInterval: ReturnType<typeof setInterval> | null = null;
let weeklyReviewInterval: ReturnType<typeof setInterval> | null = null;
let weeklyChallengeInterval: ReturnType<typeof setInterval> | null = null;
let silenceDetectionInterval: ReturnType<typeof setInterval> | null = null;
let patternsInterval: ReturnType<typeof setInterval> | null = null;
let lastNewsDigestSent = 0;
let lastMorningBriefingSent = "";
let lastWeeklyReviewSent = "";
let lastWeeklyChallengeSent = "";
let lastSilenceCheckSent = "";
let lastPatternsSent = "";

async function sendNewsDigest(): Promise<void> {
  const now = Date.now();
  if (now - lastNewsDigestSent < 6 * 60 * 60 * 1000) return; // at most once per 6h
  try {
    const headlines = await fetchLatestNews(true);
    if (headlines.length === 0) return;

    const digestText = getNewsDigestText(headlines);
    if (!digestText) return;

    const subscribers = await db.select({ id: aryaUsers.id }).from(aryaUsers)
      .where(eq(aryaUsers.wantsNewsDigest, true));

    for (const user of subscribers) {
      try {
        await db.insert(aryaNotifications).values({
          userId: user.id,
          type: "news_digest",
          title: "Today's Headlines",
          message: digestText.slice(0, 500),
        });
        await sendPushToUser(user.id, "📰 ARYA News Digest", headlines[0]?.title || "Latest headlines available", "/icons/icon-192.png");
      } catch {}
    }

    lastNewsDigestSent = now;
    console.log(`[NEWS DIGEST] Sent to ${subscribers.length} subscribers`);
  } catch (err: any) {
    console.error("[NEWS DIGEST ERROR]", err.message);
  }
}

async function checkMorningBriefing(): Promise<void> {
  try {
    const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000)); // UTC+5:30
    const hour = nowIST.getUTCHours();
    const dateKey = nowIST.toISOString().slice(0, 10);
    if (hour !== 7) return; // Only fire at 7 AM IST
    if (lastMorningBriefingSent === dateKey) return; // Already sent today
    lastMorningBriefingSent = dateKey;
    await sendMorningBriefings(sendPushToUser);
  } catch (err: any) {
    console.error("[MORNING BRIEFING CHECK]", err.message);
  }
}

async function checkWeeklyReview(): Promise<void> {
  try {
    const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000)); // UTC+5:30
    const dayOfWeek = nowIST.getUTCDay(); // 0=Sun
    const hour = nowIST.getUTCHours();
    const weekKey = nowIST.toISOString().slice(0, 10);
    if (dayOfWeek !== 0 || hour !== 20) return; // Only Sunday 8 PM IST
    if (lastWeeklyReviewSent === weekKey) return;
    lastWeeklyReviewSent = weekKey;
    await sendWeeklyReviews(sendPushToUser);
    // Also generate reflection share links for users who opted in
    await generateWeeklyReflectionShares(sendPushToUser);
  } catch (err: any) {
    console.error("[WEEKLY REVIEW CHECK]", err.message);
  }
}

async function checkSilenceDetection(): Promise<void> {
  try {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const hour = nowIST.getUTCHours();
    const dateKey = nowIST.toISOString().slice(0, 10);
    if (hour !== 18) return; // Only run at 6 PM IST daily
    if (lastSilenceCheckSent === dateKey) return;
    lastSilenceCheckSent = dateKey;
    await checkSilentUsers(sendPushToUser);
  } catch (err: any) {
    console.error("[SILENCE CHECK]", err.message);
  }
}

async function checkPatterns(): Promise<void> {
  try {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const dayOfMonth = nowIST.getUTCDate();
    const hour = nowIST.getUTCHours();
    const monthKey = nowIST.toISOString().slice(0, 7); // YYYY-MM
    if (dayOfMonth !== 1 || hour !== 10) return; // 1st of each month at 10 AM IST
    if (lastPatternsSent === monthKey) return;
    lastPatternsSent = monthKey;
    await sendYourPatterns(sendPushToUser);
  } catch (err: any) {
    console.error("[PATTERNS CHECK]", err.message);
  }
}

async function checkWeeklyChallenge(): Promise<void> {
  try {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const dayOfWeek = nowIST.getUTCDay(); // 1 = Monday
    const hour = nowIST.getUTCHours();
    const weekKey = nowIST.toISOString().slice(0, 10);
    if (dayOfWeek !== 1 || hour !== 6) return; // Only Monday 6 AM IST
    if (lastWeeklyChallengeSent === weekKey) return;
    lastWeeklyChallengeSent = weekKey;
    const { generateWeeklyChallenge } = await import("./community-challenge");
    const generated = await generateWeeklyChallenge();
    if (generated) console.log("[COMMUNITY] Weekly challenge generated via scheduler");
  } catch (err: any) {
    console.error("[WEEKLY CHALLENGE CHECK]", err.message);
  }
}

async function checkGoalReminders(): Promise<void> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000);  // 5 min ago
    const windowEnd   = new Date(now.getTime() + 5 * 60 * 1000);  // 5 min ahead

    const upcoming = await db.execute(
      `SELECT * FROM arya_goals
       WHERE reminder_at IS NOT NULL
         AND reminder_at >= $1
         AND reminder_at <= $2
         AND reminder_fired = false
         AND is_completed = false
         AND status = 'active'
         AND user_id IS NOT NULL`,
      [windowStart.toISOString(), windowEnd.toISOString()]
    ) as any;

    const rows = upcoming.rows || [];

    for (const goal of rows) {
      if (!goal.user_id) continue;

      await sendPushToUser(goal.user_id, {
        title: 'ARYA reminder',
        body: goal.title,
        data: { goalId: goal.id, type: 'goal_reminder' },
      });

      await db.execute(
        `UPDATE arya_goals SET reminder_fired = true WHERE id = $1`,
        [goal.id]
      );

      await db.insert(aryaNotifications).values({
        userId: goal.user_id,
        type: 'reminder',
        title: 'ARYA reminder',
        message: goal.title,
        goalId: goal.id,
      }).catch(() => {});

      console.log(`[GoalReminder] Fired reminder for goal "${goal.title}" (user ${goal.user_id})`);
    }
  } catch (err: any) {
    console.error("[GOAL REMINDER CHECK]", err.message);
  }
}

let goalReminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler(): void {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(checkAndFireReminders, 30 * 1000);
  checkAndFireReminders();

  newsDigestInterval = setInterval(sendNewsDigest, 60 * 60 * 1000); // check every hour, sends at most every 6h
  setTimeout(sendNewsDigest, 5000); // send shortly after startup if due

  morningBriefingInterval = setInterval(checkMorningBriefing, 5 * 60 * 1000); // check every 5 min
  weeklyReviewInterval = setInterval(checkWeeklyReview, 15 * 60 * 1000); // check every 15 min
  weeklyChallengeInterval = setInterval(checkWeeklyChallenge, 15 * 60 * 1000); // check every 15 min
  silenceDetectionInterval = setInterval(checkSilenceDetection, 30 * 60 * 1000); // check every 30 min
  patternsInterval = setInterval(checkPatterns, 60 * 60 * 1000); // check every hour
  goalReminderInterval = setInterval(checkGoalReminders, 5 * 60 * 1000); // check every 5 min

  // Seed an initial challenge if none exists
  import("./community-challenge").then(({ seedInitialChallenge }) => seedInitialChallenge()).catch(() => {});

  console.log("[SCHEDULER] Reminder scheduler started — briefing/review/challenge/silence/patterns/goal-reminders active");
}

export function stopReminderScheduler(): void {
  if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
  if (newsDigestInterval) { clearInterval(newsDigestInterval); newsDigestInterval = null; }
  if (morningBriefingInterval) { clearInterval(morningBriefingInterval); morningBriefingInterval = null; }
  if (weeklyReviewInterval) { clearInterval(weeklyReviewInterval); weeklyReviewInterval = null; }
  if (weeklyChallengeInterval) { clearInterval(weeklyChallengeInterval); weeklyChallengeInterval = null; }
  if (silenceDetectionInterval) { clearInterval(silenceDetectionInterval); silenceDetectionInterval = null; }
  if (patternsInterval) { clearInterval(patternsInterval); patternsInterval = null; }
  if (goalReminderInterval) { clearInterval(goalReminderInterval); goalReminderInterval = null; }
}
