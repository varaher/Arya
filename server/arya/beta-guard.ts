import { db } from "../db";
import { aryaBetaAllowList, aryaInviteCodes, aryaInviteRedemptions, aryaUsers } from "@shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import crypto from "crypto";

const BETA_MODE = process.env.BETA_MODE === "true";
const MAX_BETA_USERS = 200;
const INVITES_PER_USER = 3;
const INVITE_CODE_EXPIRY_DAYS = 7;

export function isBetaMode(): boolean {
  return BETA_MODE;
}

export async function getBetaUserCount(): Promise<number> {
  const [result] = await db.select({ count: count() }).from(aryaUsers).where(eq(aryaUsers.isActive, true));
  return result?.count || 0;
}

export async function canAcceptMoreUsers(): Promise<boolean> {
  const currentCount = await getBetaUserCount();
  return currentCount < MAX_BETA_USERS;
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
  if (!await canAcceptMoreUsers()) {
    return { success: false, error: "Beta is full. No more spots available right now." };
  }

  const [invite] = await db.select().from(aryaInviteCodes)
    .where(and(eq(aryaInviteCodes.code, code.trim().toUpperCase()), eq(aryaInviteCodes.isActive, true)))
    .limit(1);

  if (!invite) return { success: false, error: "Invalid invite code" };

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { success: false, error: "This invite code has expired" };
  }

  if (invite.usedCount >= invite.maxUses) {
    return { success: false, error: "This invite code has already been used" };
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

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const prefix = "ARYA";
  let code = prefix + "-";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

export async function createUserInviteCode(userId: string): Promise<{ success: boolean; code?: string; error?: string }> {
  const [user] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
  if (!user) return { success: false, error: "User not found" };

  if (user.invitesRemaining <= 0) {
    return { success: false, error: "You have no invites remaining" };
  }

  if (!await canAcceptMoreUsers()) {
    return { success: false, error: "Beta is full. No more spots available." };
  }

  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_CODE_EXPIRY_DAYS);

  await db.insert(aryaInviteCodes).values({
    code,
    maxUses: 1,
    expiresAt,
    createdBy: userId,
  });

  await db.update(aryaUsers)
    .set({ invitesRemaining: sql`${aryaUsers.invitesRemaining} - 1` })
    .where(eq(aryaUsers.id, userId));

  return { success: true, code };
}

export async function addToAllowList(identifier: string, identifierType: "email" | "phone"): Promise<void> {
  await db.insert(aryaBetaAllowList).values({
    identifier: identifier.trim(),
    identifierType,
  }).onConflictDoNothing();
}

export async function createInviteCode(code: string, maxUses: number = 1, expiresAt?: Date): Promise<any> {
  const finalExpiry = expiresAt || new Date(Date.now() + INVITE_CODE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const [invite] = await db.insert(aryaInviteCodes).values({
    code: code.trim().toUpperCase(),
    maxUses,
    expiresAt: finalExpiry,
  }).returning();
  return invite;
}

export async function createSystemInviteCodes(count: number): Promise<any[]> {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + INVITE_CODE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const [invite] = await db.insert(aryaInviteCodes).values({
      code,
      maxUses: 1,
      expiresAt,
      createdBy: "system",
    }).returning();
    codes.push(invite);
  }
  return codes;
}

export async function listInviteCodes(): Promise<any[]> {
  return db.select().from(aryaInviteCodes).orderBy(aryaInviteCodes.createdAt);
}

export async function listAllowList(): Promise<any[]> {
  return db.select().from(aryaBetaAllowList).orderBy(aryaBetaAllowList.createdAt);
}

export function getBetaConfig() {
  return {
    maxBetaUsers: MAX_BETA_USERS,
    invitesPerUser: INVITES_PER_USER,
    inviteCodeExpiryDays: INVITE_CODE_EXPIRY_DAYS,
  };
}
