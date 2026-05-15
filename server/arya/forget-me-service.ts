import { db } from "../db";
import {
  aryaMemory,
  aryaGoals,
  aryaGoalSteps,
  aryaMoodCheckins,
  aryaVoiceNotes,
  aryaNotifications,
  aryaDeletionAudit,
} from "@shared/schema";
import { conversations, messages } from "@shared/models/chat";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export type ForgetCategory =
  | "conversations"
  | "memories"
  | "goals"
  | "mood"
  | "voice_notes"
  | "reflection_shares";

export interface DataSummary {
  conversations: number;
  memories: number;
  goals: number;
  mood: number;
  voiceNotes: number;
  reflectionShares: number;
  totalRecords: number;
  oldestRecord: Date | null;
}

export async function getDataSummary(userId: string): Promise<DataSummary> {
  const [convCount, memCount, goalCount, moodCount, noteCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(conversations).where(eq(conversations.userId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(aryaMemory).where(eq(aryaMemory.userId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(aryaGoals).where(eq(aryaGoals.userId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(aryaMoodCheckins).where(eq(aryaMoodCheckins.userId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(aryaVoiceNotes).where(eq(aryaVoiceNotes.userId, userId)),
  ]);

  let reflectionCount = 0;
  try {
    const res = await db.execute(sql`SELECT COUNT(*)::int as count FROM arya_reflection_shares WHERE user_id = ${userId}`);
    reflectionCount = (res.rows?.[0] as any)?.count || 0;
  } catch { }

  const c = convCount[0]?.count || 0;
  const m = memCount[0]?.count || 0;
  const g = goalCount[0]?.count || 0;
  const mo = moodCount[0]?.count || 0;
  const n = noteCount[0]?.count || 0;
  const r = reflectionCount;

  // Find oldest record across key tables
  let oldestRecord: Date | null = null;
  try {
    const oldest = await db.select({ createdAt: conversations.createdAt })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(conversations.createdAt)
      .limit(1);
    if (oldest[0]?.createdAt) oldestRecord = oldest[0].createdAt;
  } catch { }

  return {
    conversations: c,
    memories: m,
    goals: g,
    mood: mo,
    voiceNotes: n,
    reflectionShares: r,
    totalRecords: c + m + g + mo + n + r,
    oldestRecord,
  };
}

export async function forgetSelective(
  userId: string,
  categories: ForgetCategory[]
): Promise<number> {
  let deleted = 0;

  for (const category of categories) {
    switch (category) {
      case "conversations": {
        const convs = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, userId));
        if (convs.length > 0) {
          const ids = convs.map(c => c.id);
          for (const id of ids) {
            await db.delete(messages).where(eq(messages.conversationId, id));
          }
          await db.delete(conversations).where(eq(conversations.userId, userId));
          deleted += convs.length;
        }
        break;
      }
      case "memories": {
        const res = await db.delete(aryaMemory).where(eq(aryaMemory.userId, userId)).returning({ id: aryaMemory.id });
        deleted += res.length;
        break;
      }
      case "goals": {
        const goalList = await db.select({ id: aryaGoals.id }).from(aryaGoals).where(eq(aryaGoals.userId, userId));
        for (const g of goalList) {
          await db.delete(aryaGoalSteps).where(eq(aryaGoalSteps.goalId, g.id));
        }
        const res = await db.delete(aryaGoals).where(eq(aryaGoals.userId, userId)).returning({ id: aryaGoals.id });
        deleted += res.length;
        break;
      }
      case "mood": {
        const res = await db.delete(aryaMoodCheckins).where(eq(aryaMoodCheckins.userId, userId)).returning({ id: aryaMoodCheckins.id });
        deleted += res.length;
        break;
      }
      case "voice_notes": {
        const res = await db.delete(aryaVoiceNotes).where(eq(aryaVoiceNotes.userId, userId)).returning({ id: aryaVoiceNotes.id });
        deleted += res.length;
        break;
      }
      case "reflection_shares": {
        try {
          const res = await db.execute(sql`DELETE FROM arya_reflection_shares WHERE user_id = ${userId} RETURNING id`);
          deleted += res.rows?.length || 0;
        } catch { }
        break;
      }
    }
  }

  await logDeletion(userId, "selective", categories, deleted);
  return deleted;
}

export async function forgetPeriod(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  let deleted = 0;

  // Conversations in period
  const convs = await db.select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.userId, userId), gte(conversations.createdAt, startDate), lte(conversations.createdAt, endDate)));
  if (convs.length > 0) {
    for (const c of convs) {
      await db.delete(messages).where(eq(messages.conversationId, c.id));
    }
    for (const c of convs) {
      await db.delete(conversations).where(eq(conversations.id, c.id));
    }
    deleted += convs.length;
  }

  // Memories in period
  const memRes = await db.delete(aryaMemory)
    .where(and(eq(aryaMemory.userId, userId), gte(aryaMemory.createdAt, startDate), lte(aryaMemory.createdAt, endDate)))
    .returning({ id: aryaMemory.id });
  deleted += memRes.length;

  // Goals in period
  const goalList = await db.select({ id: aryaGoals.id })
    .from(aryaGoals)
    .where(and(eq(aryaGoals.userId, userId), gte(aryaGoals.createdAt, startDate), lte(aryaGoals.createdAt, endDate)));
  for (const g of goalList) {
    await db.delete(aryaGoalSteps).where(eq(aryaGoalSteps.goalId, g.id));
  }
  const goalRes = await db.delete(aryaGoals)
    .where(and(eq(aryaGoals.userId, userId), gte(aryaGoals.createdAt, startDate), lte(aryaGoals.createdAt, endDate)))
    .returning({ id: aryaGoals.id });
  deleted += goalRes.length;

  // Mood in period
  const moodRes = await db.delete(aryaMoodCheckins)
    .where(and(eq(aryaMoodCheckins.userId, userId), gte(aryaMoodCheckins.createdAt, startDate), lte(aryaMoodCheckins.createdAt, endDate)))
    .returning({ id: aryaMoodCheckins.id });
  deleted += moodRes.length;

  // Voice notes in period
  const noteRes = await db.delete(aryaVoiceNotes)
    .where(and(eq(aryaVoiceNotes.userId, userId), gte(aryaVoiceNotes.createdAt, startDate), lte(aryaVoiceNotes.createdAt, endDate)))
    .returning({ id: aryaVoiceNotes.id });
  deleted += noteRes.length;

  await logDeletion(userId, "period", [], deleted, startDate, endDate);
  return deleted;
}

export async function forgetAll(userId: string): Promise<number> {
  let deleted = 0;

  // Conversations + messages
  const convs = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, userId));
  for (const c of convs) {
    await db.delete(messages).where(eq(messages.conversationId, c.id));
  }
  await db.delete(conversations).where(eq(conversations.userId, userId));
  deleted += convs.length;

  // Memory
  const memRes = await db.delete(aryaMemory).where(eq(aryaMemory.userId, userId)).returning({ id: aryaMemory.id });
  deleted += memRes.length;

  // Goals
  const goalList = await db.select({ id: aryaGoals.id }).from(aryaGoals).where(eq(aryaGoals.userId, userId));
  for (const g of goalList) {
    await db.delete(aryaGoalSteps).where(eq(aryaGoalSteps.goalId, g.id));
  }
  const goalRes = await db.delete(aryaGoals).where(eq(aryaGoals.userId, userId)).returning({ id: aryaGoals.id });
  deleted += goalRes.length;

  // Mood
  const moodRes = await db.delete(aryaMoodCheckins).where(eq(aryaMoodCheckins.userId, userId)).returning({ id: aryaMoodCheckins.id });
  deleted += moodRes.length;

  // Voice notes
  const noteRes = await db.delete(aryaVoiceNotes).where(eq(aryaVoiceNotes.userId, userId)).returning({ id: aryaVoiceNotes.id });
  deleted += noteRes.length;

  // Notifications
  await db.delete(aryaNotifications).where(eq(aryaNotifications.userId, userId));

  // Reflection shares
  try {
    await db.execute(sql`DELETE FROM arya_reflection_shares WHERE user_id = ${userId}`);
  } catch { }

  await logDeletion(userId, "full", ["all"], deleted);
  return deleted;
}

async function logDeletion(
  userId: string,
  type: "selective" | "period" | "full",
  categories: string[],
  count: number,
  periodStart?: Date,
  periodEnd?: Date
): Promise<void> {
  try {
    await db.insert(aryaDeletionAudit).values({
      userId,
      deletionType: type,
      categories,
      recordsDeleted: count,
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
    });
  } catch { }
}
