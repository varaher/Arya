/**
 * voice-extractor.ts
 * Runs after every voice note is saved.
 *
 * Does 3 things:
 *   1. Extracts goals, decisions, memories, people from the transcript
 *      using GPT-4o-mini
 *   2. Saves extracted memories to aryaMemory so ARYA remembers them
 *      across all future sessions
 *   3. If decision language is detected → saves a notification offering Niti
 *
 * This is always called in a fire-and-forget background block so it
 * never delays the response to the user.
 */

import OpenAI from "openai";
import { db } from "../db";
import { aryaVoiceNotes, aryaMemory, aryaNotifications } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface VoiceExtraction {
  goals: string[];
  decisions: string[];
  memories: string[];
  people: string[];
  hasDecisionLanguage: boolean;
}

export async function extractFromVoiceNote(
  userId: string,
  noteId: string,
  transcript: string,
  tenantId = "varah",
): Promise<VoiceExtraction> {
  if (!transcript?.trim() || transcript.trim().length < 20) {
    return { goals: [], decisions: [], memories: [], people: [], hasDecisionLanguage: false };
  }

  // ── 1. GPT extraction ─────────────────────────────────────────────────────
  let extraction: VoiceExtraction = {
    goals: [],
    decisions: [],
    memories: [],
    people: [],
    hasDecisionLanguage: false,
  };

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract structured information from this voice note. Return ONLY valid JSON with these keys:
{
  "goals": ["things they said they need or want to do — concrete actions"],
  "decisions": ["things they are actively weighing or going back and forth on"],
  "memories": ["facts worth remembering — about people, plans, commitments, feelings, realizations"],
  "people": ["names of people mentioned"]
}
Return empty arrays if nothing found. Keep each item under 15 words. Do not include generic observations.`,
        },
        { role: "user", content: transcript.trim() },
      ],
      max_completion_tokens: 400,
      response_format: { type: "json_object" } as any,
    } as any);

    const raw = (res as any).choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    extraction = {
      goals: Array.isArray(parsed.goals) ? parsed.goals.filter(Boolean).slice(0, 5) : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.filter(Boolean).slice(0, 3) : [],
      memories: Array.isArray(parsed.memories) ? parsed.memories.filter(Boolean).slice(0, 6) : [],
      people: Array.isArray(parsed.people) ? parsed.people.filter(Boolean).slice(0, 5) : [],
      hasDecisionLanguage: Array.isArray(parsed.decisions) && parsed.decisions.length > 0,
    };
  } catch (err: any) {
    console.error("[VOICE-EXTRACTOR] GPT extraction failed:", err.message);
    return { goals: [], decisions: [], memories: [], people: [], hasDecisionLanguage: false };
  }

  // ── 2. Save memories to aryaMemory ────────────────────────────────────────
  for (const mem of extraction.memories) {
    try {
      await db.insert(aryaMemory).values({
        tenantId,
        category: "context",
        key: `voice_note_${noteId}_${Date.now()}`,
        value: mem,
        confidence: "0.80",
        source: "explicit",
        conversationId: null,
      });
    } catch (err: any) {
      console.error("[VOICE-EXTRACTOR] Memory save failed:", err.message);
    }
  }

  // Save people to memory as "relationship" facts
  for (const person of extraction.people) {
    try {
      const key = `person_mentioned_${person.toLowerCase().replace(/\s+/g, "_")}`;
      // Check if we already have a memory for this person
      const existing = await db
        .select({ id: aryaMemory.id })
        .from(aryaMemory)
        .where(eq(aryaMemory.key, key))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(aryaMemory).values({
          tenantId,
          category: "relationship",
          key,
          value: `User mentioned ${person} in a voice note`,
          confidence: "0.75",
          source: "inferred",
          conversationId: null,
        });
      }
    } catch {}
  }

  // ── 3. Niti offer if decision language detected ────────────────────────────
  if (extraction.hasDecisionLanguage && extraction.decisions.length > 0) {
    const decisionPreview = extraction.decisions[0];
    try {
      await db.insert(aryaNotifications).values({
        userId,
        type: "pattern_insight" as any,
        title: "🤔 Sounds like a decision you're sitting with",
        message: `Your voice note touched on: "${decisionPreview}". Want to think it through properly? Open Niti → Help me decide.`,
      });
    } catch (err: any) {
      console.error("[VOICE-EXTRACTOR] Niti notification failed:", err.message);
    }
  }

  // ── 4. Update voice note with extracted goals (as tasks) ──────────────────
  if (extraction.goals.length > 0) {
    try {
      // Merge new goal items with existing extractedTasks
      const existing = await db
        .select({ extractedTasks: aryaVoiceNotes.extractedTasks })
        .from(aryaVoiceNotes)
        .where(eq(aryaVoiceNotes.id, noteId))
        .limit(1);

      const currentTasks = (existing[0]?.extractedTasks as any[]) || [];
      const newTasks = extraction.goals.map(g => ({ task: g, source: "memory_extraction", deadline: null }));
      const merged = [...currentTasks, ...newTasks].slice(0, 10);

      await db
        .update(aryaVoiceNotes)
        .set({ extractedTasks: merged as any })
        .where(eq(aryaVoiceNotes.id, noteId));
    } catch (err: any) {
      console.error("[VOICE-EXTRACTOR] Task merge failed:", err.message);
    }
  }

  console.log(
    `[VOICE-EXTRACTOR] Note ${noteId} — goals:${extraction.goals.length} decisions:${extraction.decisions.length} memories:${extraction.memories.length} people:${extraction.people.length}`,
  );
  return extraction;
}
