import { db } from "../db";
import { sql } from "drizzle-orm";

export type CheckInType =
  | 'just_created'
  | 'stalled_early'
  | 'stalled_week'
  | 'stalled_long'
  | 'abandoned'
  | 'near_deadline'
  | 'overdue'
  | 'completed_recent';

export interface GoalCheckIn {
  goalId: string;
  goalTitle: string;
  type: CheckInType;
  systemLine: string;
}

export interface CheckInContext {
  primaryCheckIn: GoalCheckIn | null;
  systemPromptBlock: string;
}

const CHECK_IN_LINES: Record<CheckInType, string> = {
  just_created:      "What's the first small step?",
  stalled_early:     "Have you had a chance to start?",
  stalled_week:      "A week ago you set this — how's that going?",
  stalled_long:      "What's getting in the way?",
  abandoned:         "Is this still something you want?",
  near_deadline:     "Where are you with it?",
  overdue:           "What happened — want to revisit?",
  completed_recent:  "How does that feel?",
};

const TYPE_PRIORITY: Record<CheckInType, number> = {
  just_created:     1,
  stalled_early:    2,
  stalled_week:     3,
  stalled_long:     4,
  abandoned:        5,
  near_deadline:    6,
  overdue:          7,
  completed_recent: 8,
};

function classifyGoal(goal: any, now: Date): CheckInType | null {
  const createdAt      = new Date(goal.created_at);
  const daysOld        = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const progress       = goal.progress ?? 0;
  const isCompleted    = goal.is_completed ?? false;
  const completedAt    = goal.completed_at ? new Date(goal.completed_at) : null;
  const dueDate        = goal.due_date     ? new Date(goal.due_date)     : null;
  const lastCheckedAt  = goal.last_checked_at ? new Date(goal.last_checked_at) : null;

  // Skip if checked in within 20 h
  if (lastCheckedAt) {
    const hoursAgo = (now.getTime() - lastCheckedAt.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 20) return null;
  }

  // Just completed
  if (isCompleted && completedAt) {
    const hoursSince = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 48) return 'completed_recent';
  }
  if (isCompleted) return null;

  // Overdue
  if (dueDate && dueDate < now && progress < 100) return 'overdue';

  // Near deadline — due within 3 days
  if (dueDate) {
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue >= 0 && daysUntilDue <= 3) return 'near_deadline';
  }

  // Stalled / abandoned (0 % progress)
  if (progress === 0) {
    if (daysOld >= 21) return 'abandoned';
    if (daysOld >= 14) return 'stalled_long';
    if (daysOld >= 7)  return 'stalled_week';
    if (daysOld >= 3)  return 'stalled_early';
    if (daysOld >= 1)  return 'just_created';
  }

  return null;
}

export async function buildGoalCheckInContext(
  userId: string,
  firstName: string,
  conversationId?: number
): Promise<CheckInContext> {
  try {
    const result = await db.execute(
      sql`SELECT id, title, progress, status, is_completed, completed_at, due_date, created_at, last_checked_at
          FROM arya_goals
          WHERE user_id = ${userId}
            AND status IN ('active', 'completed')
          ORDER BY created_at DESC
          LIMIT 10`
    ) as any;

    const rows = result.rows || [];
    const now = new Date();
    const checkIns: GoalCheckIn[] = [];

    for (const goal of rows) {
      const type = classifyGoal(goal, now);
      if (!type) continue;
      checkIns.push({
        goalId: goal.id,
        goalTitle: goal.title,
        type,
        systemLine: CHECK_IN_LINES[type],
      });
    }

    if (checkIns.length === 0) return { primaryCheckIn: null, systemPromptBlock: "" };

    checkIns.sort((a, b) => TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type]);
    const primary = checkIns[0];

    const name = firstName || "The user";

    const systemPromptBlock = `

GOAL CHECK-IN — WEAVE NATURALLY (never announce this directly):
${name} set a goal: "${primary.goalTitle}"
Situation: ${primary.type.replace(/_/g, " ")}
Suggested question to weave in: "${primary.systemLine}"

Rules you must follow:
- Ask it ONCE. Don't repeat.
- If they haven't started → ask what got in the way.
- If they forgot → offer to adjust the reminder.
- Never judge. Always curious.
- Feel like a friend noticing — not an app reporting.
- Only weave it in if it fits the flow naturally. If the user's message is urgent or unrelated, skip it entirely.`;

    // Also check for recently-created vague goal — ask for specificity if needed
    const specificityBlock = await getRecentVagueGoal(userId);

    return { primaryCheckIn: primary, systemPromptBlock: systemPromptBlock + specificityBlock };
  } catch {
    return { primaryCheckIn: null, systemPromptBlock: "" };
  }
}

export async function markGoalCheckedIn(goalId: string, userId: string): Promise<void> {
  try {
    await db.execute(
      sql`UPDATE arya_goals SET last_checked_at = NOW() WHERE id = ${goalId} AND user_id = ${userId}`
    );
    await db.execute(
      sql`INSERT INTO arya_goal_checkins (user_id, goal_id, result) VALUES (${userId}, ${goalId}, 'noted')`
    );
  } catch {
    // Non-critical — silently skip
  }
}

export function isVagueGoal(title: string): boolean {
  const vagueWords     = /^(get|be|become|stay|feel|have|do|make|learn|improve|start|stop|try)\s/i;
  const specificMarkers = /\d|by\s|every\s|per\s|times?\s|km|kg|min|hour|book|page|week|month|day/i;
  return vagueWords.test(title.trim()) && !specificMarkers.test(title);
}

export function buildSpecificityPrompt(title: string): string {
  return `\n\nGOAL SPECIFICITY NUDGE — the user just set this goal: "${title}"
This sounds a bit open-ended. Gently ask for specificity in your next response.
Example: "What would done look like? A number, a frequency, or a deadline makes it real."
One warm question. Not a form. Make it feel natural.`;
}

// Also detect recently-created vague goals and request specificity in chat
async function getRecentVagueGoal(userId: string): Promise<string> {
  try {
    const result = await db.execute(
      sql`SELECT title FROM arya_goals
          WHERE user_id = ${userId}
            AND created_at > NOW() - INTERVAL '10 minutes'
            AND status = 'active'
          ORDER BY created_at DESC LIMIT 1`
    ) as any;
    const row = result.rows?.[0];
    if (row && isVagueGoal(row.title)) return buildSpecificityPrompt(row.title);
  } catch {}
  return "";
}

export async function getAbandonedGoals(userId: string): Promise<any[]> {
  try {
    const result = await db.execute(
      sql`SELECT id, title, progress, created_at, status
          FROM arya_goals
          WHERE user_id = ${userId}
            AND status = 'active'
            AND progress = 0
            AND is_completed = false
            AND created_at < NOW() - INTERVAL '21 days'
          ORDER BY created_at ASC`
    ) as any;
    return result.rows || [];
  } catch {
    return [];
  }
}
