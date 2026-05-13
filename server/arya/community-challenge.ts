import OpenAI from "openai";
import { db } from "../db";
import { aryaCommunityMembers, aryaCommunityChallenge } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateWeeklyChallenge(): Promise<boolean> {
  try {
    // Check if there's already an active challenge for this week
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const monday = new Date(nowIST);
    const day = monday.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setUTCDate(monday.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);

    const existing = await db
      .select({ id: aryaCommunityChallenge.id })
      .from(aryaCommunityChallenge)
      .where(eq(aryaCommunityChallenge.status, "active"))
      .limit(1);

    if (existing.length > 0) {
      console.log("[COMMUNITY] Active challenge already exists, skipping generation");
      return false;
    }

    // Aggregate community member profiles
    const members = await db
      .select({
        growthGoals: aryaCommunityMembers.growthGoals,
        currentChallenges: aryaCommunityMembers.currentChallenges,
        habitTracking: aryaCommunityMembers.habitTracking,
      })
      .from(aryaCommunityMembers)
      .limit(200);

    const totalMembers = members.length;

    // Build aggregate context from member profiles
    const goalFrequency: Record<string, number> = {};
    const challengeSnippets: string[] = [];

    for (const m of members) {
      (m.growthGoals ?? []).forEach((g) => {
        goalFrequency[g] = (goalFrequency[g] ?? 0) + 1;
      });
      (m.habitTracking ?? []).forEach((h) => {
        goalFrequency[h] = (goalFrequency[h] ?? 0) + 1;
      });
      if (m.currentChallenges) {
        challengeSnippets.push(m.currentChallenges.slice(0, 120));
      }
    }

    const topGoals = Object.entries(goalFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([g]) => g)
      .join(", ");

    const sampleChallenges = challengeSnippets.slice(0, 10).join(" | ");

    const prompt = `You are ARYA — a personal thinking and growth assistant serving a community of ${totalMembers} members.

The most common growth goals & habits members want to build: ${topGoals || "Productivity, Focus, Mental Clarity, Discipline"}.
Sample challenges members are facing: ${sampleChallenges || "procrastination, overthinking, burnout, lack of focus"}.

Generate a 7-day weekly community growth challenge that addresses the most common needs of these members.

The challenge should:
- Be practical and doable (15–30 minutes per day)
- Focus on one clear theme that resonates with most members
- Have 7 specific daily tasks (one per day), each building on the last
- Be inspiring but realistic — not overwhelming
- Feel personal, warm, and motivating — like a wise friend setting the challenge

Respond ONLY with valid JSON in this exact format:
{
  "title": "Challenge title (max 60 chars)",
  "description": "2-3 sentence description of the challenge and why it matters (max 300 chars)",
  "dailyTasks": [
    "Day 1: specific task description",
    "Day 2: specific task description",
    "Day 3: specific task description",
    "Day 4: specific task description",
    "Day 5: specific task description",
    "Day 6: specific task description",
    "Day 7: specific task description"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    if (!parsed.title || !parsed.description || !Array.isArray(parsed.dailyTasks)) {
      console.error("[COMMUNITY] Invalid challenge format from GPT");
      return false;
    }

    // Archive any existing active challenges
    await db
      .update(aryaCommunityChallenge)
      .set({ status: "ended" })
      .where(eq(aryaCommunityChallenge.status, "active"));

    // Insert new challenge
    await db.insert(aryaCommunityChallenge).values({
      weekStart: monday,
      title: parsed.title.slice(0, 300),
      description: parsed.description.slice(0, 1000),
      dailyTasks: parsed.dailyTasks.slice(0, 7).map((t: string) => t.slice(0, 300)),
      durationDays: 7,
      status: "active",
      generatedBy: "arya",
      participantCount: 0,
      completedCount: 0,
    });

    console.log(`[COMMUNITY] Generated new weekly challenge: "${parsed.title}"`);
    return true;
  } catch (err: any) {
    console.error("[COMMUNITY] Challenge generation failed:", err.message);
    return false;
  }
}

export async function getCurrentChallenge() {
  const [challenge] = await db
    .select()
    .from(aryaCommunityChallenge)
    .where(eq(aryaCommunityChallenge.status, "active"))
    .orderBy(desc(aryaCommunityChallenge.createdAt))
    .limit(1);
  return challenge ?? null;
}

export async function seedInitialChallenge(): Promise<void> {
  const existing = await db
    .select({ id: aryaCommunityChallenge.id })
    .from(aryaCommunityChallenge)
    .where(eq(aryaCommunityChallenge.status, "active"))
    .limit(1);

  if (existing.length > 0) return;

  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const monday = new Date(nowIST);
  const day = monday.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);

  await db.insert(aryaCommunityChallenge).values({
    weekStart: monday,
    title: "7 Days of Intentional Focus",
    description:
      "Most of us are busy but not truly focused. This week, we reclaim our attention — one deliberate day at a time. Small actions, compounded daily, create extraordinary results.",
    dailyTasks: [
      "Day 1: Write down your single most important task for this week. Do only that before anything else today.",
      "Day 2: Remove one digital distraction from your morning — no social media for the first hour after waking.",
      "Day 3: Work in one 45-minute focused block today. No phone, no tabs, no interruptions. Notice how much you get done.",
      "Day 4: Reflect — what thought patterns steal your focus most? Write 3 of them down and one counter-action for each.",
      "Day 5: Do today's most important task first, before email or messages. Protect your best hours.",
      "Day 6: Have one fully present conversation today — no phone, no distractions. Just listen deeply.",
      "Day 7: Write a short note to yourself: what did this week teach you about your attention? What will you carry forward?",
    ],
    durationDays: 7,
    status: "active",
    generatedBy: "arya",
    participantCount: 0,
    completedCount: 0,
  });

  console.log("[COMMUNITY] Seeded initial challenge: 7 Days of Intentional Focus");
}
