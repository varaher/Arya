import { db } from "../db";
import { aryaBetaAllowList, aryaInviteCodes, aryaInviteRedemptions, aryaUsers } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

const BETA_MODE = process.env.BETA_MODE === "true";

export function isBetaMode(): boolean {
  return BETA_MODE;
}

export async function isUserAllowed(userId: string): Promise<boolean> {
  if (!BETA_MODE) return true;

  const [user] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
  if (!user) return false;

  if (user.phone) {
    const phoneMatch = await db.select().from(aryaBetaAllowList)
      .where(and(eq(aryaBetaAllowList.identifier, user.phone), eq(aryaBetaAllowList.identifierType, "phone")))
      .limit(1);
    if (phoneMatch.length > 0) return true;
  }

  if (user.email) {
    const emailMatch = await db.select().from(aryaBetaAllowList)
      .where(and(eq(aryaBetaAllowList.identifier, user.email), eq(aryaBetaAllowList.identifierType, "email")))
      .limit(1);
    if (emailMatch.length > 0) return true;
  }

  const redemption = await db.select().from(aryaInviteRedemptions)
    .where(eq(aryaInviteRedemptions.userId, userId))
    .limit(1);
  if (redemption.length > 0) return true;

  return false;
}

export async function redeemInviteCode(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const [invite] = await db.select().from(aryaInviteCodes)
    .where(and(eq(aryaInviteCodes.code, code.trim().toUpperCase()), eq(aryaInviteCodes.isActive, true)))
    .limit(1);

  if (!invite) return { success: false, error: "Invalid invite code" };

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { success: false, error: "This invite code has expired" };
  }

  if (invite.usedCount >= invite.maxUses) {
    return { success: false, error: "This invite code has reached its limit" };
  }

  const existing = await db.select().from(aryaInviteRedemptions)
    .where(eq(aryaInviteRedemptions.userId, userId))
    .limit(1);
  if (existing.length > 0) return { success: true };

  await db.insert(aryaInviteRedemptions).values({
    inviteCodeId: invite.id,
    userId,
  });

  await db.update(aryaInviteCodes)
    .set({ usedCount: sql`${aryaInviteCodes.usedCount} + 1` })
    .where(eq(aryaInviteCodes.id, invite.id));

  return { success: true };
}

export async function addToAllowList(identifier: string, identifierType: "email" | "phone"): Promise<void> {
  await db.insert(aryaBetaAllowList).values({
    identifier: identifier.trim(),
    identifierType,
  }).onConflictDoNothing();
}

export async function createInviteCode(code: string, maxUses: number = 1, expiresAt?: Date): Promise<any> {
  const [invite] = await db.insert(aryaInviteCodes).values({
    code: code.trim().toUpperCase(),
    maxUses,
    expiresAt: expiresAt || null,
  }).returning();
  return invite;
}

export async function listInviteCodes(): Promise<any[]> {
  return db.select().from(aryaInviteCodes).orderBy(aryaInviteCodes.createdAt);
}

export async function listAllowList(): Promise<any[]> {
  return db.select().from(aryaBetaAllowList).orderBy(aryaBetaAllowList.createdAt);
}
