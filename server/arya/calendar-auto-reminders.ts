/**
 * calendar-auto-reminders.ts
 * Connection 5 — Calendar → Auto-reminders
 *
 * Automatically creates smart reminders for important calendar events.
 *
 * Critical events (conference, surgery, interview, exam, presentation):
 *   • Night before at 9 PM
 *   • Morning of at 7 AM
 *   • 2 hours before
 *   • 30 minutes before
 *
 * Important events (meeting, seminar, workshop, review):
 *   • Morning of at 8 AM
 *   • 1 hour before
 *
 * All duplicate-safe — never creates the same reminder twice.
 *
 * Usage in routes.ts (calendar events GET):
 *   for (const event of events) {
 *     autoCreateCalendarReminders(userId, event).catch(() => {});
 *   }
 */

import { db } from "../db";
import { aryaReminders } from "@shared/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export interface CalendarEventInput {
  summary: string;
  start: string;   // ISO string or "HH:MM AM/PM"
  end?: string;
}

const CRITICAL_KEYWORDS = [
  "surgery", "procedure", "conference", "interview",
  "exam", "presentation", "inauguration", "pitch",
  "pocus", "lecture", "seminar",
];

const IMPORTANT_KEYWORDS = [
  "meeting", "review", "workshop", "webinar",
  "panel", "talk", "speech", "demo",
];

function isCritical(title: string): boolean {
  const l = title.toLowerCase();
  return CRITICAL_KEYWORDS.some(k => l.includes(k));
}

function isImportant(title: string): boolean {
  const l = title.toLowerCase();
  return IMPORTANT_KEYWORDS.some(k => l.includes(k)) || isCritical(l);
}

function subHours(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 3600_000);
}

function subDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 86_400_000);
}

function setHourOfDay(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function alreadyExists(
  userId: string,
  title: string,
  scheduledAt: Date,
  toleranceMinutes = 120,
): Promise<boolean> {
  const windowStart = new Date(scheduledAt.getTime() - toleranceMinutes * 60_000);
  const windowEnd = new Date(scheduledAt.getTime() + toleranceMinutes * 60_000);
  const rows = await db
    .select({ id: aryaReminders.id })
    .from(aryaReminders)
    .where(
      and(
        eq(aryaReminders.userId, userId),
        eq(aryaReminders.title, title),
        gte(aryaReminders.scheduledAt, windowStart),
        lte(aryaReminders.scheduledAt, windowEnd),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function autoCreateCalendarReminders(
  userId: string,
  event: CalendarEventInput,
): Promise<number> {
  const title = event.summary?.trim();
  if (!title || !isImportant(title)) return 0;

  const eventTime = new Date(event.start);
  if (isNaN(eventTime.getTime())) return 0;

  const now = new Date();
  const hoursUntil = (eventTime.getTime() - now.getTime()) / 3_600_000;
  if (hoursUntil < 0) return 0; // already past

  const critical = isCritical(title);
  const candidates: Array<{ title: string; scheduledAt: Date; message: string }> = [];

  if (critical) {
    // Night before at 9 PM
    if (hoursUntil > 14) {
      const nightBefore = setHourOfDay(subDays(eventTime, 1), 21);
      if (nightBefore > now) {
        candidates.push({
          title: `${title} — tomorrow`,
          scheduledAt: nightBefore,
          message: `You have ${title} tomorrow. Prepare tonight, rest well.`,
        });
      }
    }

    // Morning of at 7 AM
    if (hoursUntil > 2) {
      const morningOf = setHourOfDay(eventTime, 7);
      if (morningOf > now && morningOf < eventTime) {
        candidates.push({
          title: `${title} — today`,
          scheduledAt: morningOf,
          message: `${title} is today. You've prepared for this. Trust what you know.`,
        });
      }
    }

    // 2 hours before
    if (hoursUntil > 2.5) {
      const twoHoursBefore = subHours(eventTime, 2);
      if (twoHoursBefore > now) {
        candidates.push({
          title: `${title} in 2 hours`,
          scheduledAt: twoHoursBefore,
          message: `2 hours until ${title}. Eat something. Breathe. You're ready.`,
        });
      }
    }

    // 30 minutes before
    if (hoursUntil > 0.75) {
      const thirtyBefore = subHours(eventTime, 0.5);
      if (thirtyBefore > now) {
        candidates.push({
          title: `${title} — starting soon`,
          scheduledAt: thirtyBefore,
          message: `${title} starts in 30 minutes. Calm. Present. Ready.`,
        });
      }
    }
  } else {
    // Important (not critical) — morning + 1 hour before
    if (hoursUntil > 1) {
      const morningOf = setHourOfDay(eventTime, 8);
      if (morningOf > now && morningOf < eventTime) {
        candidates.push({
          title: `${title} today`,
          scheduledAt: morningOf,
          message: `You have ${title} today. Know what you want from it.`,
        });
      }
    }

    if (hoursUntil > 1.5) {
      const oneHourBefore = subHours(eventTime, 1);
      if (oneHourBefore > now) {
        candidates.push({
          title: `${title} in 1 hour`,
          scheduledAt: oneHourBefore,
          message: `${title} in one hour. What's the one thing you want to say or get done?`,
        });
      }
    }
  }

  let created = 0;
  for (const c of candidates) {
    const exists = await alreadyExists(userId, c.title, c.scheduledAt);
    if (exists) continue;
    await db.insert(aryaReminders).values({
      userId,
      title: c.title,
      message: c.message,
      type: "reminder",
      scheduledAt: c.scheduledAt,
      recurrence: "once",
      isActive: true,
      soundEnabled: true,
    });
    created++;
  }

  if (created > 0) {
    console.log(`[CAL-REMINDER] Created ${created} reminders for "${title}" (user ${userId})`);
  }
  return created;
}

/**
 * Nightly sweep — fetch calendar events for all users with calendar connected
 * and auto-create reminders for important upcoming events.
 * Called from reminder-scheduler.ts at 11 PM daily.
 */
export async function sweepCalendarForReminders(): Promise<void> {
  try {
    const { aryaUsers } = await import("@shared/schema");
    const { isNotNull } = await import("drizzle-orm");

    // Get users with Google Calendar connected (they have a refresh token)
    const users = await db
      .select({ id: aryaUsers.id })
      .from(aryaUsers)
      .where(isNotNull((aryaUsers as any).googleRefreshToken))
      .limit(500);

    if (users.length === 0) return;

    const { getUpcomingEvents } = await import("./google-calendar");
    let total = 0;

    for (const user of users) {
      try {
        const events = await getUpcomingEvents(user.id, 3); // next 3 days
        for (const ev of events) {
          const n = await autoCreateCalendarReminders(user.id, {
            summary: (ev as any).summary ?? "",
            start: (ev as any).start ?? "",
          }).catch(() => 0);
          total += n;
        }
      } catch {
        // Per-user errors are non-fatal
      }
    }

    if (total > 0) {
      console.log(`[CAL-REMINDER] Nightly sweep created ${total} calendar reminders`);
    }
  } catch (err: any) {
    console.error("[CAL-REMINDER] Sweep failed:", err.message);
  }
}
