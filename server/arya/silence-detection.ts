import { db } from "../db";
import { aryaUsers, aryaNotifications } from "@shared/schema";
import { eq, and, lt, gte, isNotNull, sql } from "drizzle-orm";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function checkSilentUsers(
  sendPush: (userId: string, title: string, body: string, icon: string) => Promise<void>
): Promise<void> {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - THREE_DAYS_MS);
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

    // Users who last logged in 3–7 days ago (gone quiet but not abandoned)
    const silentUsers = await db.select({
      id: aryaUsers.id,
      name: aryaUsers.name,
      lastLoginAt: aryaUsers.lastLoginAt,
    })
      .from(aryaUsers)
      .where(
        and(
          eq(aryaUsers.isActive, true),
          isNotNull(aryaUsers.lastLoginAt),
          lt(aryaUsers.lastLoginAt, threeDaysAgo),
          gte(aryaUsers.lastLoginAt, sevenDaysAgo)
        )
      );

    for (const user of silentUsers) {
      try {
        // Check if we already sent a silence notification in the last 7 days
        const recentSilenceNote = await db.select({ id: aryaNotifications.id })
          .from(aryaNotifications)
          .where(
            and(
              eq(aryaNotifications.userId, user.id),
              eq(aryaNotifications.type, "silence_check" as any),
              gte(aryaNotifications.createdAt, sevenDaysAgo)
            )
          )
          .limit(1);

        if (recentSilenceNote.length > 0) continue;

        const firstName = user.name?.split(" ")[0] || "there";

        const message = "You've been quiet. No pressure — but I noticed.";

        await db.insert(aryaNotifications).values({
          userId: user.id,
          type: "silence_check" as any,
          title: `Hey ${firstName}`,
          message,
        });

        await sendPush(user.id, `Hey ${firstName}`, message, "/icons/icon-192.png");

        console.log(`[SILENCE] Sent check-in to ${firstName} (${user.id})`);
      } catch (err: any) {
        console.error(`[SILENCE] Failed for user ${user.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[SILENCE DETECTION]", err.message);
  }
}
