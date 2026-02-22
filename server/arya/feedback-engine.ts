import { db } from "../db";
import { aryaFeedback, aryaMemory, AryaFeedback } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ResponseCacheEngine } from "./response-cache-engine";

const responseCacheEngine = new ResponseCacheEngine();

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

      this.processLearningLoop(messageId, conversationId, tenantId, rating).catch(err =>
        console.error("[FeedbackEngine] Learning loop error:", err)
      );

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

    this.processLearningLoop(messageId, conversationId, tenantId, rating).catch(err =>
      console.error("[FeedbackEngine] Learning loop error:", err)
    );

    return feedback;
  }

  private async processLearningLoop(
    messageId: number,
    conversationId: number,
    tenantId: string,
    rating: 'up' | 'down'
  ): Promise<void> {
    if (rating === 'up') {
      const userQuery = await responseCacheEngine.getUserQueryForMessage(messageId, conversationId);
      const assistantResponse = await responseCacheEngine.getAssistantResponse(messageId);

      if (userQuery && assistantResponse && assistantResponse.length > 20) {
        await responseCacheEngine.cacheGoldenResponse(
          tenantId,
          userQuery,
          assistantResponse,
          undefined,
          messageId,
          conversationId
        );
        console.log(`[LearningLoop] Golden response cached from thumbs-up on message ${messageId}`);
      }
    } else if (rating === 'down') {
      const userQuery = await responseCacheEngine.getUserQueryForMessage(messageId, conversationId);
      if (userQuery) {
        await responseCacheEngine.markNegativeFeedback(tenantId, userQuery);
        console.log(`[LearningLoop] Negative feedback recorded for message ${messageId}`);
      }
    }
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
