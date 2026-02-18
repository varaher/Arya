import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, timestamp, integer, jsonb, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ARYA Core Tables

// Domain enum
export const DomainSchema = z.enum(['medical', 'business', 'sanskrit', 'chanakya']);
export type Domain = z.infer<typeof DomainSchema>;

// Knowledge Base Table (published knowledge)
export const aryaKnowledge = pgTable("arya_knowledge", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  domain: varchar("domain", { length: 50 }).notNull().$type<Domain>(),
  topic: varchar("topic", { length: 500 }).notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  domain: varchar("domain", { length: 50 }).notNull().$type<Domain>(),
  topic: varchar("topic", { length: 500 }).notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  language: varchar("language", { length: 10 }).default("en"),
  sourceType: varchar("source_type", { length: 100 }).notNull(),
  sourceTitle: varchar("source_title", { length: 500 }).notNull(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).default("0.00"),
  learnedFromQuery: text("learned_from_query"),
  status: varchar("status", { length: 20 }).default("pending").$type<'pending' | 'approved' | 'rejected'>(),
  rules: jsonb("rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by", { length: 100 })
});

// Query Patterns Table (self-learning: tracks query frequency and gaps)
export const aryaQueryPatterns = pgTable("arya_query_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  normalizedQuery: text("normalized_query").notNull(),
  domain: varchar("domain", { length: 50 }).$type<Domain>(),
  queryCount: integer("query_count").default(1).notNull(),
  lastResultCount: integer("last_result_count").default(0),
  avgConfidence: decimal("avg_confidence", { precision: 3, scale: 2 }).default("0.00"),
  isGap: boolean("is_gap").default(false),
  draftGenerated: boolean("draft_generated").default(false),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull()
});

// Neural Links Table (cross-domain knowledge connections)
export const aryaNeuralLinks = pgTable("arya_neural_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  fromUnitId: varchar("from_unit_id", { length: 255 }).notNull(),
  toUnitId: varchar("to_unit_id", { length: 255 }).notNull(),
  fromDomain: varchar("from_domain", { length: 50 }).notNull().$type<Domain>(),
  toDomain: varchar("to_domain", { length: 50 }).notNull().$type<Domain>(),
  linkScore: decimal("link_score", { precision: 4, scale: 3 }).default("0.000").notNull(),
  linkType: varchar("link_type", { length: 50 }).notNull().$type<'tag_overlap' | 'keyword_similarity' | 'conceptual' | 'complementary'>(),
  evidence: text("evidence").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Audit Logs Table
export const aryaAuditLogs = pgTable("arya_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

export const insertAryaKnowledgeDraftSchema = createInsertSchema(aryaKnowledgeDrafts).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true
});
export type InsertAryaKnowledgeDraft = z.infer<typeof insertAryaKnowledgeDraftSchema>;
export type AryaKnowledgeDraft = typeof aryaKnowledgeDrafts.$inferSelect;

export const insertAryaQueryPatternSchema = createInsertSchema(aryaQueryPatterns).omit({
  id: true,
  firstSeen: true,
  lastSeen: true
});
export type InsertAryaQueryPattern = z.infer<typeof insertAryaQueryPatternSchema>;
export type AryaQueryPattern = typeof aryaQueryPatterns.$inferSelect;

export const insertAryaNeuralLinkSchema = createInsertSchema(aryaNeuralLinks).omit({
  id: true,
  createdAt: true
});
export type InsertAryaNeuralLink = z.infer<typeof insertAryaNeuralLinkSchema>;
export type AryaNeuralLink = typeof aryaNeuralLinks.$inferSelect;

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

// API Keys Table (for external apps like ERmate, ErPrana to connect)
export const aryaApiKeys = pgTable("arya_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  appId: varchar("app_id", { length: 50 }).notNull(),
  keyHash: varchar("key_hash", { length: 128 }).notNull(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
  permissions: text("permissions").array().default(sql`ARRAY['knowledge:read','chat:write']::text[]`),
  rateLimit: integer("rate_limit").default(100),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  totalRequests: integer("total_requests").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const aryaApiUsage = pgTable("arya_api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id", { length: 255 }).notNull(),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  endpoint: varchar("endpoint", { length: 200 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAryaApiKeySchema = createInsertSchema(aryaApiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  totalRequests: true,
});
export type InsertAryaApiKey = z.infer<typeof insertAryaApiKeySchema>;
export type AryaApiKey = typeof aryaApiKeys.$inferSelect;

export const insertAryaApiUsageSchema = createInsertSchema(aryaApiUsage).omit({
  id: true,
  createdAt: true,
});
export type InsertAryaApiUsage = z.infer<typeof insertAryaApiUsageSchema>;
export type AryaApiUsage = typeof aryaApiUsage.$inferSelect;

// Clinical Records Table (ERmate processed data → feeds ARYA knowledge)
export const aryaClinicalRecords = pgTable("arya_clinical_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  sourceApp: varchar("source_app", { length: 50 }).default("ermate").notNull(),
  chiefComplaint: varchar("chief_complaint", { length: 500 }).notNull(),
  hpi: text("hpi"),
  pmh: text("pmh").array().default(sql`ARRAY[]::text[]`),
  medications: text("medications").array().default(sql`ARRAY[]::text[]`),
  allergies: text("allergies").array().default(sql`ARRAY[]::text[]`),
  exam: text("exam"),
  ddx: text("ddx").array().default(sql`ARRAY[]::text[]`),
  investigations: text("investigations").array().default(sql`ARRAY[]::text[]`),
  treatment: text("treatment").array().default(sql`ARRAY[]::text[]`),
  safetyFlags: text("safety_flags").array().default(sql`ARRAY[]::text[]`),
  riskLevel: varchar("risk_level", { length: 20 }),
  originalTranscript: text("original_transcript"),
  language: varchar("language", { length: 10 }).default("en"),
  knowledgeUnitId: varchar("knowledge_unit_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAryaClinicalRecordSchema = createInsertSchema(aryaClinicalRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertAryaClinicalRecord = z.infer<typeof insertAryaClinicalRecordSchema>;
export type AryaClinicalRecord = typeof aryaClinicalRecords.$inferSelect;

// Re-export chat models
export * from "./models/chat";
