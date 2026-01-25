import { getPool } from '../db/postgres.js';
import { Domain, KnowledgeUnit } from './schemas.js';

export interface RetrievalResult {
  units: KnowledgeUnit[];
  total: number;
}

/**
 * Knowledge Retriever - Phase 1 Implementation
 * Uses keyword matching + tag filtering + simple ranking
 * Designed to be upgraded to pgvector semantic search later
 */
export class KnowledgeRetriever {
  
  /**
   * Retrieve knowledge units based on query
   * TODO: Replace with semantic search using pgvector when available
   */
  async retrieve(
    tenantId: string,
    query: string,
    domain?: Domain,
    language: string = 'en',
    topK: number = 5
  ): Promise<RetrievalResult> {
    const pool = getPool();
    
    // Extract keywords from query (simple tokenization)
    const keywords = this.extractKeywords(query);
    
    // Build SQL query with keyword and tag matching
    let sql = `
      SELECT 
        id, tenant_id, domain, topic, content, tags, language,
        source_type, source_title, status, version, rules,
        created_at, updated_at,
        -- Simple relevance scoring (keyword + tag overlap)
        (
          -- Topic match weight: 3x
          CASE WHEN LOWER(topic) LIKE $3 THEN 3 ELSE 0 END +
          -- Content match weight: 1x
          CASE WHEN LOWER(content) LIKE $3 THEN 1 ELSE 0 END +
          -- Tag overlap weight: 2x per matching tag
          (SELECT COUNT(*) * 2 FROM unnest(tags) tag WHERE tag = ANY($4))
        ) as relevance_score
      FROM arya_knowledge
      WHERE tenant_id = $1
        AND status = 'published'
        AND (LOWER(topic) LIKE $3 OR LOWER(content) LIKE $3 OR tags && $4)
    `;
    
    const params: any[] = [tenantId, language, `%${keywords[0]}%`, keywords];
    
    // Domain filter
    if (domain) {
      sql += ` AND domain = $${params.length + 1}`;
      params.push(domain);
    }
    
    sql += `
      ORDER BY relevance_score DESC, created_at DESC
      LIMIT $${params.length + 1}
    `;
    params.push(topK);
    
    const result = await pool.query(sql, params);
    
    return {
      units: result.rows.map(row => ({
        ...row,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      })),
      total: result.rowCount || 0
    };
  }
  
  /**
   * Get knowledge unit by ID
   */
  async getById(tenantId: string, id: string): Promise<KnowledgeUnit | null> {
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT * FROM arya_knowledge WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
  
  /**
   * Get all knowledge units by domain
   */
  async getByDomain(
    tenantId: string,
    domain: Domain,
    limit: number = 100
  ): Promise<KnowledgeUnit[]> {
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT * FROM arya_knowledge 
       WHERE tenant_id = $1 AND domain = $2 AND status = 'published'
       ORDER BY created_at DESC
       LIMIT $3`,
      [tenantId, domain, limit]
    );
    
    return result.rows.map(row => ({
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));
  }
  
  /**
   * Simple keyword extraction (can be enhanced with NLP later)
   */
  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 5); // Top 5 keywords
  }
}
