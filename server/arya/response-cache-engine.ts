import { db } from "../db";
import { aryaResponseCache, aryaCacheMetrics, AryaResponseCache, Domain } from "@shared/schema";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { messages } from "@shared/schema";

export interface CacheMatch {
  cacheEntry: AryaResponseCache;
  score: number;
}

export class ResponseCacheEngine {

  normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractKeywords(query: string): string[] {
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'not', 'what', 'how', 'why', 'who',
      'when', 'where', 'from', 'are', 'was', 'tell', 'me', 'about', 'explain',
      'can', 'you', 'i', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'please', 'help', 'want', 'need', 'like', 'know', 'think',
      'just', 'also', 'very', 'really', 'much', 'some', 'any', 'all',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that',
      'be', 'been', 'being', 'have', 'has', 'had', 'having',
    ]);
    return query
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w))
      .slice(0, 10);
  }

  async cacheGoldenResponse(
    tenantId: string,
    userQuery: string,
    responseText: string,
    domain: Domain | undefined,
    messageId: number,
    conversationId: number
  ): Promise<AryaResponseCache> {
    const normalized = this.normalizeQuery(userQuery);
    const keywords = this.extractKeywords(userQuery);

    const existing = await db
      .select()
      .from(aryaResponseCache)
      .where(and(
        eq(aryaResponseCache.tenantId, tenantId),
        eq(aryaResponseCache.normalizedQuery, normalized)
      ))
      .limit(1);

    if (existing.length > 0) {
      const entry = existing[0];
      const [updated] = await db
        .update(aryaResponseCache)
        .set({
          positiveFeedbackCount: entry.positiveFeedbackCount + 1,
          confidenceScore: Math.min(0.99, parseFloat(entry.confidenceScore || '0.50') + 0.05).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(aryaResponseCache.id, entry.id))
        .returning();
      console.log(`[ResponseCache] Updated golden response for: "${normalized}" (confidence: ${updated.confidenceScore})`);
      return updated;
    }

    const [cached] = await db.insert(aryaResponseCache).values({
      tenantId,
      normalizedQuery: normalized,
      originalQuery: userQuery,
      responseText,
      domain: domain || undefined,
      keywords,
      sourceMessageId: messageId,
      sourceConversationId: conversationId,
      confidenceScore: "0.50",
      positiveFeedbackCount: 1,
      negativeFeedbackCount: 0,
      isActive: true,
    }).returning();

    console.log(`[ResponseCache] Cached new golden response for: "${normalized}"`);
    return cached;
  }

  async markNegativeFeedback(
    tenantId: string,
    userQuery: string
  ): Promise<void> {
    const normalized = this.normalizeQuery(userQuery);

    const existing = await db
      .select()
      .from(aryaResponseCache)
      .where(and(
        eq(aryaResponseCache.tenantId, tenantId),
        eq(aryaResponseCache.normalizedQuery, normalized)
      ))
      .limit(1);

    if (existing.length > 0) {
      const entry = existing[0];
      const newNeg = entry.negativeFeedbackCount + 1;
      const newConfidence = Math.max(0, parseFloat(entry.confidenceScore || '0.50') - 0.15);
      const shouldDeactivate = newNeg >= 3 || newConfidence < 0.1;

      await db
        .update(aryaResponseCache)
        .set({
          negativeFeedbackCount: newNeg,
          confidenceScore: newConfidence.toFixed(2),
          isActive: !shouldDeactivate,
          updatedAt: new Date(),
        })
        .where(eq(aryaResponseCache.id, entry.id));

      console.log(`[ResponseCache] Negative feedback for: "${normalized}" (confidence: ${newConfidence.toFixed(2)}, active: ${!shouldDeactivate})`);
    }
  }

  findBestMatch(query: string, candidates: AryaResponseCache[]): CacheMatch | null {
    const queryKeywords = this.extractKeywords(query);
    const queryNormalized = this.normalizeQuery(query);

    if (queryKeywords.length === 0) return null;

    let bestMatch: CacheMatch | null = null;

    for (const entry of candidates) {
      let score = 0;

      if (entry.normalizedQuery === queryNormalized) {
        score = 1.0;
      } else {
        const entryKeywords = entry.keywords || [];
        if (entryKeywords.length === 0) continue;

        const intersection = queryKeywords.filter(k => entryKeywords.includes(k));
        const union = new Set([...queryKeywords, ...entryKeywords]);
        const jaccard = intersection.length / union.size;

        const orderBonus = this.computeOrderSimilarity(queryKeywords, entryKeywords);

        score = (jaccard * 0.7) + (orderBonus * 0.3);
      }

      const confidenceMultiplier = parseFloat(entry.confidenceScore || '0.50');
      const feedbackRatio = entry.positiveFeedbackCount / Math.max(1, entry.positiveFeedbackCount + entry.negativeFeedbackCount);
      const finalScore = score * confidenceMultiplier * feedbackRatio;

      if (finalScore > (bestMatch?.score || 0)) {
        bestMatch = { cacheEntry: entry, score: finalScore };
      }
    }

    return bestMatch;
  }

  private computeOrderSimilarity(queryWords: string[], entryWords: string[]): number {
    if (queryWords.length === 0 || entryWords.length === 0) return 0;
    let matches = 0;
    let total = Math.min(queryWords.length, entryWords.length);
    for (let i = 0; i < total; i++) {
      if (queryWords[i] === entryWords[i]) matches++;
    }
    return matches / total;
  }

  async shadowLookup(
    tenantId: string,
    userQuery: string
  ): Promise<{ hit: boolean; match: CacheMatch | null; lookupTimeMs: number }> {
    const startTime = Date.now();

    try {
      const candidates = await db
        .select()
        .from(aryaResponseCache)
        .where(and(
          eq(aryaResponseCache.tenantId, tenantId),
          eq(aryaResponseCache.isActive, true)
        ))
        .orderBy(desc(aryaResponseCache.positiveFeedbackCount))
        .limit(100);

      if (candidates.length === 0) {
        return { hit: false, match: null, lookupTimeMs: Date.now() - startTime };
      }

      const match = this.findBestMatch(userQuery, candidates);
      const SHADOW_THRESHOLD = 0.35;
      const hit = match !== null && match.score >= SHADOW_THRESHOLD;

      const lookupTimeMs = Date.now() - startTime;

      if (hit && match) {
        console.log(`[ResponseCache] SHADOW HIT: "${userQuery}" → matched "${match.cacheEntry.originalQuery}" (score: ${match.score.toFixed(3)}, ${lookupTimeMs}ms)`);
      } else {
        console.log(`[ResponseCache] SHADOW MISS: "${userQuery}" (best score: ${match?.score.toFixed(3) || 'none'}, ${lookupTimeMs}ms)`);
      }

      return { hit, match, lookupTimeMs };
    } catch (err) {
      console.error("[ResponseCache] Shadow lookup error:", err);
      return { hit: false, match: null, lookupTimeMs: Date.now() - startTime };
    }
  }

  async logMetric(
    tenantId: string,
    queryNormalized: string,
    cacheHit: boolean,
    matchedCacheId: string | null,
    matchScore: number,
    responseSource: 'cache' | 'llm' | 'smart_command',
    llmModel: string | null,
    responseTimeMs: number
  ): Promise<void> {
    try {
      await db.insert(aryaCacheMetrics).values({
        tenantId,
        queryNormalized,
        cacheHit,
        matchedCacheId,
        matchScore: matchScore.toFixed(3),
        responseSource,
        llmModel,
        responseTimeMs,
      });
    } catch (err) {
      console.error("[ResponseCache] Metric log error:", err);
    }
  }

  async getCacheStats(tenantId: string): Promise<{
    totalCached: number;
    activeCached: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    avgMatchScore: number;
    topCachedResponses: AryaResponseCache[];
  }> {
    const allCached = await db
      .select()
      .from(aryaResponseCache)
      .where(eq(aryaResponseCache.tenantId, tenantId));

    const activeCached = allCached.filter(c => c.isActive);

    const metrics = await db
      .select()
      .from(aryaCacheMetrics)
      .where(eq(aryaCacheMetrics.tenantId, tenantId));

    const totalHits = metrics.filter(m => m.cacheHit).length;
    const totalMisses = metrics.filter(m => !m.cacheHit).length;
    const total = totalHits + totalMisses;

    const avgScore = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + parseFloat(m.matchScore || '0'), 0) / metrics.length
      : 0;

    const topCachedResponses = activeCached
      .sort((a, b) => b.positiveFeedbackCount - a.positiveFeedbackCount)
      .slice(0, 10);

    return {
      totalCached: allCached.length,
      activeCached: activeCached.length,
      totalHits,
      totalMisses,
      hitRate: total > 0 ? Math.round((totalHits / total) * 100) : 0,
      avgMatchScore: parseFloat(avgScore.toFixed(3)),
      topCachedResponses,
    };
  }

  async getUserQueryForMessage(messageId: number, conversationId: number): Promise<string | null> {
    try {
      const allMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.id);

      const msgIndex = allMessages.findIndex(m => m.id === messageId);
      if (msgIndex <= 0) return null;

      const previousMsg = allMessages[msgIndex - 1];
      if (previousMsg.role === 'user') {
        return previousMsg.content;
      }
      return null;
    } catch (err) {
      console.error("[ResponseCache] Error fetching user query for message:", err);
      return null;
    }
  }

  async getAssistantResponse(messageId: number): Promise<string | null> {
    try {
      const [msg] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (msg && msg.role === 'assistant') {
        return msg.content;
      }
      return null;
    } catch (err) {
      console.error("[ResponseCache] Error fetching assistant response:", err);
      return null;
    }
  }
}
