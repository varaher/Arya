# ARYA Core - Personal Thinking & Growth Assistant

## Overview

ARYA (Augmented Reasoning & Yielding Awareness) is a multi-tenant personal AI assistant platform designed for the VARAH Group. It serves as "Your Personal Thinking & Growth Assistant," focusing on helping users think clearly, set goals, stay disciplined, reflect daily, and grow spiritually and professionally. ARYA integrates Bharatiya (Indian/Hindu) civilizational perspectives and supports voice interaction in 11 Indian languages via Sarvam AI. It also underpins future products like ERmate (clinical documentation copilot) and ErPrana (patient monitoring).

## User Preferences

Preferred communication style: Simple, everyday language.
Branding: ARYA stands for "Augmented Reasoning & Yielding Awareness." ARYA is "Your Personal Thinking & Growth Assistant" — never refer to it as "AGI," "AGI-class," or just "chatbot." Avoid technical jargon in user-facing text. Tone should be warm, encouraging, personal — like a wise friend, not a corporate AI.
Bharatiya/Vedic/Sanskrit knowledge is the invisible core — ARYA draws from this wisdom naturally in responses, but these terms should NOT appear in user-facing UI labels, prompts, or navigation. The wisdom shows through the quality of advice, not through labels.
Philosopher names (Chanakya, Vidura, Thiruvalluvar, Krishna, Shukracharya) and source texts (Arthashastra, Thirukkural, Bhagavad Gita, Vidura Niti, etc.) are NEVER shown to users — not in tooltips, session headers, message footers, onboarding screens, or anywhere user-facing. They exist only in backend system prompts to guide ARYA's thinking. Users experience ARYA's wisdom directly — they never see which tradition it came from.

## System Architecture

The project is structured as a monorepo with a React frontend, an Express backend, and a shared module for schemas and types. It functions as a Progressive Web App (PWA).

### Frontend

-   **Framework:** React 18 with TypeScript.
-   **UI/UX:** shadcn/ui (New York style), Radix UI, Tailwind CSS v4 (light/bright theme: white backgrounds, gray text, cyan/amber/purple accents), Space Grotesk (headings), Inter (body), JetBrains Mono (code).
-   **PWA:** Installable on mobile, with manifest, service worker, and app icons.
-   **Markdown rendering:** `ReactMarkdown` + `remark-gfm` — tables render as visual grids, full GFM support.
-   **Key Pages:**
    -   `/` — Main chat (AryaChat.tsx) — public and admin views
    -   `/my-goals` — User goals management
    -   `/pricing` — Full pricing page (PricingPage.tsx) — India/Global toggle, Monthly/Annual toggle, feature comparison table, FAQ, exit-intent nudge modal
    -   `/privacy-control` — Right to Forget / DPDP Act 2023 data management
    -   `/privacy`, `/terms` — Legal pages
    -   `/community` — Community challenges and posts
    -   `/reflection/:token` — Shared weekly reflection (public)
    -   Admin-only: `/dashboard`, `/orchestrator`, `/knowledge`, `/ermate`, `/erprana`, `/self-learning`, `/neural-link`, `/api-playground`, `/developer`, `/user-analytics`
-   **User Authentication:** Name/email/phone/password signup, JWT-like session tokens (30-day TTL) stored in localStorage. Google OAuth also supported.
-   **Admin Authentication:** Password-based, in-memory session tokens.
-   **Notifications:** Bell icon for unread count and list of notifications. In-app alarm overlay for time-sensitive alarms (distinct from regular reminders).
-   **User Customization (Customize panel):** Response length, conversation tone, focus areas, wisdom/quotes toggle, news toggle, morning briefing toggle + time picker, weekly review toggle, app language (English / हिंदी).
-   **Multilingual UI:** Full English + Hindi UI via `client/src/lib/i18n.ts`. `getTranslation(lang, key)` / `getStoredUiLanguage()` / `setStoredUiLanguage()`. Applied across sidebar, chat, mood card, voice notes panel, and customize panel.
-   **Theme:** Light/dark toggle. `ThemeProvider` in `client/src/lib/theme.tsx`, stored in localStorage. `[data-theme="dark"]` on `<html>`, Tailwind v4 `@custom-variant dark`.
-   **Desktop layout:** `UniversalBottomNav` wrapped in `md:hidden` so bottom nav shows only on mobile. Main chat area uses `md:h-[100dvh]` for full-viewport height on desktop.

### Backend

-   **Framework:** Express.js on Node.js with TypeScript.
-   **User Auth Service:** Signup (bcrypt hashing), login, session verification, profile management, Google OAuth login (`server/arya/user-auth-service.ts`).
-   **Core AI Components:**
    -   **Orchestrator** (`orchestrator.ts`): Routes queries to knowledge domains based on intent and context.
    -   **Knowledge Retriever** (`knowledge-retriever.ts`): Fetches knowledge units from PostgreSQL with RAG.
    -   **Medical Engine** (`medical-engine.ts`): Deterministic NLP parsing for clinical transcripts.
    -   **Self-Learning Engine** (`learning-engine.ts`): Identifies knowledge gaps, auto-generates drafts.
    -   **Neural Link Engine** (`neural-link-engine.ts`): Discovers cross-domain connections for insights.
    -   **Smart Commands** (`smart-commands.ts`): Instant local commands without LLM API calls ("Alexa Mode").
    -   **Goal Detection in Chat:** Detects goal-setting intent post-response via pattern matching and GPT-4o-mini, auto-creating structured goals.
    -   **Memory Engine** (`memory-engine.ts`): Persistent user memory, cross-session context.
    -   **Patterns Engine** (`patterns-engine.ts`): Detects behavioral patterns over time.
    -   **Silence Detection** (`silence-detection.ts`): Detects inactivity and sends re-engagement nudges.
    -   **Response Cache Engine** (`response-cache-engine.ts`): Golden response caching, similarity matching, shadow-mode lookup to reduce LLM dependency.
-   **Indian Legal Knowledge:** 13 knowledge records in `arya_knowledge` — BNS 2023, BNSS 2023, consumer rights, RTI Act, labour law, property law, family law, cyber law, banking rights, traffic law, women's safety, fundamental rights, and a Hindi-language rights summary. ARYA system prompt in `chat-engine.ts` includes an INDIAN LEGAL KNOWLEDGE RULE instructing the model to draw from these records.
-   **Niti — Business Mind** (`niti.ts`, `market-lens.ts`): Dark-premium PWA at `/niti` with two modes on the home screen, toggled by a tab bar:
    -   **⚖️ Decisions tab**: 6-screen onboarding → philosopher routing (Chanakya/Vidura/Thiruvalluvar/Krishna/Shukracharya) → session types (Help me decide / Stress-test my plan / People situation / Think out loud). Each ARYA response: insight + push question (italic gold) + 3 follow-up chips. Sessions in `arya_niti_sessions` + `arya_niti_messages`.
    -   **📈 Market Lens tab**: (1) Indicative market indices (NIFTY/SENSEX/BANK NF/NIFTY IT) with sparkline SVGs; (2) 3 rotating news cards with impact chips + "What does this mean for me?" → ARYA GPT modal; (3) Portfolio Journal (self-reported holdings in `arya_portfolio_holdings`, ARYA asks Socratic questions per holding); (4) Think with ARYA (4 pre-loaded questions + free input → ARYA one-shot response). Every ARYA market response ends with a Socratic question — never a verdict. Legal safety + product magic. Routes: GET /api/niti/market/indices, /api/niti/market/news, POST /api/niti/market/ask, GET/POST /api/niti/portfolio, DELETE /api/niti/portfolio/:id.
    -   User business profile on `arya_users`: nitiEnabled, businessType, businessStage, businessRole, businessChallenge, businessFocusAreas. Menu: ✦ Niti — Business Wisdom in both user menus.
-   **Goal Intelligence System** (`server/arya/goal-checkin.ts`): Proactive check-in engine wired into chat-engine and the evening scheduler.
    -   8 check-in types: `just_created`, `stalled_early`, `stalled_week`, `stalled_long`, `abandoned`, `near_deadline`, `overdue`, `completed_recent` — each triggers a different ARYA nudge style (curious, not judgmental).
    -   Vague-goal detection: goals like "get fit" / "learn more" trigger a quiet specificity prompt if created in the last 10 min.
    -   `buildGoalCheckInContext(userId, firstName, conversationId)` → injects a hidden system prompt block into chat-engine. `markGoalCheckedIn()` stamps `last_checked_at` post-stream (20h cooldown).
    -   Evening scheduler fires at 8 PM IST (14:30–15:00 UTC): push notification per user for their top stalled goal → SW handles Yes / Skip / Not yet actions.
    -   3 routes: `GET /api/user/goals/abandoned`, `POST /api/user/goals/:goalId/hygiene` (keep/pause/release), `POST /api/user/goals/:goalId/checkin` (yes/skipped).
    -   **GoalsPanel hygiene section**: shows "💤 Sitting untouched" cards for goals 21+ days old with 0% progress — three one-tap actions: ✓ Keep it · ⏸ Pause · ✕ Let go.
-   **Alarm & Reminder differentiation:** Reminders = standard push notifications. Alarms = time-critical push with alarm sound + full-screen in-app overlay (cannot be missed). SW handles `alarm` type separately from `reminder`. Snooze (10 min) and Dismiss routes: `POST /api/user/reminders/:id/snooze`, `POST /api/user/reminders/:id/dismiss`.
-   **Retention & Engagement Services:**
    -   **Morning Briefing** (`morning-briefing.ts`): Daily personalized briefing — active goals + news + motivational line, sent as a notification. Triggered by scheduler for users with `morningBriefingEnabled = true`.
    -   **Weekly Review** (`weekly-review.ts`): Sunday GPT-generated narrative review woven from goals, memory, and voice flashback (notes from 28–62 days prior). Sent as notification.
    -   **Hard Conversation Rehearsal** (`rehearsal.ts`): ARYA plays a persona (boss, parent, investor, etc.) so users can practise difficult conversations. Conversations enter `rehearsal` mode with `rehearsalPersona` + `rehearsalExchangeCount` tracked on the conversations table. POST `/api/arya/conversations/:id/start-rehearsal`, `/rehearsal-feedback`.
    -   **Community Challenges** (`community-challenge.ts`): Shared weekly challenges, community posts, reactions.
    -   **Reflection Share** (`reflection-share.ts`): Tokenised public links for sharing weekly reflections.
-   **Scheduler** (`reminder-scheduler.ts`): Manages all background tasks — morning briefings (every 5 min check), weekly reviews (every 15 min check), community challenges, silence detection, pattern analysis, goal reminders, evening goal check-ins (every 10 min check, fires at 8 PM IST), Sarvam health check (midnight). All raw queries use `sql` tagged template literals.
-   **Notifications System:** Types include welcome, goal_created, progress, streak, reminder, alarm, morning_briefing, weekly_review, community_challenge, pattern_insight, silence_nudge, notes_reminder, goal_checkin.
-   **Document & Image Analysis with OCR:** `POST /api/arya/conversations/:id/scan` — accepts base64 file + mimeType + question. **Images:** Sarvam OCR (`/v1/ocr`) extracts raw text first (handles Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Odia + English); extracted text is sent to GPT-4o for interpretation. Falls back to GPT-4o vision if OCR fails or returns empty. **PDFs:** pdf-parse text extraction → GPT-4o; scanned/image PDFs: JPEG embedded bytes extracted → GPT-4o vision. Response optionally translated via Sarvam. Frontend: "Scan document" button in `···` toolbar menu opens camera (`capture="environment"`) → auto-sends through OCR pipeline. Loading indicator: "🔍 OCR reading document…".
-   **Google Calendar** (`google-calendar.ts`): OAuth 2.0 flow. Routes: `GET /api/calendar/auth-url`, `GET /api/calendar/callback`, `GET /api/calendar/status`, `GET /api/calendar/events`, `DELETE /api/calendar/disconnect`. CalendarPanel component in AryaChat.
-   **Mood Check-ins:** `POST /api/user/mood` (mood + energy + note), `GET /api/user/mood/today`, `GET /api/user/mood/history`. Stored in `arya_mood_checkins`. MoodCheckInCard shown once daily in welcome screen (below TalkToARYACard).
-   **Voice Notes & Study Notes (complete):**
    -   `POST /api/user/voice-notes` — saves transcript + base64 audio (`audioData`) + `mimeType` + `durationSeconds`. Background GPT-4o-mini job generates summary (bullet format) + extracts tasks/people/deadlines → updates note. Sends `notes_reminder` notification.
    -   `GET /api/user/voice-notes` — list (50 most recent).
    -   `GET /api/user/voice-notes/:id/audio` — streams stored WAV as binary (`Content-Type: audio/wav`); returns 204 if no audio stored.
    -   `POST /api/user/voice-notes/:id/save-tasks` — creates goals from extracted tasks (with `dueDate` where found), stamps `tasksSavedAt` on note, links each goal via `sourceNoteId`.
    -   `DELETE /api/user/voice-notes/:id`.
    -   **VoiceNoteCard UI:** header (timestamp · duration · language), ✨ Summary bullets, collapsible full transcript, 📋 action items found section with "✅ Save as goals" full-width button, `[🔊 Play]` / `[⏹ Stop]` toggle, `[📋 Copy]` copies transcript.
    -   **Study Notes System** (`server/arya/study-notes-extractor.ts`): Auto-detects study intent from user messages (exam_prep, ppt_prep, concept_learn, essay_writing, topic_summary). When detected: injects structured guidance into ARYA's system prompt, extracts bullets from the streamed response (zero latency), saves to `arya_voice_notes` with `source_type='chat'`, emits `note_saved` SSE event. Background GPT-4o-mini generates 4 exam questions (exam_prep / concept_learn only) and enriches the note after `done:true`.
    -   **StudyNoteToast** (`AryaChat.tsx`): `createPortal` to `document.body`. Slides up from bottom on `note_saved` SSE event, shows icon per study type (📝📊💡✍️📌), auto-dismisses in 6s, "Open →" jumps to Notes panel.
    -   **StudyNoteCard** (`AryaChat.tsx`): Teal/cyan color scheme (distinct from violet voice notes). Shows title, type badge, ✨ Summary bullets, ❓ Likely Exam Questions (filled ~3s after response).
    -   **DB columns added to `arya_voice_notes`:** `source_type` (voice/chat), `study_type`, `exam_questions` (JSONB), `conversation_id`.
    -   **Chat-engine proactive context**: unactioned voice note tasks (extractedTasks > 0 AND !tasksSavedToGoals) are added to liveContext as `UNACTIONED VOICE NOTE ITEMS` — ARYA weaves these naturally into conversation, never as a list announcement.
-   **Image Prompt Engineer** (in ARYA system prompt, `chat-engine.ts`): ARYA acts as a personal prompt engineer when the user asks for image prompts or visual content for Midjourney, DALL-E, Canva AI, Adobe Firefly, Microsoft Designer, or Stable Diffusion. Knows exact syntax for each tool. Personalises prompts using user context (doctor → Kerala hospital setting, founder → Indian office, student → study environment, goals → pulled from Goals panel). Default recommendation: Canva AI (free, browser-based). Always writes the actual prompt — never just explains how to write one.
-   **Right to Forget / Privacy Control** (`forget-me-service.ts`): DPDP Act 2023 compliance. Three deletion paths — selective (by category), period (date range), full reset. All operations logged to `arya_deletion_audit` (records THAT a deletion happened, never WHAT). Routes: `GET /api/user/data-summary`, `DELETE /api/user/forget/selective`, `/period`, `/all`.
-   **Billing / Subscriptions:** `client/src/pages/PricingPage.tsx` (full page at `/pricing`) and `client/src/components/PricingModal.tsx` (in-app modal). Both support Razorpay checkout (India, INR) via `POST /api/subscription/create` + `POST /api/subscription/verify`. International (USD) buttons are visually disabled ("Coming soon"). Plans: Free · Core (₹249) · Pro (₹499) · Elite (₹999). Annual toggle shows 2-months-free pricing. Exit-intent nudge fires when user taps back arrow. Voice minutes: Free=0, Core=150/mo, Pro=500/mo, Elite=unlimited. Razorpay secrets (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID_CORE`, `RAZORPAY_PLAN_ID_PRO`, `RAZORPAY_WEBHOOK_SECRET`) not yet configured — billing UI is ready but live payments will activate once secrets are added.
-   **Usage & Cost Management:** Granular usage tracking, daily cost estimation, rate limiting, cost cap enforcement (`usage-budget.ts`). Beta mode with invite-only access and user caps (`beta-guard.ts`).
-   **Multi-Tenancy:** `tenant_id` and validation middleware throughout.
-   **Server Stability:** `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers in `server/index.ts` log errors and keep the process alive instead of crashing.
-   **Token Limits** (`chat-engine.ts` `getMaxTokens`): Professional query keywords (nabh, format, template, indicator, kpi, protocol, checklist, etc.) trigger 4096-token ceiling. COMPREHENSIVE RESPONSE RULE + YOUNG USER SAFETY RULE in system prompt.

### Voice Architecture

-   **Voice Conversation Mode** (`VoiceConversationMode` component in AryaChat.tsx): Continuous Gemini-style voice loop — records → Sarvam STT → ARYA LLM → Sarvam TTS → plays audio → auto-listens again (600ms gap). TalkToARYACard on welcome screen is the entry point; also accessible via the "..." toolbar menu.
-   **STT (Speech-to-Text):** Sarvam `saarika:v2.5` with language auto-detection (pass `"unknown"` so Sarvam identifies the language). 30-second timeout. On timeout or failure → falls back to **OpenAI Whisper** so the user always gets a response. `ur-IN` remapped to `hi-IN`. `isTransliteratedEnglish()` helper (Unicode-based, covers Malayalam/Hindi/Tamil/Telugu/Kannada) detects English phonetically written in Indian script → falls back to Whisper.
-   **TTS (Text-to-Speech) — server-side (voice endpoint):** Two-tier:
    1. Sarvam `bulbul:v2` for Indian languages (ml-IN, kn-IN, hi-IN, ta-IN, te-IN, etc.) — text cleaned of emoji/control chars/markdown before sending. Invalid params (`speech_sample_rate`, `speaker_gender`, `mode`) removed from payload.
    2. OpenAI TTS (`nova` voice, wav) as universal fallback if Sarvam returns empty audio or throws.
-   **TTS — client-side (`speakText`):** Uses Unicode script detection (`detectTextScript`) to identify the language of ARYA's reply (Devanagari→hi-IN, Kannada→kn-IN, Malayalam→ml-IN, etc.) so the correct Sarvam voice is used even if the recording-language picker is set to a different language.
-   **Voice Error UX:** Transient errors (timeout, network) show "Reconnecting…" and auto-restart in 3 seconds. Permanent errors (mic denied) show manual "Try again" button.
-   **AudioContext:** Reuses existing context across sessions (suspend/resume pattern). Only fully closes on component unmount to prevent memory leaks.
-   **SSE stream reader:** Cancelled via `streamReaderRef` before opening a new stream to prevent connection pool exhaustion.

### Database

PostgreSQL with Drizzle ORM (`shared/schema.ts` + `shared/models/chat.ts`).

Key tables:
-   `arya_users` — accounts, prefs, morning briefing settings, weekly review toggle, UI language, Google Calendar tokens, plan (free/core/pro/elite), Niti business profile fields
-   `conversations`, `messages` — chat model (chat.ts). Columns for `mode` (normal/rehearsal), `rehearsalPersona`, `rehearsalExchangeCount`
-   `arya_knowledge`, `arya_memory` — knowledge base and user memory
-   `arya_goals`, `arya_goal_steps` — goal management with steps. Columns: `reminder_at`, `reminder_fired` (BOOLEAN DEFAULT false), `is_completed` (BOOLEAN DEFAULT false), `calendar_event_id`, `recurrence`, `people_involved`, `context_note`, `source_note_id` (VARCHAR — links goal back to originating voice note), `last_checked_at` (goal intelligence cooldown), `hygiene_at`
-   `arya_goal_checkins` — records every evening check-in result (userId, goalId, result, timestamp)
-   `arya_notifications` — all notification types
-   `arya_mood_checkins` — daily mood + energy + note
-   `arya_voice_notes` — transcribed voice notes + study notes. Columns: `transcript`, `summary`, `extracted_tasks` (JSONB), `extracted_people` (text[]), `extracted_deadlines` (JSONB), `tasks_saved_to_goals` (BOOLEAN), `tasks_saved_at` (TIMESTAMP), `audio_data` (TEXT — base64 WAV), `mime_type`, `duration_seconds`, `language`, `source_type` (voice/chat), `study_type` (exam_prep/ppt_prep/concept_learn/essay_writing/topic_summary), `exam_questions` (JSONB), `conversation_id` (INTEGER)
-   `arya_reminders` — user-set reminders with recurrence; `is_alarm` BOOLEAN differentiates alarms from regular reminders
-   `arya_user_feedback` — bug/feature reports from users
-   `arya_deletion_audit` — DPDP Act compliance log (userId, deletionType, categories[], recordsDeleted, timestamps only — no personal content)
-   `arya_reflection_shares` — tokenised weekly reflection share links (raw SQL, not in Drizzle schema)
-   `arya_community_posts`, `arya_community_reactions` — community features
-   `arya_subscriptions` — Razorpay subscription records (userId, plan, razorpaySubscriptionId, status, etc.)
-   `arya_response_cache`, `arya_usage_budget`, `arya_api_keys`, `arya_voice_sessions`, `arya_voice_quality_log`, etc.

## External Dependencies

-   **PostgreSQL:** Primary database.
-   **Sarvam.ai** (`SARVAM_API_KEY`): Indian language STT (`saarika:v2.5`), TTS (`bulbul:v2`), and translation (`mayura:v1`) for 11 languages.
-   **OpenAI (via Replit AI Integrations):** LLM capabilities — gpt-4o for vision/analysis, gpt-4o-mini for goal detection and summaries. Also used as STT fallback (Whisper) and TTS fallback (nova voice). Accessed via `process.env.AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`.
-   **Google OAuth** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`): User login + Calendar access.
-   **Framer Motion:** Animated transitions throughout — page transitions, panel slide-in/out, modals, chat messages, welcome screen staggered reveal, user menu dropdown, mobile sidebar overlay.
-   **Razorpay** (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID_CORE`, `RAZORPAY_PLAN_ID_PRO`, `RAZORPAY_WEBHOOK_SECRET`): Subscription billing for Core and Pro plans. UI and backend routes are fully built — secrets not yet configured so live payments are not yet active.
-   **remark-gfm:** GitHub-flavored Markdown rendering in chat (tables, strikethrough, task lists).

## Key Files

-   `client/src/pages/AryaChat.tsx` — Main chat UI (~8500 lines). Contains: VoiceConversationMode, VoiceNotesPanel (with NoteCard/StudyNoteCard — audio playback, copy, save-tasks, exam questions), StudyNoteToast, MoodCheckInCard, TalkToARYACard, CalendarPanel, CustomizePanel, RehearsalSetupPanel, GoalsPanel (with hygiene section), QuickStartTutorial (16 steps), all sidebar panels, welcome screen, detectTextScript utility.
-   `client/src/pages/PricingPage.tsx` — Full pricing page: India/Global toggle, Monthly/Annual billing toggle, plan cards with feature bullets, feature comparison table, voice metering explainer, FAQ accordion, exit-intent nudge modal. Plans: Free · Core (₹249/₹207 annual) · Pro (₹499/₹416) · Elite (₹999/₹833).
-   `client/src/components/PricingModal.tsx` — In-app upgrade modal (triggered from chat UI). India-only, monthly pricing, Razorpay checkout.
-   `client/src/pages/PrivacyControlPage.tsx` — Right to Forget multi-step UI (3 deletion paths, typed confirmation, receipt screen).
-   `client/src/lib/i18n.ts` — English + Hindi translations, getTranslation/getStoredUiLanguage/setStoredUiLanguage.
-   `server/routes.ts` — All API routes (~5100 lines).
-   `server/arya/chat-engine.ts` — Core LLM pipeline. Builds liveContext from: goals, memory, mood, calendar, news, voice notes (summary + unactioned tasks). Injects goal check-in system prompt block. IMAGE PROMPT ENGINEER section in ARYA_SYSTEM_PROMPT. Calls markGoalCheckedIn post-stream. `studyNotesAddition` parameter injects study context when study intent detected.
-   `server/arya/study-notes-extractor.ts` — Study intent detection (5 types), bullet extraction from responses, note title builder, study notes system prompt addition builder.
-   `server/arya/goal-checkin.ts` — Goal intelligence: buildGoalCheckInContext, markGoalCheckedIn, isVagueGoal, buildSpecificityPrompt, getAbandonedGoals. 8 check-in types.
-   `server/arya/sarvam-service.ts` — Sarvam STT, TTS, translate functions. TTS: text sanitisation pipeline, bulbul:v2, two-tier fallback logging. `isIndianLanguage()`, `getSpeakerForLanguage()`, `SUPPORTED_LANGUAGES`. `isTransliteratedEnglish()` helper for Whisper fallback.
-   `server/arya/forget-me-service.ts` — Data deletion service (getDataSummary, forgetSelective, forgetPeriod, forgetAll, logDeletion).
-   `server/arya/rehearsal.ts` — Hard Conversation Rehearsal service.
-   `server/arya/morning-briefing.ts` — Daily briefing generation.
-   `server/arya/weekly-review.ts` — Sunday weekly review with voice flashback.
-   `server/arya/reminder-scheduler.ts` — Central background task scheduler. All raw queries use `sql` tagged template literals. Intervals: morning briefing (5 min), weekly review (15 min), evening goal check-in (10 min, fires 14:30–15:00 UTC = 8 PM IST), Sarvam health check (midnight).
-   `server/index.ts` — Express entry point. Contains global uncaughtException + unhandledRejection crash guards.
-   `shared/schema.ts` — Drizzle schema for all tables.
-   `shared/models/chat.ts` — conversations + messages tables.
-   `client/public/sw.js` — Service worker. Handles push notification actions: alarm (snooze/dismiss), goal_checkin (yes/skip/not-yet), reminder, morning_briefing, weekly_review.
