/**
 * auto-reminder.ts
 * Automatically creates 3 deadline reminders whenever a goal
 * is created or updated with a dueDate or reminderAt field.
 *
 * Reminder schedule:
 *   • 3 days before deadline — "3 days left — <title>"
 *   • 1 day before deadline  — "Tomorrow — <title>"
 *   • Morning of deadline    — "Today — <title>"
 *
 * De-duplication: skips if a reminder with the same title already
 * exists within 2 hours of the target time for this user.
 */

import { db } from "../db";
import { aryaReminders } from "@shared/schema";
import { and, eq, gte, lte } from "drizzle-orm";

interface GoalLike {
  id: string;
  title: string;
  dueDate?: Date | null;
  reminderAt?: Date | null;
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function setMorning(date: Date): Date {
  const d = new Date(date);
  d.setHours(8, 0, 0, 0);
  return d;
}

function daysUntil(deadline: Date): number {
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
}

async function reminderAlreadyExists(
  userId: string,
  title: string,
  scheduledAt: Date,
): Promise<boolean> {
  const windowStart = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000);
  const existing = await db
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
  return existing.length > 0;
}

export async function scheduleGoalReminders(
  userId: string,
  goal: GoalLike,
): Promise<number> {
  const deadline = goal.dueDate ?? goal.reminderAt ?? null;
  if (!deadline) return 0;

  const now = new Date();
  if (deadline <= now) return 0; // already past — skip

  const days = daysUntil(deadline);
  let created = 0;

  const candidates: Array<{ title: string; scheduledAt: Date; message: string }> = [];

  if (days >= 3) {
    candidates.push({
      title: `3 days left — ${goal.title}`,
      scheduledAt: setMorning(subDays(deadline, 3)),
      message: `Your goal "${goal.title}" is due in 3 days. Time to get moving.`,
    });
  }

  if (days >= 1) {
    candidates.push({
      title: `Tomorrow — ${goal.title}`,
      scheduledAt: setMorning(subDays(deadline, 1)),
      message: `"${goal.title}" is due tomorrow. What's your final push?`,
    });
  }

  // Morning of
  const morningOf = setMorning(deadline);
  if (morningOf > now) {
    candidates.push({
      title: `Today — ${goal.title}`,
      scheduledAt: morningOf,
      message: `"${goal.title}" is due today. Make it count.`,
    });
  }

  for (const c of candidates) {
    if (c.scheduledAt <= now) continue;
    const exists = await reminderAlreadyExists(userId, c.title, c.scheduledAt);
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
    console.log(`[AUTO-REMINDER] Created ${created} reminders for goal "${goal.title}" (user ${userId})`);
  }
  return created;
}

/**
 * Nightly sweep — schedule reminders for all goals whose deadlines
 * fall within the next 7 days that don't have reminders yet.
 * Called by reminder-scheduler.ts.
 */
export async function sweepGoalReminders(): Promise<void> {
  const { aryaGoals } = await import("@shared/schema");
  const { lte: lteOp, gte: gteOp } = await import("drizzle-orm");

  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const goals = await db
    .select({
      id: aryaGoals.id,
      title: aryaGoals.title,
      userId: aryaGoals.userId,
      dueDate: aryaGoals.dueDate,
      reminderAt: aryaGoals.reminderAt,
      isCompleted: aryaGoals.isCompleted,
    })
    .from(aryaGoals)
    .where(
      and(
        eq(aryaGoals.status, "active"),
        eq(aryaGoals.isCompleted, false),
      ),
    )
    .limit(200);

  let total = 0;
  for (const g of goals) {
    if (!g.userId) continue;
    const deadline = g.dueDate ?? g.reminderAt;
    if (!deadline) continue;
    if (deadline <= now || deadline > in7Days) continue;
    const n = await scheduleGoalReminders(g.userId, g as GoalLike).catch(() => 0);
    total += n;
  }
  if (total > 0) {
    console.log(`[AUTO-REMINDER] Nightly sweep created ${total} reminders across all users`);
  }
}
