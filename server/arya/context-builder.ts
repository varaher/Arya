/**
 * context-builder.ts — Central context assembly for ARYA
 *
 * ONE function assembles everything about a user.
 * Every section (Chat, KAAL, Niti, Drishya, Morning Briefing, Sunday Review)
 * reads from this instead of querying in isolation.
 *
 * All 12 DB queries run in parallel → ~50ms total.
 */

import { db } from "../db";
import {
  aryaUsers,
  aryaGoals,
  aryaMoodCheckins,
  aryaVoiceNotes,
  aryaMemory,
  aryaNitiSessions,
  aryaReminders,
  aryaHealthReadings,
} from "@shared/schema";
import { eq, and, gte, lte, desc, isNull, ne } from "drizzle-orm";
import { getUpcomingEvents } from "./google-calendar";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserGoalSummary {
  id: string;
  title: string;
  priority: string | null;
  progress: number;
  streakCount: number;
  dueDate: Date | null;
  targetDate: Date | null;
  goalType: string;
  isCompleted: boolean;
  isOverdue: boolean;
}

export interface UserContext {
  // Identity
  userId: string;
  name: string;
  firstName: string;
  language: string;
  occupation: string | null;
  lifeStage: string | null;

  // Goals
  goals: {
    all: UserGoalSummary[];
    topThree: UserGoalSummary[];
    urgent: UserGoalSummary[];
    overdue: UserGoalSummary[];
    totalActive: number;
    dueThisWeek: UserGoalSummary[];
  };

  // Mood
  mood: {
    score: number | null;       // 1-5
    energy: number | null;      // 1-5
    emoji: string | null;       // derived
    note: string | null;
    checkedInToday: boolean;
  };

  // Health
  health: {
    lastSleep: number | null;         // hours
    lastHeartRate: number | null;     // bpm
    lastSpO2: number | null;          // %
    lastWeight: number | null;        // kg
    readingsCount: number;
  };

  // KAAL / Vedic profile
  kaal: {
    rashi: string | null;
    nakshatra: string | null;
    dashaLord: string | null;
    dashaYearsLeft: string | null;
    birthDate: string | null;
    hasProfile: boolean;
  };

  // Niti / decisions
  niti: {
    recentSessions: Array<{ title: string | null; sessionType: string; philosopher: string | null; userDecision: string | null }>;
    openDecisions: Array<{ title: string | null; sessionType: string }>;
  };

  // Calendar
  calendar: {
    todayEvents: Array<{ summary: string; start: string; end: string }>;
    tomorrowEvents: Array<{ summary: string; start: string; end: string }>;
    hasMeetingsToday: boolean;
    firstMeetingToday: string | null;
  };

  // Voice notes
  voiceNotes: {
    recent: Array<{ summary: string | null; transcript: string; createdAt: Date }>;
    flashback: { summary: string | null; transcript: string; createdAt: Date } | null;
    recentTheme: string | null;
  };

  // Memory (last 12 items)
  memories: Array<{ key: string; value: string; category: string }>;

  // Upcoming reminders (next 24 h)
  nextReminders: Array<{ title: string; type: string; scheduledAt: Date }>;

  // Time context
  time: {
    hour: number;
    dayOfWeek: number;             // 0=Sun, 6=Sat
    isWeekend: boolean;
    isEarlyMorning: boolean;       // 4-8
    isMorning: boolean;            // 8-12
    isAfternoon: boolean;          // 12-17
    isEvening: boolean;            // 17-21
    isLateNight: boolean;          // 21-4
    greeting: string;
  };

  // Pre-assembled prompt string (ready to inject into any system prompt)
  promptContext: {
    fullContext: string;
    goalsBlock: string;
    moodBlock: string;
    kaalBlock: string;
    voiceNotesBlock: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOOD_EMOJIS: Record<number, string> = { 1: "😔", 2: "😕", 3: "😐", 4: "🙂", 5: "😊" };
const MOOD_LABELS: Record<number, string> = { 1: "awful", 2: "low", 3: "okay", 4: "good", 5: "great" };

function moodEmoji(score: number | null): string | null {
  if (!score) return null;
  return MOOD_EMOJIS[score] ?? null;
}

function timeGreeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function isOverdueGoal(g: { dueDate?: Date | null; targetDate?: Date | null; isCompleted?: boolean | null }): boolean {
  if (g.isCompleted) return false;
  const deadline = g.dueDate ?? g.targetDate ?? null;
  if (!deadline) return false;
  return deadline < new Date();
}

function isDueThisWeek(g: { dueDate?: Date | null; targetDate?: Date | null; isCompleted?: boolean | null }): boolean {
  if (g.isCompleted) return false;
  const deadline = g.dueDate ?? g.targetDate ?? null;
  if (!deadline) return false;
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  return deadline <= weekEnd && deadline >= new Date();
}

// ─── Main function ─────────────────────────────────────────────────────────────

export async function buildUserContext(userId: string, tenantId = "varah"): Promise<UserContext> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const next24h = new Date(now);
  next24h.setHours(next24h.getHours() + 24);

  // Flashback window: 28–62 days ago
  const flashbackEnd = new Date(now);
  flashbackEnd.setDate(flashbackEnd.getDate() - 28);
  const flashbackStart = new Date(now);
  flashbackStart.setDate(flashbackStart.getDate() - 62);

  // Run all queries in parallel
  const [
    userRow,
    activeGoals,
    todayMoodRows,
    healthRows,
    nitiRows,
    voiceNoteRows,
    flashbackRows,
    memoryRows,
    reminderRows,
    calTodayRaw,
    calUpcomingRaw,
  ] = await Promise.all([
    // 1. User profile
    db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1),

    // 2. Active goals
    db.select({
      id: aryaGoals.id,
      title: aryaGoals.title,
      priority: aryaGoals.priority,
      progress: aryaGoals.progress,
      streakCount: aryaGoals.streakCount,
      dueDate: aryaGoals.dueDate,
      targetDate: aryaGoals.targetDate,
      goalType: aryaGoals.goalType,
      isCompleted: aryaGoals.isCompleted,
    })
      .from(aryaGoals)
      .where(and(eq(aryaGoals.userId, userId), eq(aryaGoals.status, "active"), eq(aryaGoals.isCompleted, false)))
      .orderBy(desc(aryaGoals.updatedAt))
      .limit(20),

    // 3. Today's mood
    db.select().from(aryaMoodCheckins)
      .where(and(eq(aryaMoodCheckins.userId, userId), gte(aryaMoodCheckins.createdAt, todayStart)))
      .orderBy(desc(aryaMoodCheckins.createdAt))
      .limit(1),

    // 4. Health readings — last 7 days
    db.select().from(aryaHealthReadings)
      .where(and(eq(aryaHealthReadings.userId, userId), gte(aryaHealthReadings.loggedAt, weekAgo)))
      .orderBy(desc(aryaHealthReadings.loggedAt))
      .limit(20),

    // 5. Niti sessions — recent 5
    db.select({
      title: aryaNitiSessions.title,
      sessionType: aryaNitiSessions.sessionType,
      philosopher: aryaNitiSessions.philosopher,
      userDecision: aryaNitiSessions.userDecision,
      status: aryaNitiSessions.status,
    })
      .from(aryaNitiSessions)
      .where(eq(aryaNitiSessions.userId, userId))
      .orderBy(desc(aryaNitiSessions.createdAt))
      .limit(5),

    // 6. Voice notes — recent 5
    db.select({
      summary: aryaVoiceNotes.summary,
      transcript: aryaVoiceNotes.transcript,
      createdAt: aryaVoiceNotes.createdAt,
    })
      .from(aryaVoiceNotes)
      .where(eq(aryaVoiceNotes.userId, userId))
      .orderBy(desc(aryaVoiceNotes.createdAt))
      .limit(5),

    // 7. Voice note flashback (28–62 days ago)
    db.select({
      summary: aryaVoiceNotes.summary,
      transcript: aryaVoiceNotes.transcript,
      createdAt: aryaVoiceNotes.createdAt,
    })
      .from(aryaVoiceNotes)
      .where(and(
        eq(aryaVoiceNotes.userId, userId),
        lte(aryaVoiceNotes.createdAt, flashbackEnd),
        gte(aryaVoiceNotes.createdAt, flashbackStart),
      ))
      .orderBy(desc(aryaVoiceNotes.createdAt))
      .limit(3),

    // 8. Memory — last 12 items
    db.select({ key: aryaMemory.key, value: aryaMemory.value, category: aryaMemory.category })
      .from(aryaMemory)
      .where(eq(aryaMemory.tenantId, tenantId))
      .orderBy(desc(aryaMemory.updatedAt))
      .limit(12),

    // 9. Upcoming reminders — next 24h
    db.select({ title: aryaReminders.title, type: aryaReminders.type, scheduledAt: aryaReminders.scheduledAt })
      .from(aryaReminders)
      .where(and(
        eq(aryaReminders.userId, userId),
        eq(aryaReminders.isActive, true),
        gte(aryaReminders.scheduledAt, now),
        lte(aryaReminders.scheduledAt, next24h),
      ))
      .orderBy(aryaReminders.scheduledAt)
      .limit(5),

    // 10. Calendar — today's events
    getUpcomingEvents(userId, 1).catch(() => [] as any[]),

    // 11. Calendar — next 2 days for tomorrow
    getUpcomingEvents(userId, 2).catch(() => [] as any[]),
  ]);

  // ── Process user profile ────────────────────────────────────────────────────
  const user = userRow[0];
  if (!user) {
    throw new Error(`[CONTEXT] User not found: ${userId}`);
  }
  const firstName = user.name.split(" ")[0];

  // ── Process goals ────────────────────────────────────────────────────────────
  const goalSummaries: UserGoalSummary[] = activeGoals.map(g => ({
    ...g,
    isOverdue: isOverdueGoal(g),
  }));

  const urgent = goalSummaries.filter(g => g.priority === "high" || g.priority === "critical");
  const overdue = goalSummaries.filter(g => g.isOverdue);
  const dueThisWeek = goalSummaries.filter(g => isDueThisWeek(g));
  // Top 3: urgent first, then by progress (lowest first = needs most work)
  const topThree = [...goalSummaries]
    .sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (b.priority === "high" && a.priority !== "high") return 1;
      return a.progress - b.progress;
    })
    .slice(0, 3);

  // ── Process mood ────────────────────────────────────────────────────────────
  const todayMood = todayMoodRows[0] ?? null;
  const moodScore = todayMood?.mood ?? null;

  // ── Process health ──────────────────────────────────────────────────────────
  const findReading = (metric: string) => healthRows.find(r => r.metric === metric);
  const sleepRow = findReading("sleep");
  const hrRow = findReading("heart_rate");
  const spo2Row = findReading("spo2");
  const weightRow = findReading("weight");

  // ── Process KAAL / Vedic ────────────────────────────────────────────────────
  const kaalHasProfile = !!(user.rashi || user.nakshatra);

  // ── Process Niti ─────────────────────────────────────────────────────────────
  const openDecisions = nitiRows.filter(s => !s.userDecision && s.status === "active");

  // ── Process calendar ─────────────────────────────────────────────────────────
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const normEvent = (e: any) => ({
    summary: e.summary || e.title || "Event",
    start: e.start?.dateTime || e.start?.date || e.start || "",
    end: e.end?.dateTime || e.end?.date || e.end || "",
  });

  const todayEvents = (calTodayRaw ?? [])
    .filter((e: any) => {
      const s = e.start?.dateTime || e.start?.date || e.start || "";
      const d = new Date(s);
      return d >= todayStart && d <= todayEnd;
    })
    .map(normEvent);

  const tomorrowEvents = (calUpcomingRaw ?? [])
    .filter((e: any) => {
      const s = e.start?.dateTime || e.start?.date || e.start || "";
      const d = new Date(s);
      return d >= tomorrowStart && d <= tomorrowEnd;
    })
    .map(normEvent);

  const firstMeeting = todayEvents[0] ?? null;

  // ── Process voice notes ───────────────────────────────────────────────────────
  const pickFlashback = flashbackRows.length > 0
    ? flashbackRows[Math.floor(Math.random() * flashbackRows.length)]
    : null;

  // ── Time context ───────────────────────────────────────────────────────────────
  const hour = now.getHours();
  const dow = now.getDay();

  // ─── Build prompt blocks ──────────────────────────────────────────────────────

  const goalsBlock = goalSummaries.length === 0
    ? ""
    : `WHAT ${firstName.toUpperCase()} IS WORKING ON RIGHT NOW:\n${topThree.map(g =>
      `• ${g.title} — ${g.progress}% done${g.streakCount > 0 ? `, ${g.streakCount}-day streak` : ""}${g.isOverdue ? " ⚠ OVERDUE" : ""}`
    ).join("\n")}${goalSummaries.length > 3 ? `\n(+${goalSummaries.length - 3} more active goals)` : ""}`;

  const moodBlock = todayMood
    ? `TODAY'S STATE: Mood ${MOOD_LABELS[moodScore!] || "unknown"} (${moodEmoji(moodScore)}), Energy ${todayMood.energy}/5${todayMood.note ? `. Note: "${todayMood.note}"` : ""}.`
    : "";

  const kaalBlock = kaalHasProfile
    ? `VEDIC PROFILE: Rashi — ${user.rashi || "unknown"}, Nakshatra — ${user.nakshatra || "unknown"}${user.dashaLord ? `, Dasha — ${user.dashaLord} (${user.dashaYearsLeft} yrs left)` : ""}.`
    : "";

  const voiceNotesBlock = voiceNoteRows.length > 0
    ? `RECENT VOICE NOTES (what ${firstName} has been thinking about):\n${voiceNoteRows.slice(0, 3).map(v =>
      `• ${v.summary || v.transcript.slice(0, 100)}`
    ).join("\n")}`
    : "";

  const nitiBlock = openDecisions.length > 0
    ? `OPEN DECISIONS (not yet resolved in Niti):\n${openDecisions.map(d => `• ${d.title || d.sessionType}`).join("\n")}`
    : "";

  const calendarBlock = todayEvents.length > 0
    ? `TODAY'S SCHEDULE:\n${todayEvents.map(e => `• ${e.summary} at ${e.start}`).join("\n")}`
    : "";

  const memoryBlock = memoryRows.length > 0
    ? `ARYA REMEMBERS:\n${memoryRows.slice(0, 8).map(m => `• ${m.value}`).join("\n")}`
    : "";

  const overdueBlock = overdue.length > 0
    ? `⚠ OVERDUE GOALS: ${overdue.map(g => g.title).join(", ")}`
    : "";

  const fullContext = [
    goalsBlock,
    moodBlock,
    kaalBlock,
    voiceNotesBlock,
    nitiBlock,
    calendarBlock,
    memoryBlock,
    overdueBlock,
  ].filter(Boolean).join("\n\n");

  return {
    userId,
    name: user.name,
    firstName,
    language: user.preferredLanguage || "en",
    occupation: user.occupation ?? null,
    lifeStage: user.lifeStage ?? null,

    goals: {
      all: goalSummaries,
      topThree,
      urgent,
      overdue,
      dueThisWeek,
      totalActive: goalSummaries.length,
    },

    mood: {
      score: moodScore,
      energy: todayMood?.energy ?? null,
      emoji: moodEmoji(moodScore),
      note: todayMood?.note ?? null,
      checkedInToday: !!todayMood,
    },

    health: {
      lastSleep: sleepRow ? parseFloat(sleepRow.value as string) : null,
      lastHeartRate: hrRow ? parseFloat(hrRow.value as string) : null,
      lastSpO2: spo2Row ? parseFloat(spo2Row.value as string) : null,
      lastWeight: weightRow ? parseFloat(weightRow.value as string) : null,
      readingsCount: healthRows.length,
    },

    kaal: {
      rashi: user.rashi ?? null,
      nakshatra: user.nakshatra ?? null,
      dashaLord: user.dashaLord ?? null,
      dashaYearsLeft: user.dashaYearsLeft ?? null,
      birthDate: user.birthDate ?? null,
      hasProfile: kaalHasProfile,
    },

    niti: {
      recentSessions: nitiRows,
      openDecisions,
    },

    calendar: {
      todayEvents,
      tomorrowEvents,
      hasMeetingsToday: todayEvents.length > 0,
      firstMeetingToday: firstMeeting ? `${firstMeeting.summary} at ${firstMeeting.start}` : null,
    },

    voiceNotes: {
      recent: voiceNoteRows,
      flashback: pickFlashback ?? null,
      recentTheme: null,
    },

    memories: memoryRows,

    nextReminders: reminderRows.map(r => ({
      ...r,
      scheduledAt: r.scheduledAt instanceof Date ? r.scheduledAt : new Date(r.scheduledAt),
    })),

    time: {
      hour,
      dayOfWeek: dow,
      isWeekend: dow === 0 || dow === 6,
      isEarlyMorning: hour >= 4 && hour < 8,
      isMorning: hour >= 8 && hour < 12,
      isAfternoon: hour >= 12 && hour < 17,
      isEvening: hour >= 17 && hour < 21,
      isLateNight: hour >= 21 || hour < 4,
      greeting: timeGreeting(hour),
    },

    promptContext: {
      fullContext: fullContext
        ? `\n\nLIVE USER CONTEXT — use this to personalise your response. Never say "I see that..." — weave it naturally:\n${fullContext}`
        : "",
      goalsBlock,
      moodBlock,
      kaalBlock,
      voiceNotesBlock,
    },
  };
}

// ─── Light context (goals + mood + kaal only) — for fast responses ────────────

export async function buildLightContext(userId: string) {
  const [userRow, activeGoals, todayMoodRows] = await Promise.all([
    db.select({ name: aryaUsers.name, rashi: aryaUsers.rashi, nakshatra: aryaUsers.nakshatra })
      .from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1),
    db.select({ title: aryaGoals.title, priority: aryaGoals.priority, progress: aryaGoals.progress })
      .from(aryaGoals)
      .where(and(eq(aryaGoals.userId, userId), eq(aryaGoals.status, "active"), eq(aryaGoals.isCompleted, false)))
      .orderBy(desc(aryaGoals.updatedAt))
      .limit(5),
    db.select({ mood: aryaMoodCheckins.mood, energy: aryaMoodCheckins.energy })
      .from(aryaMoodCheckins)
      .where(eq(aryaMoodCheckins.userId, userId))
      .orderBy(desc(aryaMoodCheckins.createdAt))
      .limit(1),
  ]);

  const user = userRow[0];
  const mood = todayMoodRows[0];
  return {
    name: user?.name ?? "",
    firstName: user?.name?.split(" ")[0] ?? "",
    topGoals: activeGoals.slice(0, 3).map(g => g.title),
    moodScore: mood?.mood ?? null,
    energy: mood?.energy ?? null,
    rashi: user?.rashi ?? null,
    nakshatra: user?.nakshatra ?? null,
  };
}

// ─── Proactive alerts — used by scheduler ─────────────────────────────────────

export interface ProactiveAlert {
  type: "overdue_goal" | "open_decision" | "mood_missing" | "voice_note_reminder" | "reminder_due";
  message: string;
  urgency: "high" | "medium" | "low";
}

export async function getProactiveAlerts(userId: string): Promise<ProactiveAlert[]> {
  const alerts: ProactiveAlert[] = [];

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [overdueGoals, openNiti, todayMood] = await Promise.all([
    db.select({ title: aryaGoals.title, dueDate: aryaGoals.dueDate, targetDate: aryaGoals.targetDate })
      .from(aryaGoals)
      .where(and(eq(aryaGoals.userId, userId), eq(aryaGoals.status, "active"), eq(aryaGoals.isCompleted, false)))
      .limit(10),
    db.select({ title: aryaNitiSessions.title, sessionType: aryaNitiSessions.sessionType })
      .from(aryaNitiSessions)
      .where(and(eq(aryaNitiSessions.userId, userId), isNull(aryaNitiSessions.userDecision), eq(aryaNitiSessions.status, "active")))
      .limit(3),
    db.select({ id: aryaMoodCheckins.id })
      .from(aryaMoodCheckins)
      .where(and(eq(aryaMoodCheckins.userId, userId), gte(aryaMoodCheckins.createdAt, todayStart)))
      .limit(1),
  ]);

  for (const g of overdueGoals) {
    const deadline = g.dueDate ?? g.targetDate;
    if (deadline && deadline < now) {
      alerts.push({
        type: "overdue_goal",
        message: `Goal "${g.title}" is overdue. Worth reviewing.`,
        urgency: "high",
      });
    }
  }

  for (const d of openNiti) {
    alerts.push({
      type: "open_decision",
      message: `You have an open decision in Niti: "${d.title || d.sessionType}". Have you made up your mind?`,
      urgency: "medium",
    });
  }

  if (todayMood.length === 0 && now.getHours() >= 9) {
    alerts.push({
      type: "mood_missing",
      message: "You haven't checked in your mood today. Takes 5 seconds.",
      urgency: "low",
    });
  }

  return alerts;
}
