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
            content: `You are a memory extraction system. Analyze the conversation and extract important facts, preferences, and context that should be remembered for future conversations.

Extract ONLY meaningful, specific information. Skip generic statements.

Categories:
- identity: Name, age, location, profession, company
- preference: Likes, dislikes, preferred styles, habits
- fact: Specific facts shared (health conditions, goals, projects)
- context: Current situation, ongoing activities, recent events
- relationship: People mentioned, their roles/relationships

Respond with a JSON array of objects. Each object must have:
- category: one of identity/preference/fact/context/relationship
- key: short descriptive label (e.g. "name", "favorite_food", "health_condition")
- value: the actual information
- confidence: 0.0-1.0 how confident you are this is important to remember

Return [] if nothing worth remembering. Be selective — only extract genuinely useful information.
Example: [{"category":"identity","key":"name","value":"Rahul","confidence":0.95}]`
          },
          {
            role: "user",
            content: `User said: "${userMessage}"\nAssistant replied: "${assistantResponse.slice(0, 500)}"\n\nExtract memories:`
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
      memories = await db
        .select()
        .from(aryaMemory)
        .where(and(
          eq(aryaMemory.tenantId, tenantId),
        ))
        .orderBy(desc(aryaMemory.updatedAt))
        .limit(50);

      const queryLower = query.toLowerCase();
      const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

      memories = memories
        .map(m => {
          let score = 0;
          const keyLower = m.key.toLowerCase();
          const valueLower = m.value.toLowerCase();
          for (const kw of keywords) {
            if (keyLower.includes(kw)) score += 3;
            if (valueLower.includes(kw)) score += 2;
          }
          if (m.category === 'identity') score += 1;
          if (m.category === 'preference') score += 0.5;
          return { ...m, _score: score };
        })
        .filter((m: any) => m._score > 0)
        .sort((a: any, b: any) => b._score - a._score)
        .slice(0, limit);
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

    let context = "\n\nYou remember these things about this user (use naturally, don't announce them):";
    for (const [cat, items] of Object.entries(grouped)) {
      context += `\n[${cat}] ${items.join("; ")}`;
    }
    return context;
  }
}
