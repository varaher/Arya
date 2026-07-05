---
name: Wisdom Knowledge Architecture
description: How ARYA's ancient wisdom system works — DB schema, 3 new services, wiring into chat-engine and drishya. Sources never shown to users.
---

## The rule
"The wisdom is the ingredient. ARYA is the dish. Users taste the dish. They never see the recipe."
Sources (Gita, Thirukkural, Kabir, etc.) are NEVER shown to users anywhere — not in tooltips, headers, footers, UI labels, or anywhere else. They exist only as internal backend data.

## New DB columns on arya_knowledge
situation_tags (text[], GIN indexed), emotional_tags (text[], GIN indexed), arya_principle (text — the wisdom in plain English), arya_story_seed (text — Drishya's story skeleton), rasa (varchar 20), guna_relevance (text[]), language_variants (jsonb — {hi, ta, ml} variants of arya_principle), confidence_level (varchar 20, default 'high'), reviewed (boolean, default false), tradition (varchar 100), source_text (text), source_name (varchar 500).

## 3 new services
- `server/arya/situation-classifier.ts` — GPT-4.1-mini, JSON mode, classifies user message → SituationProfile (primarySituation, secondarySituations, emotionalState, gunaState, urgency, wisdomNeeded). `wisdomNeeded=true` only when: genuine personal sharing + reflective urgency + non-task.
- `server/arya/wisdom-retriever.ts` — raw SQL (not Drizzle array overlaps), queries situation_tags && array AND emotional_tags && array, scores by overlap + rasa match + guna match, returns best WisdomEntry with principle (language-variant if available) + storySeed.
- `server/arya/wisdom-translator.ts` — GPT-4.1-mini, renders wisdom into ARYA's natural voice given user context. Never cites source. Ends with an opening question, not a conclusion.

## Wiring in chat-engine.ts
Block inserted BEFORE detectedLang declaration (uses `earlyLang` not `detectedLang` — important!). Located after liveContext assembly. Condition: wisdomNeeded && urgency !== "immediate". Injected as `wisdomContext` into system prompt after `liveContext`.

**Why earlyLang not detectedLang**: `detectedLang` is declared ~50 lines after the wisdom block. `earlyLang` is the same value (computed earlier from sarvamDetectedLang or detectLanguage) and is already in scope.

## Wiring in drishya.ts
`wisdomSeedHint` built from `classifySituation` → `retrieveRelevantWisdom` → `storySeed`. Injected into the user message (alongside stateHint) as [INVISIBLE STORY SKELETON...] block. GPT-4o uses it as invisible architecture. Story contains no source names or known text characters.

## Wisdom seeds (24 records, reviewed=true)
Traditions: Thirukkural (4), Bhagavad Gita (4), Kabir (3), Yoga Sutras (2), Panchatantra (3), Ramayana (2), Mahabharata (2), Upanishads (2), Arthashastra (2). All have situation_tags, emotional_tags, arya_principle, arya_story_seed, rasa, guna_relevance, language_variants (hi + ta + ml where applicable).
