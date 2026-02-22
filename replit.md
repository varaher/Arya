# ARYA Core - Personal Thinking & Growth Assistant

## Overview

ARYA (Augmented Reasoning & Yielding Analytics) is a multi-tenant personal AI assistant platform designed for the VARAH Group. ARYA is positioned as "Your Personal Thinking & Growth Assistant" — not another chatbot, not an AI toy, not a tech demo. ARYA is a thinking companion, goal tracker, daily discipline guide, voice-based planner, wisdom-rooted advisor, and life organiser. It helps people: think clearly, set goals, stay disciplined, reflect daily, and grow spiritually + professionally. ARYA thinks from a Bharatiya (Indian/Hindu) civilizational perspective and supports voice in 11 Indian languages via Sarvam AI. The platform also serves as the foundation for downstream products including ERmate (clinical documentation copilot) and ErPrana (patient monitoring and risk assessment).

## User Preferences

Preferred communication style: Simple, everyday language.
Branding: ARYA is "Your Personal Thinking & Growth Assistant" — never refer to it as "AGI," "AGI-class," or just "chatbot." Avoid technical jargon in user-facing text. Tone should be warm, encouraging, personal — like a wise friend, not a corporate AI.

## System Architecture

The project is structured as a monorepo with a React frontend, an Express backend, and a shared module for schemas and types. The application runs from the root `server/index.ts` entry point. The app is also a Progressive Web App (PWA) — installable on mobile phones from the browser.

### Frontend

-   **Framework:** React 18 with TypeScript
-   **UI/UX:** shadcn/ui (New York style) based on Radix UI, Tailwind CSS v4 for styling (dark theme: deep navy, cyan, amber), Space Grotesk (headings), Inter (body), JetBrains Mono (code).
-   **PWA:** Manifest at `client/public/manifest.json`, service worker at `client/public/sw.js`, registered in `client/src/main.tsx`. App icons in `client/public/icons/`.
-   **Logo:** Transparent-background logo at `client/public/arya-logo-transparent.png`. Original at `client/public/arya-logo.png`.
-   **Key Pages:**
    -   `/`: Public conversational chat with ARYA (text and voice input, streaming AI responses with RAG).
    -   `/goals`: User goals page — view/manage personal goals, track daily progress, streaks, and voice session durations.
    -   Admin-only pages for dashboard, orchestrator visualization, knowledge base management, self-learning engine, neural link explorer, ERmate processing, ErPrana monitoring, API playground, and developer portal.
-   **User Authentication:** Separate from admin auth. Users sign up with name/email/phone/password. JWT-like session tokens (30-day TTL) stored in localStorage. Context provider at `client/src/lib/user-auth.tsx`. Login/signup modal in chat UI. User menu with profile, goals link, sign out.
-   **Admin Authentication:** Password-based admin authentication with in-memory session tokens.
-   **Notifications:** Bell icon in chat header (visible when logged in) fetches from `/api/user/notifications`, shows unread count badge, dropdown list with mark-as-read.

### Backend

-   **Framework:** Express.js on Node.js with TypeScript
-   **User Auth Service:** `server/arya/user-auth-service.ts` — signup (bcrypt password hashing), login, session verification, profile management. Sessions stored in `arya_user_sessions` table with 30-day expiry. Middleware: `requireUser` (blocks unauthenticated), `optionalUser` (attaches userId if available).
-   **Core Components:**
    -   **Orchestrator:** Routes queries to appropriate knowledge domains based on intent, language, keywords, and app context. Supports single, dual, or four-pillar domain weighting.
    -   **Knowledge Retriever:** Fetches knowledge units from PostgreSQL using keyword-based scoring, with future plans for semantic search.
    -   **Medical Engine:** Provides deterministic NLP parsing for clinical transcripts.
    -   **Self-Learning Engine:** Tracks queries, identifies knowledge gaps, and auto-generates knowledge drafts for admin review.
    -   **Neural Link Engine:** Discovers and stores cross-domain connections between knowledge units for synthesis and insights.
    -   **Smart Commands:** Handles instant, local commands (time, date, math) without AI API calls for rapid responses.
    -   **Goal Detection in Chat:** `server/arya/chat-engine.ts` — after streaming a response, if the user is logged in, detects goal-setting intent via pattern matching + GPT-4.1-mini validation. Auto-creates structured goals with steps and sends a notification.
-   **AI Architecture:** Hybrid approach combining:
    -   **Alexa Mode (Instant):** Local processing for quick commands.
    -   **Deep Reasoning:** Uses GPT-5.2 with RAG for complex analysis.
    -   **Creative Mode:** Leverages GPT for creative tasks.
-   **Smart Capabilities:**
    -   **Persistent Memory:** Extracts and remembers facts, preferences, and context from conversations using GPT-4.1-mini.
    -   **Goal & Plan Manager:** Breaks down complex tasks into prioritized, trackable steps. Goals linked to users with `userId`, daily target minutes, reminder times, streak tracking, voice session duration tracking, auto-progress updates.
    -   **Self-Reflection & Feedback:** Incorporates user feedback (thumbs up/down) to refine responses and memory.
    -   **Proactive Insights:** Analyzes patterns and gaps to generate unprompted insights.
    -   **Confidence & Uncertainty:** Provides confidence scores for responses, explicitly stating uncertainty when knowledge is low.
-   **Notifications System:** Generates notifications for: welcome on signup, goal creation, goal progress, streak achievements, reminders. Routes at `/api/user/notifications` (GET, POST mark-read, POST read-all). Protected with `requireUser` middleware.
-   **Database:** PostgreSQL with Drizzle ORM for schema definition and migrations.
    -   Key tables: `arya_knowledge`, `arya_knowledge_drafts`, `arya_query_patterns`, `arya_neural_links`, `arya_memory`, `arya_goals`, `arya_goal_steps`, `arya_feedback`, `arya_users`, `arya_user_sessions`, `arya_notifications`, `arya_voice_sessions`.
-   **Multi-Tenancy:** Achieved via `tenant_id` on all knowledge records and validation middleware.

## Key Files

-   `shared/schema.ts` — All Drizzle ORM table definitions, insert schemas, and types.
-   `server/routes.ts` — All API route definitions (admin, user auth, chat, voice, goals, notifications, knowledge, etc.).
-   `server/arya/chat-engine.ts` — Core chat logic: orchestrator routing, RAG, streaming, memory extraction, goal detection.
-   `server/arya/user-auth-service.ts` — User signup, login, session management, profile updates.
-   `client/src/lib/user-auth.tsx` — Frontend user authentication context provider.
-   `client/src/pages/AryaChat.tsx` — Main chat interface with voice, text, memory panel, goals panel, notification bell, user auth modal.
-   `client/src/pages/UserGoals.tsx` — User goals management page.
-   `client/src/App.tsx` — App routing and provider wrappers.

## External Dependencies

-   **PostgreSQL:** Primary database for all persistent data.
-   **Sarvam.ai:** Used for Indian language Speech-to-Text (STT), Text-to-Speech (TTS), and Translation services.
-   **OpenAI (via Replit AI Integrations):** Provides LLM capabilities for conversational responses and voice transcription (gpt-5.2, gpt-4o-mini-transcribe).

## Recent Changes

-   **Feb 2026:** Refined positioning to "Your Personal Thinking & Growth Assistant" — updated welcome screen, footer, suggestion prompts, and system prompt to reflect five pillars: think clearly, set goals, stay disciplined, reflect daily, grow spiritually & professionally. Warm, friend-like tone in system prompt.
-   **Feb 2026:** Rebranded ARYA from "AGI-class AI assistant" to personal assistant. Removed all AGI references.
-   **Feb 2026:** Made logo background transparent (`arya-logo-transparent.png`), trimmed to content.
-   **Feb 2026:** Added custom ARYA logo to welcome screen and login/signup modal.
-   **Feb 2026:** Added PWA support (manifest.json, service worker, app icons, meta tags) so users can install ARYA on their phones from the browser.
-   **Feb 2026:** Built user authentication system (signup/login, bcrypt hashing, session tokens, user profile management).
-   **Feb 2026:** Added user goals system with daily targets, streak tracking, voice session duration tracking, and auto-goal detection in chat via GPT-4.1-mini.
-   **Feb 2026:** Built notification system with bell icon in chat header, unread count, and mark-as-read functionality.
-   **Feb 2026:** Integrated user token passing in text and voice chat routes for personalized goal detection.
