import { db } from "../db";
import { aryaApiKeys, aryaApiUsage } from "@shared/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const fullKey = `arya_${raw}`;
  const prefix = fullKey.slice(0, 11);
  const hash = hashKey(fullKey);
  return { fullKey, prefix, hash };
}

export async function createApiKey(opts: {
  tenantId: string;
  name: string;
  appId: string;
  permissions?: string[];
  rateLimit?: number;
  expiresInDays?: number;
}) {
  const { fullKey, prefix, hash } = generateApiKey();

  const expiresAt = opts.expiresInDays
    ? new Date(Date.now() + opts.expiresInDays * 86400000)
    : null;

  const [row] = await db
    .insert(aryaApiKeys)
    .values({
      tenantId: opts.tenantId,
      name: opts.name,
      appId: opts.appId,
      keyHash: hash,
      keyPrefix: prefix,
      permissions: opts.permissions || ["knowledge:read", "chat:write"],
      rateLimit: opts.rateLimit || 100,
      expiresAt,
    })
    .returning();

  return { id: row.id, key: fullKey, prefix, name: row.name, appId: row.appId, createdAt: row.createdAt };
}

export async function listApiKeys(tenantId: string) {
  return db
    .select({
      id: aryaApiKeys.id,
      name: aryaApiKeys.name,
      appId: aryaApiKeys.appId,
      keyPrefix: aryaApiKeys.keyPrefix,
      permissions: aryaApiKeys.permissions,
      rateLimit: aryaApiKeys.rateLimit,
      isActive: aryaApiKeys.isActive,
      lastUsedAt: aryaApiKeys.lastUsedAt,
      totalRequests: aryaApiKeys.totalRequests,
      createdAt: aryaApiKeys.createdAt,
      expiresAt: aryaApiKeys.expiresAt,
    })
    .from(aryaApiKeys)
    .where(eq(aryaApiKeys.tenantId, tenantId))
    .orderBy(desc(aryaApiKeys.createdAt));
}

export async function revokeApiKey(keyId: string, tenantId: string) {
  const [updated] = await db
    .update(aryaApiKeys)
    .set({ isActive: false })
    .where(and(eq(aryaApiKeys.id, keyId), eq(aryaApiKeys.tenantId, tenantId)))
    .returning();
  return !!updated;
}

export async function deleteApiKey(keyId: string, tenantId: string) {
  const [deleted] = await db
    .delete(aryaApiKeys)
    .where(and(eq(aryaApiKeys.id, keyId), eq(aryaApiKeys.tenantId, tenantId)))
    .returning();
  return !!deleted;
}

export async function getApiKeyUsage(keyId: string, days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  return db
    .select()
    .from(aryaApiUsage)
    .where(and(eq(aryaApiUsage.apiKeyId, keyId), gte(aryaApiUsage.createdAt, since)))
    .orderBy(desc(aryaApiUsage.createdAt))
    .limit(500);
}

export async function getUsageStats(tenantId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [todayCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aryaApiUsage)
    .where(and(eq(aryaApiUsage.tenantId, tenantId), gte(aryaApiUsage.createdAt, todayStart)));

  const [weekCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aryaApiUsage)
    .where(and(eq(aryaApiUsage.tenantId, tenantId), gte(aryaApiUsage.createdAt, weekAgo)));

  const keyCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aryaApiKeys)
    .where(and(eq(aryaApiKeys.tenantId, tenantId), eq(aryaApiKeys.isActive, true)));

  return {
    totalKeysActive: keyCount[0]?.count || 0,
    requestsToday: todayCount?.count || 0,
    requestsThisWeek: weekCount?.count || 0,
  };
}

async function validateApiKey(rawKey: string) {
  const hash = hashKey(rawKey);
  const [key] = await db
    .select()
    .from(aryaApiKeys)
    .where(and(eq(aryaApiKeys.keyHash, hash), eq(aryaApiKeys.isActive, true)));

  if (!key) return null;
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return null;

  await db
    .update(aryaApiKeys)
    .set({
      lastUsedAt: new Date(),
      totalRequests: sql`${aryaApiKeys.totalRequests} + 1`,
    })
    .where(eq(aryaApiKeys.id, key.id));

  return key;
}

async function logUsage(apiKeyId: string, tenantId: string, endpoint: string, method: string, statusCode: number, responseTimeMs: number) {
  await db.insert(aryaApiUsage).values({
    apiKeyId,
    tenantId,
    endpoint,
    method,
    statusCode,
    responseTimeMs,
  });
}

export function apiKeyAuth(requiredPermission?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing API key. Use Authorization: Bearer arya_..." });
    }

    const rawKey = authHeader.slice(7);
    const startTime = Date.now();

    const key = await validateApiKey(rawKey);
    if (!key) {
      return res.status(401).json({ error: "Invalid or expired API key" });
    }

    if (requiredPermission && key.permissions && !key.permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: `Missing permission: ${requiredPermission}` });
    }

    (req as any).apiKey = key;
    (req as any).tenantId = key.tenantId;
    (req as any).appId = key.appId;

    const originalEnd = res.end.bind(res);
    (res as any).end = function (this: Response, ...args: any[]) {
      const elapsed = Date.now() - startTime;
      logUsage(key.id, key.tenantId, req.path, req.method, res.statusCode, elapsed).catch(() => {});
      return (originalEnd as Function).call(this, ...args);
    };

    next();
  };
}
