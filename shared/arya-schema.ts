import { pgTable, text, uuid, timestamp, integer, jsonb, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Domain enum
export const DomainSchema = z.enum(['medical', 'business', 'sanskrit', 'chanakya']);
export type Domain = z.infer<typeof DomainSchema>;

// Knowledge Base Table (published knowledge)
export const aryaKnowledge = pgTable("arya_knowledge", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  domain: varchar("domain", { length: 50 }).notNull().$type<Domain>(),
  topic: varchar("topic", { length: 500 }).notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default([]),
  language: varchar("language", { length: 10 }).default("en"),
  sourceType: varchar("source_type", { length: 100 }).notNull(),
  sourceTitle: varchar("source_title", { length: 500 }).notNull(),
  status: varchar("status", { length: 20 }).default("published").$type<'draft' | 'published' | 'archived'>(),
  version: integer("version").default(1),
  rules: jsonb("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Knowledge Drafts Table (self-learning AI drafts)
export const aryaKnowledgeDrafts = pgTable("arya_knowledge_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  domain: varchar("domain", { length: 50 }).notNull().$type<Domain>(),
  topic: varchar("topic", { length: 500 }).notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default([]),
  language: varchar("language", { length: 10 }).default("en"),
  sourceType: varchar("source_type", { length: 100 }).notNull(),
  sourceTitle: varchar("source_title", { length: 500 }).notNull(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).default("0.00"),
  learnedFromQuery: text("learned_from_query"),
  rules: jsonb("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by", { length: 100 })
});

// Audit Logs Table
export const aryaAuditLogs = pgTable("arya_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: varchar("tenant_id", { length: 100 }),
  appId: varchar("app_id", { length: 50 }),
  userRole: varchar("user_role", { length: 50 }),
  action: varchar("action", { length: 100 }).notNull(),
  endpoint: varchar("endpoint", { length: 200 }),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  traceId: varchar("trace_id", { length: 100 }),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Insert schemas
export const insertAryaKnowledgeSchema = createInsertSchema(aryaKnowledge).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertAryaKnowledge = z.infer<typeof insertAryaKnowledgeSchema>;
export type AryaKnowledge = typeof aryaKnowledge.$inferSelect;

// Query schemas
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
