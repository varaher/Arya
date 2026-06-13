// ═══════════════════════════════════════════════════════════════════════
// ARYA — 45-Day Trial Notification System
// server/arya/trial-notifications.ts
//
// Schedules 18 push notifications over 45 days.
// Day 1–37: discovery notifications introducing each ARYA section.
// Day 40–45: upgrade nudges with personalised Day 40 message.
// ═══════════════════════════════════════════════════════════════════════

import { db } from "../db";
import {
  aryaTrialNotifications,
  aryaUsers,
  aryaGoals,
  aryaVoiceNotes,
} from "@shared/schema";
import { eq, and, isNull, lte, gte, count } from "drizzle-orm";

// ── Notification definitions ────────────────────────────────────────────

interface TrialNotifDef {
  dayNumber: number;
  type: "discovery" | "nudge" | "upgrade_soft" | "upgrade_final";
  title: string;
  body: string;
  sendHour: number;
}

const TRIAL_NOTIFICATIONS: TrialNotifDef[] = [
  // Week 1: Core
  {
    dayNumber: 1,
    type: "discovery",
    title: "ARYA is ready for you 🤝",
    body: "Start with one thought. A decision. A worry. Anything. Just open ARYA and say it.",
    sendHour: 9,
  },
  {
    dayNumber: 3,
    type: "discovery",
    title: "Tell ARYA what you want to do 🎯",
    body: "Just say it naturally in conversation. ARYA will turn it into a goal — and check in when it goes quiet.",
    sendHour: 10,
  },
  {
    dayNumber: 5,
    type: "discovery",
    title: "Something on your mind? 🎤",
    body: "Tap Notes → Record. Speak for 30 seconds. ARYA transcribes, summarises, and pulls out the action items. In your language.",
    sendHour: 11,
  },
  {
    dayNumber: 7,
    type: "discovery",
    title: "Your first Sunday letter 📖",
    body: "Open ARYA today. Your first weekly review is ready — a reflection of your first week. Reads like a letter from someone paying close attention.",
    sendHour: 18,
  },

  // Week 2: Voice, Thinking, Body
  {
    dayNumber: 8,
    type: "discovery",
    title: "ARYA has 7 ways to think 🧠",
    body: "Tap the mode selector above the input. Try Founder Mode on any decision today — \"Here's what I'd actually do:\" Uncomfortable. Useful.",
    sendHour: 9,
  },
  {
    dayNumber: 10,
    type: "discovery",
    title: "Try talking to ARYA 🗣️",
    body: "Tap the mic. Speak in Malayalam, Hindi, Tamil — any language. ARYA listens and replies in the same language. Hands-free.",
    sendHour: 10,
  },
  {
    dayNumber: 12,
    type: "discovery",
    title: "Got a document you don't understand? 📸",
    body: "Prescription. Legal notice. Bank statement. Tap + → Scan document. ARYA reads it and explains it in plain language.",
    sendHour: 11,
  },
  {
    dayNumber: 14,
    type: "discovery",
    title: "How is your body doing? 💪",
    body: "Open Prana. Build your health profile. Log your first reading. ARYA coaches you on your actual numbers — not generic averages.",
    sendHour: 8,
  },

  // Week 3: Timing, Business, Market
  {
    dayNumber: 17,
    type: "discovery",
    title: "What kind of day is today? 🌙",
    body: "Open KAAL. See today's energy, your best window, and what to handle with care. Setup takes 2 minutes.",
    sendHour: 7,
  },
  {
    dayNumber: 20,
    type: "discovery",
    title: "Got a business decision pending? ⚖️",
    body: "Open Niti. Bring the decision you've been sitting with. ARYA thinks through it with you — sharply, not gently.",
    sendHour: 10,
  },
  {
    dayNumber: 23,
    type: "discovery",
    title: "NIFTY, SENSEX, your portfolio 📈",
    body: "Inside Niti → Market Lens. Live indices. Rotating news. Tap \"What does this mean for me?\" — ARYA explains it without jargon.",
    sendHour: 9,
  },

  // Week 4: Stories, Rehearsal, Community
  {
    dayNumber: 26,
    type: "discovery",
    title: "ARYA wants to tell you a story 📖",
    body: "Open Drishya. Describe what you need — a feeling, a situation. ARYA generates a complete story from India's ancient tradition. For your exact moment tonight.",
    sendHour: 21,
  },
  {
    dayNumber: 30,
    type: "discovery",
    title: "Got a difficult conversation coming? 🎭",
    body: "Open ARYA → say \"I need to rehearse a conversation with...\" ARYA plays them. You practise. You go in sharper.",
    sendHour: 10,
  },
  {
    dayNumber: 33,
    type: "discovery",
    title: "You're not the only one 👥",
    body: "Open Community. See this week's shared challenge. Others are building habits, making decisions, growing alongside you.",
    sendHour: 19,
  },

  // Final stretch
  {
    dayNumber: 37,
    type: "discovery",
    title: "Start tomorrow differently ☀️",
    body: "Set up your morning briefing. Profile → Morning Briefing → set your time. Tomorrow: your goals, the news, one line to carry through the day.",
    sendHour: 20,
  },
  {
    dayNumber: 40,
    type: "upgrade_soft",
    title: "5 days left of full access ⏳",
    body: "", // dynamically built at send time
    sendHour: 9,
  },
  {
    dayNumber: 43,
    type: "nudge",
    title: "2 days left 🔔",
    body: "Your 45-day full trial ends in 2 days. Everything you've built stays with you on any plan. Core ₹249 · Pro ₹499 · Elite ₹999",
    sendHour: 10,
  },
  {
    dayNumber: 45,
    type: "upgrade_final",
    title: "Today is day 45 🌿",
    body: "Thank you for 45 days with ARYA. Whatever you choose — your data, your memory, your goals — all yours. Always.",
    sendHour: 9,
  },
];

// ── Schedule all notifications at signup ────────────────────────────────

export async function scheduleTrialNotifications(
  userId: string,
  trialStartedAt: Date
): Promise<void> {
  const notifications = TRIAL_NOTIFICATIONS.map((n) => {
    const scheduledAt = new Date(trialStartedAt);
    scheduledAt.setDate(scheduledAt.getDate() + n.dayNumber - 1);
    scheduledAt.setHours(n.sendHour, 0, 0, 0);

    return {
      userId,
      dayNumber: n.dayNumber,
      notificationType: n.type,
      title: n.title,
      body: n.body,
      scheduledAt,
    };
  });

  await db.insert(aryaTrialNotifications).values(notifications);
}

// ── Dynamic Day 40 message ───────────────────────────────────────────────

async function buildDay40Body(userId: string): Promise<string> {
  try {
    const [convResult] = await db
      .execute<{ count: string }>(
        db.select({ count: count() }).from(aryaUsers).where(eq(aryaUsers.id, userId)).getSQL()
      );

    // Use raw SQL for simplicity across related tables
    const { rows: convRows } = await db.execute(
      `SELECT COUNT(*)::int AS cnt FROM conversations WHERE user_id = $1`
    );
    const { rows: goalRows } = await db.execute(
      `SELECT COUNT(*)::int AS cnt FROM arya_goals WHERE user_id = $1 AND deleted_at IS NULL`
    );
    const { rows: completedRows } = await db.execute(
      `SELECT COUNT(*)::int AS cnt FROM arya_goals WHERE user_id = $1 AND is_completed = true`
    );
    const { rows: noteRows } = await db.execute(
      `SELECT COUNT(*)::int AS cnt FROM arya_voice_notes WHERE user_id = $1`
    );

    const conversations = (convRows[0] as any)?.cnt || 0;
    const goals = (goalRows[0] as any)?.cnt || 0;
    const completed = (completedRows[0] as any)?.cnt || 0;
    const notes = (noteRows[0] as any)?.cnt || 0;

    return `You've been with ARYA for 40 days.

${conversations} conversations.
${goals} goals set${completed > 0 ? `, ${completed} completed` : ""}.${notes > 0 ? `\n${notes} voice notes recorded.` : ""}

ARYA knows you now.
5 more days of full access — then choose how you continue.

Core ₹249/month — everything you've been using, continues.`;
  } catch {
    return `You've been with ARYA for 40 days.

5 more days of full access — then choose how you continue.

Core ₹249/month — everything you've been using, continues.`;
  }
}

// ── Process due notifications (called every 10 min by scheduler) ─────────

export async function processTrialNotifications(
  sendPush: (
    userId: string,
    title: string,
    body: string,
    icon: string,
    extra?: Record<string, unknown>
  ) => Promise<void>
): Promise<void> {
  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const due = await db
      .select()
      .from(aryaTrialNotifications)
      .where(
        and(
          isNull(aryaTrialNotifications.sentAt),
          lte(aryaTrialNotifications.scheduledAt, now),
          gte(aryaTrialNotifications.scheduledAt, tenMinutesAgo)
        )
      )
      .limit(50);

    for (const notification of due) {
      try {
        let body = notification.body;
        if (notification.dayNumber === 40) {
          body = await buildDay40Body(notification.userId);
        }

        const isUpgradeNotif = [40, 43, 45].includes(notification.dayNumber);

        await sendPush(
          notification.userId,
          notification.title,
          body,
          "/icons/icon-192.png",
          {
            type: "trial",
            trialDay: notification.dayNumber,
            url: getNotificationUrl(notification.dayNumber),
            requireInteraction: isUpgradeNotif,
            actions: isUpgradeNotif
              ? [
                  { action: "upgrade", title: "🚀 See plans" },
                  { action: "dismiss", title: "Later" },
                ]
              : undefined,
          }
        );

        await db
          .update(aryaTrialNotifications)
          .set({ sentAt: new Date() })
          .where(eq(aryaTrialNotifications.id, notification.id));
      } catch (err: any) {
        console.error(
          `[TRIAL] Notification failed: user=${notification.userId} day=${notification.dayNumber} —`,
          err.message
        );
      }
    }
  } catch (err: any) {
    console.error("[TRIAL] processTrialNotifications error:", err.message);
  }
}

// ── Deep-link URL for each notification day ──────────────────────────────

function getNotificationUrl(day: number): string {
  const urlMap: Record<number, string> = {
    1: "/",
    3: "/?panel=goals",
    5: "/?panel=notes",
    7: "/?tab=review",
    8: "/?mode=founder",
    10: "/?voice=true",
    12: "/?scan=true",
    14: "/?tab=prana",
    17: "/?tab=kaal",
    20: "/?tab=niti",
    23: "/?tab=niti&section=market",
    26: "/?tab=drishya",
    30: "/?rehearse=true",
    33: "/?tab=community",
    37: "/?settings=morning",
    40: "/pricing",
    43: "/pricing",
    45: "/pricing",
  };
  return urlMap[day] || "/";
}

// ── getEffectivePlan — use everywhere instead of u.plan directly ─────────

export async function getEffectivePlan(userId: string): Promise<string> {
  try {
    const [u] = await db
      .select()
      .from(aryaUsers)
      .where(eq(aryaUsers.id, userId))
      .limit(1);

    if (!u) return "free";

    // Paid subscriber — use their plan
    if (u.plan && u.plan !== "free" && u.planExpiresAt && new Date(u.planExpiresAt) > new Date()) {
      return u.plan;
    }

    // Active trial — full Pro access
    if (u.trialStatus === "active" && u.trialEndsAt) {
      if (new Date() < new Date(u.trialEndsAt)) {
        return "pro";
      } else {
        // Trial expired — update status lazily
        await db
          .update(aryaUsers)
          .set({ trialStatus: "expired" })
          .where(eq(aryaUsers.id, userId));
        return "free";
      }
    }

    return u.plan || "free";
  } catch {
    return "free";
  }
}
