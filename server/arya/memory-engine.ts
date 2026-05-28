import OpenAI from "openai";
import { db } from "../db";
import { aryaMemory, AryaMemory } from "@shared/schema";
import { eq, and, desc, sql, ilike } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface MemoryEntry {
  category: 'fact' | 'preference' | 'context' | 'identity' | 'relationship';
  key: string;
  value: string;
  confidence?: number;
}

export class MemoryEngine {

  async extractAndStore(
    tenantId: string,
    userMessage: string,
    assistantResponse: string,
    conversationId?: number
  ): Promise<MemoryEntry[]> {
    try {
      const extraction = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a memory extraction system. Extract ONLY durable facts about the USER from their messages — things that will be useful to know in any future conversation.

EXTRACT (from what the USER said):
- identity: name, age, city, profession, workplace, specialty
- preference: what they like/dislike, how they prefer to work or communicate
- fact: specific personal facts — health conditions, ongoing projects, family details
- context: current situation — job challenge, life event, ongoing goal
- relationship: people they mention by name and their role (e.g. "wife Priya", "boss Ramesh")

DO NOT EXTRACT:
- Anything from the assistant's response (articles, explanations, stories, advice)
- Generic questions or casual replies ("yes please", "ok", "tell me more", "thanks")
- Topics discussed (e.g. do NOT store "asked about Skanda Kavacham" or "read about mantras")
- Any content longer than 100 characters as a memory value

Values must be short, factual labels — not sentences, not paragraphs.
WRONG: value: "The user is an ER doctor who leads a department and writes articles about emergency care"
RIGHT: value: "ER doctor, department head"

Return [] if nothing from the USER's message is worth storing. Be very selective.
Return JSON array: [{"category":"identity","key":"occupation","value":"ER doctor","confidence":0.95}]`
          },
          {
            role: "user",
            content: `User said: "${userMessage}"\n\nExtract memories from what the USER said only:`
          }
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" },
      });

      const raw = extraction.choices[0]?.message?.content || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return [];
      }

      const memories: MemoryEntry[] = Array.isArray(parsed) ? parsed : (parsed.memories || parsed.items || []);
      if (!Array.isArray(memories) || memories.length === 0) return [];

      const stored: MemoryEntry[] = [];
      for (const mem of memories) {
        if (!mem.key || !mem.value || !mem.category) continue;
        if ((mem.confidence || 0.5) < 0.5) continue;
        // Hard guard: never store long values — article content, paragraphs, ARYA's text
        if (String(mem.value).length > 150) continue;

        const existing = await db
          .select()
          .from(aryaMemory)
          .where(and(
            eq(aryaMemory.tenantId, tenantId),
            eq(aryaMemory.key, mem.key)
          ))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(aryaMemory)
            .set({
              value: mem.value,
              confidence: String(mem.confidence || 0.8),
              lastConfirmed: new Date(),
              updatedAt: new Date(),
              conversationId: conversationId || existing[0].conversationId,
            })
            .where(eq(aryaMemory.id, existing[0].id));
        } else {
          await db.insert(aryaMemory).values({
            tenantId,
            category: mem.category,
            key: mem.key,
            value: mem.value,
            confidence: String(mem.confidence || 0.8),
            source: 'conversation',
            conversationId: conversationId || null,
          });
        }

        stored.push(mem);
      }

      return stored;
    } catch (err) {
      console.error("[Memory] Extraction error:", err);
      return [];
    }
  }

  async recall(tenantId: string, query?: string, limit: number = 20): Promise<AryaMemory[]> {
    let memories: AryaMemory[];

    if (query) {
      const allMemories = await db
        .select()
        .from(aryaMemory)
        .where(eq(aryaMemory.tenantId, tenantId))
        .orderBy(desc(aryaMemory.updatedAt))
        .limit(100);

      const queryLower = query.toLowerCase();
      const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

      // Always include identity and preference memories — these define who the user is
      // and must always be present so ARYA can personalise any response.
      const alwaysInclude = allMemories.filter(
        m => m.category === 'identity' || m.category === 'preference'
      );
      const alwaysIds = new Set(alwaysInclude.map(m => m.id));

      // Score remaining memories by keyword relevance
      const scored = allMemories
        .filter(m => !alwaysIds.has(m.id))
        .map(m => {
          let score = 0;
          const keyLower = m.key.toLowerCase();
          const valueLower = m.value.toLowerCase();
          for (const kw of keywords) {
            if (keyLower.includes(kw)) score += 3;
            if (valueLower.includes(kw)) score += 2;
          }
          return { ...m, _score: score };
        })
        .filter((m: any) => m._score > 0)
        .sort((a: any, b: any) => b._score - a._score);

      // Combine: always-include first, then relevant scored memories, capped at limit
      const combined = [...alwaysInclude, ...scored];
      memories = combined.slice(0, limit) as AryaMemory[];
    } else {
      memories = await db
        .select()
        .from(aryaMemory)
        .where(eq(aryaMemory.tenantId, tenantId))
        .orderBy(desc(aryaMemory.updatedAt))
        .limit(limit);
    }

    for (const mem of memories) {
      await db
        .update(aryaMemory)
        .set({ accessCount: sql`${aryaMemory.accessCount} + 1` })
        .where(eq(aryaMemory.id, mem.id));
    }

    return memories;
  }

  async getAll(tenantId: string): Promise<AryaMemory[]> {
    return await db
      .select()
      .from(aryaMemory)
      .where(eq(aryaMemory.tenantId, tenantId))
      .orderBy(desc(aryaMemory.updatedAt));
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    await db.delete(aryaMemory).where(eq(aryaMemory.id, memoryId));
    return true;
  }

  async deleteMemoryForUser(memoryId: string, userId: string): Promise<boolean> {
    await db.delete(aryaMemory).where(
      and(eq(aryaMemory.id, memoryId), eq(aryaMemory.tenantId, userId))
    );
    return true;
  }

  async addExplicitMemory(
    tenantId: string,
    category: MemoryEntry['category'],
    key: string,
    value: string
  ): Promise<void> {
    const existing = await db
      .select()
      .from(aryaMemory)
      .where(and(
        eq(aryaMemory.tenantId, tenantId),
        eq(aryaMemory.key, key)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(aryaMemory)
        .set({ value, confidence: "0.95", source: 'explicit', updatedAt: new Date() })
        .where(eq(aryaMemory.id, existing[0].id));
    } else {
      await db.insert(aryaMemory).values({
        tenantId,
        category,
        key,
        value,
        confidence: "0.95",
        source: 'explicit',
      });
    }
  }

  buildMemoryContext(memories: AryaMemory[]): string {
    if (memories.length === 0) return "";

    const grouped: Record<string, string[]> = {};
    for (const mem of memories) {
      if (!grouped[mem.category]) grouped[mem.category] = [];
      grouped[mem.category].push(`${mem.key}: ${mem.value}`);
    }

    let context = "\n\nUSER CONTEXT — MANDATORY TO USE (these are real facts about this person — weave them into your response, do not ignore them):";
    for (const [cat, items] of Object.entries(grouped)) {
      context += `\n[${cat}] ${items.join("; ")}`;
    }
    context += "\n\nDo NOT give a generic response that ignores the above. Start from their world, not from a textbook.";
    return context;
  }
}
