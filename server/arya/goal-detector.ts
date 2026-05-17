import OpenAI from "openai";
import { db } from "../db";
import { aryaGoals, aryaNotifications } from "@shared/schema";
import type { GoalType } from "@shared/schema";
import { createCalendarEvent, isCalendarConnected } from "./google-calendar";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface DetectedGoal {
  title: string;
  goal_type: GoalType;
  due_date: string | null;
  reminder_at: string | null;
  recurrence: 'daily' | 'weekdays' | 'weekly' | null;
  people_involved: string[];
  context_note: string;
  confidence: number;
}

function buildPrompt(userMessage: string, aryaResponse: string): string {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const todayStr = istNow.toISOString().replace('T', ' ').slice(0, 16) + ' IST';

  return `You detect goals, tasks, reminders, and intentions in conversations.
Today: ${todayStr}

Detect EVERY goal-like expression — not just habits. Include:
- Tasks: "I need to message X", "I should call Y", "follow up with Z"
- Reminders: "remind me to Z at [time]", "don't let me forget"
- Habits: "I want to start doing X daily", "every morning"
- Intentions: "I want to be better at X", "spend more time with family"
- Deadlines: "finish X by Friday", "submit before the 15th"
- Social goals: "call mom more often"

For each goal, choose goal_type:
- "task": one-time completable action (possibly with deadline)
- "habit": recurring routine worth tracking with a streak
- "reminder": needs a notification at a specific date/time
- "intention": soft aspiration, ARYA periodically checks in

Return ONLY valid JSON (no markdown):
{
  "goals": [
    {
      "title": "brief action-oriented title, max 80 chars",
      "goal_type": "task" | "habit" | "reminder" | "intention",
      "due_date": "ISO datetime or null",
      "reminder_at": "ISO datetime or null",
      "recurrence": "daily" | "weekdays" | "weekly" | null,
      "people_involved": ["names"],
      "context_note": "one sentence why this matters",
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Only include goals with confidence > 0.65
- If message is pure casual chat with no goal/task/intention → {"goals":[]}
- For relative times ("tomorrow 3pm", "this Friday", "at 2pm") → convert to ISO using today's date
- Multiple goals in one message → return all
- Keep titles concise, start with a verb when possible

User message: "${userMessage.slice(0, 500)}"
ARYA's response context: "${aryaResponse.slice(0, 200)}"`;
}

const TYPE_NOTIFICATION: Record<GoalType, string> = {
  task: '✅ Task noted',
  habit: '🔥 Habit started',
  reminder: '🔔 Reminder set',
  intention: '💭 Intention held',
};

export async function detectAndCreateGoals(
  userMessage: string,
  aryaResponse: string,
  userId: string,
  tenantId: string,
  conversationId?: number
): Promise<void> {
  if (!userMessage || userMessage.trim().length < 4) return;

  // Skip obvious non-goal messages quickly (greetings, short acknowledgements)
  const isObviousCasual = userMessage.trim().length < 15 &&
    /^(hi|hello|hey|thanks|ok|okay|sure|yes|no|bye|good|great|nice|cool|wow)[\s!.]*$/i.test(userMessage.trim());
  if (isObviousCasual) return;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: buildPrompt(userMessage, aryaResponse) },
        { role: "user", content: userMessage.slice(0, 500) },
      ],
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return;

    const parsed = JSON.parse(text);
    const detected: DetectedGoal[] = parsed.goals || [];

    if (detected.length === 0) return;

    for (const g of detected) {
      if (!g || typeof g !== 'object') continue;
      if ((g.confidence || 0) < 0.65) continue;
      if (!g.title || g.title.length < 3) continue;

      const goalType: GoalType = (['task', 'habit', 'reminder', 'intention'].includes(g.goal_type))
        ? g.goal_type : 'task';

      // Parse dates safely
      let dueDate: Date | null = null;
      let reminderAt: Date | null = null;

      if (g.due_date) {
        const d = new Date(g.due_date);
        if (!isNaN(d.getTime())) dueDate = d;
      }
      if (g.reminder_at) {
        const d = new Date(g.reminder_at);
        if (!isNaN(d.getTime())) reminderAt = d;
      }

      const [goal] = await db.insert(aryaGoals).values({
        tenantId,
        userId,
        title: g.title.slice(0, 200),
        description: g.context_note || null,
        status: 'active',
        priority: 'medium',
        goalType,
        conversationId: conversationId || null,
        peopleInvolved: g.people_involved?.length > 0 ? g.people_involved : null,
        contextNote: g.context_note || null,
        recurrence: g.recurrence || null,
        isCompleted: false,
        reminderFired: false,
        dueDate,
        reminderAt,
        dailyTargetMinutes: goalType === 'habit' ? 30 : null,
      }).returning();

      // Try to sync to Google Calendar for goals with a time component
      if ((dueDate || reminderAt) && userId) {
        syncToCalendar(goal.id, g.title, g.context_note || '', dueDate, reminderAt, userId)
          .catch(() => {});
      }

      // Notification
      const dueDateStr = dueDate
        ? ` · Due ${dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : reminderAt
          ? ` · ${reminderAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
          : '';

      await db.insert(aryaNotifications).values({
        userId,
        type: 'goal_created',
        title: TYPE_NOTIFICATION[goalType],
        message: `"${g.title}"${dueDateStr}`,
        goalId: goal.id,
      }).catch(() => {});

      console.log(`[GoalDetector] ${goalType.toUpperCase()} created: "${g.title}" (conf: ${g.confidence})`);
    }
  } catch (err: any) {
    console.error("[GOALS DETECT ERROR]", err?.message || "Unknown error");
  }
}

async function syncToCalendar(
  goalId: string,
  title: string,
  description: string,
  dueDate: Date | null,
  reminderAt: Date | null,
  userId: string
): Promise<void> {
  try {
    const connected = await isCalendarConnected(userId);
    if (!connected) return;

    const eventTime = reminderAt || dueDate;
    if (!eventTime) return;

    const endTime = new Date(eventTime.getTime() + 30 * 60 * 1000);

    const event = await createCalendarEvent(
      userId,
      `ARYA: ${title}`,
      eventTime.toISOString(),
      endTime.toISOString(),
      description || undefined
    );

    if (event?.id) {
      await db.update(aryaGoals)
        .set({ calendarEventId: event.id })
        .where(eq(aryaGoals.id, goalId));
      console.log(`[GoalDetector] Calendar event created for goal ${goalId}`);
    }
  } catch (err: any) {
    // Non-critical — goal is saved even if calendar sync fails
    console.warn("[GoalDetector] Calendar sync failed:", err?.message);
  }
}
