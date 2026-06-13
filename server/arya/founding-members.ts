// ═══════════════════════════════════════════════════════════════════════
// ARYA — Founding Member One-Time Setup
// server/arya/founding-members.ts
//
// Run once on launch day to:
//   1. Mark all pre-launch users as founding members
//   2. Give them 30 more days of Pro access
//   3. Send them the founding member notification
//
// Call from admin route: POST /api/admin/mark-founding-members
// ═══════════════════════════════════════════════════════════════════════

import { db } from "../db";
import { aryaUsers, aryaNotifications } from "@shared/schema";
import { eq, lt } from "drizzle-orm";

export async function markFoundingMembers(
  sendPush: (
    userId: string,
    title: string,
    body: string,
    icon: string
  ) => Promise<void>,
  launchDate: Date = new Date("2026-06-16")
): Promise<{ marked: number }> {
  const earlyUsers = await db
    .select()
    .from(aryaUsers)
    .where(lt(aryaUsers.createdAt, launchDate));

  let marked = 0;

  for (const user of earlyUsers) {
    // Skip users who are already marked
    if (user.isFoundingMember) continue;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    await db
      .update(aryaUsers)
      .set({
        isFoundingMember: true,
        foundingPrice: 14900, // ₹149 in paise
        trialStatus: "active",
        trialEndsAt,
      })
      .where(eq(aryaUsers.id, user.id));

    const body = `You've been with ARYA since the beginning.

You have 30 more days of full access.

When you're ready — Core plan at ₹149/month.
Forever. As a thank you.

That's your founding member price.
It never increases.`;

    // In-app notification
    await db.insert(aryaNotifications).values({
      userId: user.id,
      type: "welcome",
      title: "You built ARYA with us 🌿",
      message: body,
    });

    // Push notification
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
