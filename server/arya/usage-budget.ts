import { db } from "../db";
import { aryaUsageBudget, aryaDailyCost } from "@shared/schema";
import { eq, and, sql, lt } from "drizzle-orm";

const LIMITS = {
  user: {
    textChatsPerDay: 30,
    voiceMinutesPerDay: 20,
    deepReasoningPerDay: 10,
    llmCallsPerMinute: 10,
    maxGoals: 3,
    memoryRetentionDays: 7,
  },
  anonymous: {
    textChatsPerDay: 5,
    voiceMinutesPerDay: 0,
    deepReasoningPerDay: 0,
    llmCallsPerMinute: 3,
    maxGoals: 0,
    memoryRetentionDays: 0,
  },
  system: {
    dailyLlmCalls: parseInt(process.env.SYSTEM_DAILY_LLM_LIMIT || "2000", 10),
    dailyCostCapInr: parseFloat(process.env.DAILY_COST_CAP_INR || "500"),
    maxBetaUsers: 200,
  },
};

const COST_PER_LLM_CALL_INR = 1.5;
const COST_PER_VOICE_MINUTE_INR = 2.0;
const COST_PER_DEEP_REASONING_INR = 3.0;

const SYSTEM_USER_KEY = "__SYSTEM_TOTAL__";

const rateLimitMap = new Map<string, number[]>();

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkRateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const timestamps = rateLimitMap.get(key) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  if (recent.length >= maxPerMinute) return false;
  recent.push(now);
  rateLimitMap.set(key, recent);
  return true;
}

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitMap.entries());
  for (const [key, timestamps] of entries) {
    const recent = timestamps.filter((t: number) => now - t < 120_000);
    if (recent.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, recent);
  }
}, 60_000);

async function getOrCreateBudget(userId: string | null, dateKey: string) {
  const key = userId || SYSTEM_USER_KEY;
  const existing = await db.select().from(aryaUsageBudget)
    .where(and(eq(aryaUsageBudget.userId, key), eq(aryaUsageBudget.dateKey, dateKey)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  try {
    const [created] = await db.insert(aryaUsageBudget).values({
      userId: key, dateKey, llmCallCount: 0, textChatCount: 0, voiceMinutes: 0, deepReasoningCount: 0,
    }).returning();
    return created;
  } catch {
    const [existing2] = await db.select().from(aryaUsageBudget)
      .where(and(eq(aryaUsageBudget.userId, key), eq(aryaUsageBudget.dateKey, dateKey)))
      .limit(1);
    return existing2;
  }
}

async function getOrCreateDailyCost(dateKey: string) {
  const existing = await db.select().from(aryaDailyCost)
    .where(eq(aryaDailyCost.dateKey, dateKey)).limit(1);
  if (existing.length > 0) return existing[0];
  try {
    const [created] = await db.insert(aryaDailyCost).values({
      dateKey,
      costCapInr: LIMITS.system.dailyCostCapInr.toString(),
    }).returning();
    return created;
  } catch {
    const [existing2] = await db.select().from(aryaDailyCost)
      .where(eq(aryaDailyCost.dateKey, dateKey)).limit(1);
    return existing2;
  }
}

export type CallType = 'text_chat' | 'voice' | 'deep_reasoning';

export async function checkAndRecordBudget(
  userId: string | null,
  callType: CallType = 'text_chat',
  voiceMinutesUsed: number = 0,
): Promise<{ allowed: boolean; reason?: string }> {
  const dateKey = getTodayKey();
  const isAnonymous = !userId;
  const limits = isAnonymous ? LIMITS.anonymous : LIMITS.user;

  if (callType === 'voice' && isAnonymous) {
    return { allowed: false, reason: "Please sign in to use voice features." };
  }

  const rateLimitKey = userId || 'anon';
  if (!checkRateLimit(rateLimitKey, limits.llmCallsPerMinute)) {
    return { allowed: false, reason: "You're sending messages too quickly. Please wait a moment." };
  }

  const dailyCost = await getOrCreateDailyCost(dateKey);
  if (dailyCost.isDisabled) {
    return { allowed: false, reason: "ARYA is at capacity today. Please return tomorrow." };
  }
  const currentCostNum = parseFloat(dailyCost.estimatedCostInr?.toString() || "0");
  const costCapNum = parseFloat(dailyCost.costCapInr?.toString() || "500");
  if (currentCostNum >= costCapNum) {
    await db.update(aryaDailyCost).set({ isDisabled: true, updatedAt: new Date() })
      .where(eq(aryaDailyCost.dateKey, dateKey));
    return { allowed: false, reason: "ARYA is at capacity today. Please return tomorrow." };
  }

  await getOrCreateBudget(null, dateKey);
  const systemResult = await db.update(aryaUsageBudget)
    .set({
      llmCallCount: sql`${aryaUsageBudget.llmCallCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(aryaUsageBudget.userId, SYSTEM_USER_KEY),
      eq(aryaUsageBudget.dateKey, dateKey),
      lt(aryaUsageBudget.llmCallCount, LIMITS.system.dailyLlmCalls)
    ))
    .returning();

  if (systemResult.length === 0) {
    await db.update(aryaDailyCost).set({ isDisabled: true, updatedAt: new Date() })
      .where(eq(aryaDailyCost.dateKey, dateKey));
    return { allowed: false, reason: "ARYA is at capacity today. Please return tomorrow." };
  }

  const budgetKey = userId || `anon_${rateLimitKey}`;
  await getOrCreateBudget(budgetKey, dateKey);
  const userBudget = await db.select().from(aryaUsageBudget)
    .where(and(eq(aryaUsageBudget.userId, budgetKey), eq(aryaUsageBudget.dateKey, dateKey)))
    .limit(1);

  if (userBudget.length > 0) {
    const b = userBudget[0];
    if (callType === 'text_chat' && b.textChatCount >= limits.textChatsPerDay) {
      await rollbackSystemCount(dateKey);
      return { allowed: false, reason: isAnonymous
        ? "You've used your 5 free chats today. Sign up for more access."
        : "You've reached your daily chat limit (30). Please try again tomorrow." };
    }
    if (callType === 'voice' && b.voiceMinutes >= limits.voiceMinutesPerDay) {
      await rollbackSystemCount(dateKey);
      return { allowed: false, reason: "You've used your daily voice limit (20 minutes). Please try again tomorrow." };
    }
    if (callType === 'deep_reasoning' && b.deepReasoningCount >= limits.deepReasoningPerDay) {
      await rollbackSystemCount(dateKey);
      return { allowed: false, reason: "You've reached your daily deep reasoning limit (10). Please try again tomorrow." };
    }
  }

  const costIncrement = callType === 'voice'
    ? COST_PER_VOICE_MINUTE_INR * Math.max(1, voiceMinutesUsed)
    : callType === 'deep_reasoning'
    ? COST_PER_DEEP_REASONING_INR
    : COST_PER_LLM_CALL_INR;

  const updateFields: any = {
    llmCallCount: sql`${aryaUsageBudget.llmCallCount} + 1`,
    estimatedCostInr: sql`COALESCE(${aryaUsageBudget.estimatedCostInr}, 0) + ${costIncrement}`,
    updatedAt: new Date(),
  };
  if (callType === 'text_chat') updateFields.textChatCount = sql`${aryaUsageBudget.textChatCount} + 1`;
  if (callType === 'voice') updateFields.voiceMinutes = sql`${aryaUsageBudget.voiceMinutes} + ${Math.max(1, voiceMinutesUsed)}`;
  if (callType === 'deep_reasoning') updateFields.deepReasoningCount = sql`${aryaUsageBudget.deepReasoningCount} + 1`;

  await db.update(aryaUsageBudget).set(updateFields)
    .where(and(eq(aryaUsageBudget.userId, budgetKey), eq(aryaUsageBudget.dateKey, dateKey)));

  const dailyCostUpdate: any = {
    totalLlmCalls: sql`${aryaDailyCost.totalLlmCalls} + 1`,
    estimatedCostInr: sql`COALESCE(${aryaDailyCost.estimatedCostInr}, 0) + ${costIncrement}`,
    updatedAt: new Date(),
  };
  if (callType === 'text_chat') dailyCostUpdate.totalTextChats = sql`${aryaDailyCost.totalTextChats} + 1`;
  if (callType === 'voice') dailyCostUpdate.totalVoiceMinutes = sql`${aryaDailyCost.totalVoiceMinutes} + ${Math.max(1, voiceMinutesUsed)}`;
  if (callType === 'deep_reasoning') dailyCostUpdate.totalDeepReasoning = sql`${aryaDailyCost.totalDeepReasoning} + 1`;

  await db.update(aryaDailyCost).set(dailyCostUpdate)
    .where(eq(aryaDailyCost.dateKey, dateKey));

  await db.update(aryaDailyCost)
    .set({ isDisabled: true, updatedAt: new Date() })
    .where(and(
      eq(aryaDailyCost.dateKey, dateKey),
      eq(aryaDailyCost.isDisabled, false),
      sql`COALESCE(${aryaDailyCost.estimatedCostInr}, 0) >= COALESCE(${aryaDailyCost.costCapInr}, 500)`,
    ));

  return { allowed: true };
}

async function rollbackSystemCount(dateKey: string) {
  await db.update(aryaUsageBudget)
    .set({ llmCallCount: sql`${aryaUsageBudget.llmCallCount} - 1`, updatedAt: new Date() })
    .where(and(eq(aryaUsageBudget.userId, SYSTEM_USER_KEY), eq(aryaUsageBudget.dateKey, dateKey)));
}

export async function checkBudget(userId: string | null): Promise<{ allowed: boolean; reason?: string }> {
  const dateKey = getTodayKey();
  const dailyCost = await getOrCreateDailyCost(dateKey);
  if (dailyCost.isDisabled) {
    return { allowed: false, reason: "ARYA is at capacity today. Please return tomorrow." };
  }
  const systemBudget = await getOrCreateBudget(null, dateKey);
  if (systemBudget.llmCallCount >= LIMITS.system.dailyLlmCalls) {
    return { allowed: false, reason: "ARYA is at capacity today. Please return tomorrow." };
  }
  return { allowed: true };
}

export async function recordLLMCall(userId: string | null): Promise<void> {
  const dateKey = getTodayKey();
  await getOrCreateBudget(null, dateKey);
  await db.update(aryaUsageBudget)
    .set({ llmCallCount: sql`${aryaUsageBudget.llmCallCount} + 1`, updatedAt: new Date() })
    .where(and(eq(aryaUsageBudget.userId, SYSTEM_USER_KEY), eq(aryaUsageBudget.dateKey, dateKey)));
  if (userId) {
    await getOrCreateBudget(userId, dateKey);
    await db.update(aryaUsageBudget)
      .set({ llmCallCount: sql`${aryaUsageBudget.llmCallCount} + 1`, updatedAt: new Date() })
      .where(and(eq(aryaUsageBudget.userId, userId), eq(aryaUsageBudget.dateKey, dateKey)));
  }
}

export async function getBudgetStats(): Promise<any> {
  const dateKey = getTodayKey();
  const systemBudget = await getOrCreateBudget(null, dateKey);
  const dailyCost = await getOrCreateDailyCost(dateKey);
  return {
    systemToday: systemBudget.llmCallCount,
    systemLimit: LIMITS.system.dailyLlmCalls,
    dailyCostInr: dailyCost.estimatedCostInr,
    dailyCostCapInr: dailyCost.costCapInr,
    isDisabled: dailyCost.isDisabled,
    limits: LIMITS,
  };
}

export async function getCostDashboard(): Promise<any> {
  const dateKey = getTodayKey();
  const dailyCost = await getOrCreateDailyCost(dateKey);

  const allUserBudgets = await db.select().from(aryaUsageBudget)
    .where(and(
      eq(aryaUsageBudget.dateKey, dateKey),
      sql`${aryaUsageBudget.userId} != ${SYSTEM_USER_KEY}`,
    ));

  const activeUsers = allUserBudgets.filter(b => b.llmCallCount > 0).length;
  const totalChats = allUserBudgets.reduce((s, b) => s + b.textChatCount, 0);
  const avgChatsPerUser = activeUsers > 0 ? Math.round(totalChats / activeUsers * 10) / 10 : 0;
  const costPerActiveUser = activeUsers > 0
    ? Math.round(parseFloat(dailyCost.estimatedCostInr?.toString() || "0") / activeUsers * 100) / 100
    : 0;

  await db.update(aryaDailyCost).set({ activeUsers, updatedAt: new Date() })
    .where(eq(aryaDailyCost.dateKey, dateKey));

  return {
    date: dateKey,
    totalLlmCalls: dailyCost.totalLlmCalls,
    totalTextChats: dailyCost.totalTextChats,
    totalVoiceMinutes: dailyCost.totalVoiceMinutes,
    totalDeepReasoning: dailyCost.totalDeepReasoning,
    activeUsers,
    avgChatsPerUser,
    estimatedCostInr: dailyCost.estimatedCostInr,
    costCapInr: dailyCost.costCapInr,
    costPerActiveUser,
    isDisabled: dailyCost.isDisabled,
    systemLlmLimit: LIMITS.system.dailyLlmCalls,
    limits: LIMITS,
  };
}

export async function updateCostCap(newCapInr: number): Promise<void> {
  const dateKey = getTodayKey();
  await getOrCreateDailyCost(dateKey);
  await db.update(aryaDailyCost)
    .set({ costCapInr: newCapInr.toString(), updatedAt: new Date() })
    .where(eq(aryaDailyCost.dateKey, dateKey));
}

export function getLimits() {
  return LIMITS;
}
