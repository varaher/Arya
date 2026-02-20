import { db } from "../db";
import { aryaInsights, aryaMemory, aryaQueryPatterns, aryaNeuralLinks, aryaKnowledge, AryaInsight } from "@shared/schema";
import { eq, and, desc, gt, sql } from "drizzle-orm";

export class InsightsEngine {

  async generateInsights(tenantId: string): Promise<AryaInsight[]> {
    const generated: AryaInsight[] = [];

    const memoryInsights = await this.fromMemoryPatterns(tenantId);
    generated.push(...memoryInsights);

    const gapInsights = await this.fromKnowledgeGaps(tenantId);
    generated.push(...gapInsights);

    const trendInsights = await this.fromQueryTrends(tenantId);
    generated.push(...trendInsights);

    return generated;
  }

  private async fromMemoryPatterns(tenantId: string): Promise<AryaInsight[]> {
    const memories = await db
      .select()
      .from(aryaMemory)
      .where(eq(aryaMemory.tenantId, tenantId))
      .orderBy(desc(aryaMemory.accessCount))
      .limit(20);

    const insights: AryaInsight[] = [];

    const healthMemories = memories.filter(m =>
      m.value.toLowerCase().match(/health|medical|symptom|pain|medicine|doctor|diet|exercise|sleep/)
    );
    const businessMemories = memories.filter(m =>
      m.value.toLowerCase().match(/business|startup|revenue|marketing|strategy|customer|project/)
    );

    if (healthMemories.length >= 2 && businessMemories.length >= 1) {
      const existing = await this.findExistingInsight(tenantId, 'cross_domain', 'Health-Business Balance');
      if (!existing) {
        const [insight] = await db.insert(aryaInsights).values({
          tenantId,
          sourceType: 'cross_domain',
          title: 'Health-Business Balance',
          insight: `You've shared ${healthMemories.length} health-related and ${businessMemories.length} business-related details. Balancing both is key — research shows entrepreneur health directly impacts business performance. Want me to create a wellness plan that fits your work schedule?`,
          relevance: "0.85",
          relatedMemoryIds: [...healthMemories, ...businessMemories].map(m => m.id).slice(0, 5),
          status: 'active',
        }).returning();
        insights.push(insight);
      }
    }

    const frequentTopics = memories
      .filter(m => m.accessCount > 3)
      .map(m => m.key);

    if (frequentTopics.length > 0) {
      const existing = await this.findExistingInsight(tenantId, 'memory_pattern', 'Frequently Discussed Topics');
      if (!existing) {
        const [insight] = await db.insert(aryaInsights).values({
          tenantId,
          sourceType: 'memory_pattern',
          title: 'Frequently Discussed Topics',
          insight: `You often come back to: ${frequentTopics.slice(0, 5).join(", ")}. I'm building deeper expertise in these areas to help you better. Would you like a detailed breakdown on any of these?`,
          relevance: "0.75",
          relatedMemoryIds: memories.filter(m => m.accessCount > 3).map(m => m.id).slice(0, 5),
          status: 'active',
        }).returning();
        insights.push(insight);
      }
    }

    return insights;
  }

  private async fromKnowledgeGaps(tenantId: string): Promise<AryaInsight[]> {
    const gaps = await db
      .select()
      .from(aryaQueryPatterns)
      .where(and(
        eq(aryaQueryPatterns.tenantId, tenantId),
        eq(aryaQueryPatterns.isGap, true),
        gt(aryaQueryPatterns.queryCount, 2)
      ))
      .orderBy(desc(aryaQueryPatterns.queryCount))
      .limit(5);

    if (gaps.length === 0) return [];

    const existing = await this.findExistingInsight(tenantId, 'knowledge_gap', 'Learning Opportunities');
    if (existing) return [];

    const gapTopics = gaps.map(g => g.normalizedQuery).slice(0, 3);
    const [insight] = await db.insert(aryaInsights).values({
      tenantId,
      sourceType: 'knowledge_gap',
      title: 'Learning Opportunities',
      insight: `I've noticed you've asked about topics I need to learn more about: ${gapTopics.join(", ")}. I'm actively working to fill these gaps. You can help by approving knowledge drafts in the Learning section.`,
      relevance: "0.80",
      status: 'active',
    }).returning();

    return [insight];
  }

  private async fromQueryTrends(tenantId: string): Promise<AryaInsight[]> {
    const patterns = await db
      .select()
      .from(aryaQueryPatterns)
      .where(eq(aryaQueryPatterns.tenantId, tenantId))
      .orderBy(desc(aryaQueryPatterns.queryCount))
      .limit(10);

    if (patterns.length < 5) return [];

    const domains = patterns.map(p => p.domain).filter(Boolean);
    const domainCounts: Record<string, number> = {};
    for (const d of domains) {
      if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
    }

    const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0];
    if (!topDomain) return [];

    const existing = await this.findExistingInsight(tenantId, 'query_trend', 'Your Focus Area');
    if (existing) return [];

    const [insight] = await db.insert(aryaInsights).values({
      tenantId,
      sourceType: 'query_trend',
      title: 'Your Focus Area',
      insight: `Your questions lean heavily toward ${topDomain[0]} topics (${topDomain[1]} out of ${patterns.length} recent queries). I can provide more targeted insights in this area or help you explore other domains too.`,
      relevance: "0.70",
      status: 'active',
    }).returning();

    return [insight];
  }

  private async findExistingInsight(tenantId: string, sourceType: string, title: string): Promise<AryaInsight | null> {
    const [existing] = await db
      .select()
      .from(aryaInsights)
      .where(and(
        eq(aryaInsights.tenantId, tenantId),
        eq(aryaInsights.sourceType, sourceType as any),
        eq(aryaInsights.title, title)
      ))
      .limit(1);
    return existing || null;
  }

  async getActiveInsights(tenantId: string): Promise<AryaInsight[]> {
    return await db
      .select()
      .from(aryaInsights)
      .where(and(
        eq(aryaInsights.tenantId, tenantId),
        eq(aryaInsights.status, 'active')
      ))
      .orderBy(desc(aryaInsights.createdAt))
      .limit(10);
  }

  async dismissInsight(insightId: string): Promise<boolean> {
    await db
      .update(aryaInsights)
      .set({ status: 'dismissed' })
      .where(eq(aryaInsights.id, insightId));
    return true;
  }

  async actOnInsight(insightId: string): Promise<boolean> {
    await db
      .update(aryaInsights)
      .set({ status: 'acted_on' })
      .where(eq(aryaInsights.id, insightId));
    return true;
  }
}
