import { db } from "../db";
import { aryaKnowledge, AryaKnowledge, Domain } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface RetrievalResult {
  units: AryaKnowledge[];
  total: number;
}

export class KnowledgeRetriever {
  
  async retrieve(
    tenantId: string,
    query: string,
    domain?: Domain,
    language: string = 'en',
    topK: number = 5
  ): Promise<RetrievalResult> {
    const keywords = this.extractKeywords(query);
    
    // Build query conditions
    let conditions: any[] = [
      eq(aryaKnowledge.tenantId, tenantId),
      eq(aryaKnowledge.status, 'published')
    ];
    
    if (domain) {
      conditions.push(eq(aryaKnowledge.domain, domain));
    }
    
    // Simple keyword matching (Phase 1)
    const results = await db
      .select()
      .from(aryaKnowledge)
      .where(and(...conditions))
      .orderBy(desc(aryaKnowledge.createdAt))
      .limit(topK);
    
    // Filter by content/topic match
    const filtered = results.filter(r => 
      r.topic.toLowerCase().includes(keywords[0]?.toLowerCase() || '') ||
      r.content.toLowerCase().includes(keywords[0]?.toLowerCase() || '') ||
      keywords.some(kw => r.tags.includes(kw))
    );
    
    return {
      units: filtered.length > 0 ? filtered : results,
      total: filtered.length > 0 ? filtered.length : results.length
    };
  }
  
  async getById(tenantId: string, id: string): Promise<AryaKnowledge | null> {
    const results = await db
      .select()
      .from(aryaKnowledge)
      .where(and(
        eq(aryaKnowledge.id, id),
        eq(aryaKnowledge.tenantId, tenantId)
      ))
      .limit(1);
    
    return results[0] || null;
  }
  
  async getByDomain(
    tenantId: string,
    domain: Domain,
    limit: number = 100
  ): Promise<AryaKnowledge[]> {
    return await db
      .select()
      .from(aryaKnowledge)
      .where(and(
        eq(aryaKnowledge.tenantId, tenantId),
        eq(aryaKnowledge.domain, domain),
        eq(aryaKnowledge.status, 'published')
      ))
      .orderBy(desc(aryaKnowledge.createdAt))
      .limit(limit);
  }
  
  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 5);
  }
}
