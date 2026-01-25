import { z } from 'zod';

// Domain types
export const DomainSchema = z.enum(['medical', 'business', 'sanskrit', 'chanakya']);
export type Domain = z.infer<typeof DomainSchema>;

// Knowledge Unit - Universal interface for all domains
export const KnowledgeUnitSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string(),
  domain: DomainSchema,
  topic: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  language: z.string().default('en'),
  source_type: z.string(),
  source_title: z.string(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  version: z.number().int().default(1),
  rules: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date()
});

export type KnowledgeUnit = z.infer<typeof KnowledgeUnitSchema>;

// Query Request Schema
export const QueryRequestSchema = z.object({
  tenant_id: z.string(),
  app_id: z.enum(['ermate', 'erprana', 'nevarh', 'varah_corp']).optional(),
  user_role: z.enum(['doctor', 'public', 'admin']).optional(),
  domain: DomainSchema.optional(),
  query: z.string().min(1),
  language: z.string().default('en'),
  top_k: z.number().int().min(1).max(20).default(5)
});

export type QueryRequest = z.infer<typeof QueryRequestSchema>;

// Query Response Schema
export const QueryResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.object({
    id: z.string(),
    title: z.string(),
    relevance: z.number()
  })),
  confidence: z.number(),
  domain_used: DomainSchema.optional(),
  trace_id: z.string().optional()
});

export type QueryResponse = z.infer<typeof QueryResponseSchema>;

// Insert schema for creating new knowledge units
export const InsertKnowledgeUnitSchema = KnowledgeUnitSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export type InsertKnowledgeUnit = z.infer<typeof InsertKnowledgeUnitSchema>;
