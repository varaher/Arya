import { db } from "../db";
import { aryaFeedback, aryaMemory, AryaFeedback } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class FeedbackEngine {

  async submitFeedback(
    messageId: number,
    conversationId: number,
    tenantId: string,
    rating: 'up' | 'down',
    correctionText?: string,
    category?: 'accuracy' | 'helpfulness' | 'tone' | 'completeness' | 'other'
  ): Promise<AryaFeedback> {
    const existing = await db
      .select()
      .from(aryaFeedback)
      .where(and(
        eq(aryaFeedback.messageId, messageId),
        eq(aryaFeedback.tenantId, tenantId)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(aryaFeedback)
        .set({
          rating,
          correctionText: correctionText || null,
          category: category || null,
        })
        .where(eq(aryaFeedback.id, existing[0].id))
        .returning();
      return updated;
    }

    const [feedback] = await db.insert(aryaFeedback).values({
      messageId,
      conversationId,
      tenantId,
      rating,
      correctionText: correctionText || null,
      category: category || null,
    }).returning();

    if (correctionText && rating === 'down') {
      await db.insert(aryaMemory).values({
        tenantId,
        category: 'context',
        key: `correction_${messageId}`,
        value: `User corrected response: ${correctionText}`,
        confidence: "0.90",
        source: 'feedback',
        conversationId,
      }).catch(() => {});
    }

    return feedback;
  }

  async getFeedbackStats(tenantId: string): Promise<{
    totalFeedback: number;
    thumbsUp: number;
    thumbsDown: number;
    satisfactionRate: number;
    recentFeedback: AryaFeedback[];
  }> {
    const allFeedback = await db
      .select()
      .from(aryaFeedback)
      .where(eq(aryaFeedback.tenantId, tenantId));

    const thumbsUp = allFeedback.filter(f => f.rating === 'up').length;
    const thumbsDown = allFeedback.filter(f => f.rating === 'down').length;
    const total = allFeedback.length;

    const recentFeedback = await db
      .select()
      .from(aryaFeedback)
      .where(eq(aryaFeedback.tenantId, tenantId))
      .orderBy(desc(aryaFeedback.createdAt))
      .limit(10);

    return {
      totalFeedback: total,
      thumbsUp,
      thumbsDown,
      satisfactionRate: total > 0 ? Math.round((thumbsUp / total) * 100) : 0,
      recentFeedback,
    };
  }

  async getMessageFeedback(messageId: number, tenantId: string): Promise<AryaFeedback | null> {
    const [feedback] = await db
      .select()
      .from(aryaFeedback)
      .where(and(
        eq(aryaFeedback.messageId, messageId),
        eq(aryaFeedback.tenantId, tenantId)
      ))
      .limit(1);

    return feedback || null;
  }
}
