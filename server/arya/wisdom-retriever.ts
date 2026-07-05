// ═══════════════════════════════════════════════════════════════════════════════
//  ARYA WISDOM RETRIEVER
//  Finds the right wisdom for the right moment.
//  Queries arya_knowledge by situation + emotional tags, scores, returns best.
//  The user never knows this is happening.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db";
import { aryaKnowledge } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

export interface WisdomContext {
  situationTags: string[];
  emotionalState: string;
  gunaState: string;
  userId: number | string;
  language: string;
}

export interface WisdomEntry {
  id: string;
  principle: string;
  storySeed?: string;
  rasa: string;
  confidence: string;
  domain: string;
}

const EMOTION_TO_RASA: Record<string, string> = {
  love: "shringara",
  joy: "hasya",
  grief: "karuna",
  sadness: "karuna",
  emptiness: "karuna",
  anger: "raudra",
  frustration: "raudra",
  courage: "vira",
  fear: "bhayanaka",
  anxiety: "bhayanaka",
  confusion: "bhayanaka",
  overwhelm: "bhayanaka",
  wonder: "adbhuta",
  seeking: "adbhuta",
  peace: "shanta",
  shame: "karuna",
  loneliness: "karuna",
};

function emotionToRasa(emotion: string): string {
  return EMOTION_TO_RASA[emotion] || "shanta";
}

function scoreEntry(entry: any, context: WisdomContext): number {
  let score = 0;
  const entryTags: string[] = entry.situation_tags || entry.situationTags || [];
  const entryEmotions: string[] = entry.emotional_tags || entry.emotionalTags || [];
  const entryGuna: string[] = entry.guna_relevance || entry.gunaRelevance || [];

  const situationOverlap = entryTags.filter((t: string) => context.situationTags.includes(t)).length;
  score += situationOverlap * 3;

  if (entryEmotions.includes(context.emotionalState)) score += 5;

  if (entryGuna.includes(context.gunaState)) score += 4;

  const targetRasa = emotionToRasa(context.emotionalState);
  if ((entry.rasa) === targetRasa) score += 3;

  return score;
}

export async function retrieveRelevantWisdom(
  context: WisdomContext,
): Promise<WisdomEntry | null> {
  if (!context.situationTags.length) return null;

  try {
    const tagsParam = `{${context.situationTags.map(t => `"${t}"`).join(",")}}`;
    const emotionParam = `{${context.emotionalState}}`;

    const candidates = await db.execute(sql`
      SELECT id, domain, arya_principle, arya_story_seed, rasa,
             confidence_level, situation_tags, emotional_tags, guna_relevance,
             language_variants
      FROM arya_knowledge
      WHERE reviewed = true
        AND status = 'published'
        AND arya_principle IS NOT NULL
        AND (
          situation_tags && ${tagsParam}::text[]
          OR emotional_tags && ${emotionParam}::text[]
        )
      ORDER BY random()
      LIMIT 8
    `);

    const rows = candidates.rows as any[];
    if (!rows.length) return null;

    const scored = rows
      .map(row => ({ row, score: scoreEntry(row, context) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0].row;
    if (scored[0].score < 3) return null;

    const variants = (best.language_variants || {}) as Record<string, string>;
    const principle = variants[context.language] || best.arya_principle;

    return {
      id: best.id,
      principle,
      storySeed: best.arya_story_seed || undefined,
      rasa: best.rasa || "shanta",
      confidence: best.confidence_level || "high",
      domain: best.domain,
    };
  } catch {
    return null;
  }
}
