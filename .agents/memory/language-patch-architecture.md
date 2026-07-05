---
name: Language Patch Architecture
description: How multilingual support is wired into KAAL, NITI, and DRISHYA features for 11 Indian languages + English.
---

## Pattern

Each feature has its own language instruction builder that appends a LANGUAGE INSTRUCTION block at the end of its GPT system prompt. The block tells GPT-4o to generate content in the user's chosen language with correct literary register.

## KAAL (already done before this session)
- `server/arya/language-instruction.ts` — `getLanguageInstruction(langCode, firstName)` — called from `vedic-lens.ts` `generateVedicBriefing()`. Reads `uiLanguage` from DB, passes to instruction builder.
- KAAL UI: already translated via `i18n.ts` `t()` keys.

## NITI
- Server: `server/arya/kaal-niti-language-patch.ts` — `buildNitiLanguageInstruction(language)`, `buildJournalLanguageInstruction(language)`.
- Wired into: `generateNitiConversationResponse()` and `generateNitiResponse()` in `niti.ts` — both now fetch `uiLanguage: aryaUsers.uiLanguage` from their existing DB select, then append the instruction to their system prompts.
- Journal: `generateNitiJournalEntry(sessionId, userId, language?)` — optional language param, injects `buildJournalLanguageInstruction`.
- Client: `NitiPage.tsx` passes `language` (from `useLanguage()`) in the body of both `/api/niti/sessions` (POST) and `/api/niti/sessions/:id/message` (POST) calls. Server uses DB `uiLanguage` — client `language` field is redundant but harmless.
- Niti SESSION_TYPES labels: already translated via `t('niti_${key}')` — no change needed.

## DRISHYA
- Server: `server/arya/drishya-language-patch.ts` — `DRISHYA_LITERARY_REGISTER` (per-language storytelling register), `DRISHYA_LANGUAGE_NAMES`, `DRISHYA_VOICE_BY_LANGUAGE`, `buildDrishyaLanguageInstruction(language)`.
- Wired into: `generateDrishyaStory()` in `drishya.ts` — appended to system prompt after knowledge context replacement.
- Client: `DrishyaPage.tsx` — `getDrishyaWorldNames(language)` from `client/src/lib/kaal-niti-language-patch.ts` localises world selector labels. `toLangCode(short)` helper converts `useLanguage()` short codes (e.g., `ml`) to Sarvam full codes (`ml-IN`) for both TTS calls. Story API now passes `language` in POST body.

## Client constants file
`client/src/lib/kaal-niti-language-patch.ts`:
- `DRISHYA_WORLD_NAMES` — night/film/everyday labels + subtitles in all 11 languages.
- `getDrishyaWorldNames(language)` — returns the record for a given language.
- `NITI_IMPACT_TAGS` / `getNitiImpactTags(language)` — Market Lens impact chip translations (for future wiring if impact chips are rendered client-side instead of from API).

## Key decision
Language is fetched from the user's DB profile (`aryaUsers.uiLanguage`) inside the generator functions — not passed through function signatures. This means no route-level changes are needed and the source of truth is always the DB.

**Why:** Avoids cascading signature changes through route → service → generator chains. DB is the authoritative language preference store.

**How to apply:** When adding language support to any new feature generator, add `uiLanguage: aryaUsers.uiLanguage` to its existing DB select and call the appropriate `build*LanguageInstruction(user.uiLanguage || "en")` function.
