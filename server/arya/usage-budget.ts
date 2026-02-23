import { db } from "../db";
import { aryaUsageBudget } from "@shared/schema";
import { eq, and, sql, lt } from "drizzle-orm";

const USER_DAILY_LLM_LIMIT = parseInt(process.env.USER_DAILY_LLM_LIMIT || "50", 10);
const SYSTEM_DAILY_LLM_LIMIT = parseInt(process.env.SYSTEM_DAILY_LLM_LIMIT || "2000", 10);
const SYSTEM_USER_KEY = "__SYSTEM_TOTAL__";

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getOrCreateBudget(userId: string | null, dateKey: string) {
  const key = userId || SYSTEM_USER_KEY;
  const existing = await db.select().from(aryaUsageBudget)
    .where(and(
      eq(aryaUsageBudget.userId, key),
      eq(aryaUsageBudget.dateKey, dateKey)
    ))
    .limit(1);

  if (existing.length > 0) return existing[0];

  try {
    const [created] = await db.insert(aryaUsageBudget).values({
      userId: key,
      dateKey,
      llmCallCount: 0,
    }).returning();
    return created;
  } catch {
    const [existing2] = await db.select().from(aryaUsageBudget)
      .where(and(eq(aryaUsageBudget.userId, key), eq(aryaUsageBudget.dateKey, dateKey)))
      .limit(1);
    return existing2;
  }
}

export async function checkAndRecordBudget(userId: string | null): Promise<{ allowed: boolean; reason?: string }> {
  const dateKey = getTodayKey();

  await getOrCreateBudget(null, dateKey);
  const systemResult = await db.update(aryaUsageBudget)
    .set({
      llmCallCount: sql`${aryaUsageBudget.llmCallCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(aryaUsageBudget.userId, SYSTEM_USER_KEY),
      eq(aryaUsageBudget.dateKey, dateKey),
      lt(aryaUsageBudget.llmCallCount, SYSTEM_DAILY_LLM_LIMIT)
    ))
    .returning();

  if (systemResult.length === 0) {
    return {
      allowed: false,
      reason: "ARYA is at capacity for today. Please try again tomorrow.",
    };
  }

  if (userId) {
    await getOrCreateBudget(userId, dateKey);
    const userResult = await db.update(aryaUsageBudget)
      .set({
        llmCallCount: sql`${aryaUsageBudget.llmCallCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(aryaUsageBudget.userId, userId),
        eq(aryaUsageBudget.dateKey, dateKey),
        lt(aryaUsageBudget.llmCallCount, USER_DAILY_LLM_LIMIT)
      ))
      .returning();

    if (userResult.length === 0) {
      await db.update(aryaUsageBudget)
        .set({
          llmCallCount: sql`${aryaUsageBudget.llmCallCount} - 1`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(aryaUsageBudget.userId, SYSTEM_USER_KEY),
          eq(aryaUsageBudget.dateKey, dateKey)
        ));

      return {
        allowed: false,
        reason: "You've reached your daily usage limit. Please try again tomorrow.",
      };
    }
  }

  return { allowed: true };
}

export async function checkBudget(userId: string | null): Promise<{ allowed: boolean; reason?: string }> {
  const dateKey = getTodayKey();

  const systemBudget = await getOrCreateBudget(null, dateKey);
  if (systemBudget.llmCallCount >= SYSTEM_DAILY_LLM_LIMIT) {
    return {
      allowed: false,
      reason: "ARYA is at capacity for today. Please try again tomorrow.",
    };
  }

  if (userId) {
    const userBudget = await getOrCreateBudget(userId, dateKey);
    if (userBudget.llmCallCount >= USER_DAILY_LLM_LIMIT) {
      return {
        allowed: false,
        reason: "You've reached your daily usage limit. Please try again tomorrow.",
      };
    }
  }

  return { allowed: true };
}

export async function recordLLMCall(userId: string | null): Promise<void> {
  const dateKey = getTodayKey();

  await getOrCreateBudget(null, dateKey);
  await db.update(aryaUsageBudget)
    .set({
      llmCallCount: sql`${aryaUsageBudget.llmCallCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(aryaUsageBudget.userId, SYSTEM_USER_KEY),
      eq(aryaUsageBudget.dateKey, dateKey)
    ));

  if (userId) {
    await getOrCreateBudget(userId, dateKey);
    await db.update(aryaUsageBudget)
      .set({
        llmCallCount: sql`${aryaUsageBudget.llmCallCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(aryaUsageBudget.userId, userId),
        eq(aryaUsageBudget.dateKey, dateKey)
      ));
  }
}

export async function getBudgetStats(): Promise<{
  systemToday: number;
  systemLimit: number;
  userDailyLimit: number;
}> {
  const dateKey = getTodayKey();
  const systemBudget = await getOrCreateBudget(null, dateKey);
  return {
    systemToday: systemBudget.llmCallCount,
    systemLimit: SYSTEM_DAILY_LLM_LIMIT,
    userDailyLimit: USER_DAILY_LLM_LIMIT,
  };
}
