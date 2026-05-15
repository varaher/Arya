# ARYA Core - Personal Thinking & Growth Assistant

## Overview

ARYA (Augmented Reasoning & Yielding Awareness) is a multi-tenant personal AI assistant platform designed for the VARAH Group. It serves as "Your Personal Thinking & Growth Assistant," focusing on helping users think clearly, set goals, stay disciplined, reflect daily, and grow spiritually and professionally. ARYA integrates Bharatiya (Indian/Hindu) civilizational perspectives and supports voice interaction in 11 Indian languages via Sarvam AI. It also underpins future products like ERmate (clinical documentation copilot) and ErPrana (patient monitoring).

## User Preferences

Preferred communication style: Simple, everyday language.
Branding: ARYA stands for "Augmented Reasoning & Yielding Awareness." ARYA is "Your Personal Thinking & Growth Assistant" — never refer to it as "AGI," "AGI-class," or just "chatbot." Avoid technical jargon in user-facing text. Tone should be warm, encouraging, personal — like a wise friend, not a corporate AI.
Bharatiya/Vedic/Sanskrit knowledge is the invisible core — ARYA draws from this wisdom naturally in responses, but these terms should NOT appear in user-facing UI labels, prompts, or navigation. The wisdom shows through the quality of advice, not through labels.

## System Architecture

The project is structured as a monorepo with a React frontend, an Express backend, and a shared module for schemas and types. It functions as a Progressive Web App (PWA).

### Frontend

-   **Framework:** React 18 with TypeScript.
-   **UI/UX:** shadcn/ui (New York style), Radix UI, Tailwind CSS v4 (light/bright theme: white backgrounds, gray text, cyan/amber/purple accents), Space Grotesk (headings), Inter (body), JetBrains Mono (code).
-   **PWA:** Installable on mobile, with manifest, service worker, and app icons.
-   **Key Pages:**
    -   `/` — Main chat (AryaChat.tsx) — public and admin views
    -   `/my-goals` — User goals management
    -   `/privacy-control` — Right to Forget / DPDP Act 2023 data management
    -   `/privacy`, `/terms` — Legal pages
    -   `/community` — Community challenges and posts
    -   `/reflection/:token` — Shared weekly reflection (public)
    -   Admin-only: `/dashboard`, `/orchestrator`, `/knowledge`, `/ermate`, `/erprana`, `/self-learning`, `/neural-link`, `/api-playground`, `/developer`, `/user-analytics`
-   **User Authentication:** Name/email/phone/password signup, JWT-like session tokens (30-day TTL) stored in localStorage. Google OAuth also supported.
-   **Admin Authentication:** Password-based, in-memory session tokens.
-   **Notifications:** Bell icon for unread count and list of notifications.
-   **User Customization (Customize panel):** Response length, conversation tone, focus areas, wisdom/quotes toggle, news toggle, morning briefing toggle + time picker, weekly review toggle, app language (English / हिंदी).
-   **Multilingual UI:** Full English + Hindi UI via `client/src/lib/i18n.ts`. `getTranslation(lang, key)` / `getStoredUiLanguage()` / `setStoredUiLanguage()`. Applied across sidebar, chat, mood card, voice notes panel, and customize panel.
-   **Theme:** Light/dark toggle. `ThemeProvider` in `client/src/lib/theme.tsx`, stored in localStorage. `[data-theme="dark"]` on `<html>`, Tailwind v4 `@custom-variant dark`.

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
-   **Niti — Business Mind** (`niti.ts`, `market-lens.ts`): Dark-premium PWA at `/niti` with two modes on the home screen, toggled by a tab bar:
    -   **⚖️ Decisions tab**: 6-screen onboarding → philosopher routing (Chanakya/Vidura/Thiruvalluvar/Krishna/Shukracharya) → session types (Help me decide / Stress-test my plan / People situation / Think out loud). Each ARYA response: insight + push question (italic gold) + 3 follow-up chips. Sessions in `arya_niti_sessions` + `arya_niti_messages`.
    -   **📈 Market Lens tab**: (1) Indicative market indices (NIFTY/SENSEX/BANK NF/NIFTY IT) with sparkline SVGs; (2) 3 rotating news cards with impact chips + "What does this mean for me?" → ARYA GPT modal; (3) Portfolio Journal (self-reported holdings in `arya_portfolio_holdings`, ARYA asks Socratic questions per holding); (4) Think with ARYA (4 pre-loaded questions + free input → ARYA one-shot response). Every ARYA market response ends with a Socratic question — never a verdict. Legal safety + product magic. Routes: GET /api/niti/market/indices, /api/niti/market/news, POST /api/niti/market/ask, GET/POST /api/niti/portfolio, DELETE /api/niti/portfolio/:id.
    -   User business profile on `arya_users`: nitiEnabled, businessType, businessStage, businessRole, businessChallenge, businessFocusAreas. Menu: ✦ Niti — Business Wisdom in both user menus.
-   **Retention & Engagement Services:**
    -   **Morning Briefing** (`morning-briefing.ts`): Daily personalized briefing — active goals + news + motivational line, sent as a notification. Triggered by scheduler for users with `morningBriefingEnabled = true`.
    -   **Weekly Review** (`weekly-review.ts`): Sunday GPT-generated narrative review woven from goals, memory, and voice flashback (notes from 28–62 days prior). Sent as notification.
    -   **Hard Conversation Rehearsal** (`rehearsal.ts`): ARYA plays a persona (boss, parent, investor, etc.) so users can practise difficult conversations. Conversations enter `rehearsal` mode with `rehearsalPersona` + `rehearsalExchangeCount` tracked on the conversations table. POST `/api/arya/conversations/:id/start-rehearsal`, `/rehearsal-feedback`.
    -   **Community Challenges** (`community-challenge.ts`): Shared weekly challenges, community posts, reactions.
    -   **Reflection Share** (`reflection-share.ts`): Tokenised public links for sharing weekly reflections.
-   **Scheduler** (`reminder-scheduler.ts`): Manages all background tasks — morning briefings (every 5 min check), weekly reviews (every 15 min check), community challenges, silence detection, pattern analysis.
-   **Notifications System:** Types include welcome, goal_created, progress, streak, reminder, morning_briefing, weekly_review, community_challenge, pattern_insight, silence_nudge.
-   **Document & Image Analysis:** `POST /api/arya/conversations/:id/scan` — accepts base64 file + mimeType + question. Images → GPT-4o vision. PDFs → pdf-parse text extraction → GPT-4o. Response optionally translated via Sarvam.
-   **Google Calendar** (`google-calendar.ts`): OAuth 2.0 flow. Routes: `GET /api/calendar/auth-url`, `GET /api/calendar/callback`, `GET /api/calendar/status`, `GET /api/calendar/events`, `DELETE /api/calendar/disconnect`. CalendarPanel component in AryaChat.
-   **Mood Check-ins:** `POST /api/user/mood` (mood + energy + note), `GET /api/user/mood/today`, `GET /api/user/mood/history`. Stored in `arya_mood_checkins`. MoodCheckInCard shown once daily in welcome screen.
-   **Voice Notes:** `POST /api/user/voice-notes`, `GET /api/user/voice-notes`, `DELETE /api/user/voice-notes/:id`. Stored in `arya_voice_notes`. VoiceNotesPanel in sidebar Notes tab.
-   **Right to Forget / Privacy Control** (`forget-me-service.ts`): DPDP Act 2023 compliance. Three deletion paths — selective (by category), period (date range), full reset. All operations logged to `arya_deletion_audit` (records THAT a deletion happened, never WHAT). Routes: `GET /api/user/data-summary`, `DELETE /api/user/forget/selective`, `/period`, `/all`.
-   **Usage & Cost Management:** Granular usage tracking, daily cost estimation, rate limiting, cost cap enforcement (`usage-budget.ts`). Beta mode with invite-only access and user caps (`beta-guard.ts`).
-   **Multi-Tenancy:** `tenant_id` and validation middleware throughout.

### Database

PostgreSQL with Drizzle ORM (`shared/schema.ts` + `shared/models/chat.ts`).

Key tables:
-   `arya_users` — accounts, prefs, morning briefing settings, weekly review toggle, UI language, Google Calendar tokens, plan (free/core/pro)
-   `conversations`, `messages` — chat model (chat.ts). Columns for `mode` (normal/rehearsal), `rehearsalPersona`, `rehearsalExchangeCount`
-   `arya_knowledge`, `arya_memory` — knowledge base and user memory
-   `arya_goals`, `arya_goal_steps` — goal management with steps
-   `arya_notifications` — all notification types
-   `arya_mood_checkins` — daily mood + energy + note
-   `arya_voice_notes` — transcribed voice notes
-   `arya_reminders` — user-set reminders with recurrence
-   `arya_user_feedback` — bug/feature reports from users
-   `arya_deletion_audit` — DPDP Act compliance log (userId, deletionType, categories[], recordsDeleted, timestamps only — no personal content)
-   `arya_reflection_shares` — tokenised weekly reflection share links (raw SQL, not in Drizzle schema)
-   `arya_community_posts`, `arya_community_reactions` — community features
-   `arya_response_cache`, `arya_usage_budget`, `arya_api_keys`, `arya_voice_sessions`, etc.

## External Dependencies

-   **PostgreSQL:** Primary database.
-   **Sarvam.ai** (`SARVAM_API_KEY`): Indian language STT, TTS, and translation (11 languages).
-   **OpenAI (via Replit AI Integrations):** LLM capabilities — gpt-4o for vision/analysis, gpt-4o-mini for goal detection and summaries. Accessed via `process.env.AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`.
-   **Google OAuth** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`): User login + Calendar access.
-   **Framer Motion:** Animated transitions throughout — page transitions, panel slide-in/out, modals, chat messages, welcome screen staggered reveal, user menu dropdown, mobile sidebar overlay.
-   **Razorpay** (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID_CORE`, `RAZORPAY_PLAN_ID_PRO`, `RAZORPAY_WEBHOOK_SECRET`): Subscription billing for Core and Pro plans.

## Key Files

-   `client/src/pages/AryaChat.tsx` — Main chat UI (~5800 lines). Contains: VoiceNotesPanel, MoodCheckInCard, CalendarPanel, CustomizePanel, RehearsalSetupPanel, all sidebar panels, welcome screen.
-   `client/src/pages/PrivacyControlPage.tsx` — Right to Forget multi-step UI (3 deletion paths, typed confirmation, receipt screen).
-   `client/src/lib/i18n.ts` — English + Hindi translations, getTranslation/getStoredUiLanguage/setStoredUiLanguage.
-   `server/routes.ts` — All API routes (~3300 lines).
-   `server/arya/forget-me-service.ts` — Data deletion service (getDataSummary, forgetSelective, forgetPeriod, forgetAll, logDeletion).
-   `server/arya/rehearsal.ts` — Hard Conversation Rehearsal service.
-   `server/arya/morning-briefing.ts` — Daily briefing generation.
-   `server/arya/weekly-review.ts` — Sunday weekly review with voice flashback.
-   `server/arya/reminder-scheduler.ts` — Central background task scheduler.
-   `shared/schema.ts` — Drizzle schema for all tables.
-   `shared/models/chat.ts` — conversations + messages tables.
