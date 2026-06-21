// ═══════════════════════════════════════════════════════════════════════
// ARYA — Trial Budget Engine (v2 Taper-Up)
// server/arya/trial-budget.ts
//
// Governs HOW MANY conversations/voice minutes per day during trial.
// Completely separate from getEffectivePlan() which governs FEATURE access.
//
// Taper schedule:
//   Day  1-10:  5 conversations / 2 voice min per day
//   Day 11-25: 12 conversations / 5 voice min per day
//   Day 26-45: 20 conversations / 8 voice min per day
// Founding members: flat 20/day immediately (proven users, no taper)
// ═══════════════════════════════════════════════════════════════════════

import { db } from "../db";
import { aryaUsers, aryaTrialDailyUsage } from "@shared/schema";
import { eq, and, sql as drizzleSql } from "drizzle-orm";

export interface TaperLimits {
  conversationsPerDay: number;
  voiceMinutesPerDay: number;
}

export function getTaperLimits(trialDay: number, _isFoundingMember = false): TaperLimits {
  // Everyone starts at 5/day and earns more as they engage.
  // Founding member benefit = locked pricing, NOT a budget skip.
  if (trialDay <= 10) return { conversationsPerDay: 5,  voiceMinutesPerDay: 2 };
  if (trialDay <= 25) return { conversationsPerDay: 12, voiceMinutesPerDay: 5 };
  return                      { conversationsPerDay: 20, voiceMinutesPerDay: 8 };
}

export function getTrialDay(trialStartedAt: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const elapsed  = Date.now() - trialStartedAt.getTime();
  return Math.max(1, Math.floor(elapsed / msPerDay) + 1);
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Conversation budget check ────────────────────────────────────────────

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  used?: number;
  resetsAt?: Date;
  trialDay?: number;
  todaysLimits?: TaperLimits;
}

export async function checkTrialConversationBudget(userId: string): Promise<BudgetCheckResult> {
  try {
    const [u] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
    if (!u) return { allowed: true };

    // Not on active trial → pass through (plan checks handle non-trial users)
    if (u.trialStatus !== "active" || !u.trialStartedAt) return { allowed: true };
    if (u.trialEndsAt && new Date() > new Date(u.trialEndsAt))   return { allowed: true };

    // Paid subscriber during trial window → no taper limit
    if (u.plan && u.plan !== "free" && u.planExpiresAt && new Date(u.planExpiresAt) > new Date()) {
      return { allowed: true };
    }

    const trialDay    = getTrialDay(new Date(u.trialStartedAt));
    const limits      = getTaperLimits(trialDay, u.isFoundingMember ?? false);
    const today       = todayStr();

    const [usage] = await db
      .select()
      .from(aryaTrialDailyUsage)
      .where(and(eq(aryaTrialDailyUsage.userId, userId), eq(aryaTrialDailyUsage.usageDate, today)))
      .limit(1);

    const used = usage?.conversationsUsed ?? 0;

    if (used >= limits.conversationsPerDay) {
      const resetsAt = new Date();
      resetsAt.setHours(24, 0, 0, 0);
      return {
        allowed: false,
        reason:  "trial_conversation_limit",
        limit:   limits.conversationsPerDay,
        used,
        resetsAt,
        trialDay,
        todaysLimits: limits,
      };
    }

    return { allowed: true, trialDay, todaysLimits: limits };
  } catch {
    return { allowed: true };
  }
}

// ── Voice budget check ───────────────────────────────────────────────────

export async function checkTrialVoiceBudget(userId: string, requestedMinutes = 1): Promise<BudgetCheckResult> {
  try {
    const [u] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
    if (!u) return { allowed: true };

    if (u.trialStatus !== "active" || !u.trialStartedAt) return { allowed: true };
    if (u.trialEndsAt && new Date() > new Date(u.trialEndsAt))   return { allowed: true };

    if (u.plan && u.plan !== "free" && u.planExpiresAt && new Date(u.planExpiresAt) > new Date()) {
      return { allowed: true };
    }

    const trialDay = getTrialDay(new Date(u.trialStartedAt));
    const limits   = getTaperLimits(trialDay, u.isFoundingMember ?? false);
    const today    = todayStr();

    const [usage] = await db
      .select()
      .from(aryaTrialDailyUsage)
      .where(and(eq(aryaTrialDailyUsage.userId, userId), eq(aryaTrialDailyUsage.usageDate, today)))
      .limit(1);

    const used = Number(usage?.voiceMinutesUsed ?? 0);

    if (used + requestedMinutes > limits.voiceMinutesPerDay) {
      const resetsAt = new Date();
      resetsAt.setHours(24, 0, 0, 0);
      return {
        allowed: false,
        reason:  "trial_voice_limit",
        limit:   limits.voiceMinutesPerDay,
        used,
        resetsAt,
        trialDay,
        todaysLimits: limits,
      };
    }

    return { allowed: true, trialDay, todaysLimits: limits };
  } catch {
    return { allowed: true };
  }
}

// ── Record usage (upsert) ────────────────────────────────────────────────

export async function recordTrialUsage(
  userId: string,
  type: "conversation" | "voice",
  amount = 1
): Promise<void> {
  try {
    const today = todayStr();
    await db
      .insert(aryaTrialDailyUsage)
      .values({
        userId,
        usageDate: today,
        conversationsUsed: type === "conversation" ? amount : 0,
        voiceMinutesUsed:  type === "voice" ? amount.toString() : "0",
      })
      .onConflictDoUpdate({
        target: [aryaTrialDailyUsage.userId, aryaTrialDailyUsage.usageDate],
        set:
          type === "conversation"
            ? { conversationsUsed: drizzleSql`${aryaTrialDailyUsage.conversationsUsed} + ${amount}` }
            : { voiceMinutesUsed:  drizzleSql`${aryaTrialDailyUsage.voiceMinutesUsed}  + ${amount}` },
      });
  } catch (err: any) {
    console.error("[TRIAL BUDGET] recordTrialUsage error:", err.message);
  }
}

// ── Get today's usage for a user (for trial-status API) ─────────────────

export async function getTodayUsage(userId: string): Promise<{ conversationsUsed: number; voiceMinutesUsed: number }> {
  try {
    const today = todayStr();
    const [usage] = await db
      .select()
      .from(aryaTrialDailyUsage)
      .where(and(eq(aryaTrialDailyUsage.userId, userId), eq(aryaTrialDailyUsage.usageDate, today)))
      .limit(1);
    return {
      conversationsUsed: usage?.conversationsUsed ?? 0,
      voiceMinutesUsed:  Number(usage?.voiceMinutesUsed ?? 0),
    };
  } catch {
    return { conversationsUsed: 0, voiceMinutesUsed: 0 };
  }
}

// ── Human-readable limit-reached message ────────────────────────────────

export function buildLimitMessage(check: BudgetCheckResult): string {
  const hours = check.resetsAt
    ? Math.ceil((check.resetsAt.getTime() - Date.now()) / (1000 * 60 * 60))
    : 24;

  if (check.reason === "trial_voice_limit") {
    return `You've used today's ${check.limit} voice minutes during your trial. More unlocks in ${hours} hour${hours !== 1 ? "s" : ""} — or upgrade anytime for unlimited access.`;
  }
  return `You've used today's ${check.limit} conversation${check.limit !== 1 ? "s" : ""} during your trial. More unlock${hours === 1 ? "s" : ""} in ${hours} hour${hours !== 1 ? "s" : ""} — or upgrade anytime for unlimited access.`;
}
