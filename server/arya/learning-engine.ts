import { db } from "../db";
import { aryaKnowledgeDrafts, aryaQueryPatterns, aryaKnowledge, AryaKnowledgeDraft, AryaQueryPattern, Domain } from "@shared/schema";
import { eq, and, desc, sql, gt } from "drizzle-orm";

export interface LearningSignal {
  tenantId: string;
  query: string;
  domain: Domain;
  resultCount: number;
  confidence: number;
  language?: string;
}

export class LearningEngine {

  async ingestQuery(signal: LearningSignal): Promise<{ gapDetected: boolean; draftCreated: boolean }> {
    const normalized = this.normalizeQuery(signal.query);
    let gapDetected = false;
    let draftCreated = false;

    const existing = await db
      .select()
      .from(aryaQueryPatterns)
      .where(and(
        eq(aryaQueryPatterns.tenantId, signal.tenantId),
        eq(aryaQueryPatterns.normalizedQuery, normalized)
      ))
      .limit(1);

    if (existing.length > 0) {
      const pattern = existing[0];
      const newCount = pattern.queryCount + 1;
      const newAvg = ((parseFloat(pattern.avgConfidence || '0') * pattern.queryCount) + signal.confidence) / newCount;

      await db
        .update(aryaQueryPatterns)
        .set({
          queryCount: newCount,
          lastResultCount: signal.resultCount,
          avgConfidence: newAvg.toFixed(2),
          isGap: signal.resultCount === 0 || signal.confidence < 0.3,
          lastSeen: new Date()
        })
        .where(eq(aryaQueryPatterns.id, pattern.id));

      gapDetected = (signal.resultCount === 0 || signal.confidence < 0.3);

      if (gapDetected && !pattern.draftGenerated && newCount >= 2) {
        await this.generateDraft(signal, normalized);
        draftCreated = true;

        await db
          .update(aryaQueryPatterns)
          .set({ draftGenerated: true })
          .where(eq(aryaQueryPatterns.id, pattern.id));
      }
    } else {
      const isGap = signal.resultCount === 0 || signal.confidence < 0.3;

      await db.insert(aryaQueryPatterns).values({
        tenantId: signal.tenantId,
        normalizedQuery: normalized,
        domain: signal.domain,
        queryCount: 1,
        lastResultCount: signal.resultCount,
        avgConfidence: signal.confidence.toFixed(2),
        isGap: isGap,
        draftGenerated: false
      });

      gapDetected = isGap;
    }

    return { gapDetected, draftCreated };
  }

  private async generateDraft(signal: LearningSignal, normalizedQuery: string): Promise<void> {
    const topic = this.generateTopicFromQuery(signal.query);
    const content = this.generateDraftContent(signal.query, signal.domain);

    await db.insert(aryaKnowledgeDrafts).values({
      tenantId: signal.tenantId,
      domain: signal.domain,
      topic: topic,
      content: content,
      tags: this.extractTags(signal.query),
      language: signal.language || 'en',
      sourceType: 'self_learned',
      sourceTitle: `Auto-learned from query pattern: "${normalizedQuery}"`,
      confidenceScore: '0.40',
      learnedFromQuery: signal.query,
      status: 'pending'
    });
  }

  async getDrafts(tenantId: string, status?: string): Promise<AryaKnowledgeDraft[]> {
    let conditions: any[] = [eq(aryaKnowledgeDrafts.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(aryaKnowledgeDrafts.status, status as any));
    }

    return await db
      .select()
      .from(aryaKnowledgeDrafts)
      .where(and(...conditions))
      .orderBy(desc(aryaKnowledgeDrafts.createdAt))
      .limit(50);
  }

  async approveDraft(draftId: string, reviewedBy: string): Promise<boolean> {
    const drafts = await db
      .select()
      .from(aryaKnowledgeDrafts)
      .where(eq(aryaKnowledgeDrafts.id, draftId))
      .limit(1);

    if (drafts.length === 0) return false;
    const draft = drafts[0];

    await db.insert(aryaKnowledge).values({
      tenantId: draft.tenantId,
      domain: draft.domain,
      topic: draft.topic,
      content: draft.content,
      tags: draft.tags,
      language: draft.language,
      sourceType: 'self_learned',
      sourceTitle: draft.sourceTitle,
      status: 'published',
      version: 1,
      rules: draft.rules
    });

    await db
      .update(aryaKnowledgeDrafts)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: reviewedBy
      })
      .where(eq(aryaKnowledgeDrafts.id, draftId));

    return true;
  }

  async rejectDraft(draftId: string, reviewedBy: string): Promise<boolean> {
    const result = await db
      .update(aryaKnowledgeDrafts)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: reviewedBy
      })
      .where(eq(aryaKnowledgeDrafts.id, draftId));

    return true;
  }

  async getQueryPatterns(tenantId: string, gapsOnly: boolean = false): Promise<AryaQueryPattern[]> {
    let conditions: any[] = [eq(aryaQueryPatterns.tenantId, tenantId)];
    if (gapsOnly) {
      conditions.push(eq(aryaQueryPatterns.isGap, true));
    }

    return await db
      .select()
      .from(aryaQueryPatterns)
      .where(and(...conditions))
      .orderBy(desc(aryaQueryPatterns.queryCount))
      .limit(50);
  }

  async getLearningStats(tenantId: string): Promise<{
    totalQueries: number;
    knowledgeGaps: number;
    draftsCreated: number;
    draftsApproved: number;
    draftsRejected: number;
    draftsPending: number;
    topGaps: AryaQueryPattern[];
  }> {
    const patterns = await db
      .select()
      .from(aryaQueryPatterns)
      .where(eq(aryaQueryPatterns.tenantId, tenantId));

    const totalQueries = patterns.reduce((sum, p) => sum + p.queryCount, 0);
    const knowledgeGaps = patterns.filter(p => p.isGap).length;

    const allDrafts = await db
      .select()
      .from(aryaKnowledgeDrafts)
      .where(eq(aryaKnowledgeDrafts.tenantId, tenantId));

    const draftsCreated = allDrafts.length;
    const draftsApproved = allDrafts.filter(d => d.status === 'approved').length;
    const draftsRejected = allDrafts.filter(d => d.status === 'rejected').length;
    const draftsPending = allDrafts.filter(d => d.status === 'pending').length;

    const topGaps = patterns
      .filter(p => p.isGap)
      .sort((a, b) => b.queryCount - a.queryCount)
      .slice(0, 10);

    return {
      totalQueries,
      knowledgeGaps,
      draftsCreated,
      draftsApproved,
      draftsRejected,
      draftsPending,
      topGaps
    };
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateTopicFromQuery(query: string): string {
    const cleaned = query.replace(/\?/g, '').trim();
    const words = cleaned.split(/\s+/).filter(w => w.length > 2);
    if (words.length <= 5) return `Knowledge Gap: ${cleaned}`;
    return `Knowledge Gap: ${words.slice(0, 6).join(' ')}...`;
  }

  private generateDraftContent(query: string, domain: Domain): string {
    return `[AUTO-GENERATED DRAFT — Needs expert review]\n\n` +
      `This knowledge gap was detected from repeated user queries about: "${query}"\n\n` +
      `Domain: ${domain}\n` +
      `Suggested action: Research and fill in accurate content for this topic.\n\n` +
      `[Placeholder for expert-verified content]`;
  }

  private extractTags(query: string): string[] {
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'not', 'what', 'how', 'why', 'who',
      'when', 'where', 'from', 'are', 'was', 'tell', 'me', 'about', 'explain'
    ]);
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w))
      .slice(0, 5);
  }
}
