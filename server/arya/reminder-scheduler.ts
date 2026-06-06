import webpush from "web-push";
import { db } from "../db";
import { aryaReminders, aryaAppSettings, aryaPushSubscriptions, aryaUsers, aryaNotifications } from "@shared/schema";
import { eq, and, lte, isNull, or, sql } from "drizzle-orm";
import { fetchLatestNews, getNewsDigestText } from "./news-service";
import { sendMorningBriefings } from "./morning-briefing";
import { sendWeeklyReviews } from "./weekly-review";
import { checkSilentUsers } from "./silence-detection";
import { sendYourPatterns } from "./patterns-engine";
import { generateWeeklyReflectionShares } from "./reflection-share";
import { sweepGoalReminders } from "./auto-reminder";
import { sweepCalendarForReminders } from "./calendar-auto-reminders";

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

function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(',')[0].trim();
    if (first) return `https://${first}`;
  }
  return '';
}

async function sendPushToUser(userId: string, title: string, body: string, icon: string, extra?: Record<string, unknown>): Promise<void> {
  const subs = await db.select().from(aryaPushSubscriptions).where(eq(aryaPushSubscriptions.userId, userId));
  const payload = JSON.stringify({ title, body, icon, url: "/", ...extra });

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
      await sendPushToUser(
        reminder.userId,
        `${icon} ${reminder.title}`,
        reminder.message,
        "/icons/icon-192.png",
        { type: reminder.type, reminderId: reminder.id, scheduledAt: reminder.scheduledAt.toISOString() }
      );

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
    const appUrl = getAppBaseUrl();
    const sendPushWithMorningCard = async (userId: string, title: string, body: string, icon: string) => {
      const image = appUrl ? `${appUrl}/api/cards/morning/${userId}` : undefined;
      return sendPushToUser(userId, title, body, icon, {
        type: "morning_briefing",
        ...(image ? { image } : {}),
        actions: [
          { action: "open_arya", title: "🌅 Open ARYA" },
          { action: "voice_chat", title: "🎤 Voice chat" },
        ],
      });
    };
    await sendMorningBriefings(sendPushWithMorningCard);
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
    const appUrlW = getAppBaseUrl();
    const sendPushWithSundayCard = async (userId: string, title: string, body: string, icon: string) => {
      const image = appUrlW ? `${appUrlW}/api/cards/sunday_review/${userId}` : undefined;
      return sendPushToUser(userId, title, body, icon, {
        type: "weekly_review",
        ...(image ? { image } : {}),
        actions: [{ action: "open_arya", title: "📖 Read your letter" }],
      });
    };
    await sendWeeklyReviews(sendPushWithSundayCard);
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
      sql`SELECT * FROM arya_goals
       WHERE reminder_at IS NOT NULL
         AND reminder_at >= ${windowStart.toISOString()}
         AND reminder_at <= ${windowEnd.toISOString()}
         AND reminder_fired = false
         AND is_completed = false
         AND status = 'active'
         AND user_id IS NOT NULL`
    ) as any;

    const rows = upcoming.rows || [];

    for (const goal of rows) {
      if (!goal.user_id) continue;

      await sendPushToUser(goal.user_id, `🔔 ${goal.title}`, "ARYA reminder", "/icons/icon-192.png");

      await db.execute(
        sql`UPDATE arya_goals SET reminder_fired = true WHERE id = ${goal.id}`
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
let eveningGoalCheckinInterval: ReturnType<typeof setInterval> | null = null;
let sarvamHealthInterval: ReturnType<typeof setInterval> | null = null;

async function checkEveningGoalCheckins(): Promise<void> {
  const now = new Date();
  // IST offset is +5:30. We target 8 PM IST = 14:30 UTC. Allow ±15 min window.
  const utcHour   = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const totalMin  = utcHour * 60 + utcMinute;
  if (totalMin < 870 || totalMin > 900) return; // 14:30–15:00 UTC = 20:00–20:30 IST

  try {
    const result = await db.execute(
      sql`SELECT g.user_id, g.id, g.title, g.last_checked_at
          FROM arya_goals g
          WHERE g.status = 'active'
            AND g.progress = 0
            AND g.is_completed = false
            AND g.user_id IS NOT NULL
            AND (
              g.last_checked_at IS NULL
              OR g.last_checked_at < NOW() - INTERVAL '20 hours'
            )
          ORDER BY g.created_at ASC`
    ) as any;

    const rows = result.rows || [];
    const seen = new Set<string>(); // one notification per user

    for (const goal of rows) {
      if (!goal.user_id || seen.has(goal.user_id)) continue;
      seen.add(goal.user_id);
      const appUrl = getAppBaseUrl();
      const cardImage = appUrl ? `${appUrl}/api/cards/goal_checkin/${goal.user_id}` : undefined;
      await sendPushToUser(
        goal.user_id,
        `🎯 ${goal.title}`,
        "Did you work on this today?",
        "/icons/icon-192.png",
        { type: "goal_checkin", goalId: goal.id, ...(cardImage ? { image: cardImage } : {}) }
      );
      console.log(`[EveningCheckin] Sent to user ${goal.user_id} for goal "${goal.title}"`);
    }
  } catch (err: any) {
    console.error("[EVENING GOAL CHECKIN]", err.message);
  }
}

function scheduleMidnightSarvamCheck(): void {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // next midnight IST-ish
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();

  setTimeout(() => {
    import("./sarvam-health").then(({ runSarvamHealthCheck }) => runSarvamHealthCheck()).catch(err => {
      console.error("[SARVAM HEALTH] Daily check failed:", err.message);
    });
    // After first midnight run, repeat every 24 hours
    sarvamHealthInterval = setInterval(() => {
      import("./sarvam-health").then(({ runSarvamHealthCheck }) => runSarvamHealthCheck()).catch(err => {
        console.error("[SARVAM HEALTH] Daily check failed:", err.message);
      });
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  console.log(`[SCHEDULER] Sarvam health check scheduled — next run in ${Math.round(msUntilMidnight / 1000 / 60)} min (midnight)`);
}

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
  eveningGoalCheckinInterval = setInterval(checkEveningGoalCheckins, 10 * 60 * 1000); // check every 10 min

  // Nightly sweep — auto-create reminders for goals due within 7 days
  const msUntilNightly = (() => {
    const t = new Date();
    t.setHours(23, 0, 0, 0);
    if (t <= new Date()) t.setDate(t.getDate() + 1);
    return t.getTime() - Date.now();
  })();
  setTimeout(() => {
    sweepGoalReminders().catch(() => {});
    sweepCalendarForReminders().catch(() => {});
    setInterval(() => {
      sweepGoalReminders().catch(() => {});
      sweepCalendarForReminders().catch(() => {});
    }, 24 * 60 * 60 * 1000);
  }, msUntilNightly);

  // Sarvam speaker health check — daily at midnight
  scheduleMidnightSarvamCheck();

  // Seed an initial challenge if none exists
  import("./community-challenge").then(({ seedInitialChallenge }) => seedInitialChallenge()).catch(() => {});

  console.log("[SCHEDULER] Reminder scheduler started — briefing/review/challenge/silence/patterns/goal-reminders/sarvam-health active");
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
  if (eveningGoalCheckinInterval) { clearInterval(eveningGoalCheckinInterval); eveningGoalCheckinInterval = null; }
  if (sarvamHealthInterval) { clearInterval(sarvamHealthInterval); sarvamHealthInterval = null; }
}
