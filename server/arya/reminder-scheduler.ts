import webpush from "web-push";
import { db } from "../db";
import { aryaReminders, aryaAppSettings, aryaPushSubscriptions } from "@shared/schema";
import { eq, and, lte, isNull, or } from "drizzle-orm";

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

export function startReminderScheduler(): void {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(checkAndFireReminders, 30 * 1000);
  checkAndFireReminders();
  console.log("[SCHEDULER] Reminder scheduler started (30s interval)");
}

export function stopReminderScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
