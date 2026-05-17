/**
 * ARYA Response Quality Scorer
 * ─────────────────────────────────────────────────────────────────────
 * Computes a composite quality score (0–100) for cached responses using
 * both explicit signals (thumbs up/down) and implicit engagement signals.
 *
 * Score thresholds:
 *   ≥ 75  → Golden response — served from cache, no API call
 *   35–74 → Neutral — cached but not promoted
 *   < 35  → Flagged — cache entry deactivated, goes back to LLM
 *
 * This connects the feedback loop that already exists in feedback-engine.ts
 * to the cache quality system, making ARYA measurably smarter over time.
 */

import { db } from "../db";
import { aryaResponseCache } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface QualitySignals {
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  servedCount: number;
  // Implicit signals (optional — scored if provided)
  immediateFollowUp?: boolean;   // follow-up within 30s → user was confused
  sessionContinued?: boolean;    // kept chatting after this response
  correctionProvided?: boolean;  // user gave a correction text with thumbs down
}

/**
 * Calculate a quality score from 0–100.
 *
 * Explicit thumbs signals are strongest.
 * Implicit engagement signals reinforce or penalise.
 * A fresh response with no signals starts at 50.
 */
export function calculateQualityScore(signals: QualitySignals): number {
  const {
    positiveFeedbackCount = 0,
    negativeFeedbackCount = 0,
    servedCount = 0,
    immediateFollowUp = false,
    sessionContinued = false,
    correctionProvided = false,
  } = signals;

  let score = 50; // neutral baseline

  // ── Explicit signals (strongest weight) ──────────────────────────────
  score += positiveFeedbackCount * 18;   // each thumbs-up: +18
  score -= negativeFeedbackCount * 25;   // each thumbs-down: -25 (heavier)
  score -= correctionProvided ? 10 : 0;  // correction given: extra -10

  // ── Implicit engagement signals ───────────────────────────────────────
  if (sessionContinued)   score += 8;   // kept talking = positive
  if (immediateFollowUp)  score -= 12;  // < 30s follow-up = confusion signal

  // ── Volume normalisation ──────────────────────────────────────────────
  // Heavily served responses with good ratios get a stability bonus
  if (servedCount >= 10) {
    const ratio = positiveFeedbackCount / (positiveFeedbackCount + negativeFeedbackCount + 1);
    if (ratio > 0.8) score += 5; // very high positive ratio bonus
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function isGolden(score: number): boolean { return score >= 75; }
export function isFlagged(score: number): boolean { return score < 35; }

/**
 * After receiving a feedback signal, recompute the quality score for the
 * matching cache entry and update its active status accordingly.
 *
 * Called from feedback-engine.ts after every thumbs up/down.
 */
export async function applyFeedbackToCache(
  tenantId: string,
  normalizedQuery: string,
  rating: "up" | "down",
  correctionProvided: boolean = false
): Promise<{ score: number; action: "promoted" | "flagged" | "unchanged" }> {

  const [entry] = await db
    .select()
    .from(aryaResponseCache)
    .where(
      and(
        eq(aryaResponseCache.tenantId, tenantId),
        eq(aryaResponseCache.normalizedQuery, normalizedQuery)
      )
    )
    .limit(1);

  if (!entry) return { score: 50, action: "unchanged" };

  // Update the feedback counts optimistically
  const newPositive = entry.positiveFeedbackCount + (rating === "up" ? 1 : 0);
  const newNegative = entry.negativeFeedbackCount + (rating === "down" ? 1 : 0);

  const score = calculateQualityScore({
    positiveFeedbackCount: newPositive,
    negativeFeedbackCount: newNegative,
    servedCount: entry.servedCount,
    correctionProvided,
  });

  let action: "promoted" | "flagged" | "unchanged" = "unchanged";

  if (isFlagged(score) && entry.isActive) {
    // Quality too low — stop serving this cached response
    await db
      .update(aryaResponseCache)
      .set({
        positiveFeedbackCount: newPositive,
        negativeFeedbackCount: newNegative,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(aryaResponseCache.id, entry.id));
    action = "flagged";
    console.log(`[QualityScorer] Cache entry flagged (score: ${score}) — deactivated. Query: "${entry.originalQuery.slice(0, 60)}"`);

  } else if (isGolden(score) && entry.isActive) {
    // Quality high — ensure it stays active and update counts
    await db
      .update(aryaResponseCache)
      .set({
        positiveFeedbackCount: newPositive,
        negativeFeedbackCount: newNegative,
        confidenceScore: (score / 100).toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(aryaResponseCache.id, entry.id));
    action = "promoted";
    console.log(`[QualityScorer] Cache entry promoted to golden (score: ${score}). Query: "${entry.originalQuery.slice(0, 60)}"`);

  } else {
    // Just update the counts
    await db
      .update(aryaResponseCache)
      .set({
        positiveFeedbackCount: newPositive,
        negativeFeedbackCount: newNegative,
        updatedAt: new Date(),
      })
      .where(eq(aryaResponseCache.id, entry.id));
  }

  return { score, action };
}

/**
 * Compute and return quality scores for all active cache entries
 * for a given tenant — useful for admin Self-Learning panel.
 */
export async function getCacheQualityReport(tenantId: string): Promise<Array<{
  id: string;
  query: string;
  score: number;
  status: "golden" | "neutral" | "flagged";
  servedCount: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
}>> {
  const entries = await db
    .select()
    .from(aryaResponseCache)
    .where(eq(aryaResponseCache.tenantId, tenantId));

  return entries.map((e) => {
    const score = calculateQualityScore({
      positiveFeedbackCount: e.positiveFeedbackCount,
      negativeFeedbackCount: e.negativeFeedbackCount,
      servedCount: e.servedCount,
    });
    return {
      id: e.id,
      query: e.originalQuery,
      score,
      status: isGolden(score) ? "golden" : isFlagged(score) ? "flagged" : "neutral",
      servedCount: e.servedCount,
      positiveFeedbackCount: e.positiveFeedbackCount,
      negativeFeedbackCount: e.negativeFeedbackCount,
    };
  });
}
