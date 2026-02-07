import { db } from "../db";
import { aryaKnowledge, AryaKnowledge, Domain } from "@shared/schema";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";

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
    const hasDevanagari = /[\u0900-\u097F]/.test(query);
    
    let conditions: any[] = [
      eq(aryaKnowledge.tenantId, tenantId),
      eq(aryaKnowledge.status, 'published')
    ];
    
    if (domain) {
      conditions.push(eq(aryaKnowledge.domain, domain));
    }
    
    const allResults = await db
      .select()
      .from(aryaKnowledge)
      .where(and(...conditions))
      .orderBy(desc(aryaKnowledge.createdAt));
    
    const scored = allResults.map(unit => {
      let score = 0;
      const topicLower = unit.topic.toLowerCase();
      const contentLower = unit.content.toLowerCase();
      const queryLower = query.toLowerCase();
      
      if (topicLower.includes(queryLower)) {
        score += 10;
      }
      
      for (const kw of keywords) {
        if (topicLower.includes(kw)) score += 3;
        if (contentLower.includes(kw)) score += 1;
        if (unit.tags && unit.tags.some(t => t.toLowerCase().includes(kw))) score += 2;
      }
      
      if (hasDevanagari && unit.content.match(/[\u0900-\u097F]/)) {
        score += 2;
      }
      
      const queryBigrams = this.generateBigrams(queryLower);
      for (const bigram of queryBigrams) {
        if (topicLower.includes(bigram)) score += 4;
        if (contentLower.includes(bigram)) score += 2;
      }
      
      return { unit, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const filtered = scored.filter(s => s.score > 0).slice(0, topK);
    
    if (filtered.length === 0) {
      return {
        units: allResults.slice(0, topK),
        total: Math.min(allResults.length, topK)
      };
    }
    
    return {
      units: filtered.map(s => s.unit),
      total: filtered.length
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

  async searchAll(
    tenantId: string,
    query: string,
    limit: number = 10
  ): Promise<AryaKnowledge[]> {
    const results = await this.retrieve(tenantId, query, undefined, 'en', limit);
    return results.units;
  }
  
  private extractKeywords(query: string): string[] {
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'not', 'no', 'can', 'will', 'do',
      'does', 'what', 'how', 'why', 'who', 'when', 'where', 'from', 'are',
      'was', 'were', 'been', 'be', 'have', 'has', 'had', 'it', 'its',
      'this', 'that', 'these', 'those', 'me', 'my', 'about', 'tell',
      'explain', 'describe', 'give', 'provide', 'show'
    ]);
    
    return query
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopwords.has(word));
  }

  private generateBigrams(text: string): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 1);
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
    return bigrams;
  }
}
