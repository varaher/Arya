// ═══════════════════════════════════════════════════════════════════════
// ARYA — Founding Member Definition & One-Time Setup
// server/arya/founding-members.ts
//
// FOUNDING MEMBER DEFINITION:
//   Anyone who signs up on or before 25 June 2026.
//   Benefit: Core plan locked at ₹179/month, forever.
//   (Price never increases, even when public pricing goes up.)
//
// Auto-applied at signup. Also callable as a one-time admin backfill.
// ═══════════════════════════════════════════════════════════════════════

import { db } from "../db";
import { aryaUsers, aryaNotifications } from "@shared/schema";
import { eq, lte } from "drizzle-orm";

// Cutoff: anyone who joined on or before this date is a founding member
export const FOUNDING_CUTOFF = new Date("2026-06-25T23:59:59+05:30"); // midnight IST 25 Jun 2026
export const FOUNDING_PRICE_PAISE = 17900; // ₹179/month in paise

/** Returns true if a given signup date qualifies for founding member status */
export function isFoundingSignup(signedUpAt: Date): boolean {
  return signedUpAt <= FOUNDING_CUTOFF;
}

/** One-time admin backfill: marks all qualifying users as founding members */
export async function markFoundingMembers(
  sendPush: (
    userId: string,
    title: string,
    body: string,
    icon: string
  ) => Promise<void>
): Promise<{ marked: number }> {
  const allUsers = await db.select().from(aryaUsers);
  let marked = 0;

  for (const user of allUsers) {
    if (user.isFoundingMember) continue;

    const signupDate = user.createdAt ? new Date(user.createdAt) : new Date();
    if (!isFoundingSignup(signupDate)) continue;

    await db
      .update(aryaUsers)
      .set({
        isFoundingMember: true,
        foundingPrice: FOUNDING_PRICE_PAISE,
      })
      .where(eq(aryaUsers.id, user.id));

    const body = `You've been with ARYA since the beginning.

Core plan locked at ₹179/month — forever.
Even when pricing changes for everyone else, yours stays.

That's your founding member price. It never increases.`;

    await db.insert(aryaNotifications).values({
      userId: user.id,
      type: "welcome",
      title: "You built ARYA with us 🌿",
      message: body,
    });

    try {
      await sendPush(
        user.id,
        "You built ARYA with us 🌿",
        body,
        "/icons/icon-192.png"
      );
    } catch {}

    marked++;
  }

  console.log(`[FOUNDING] Marked ${marked} founding members`);
  return { marked };
}
