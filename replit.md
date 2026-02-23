# ARYA Core - Personal Thinking & Growth Assistant

## Overview

ARYA (Augmented Reasoning & Yielding Analytics) is a multi-tenant personal AI assistant platform designed for the VARAH Group. It serves as "Your Personal Thinking & Growth Assistant," focusing on helping users think clearly, set goals, stay disciplined, reflect daily, and grow spiritually and professionally. ARYA integrates Bharatiya (Indian/Hindu) civilizational perspectives and supports voice interaction in 11 Indian languages via Sarvam AI. It also underpins future products like ERmate (clinical documentation copilot) and ErPrana (patient monitoring).

## User Preferences

Preferred communication style: Simple, everyday language.
Branding: ARYA is "Your Personal Thinking & Growth Assistant" — never refer to it as "AGI," "AGI-class," or just "chatbot." Avoid technical jargon in user-facing text. Tone should be warm, encouraging, personal — like a wise friend, not a corporate AI.
Bharatiya/Vedic/Sanskrit knowledge is the invisible core — ARYA draws from this wisdom naturally in responses, but these terms should NOT appear in user-facing UI labels, prompts, or navigation. The wisdom shows through the quality of advice, not through labels.

## System Architecture

The project is structured as a monorepo with a React frontend, an Express backend, and a shared module for schemas and types. It functions as a Progressive Web App (PWA).

### Frontend

-   **Framework:** React 18 with TypeScript.
-   **UI/UX:** shadcn/ui (New York style), Radix UI, Tailwind CSS v4 (light/bright theme: white backgrounds, gray text, cyan/amber/purple accents), Space Grotesk (headings), Inter (body), JetBrains Mono (code).
-   **PWA:** Installable on mobile, with manifest, service worker, and app icons.
-   **Key Pages:** Public conversational chat, user goals management, and admin-only dashboards for orchestrator, knowledge base, self-learning engine, neural link explorer, clinical processing, patient monitoring, API playground, and developer portal.
-   **User Authentication:** Name/email/phone/password signup, JWT-like session tokens (30-day TTL) stored in localStorage.
-   **Admin Authentication:** Password-based, in-memory session tokens.
-   **Notifications:** Bell icon for unread count and list of notifications.
-   **User Customization:** Users can set response length, conversation tone, focus areas, and wisdom/quotes preference.

### Backend

-   **Framework:** Express.js on Node.js with TypeScript.
-   **User Auth Service:** Handles signup (bcrypt hashing), login, session verification, and profile management.
-   **Core Components:**
    -   **Orchestrator:** Routes queries to knowledge domains based on intent and context.
    -   **Knowledge Retriever:** Fetches knowledge units from PostgreSQL.
    -   **Medical Engine:** Provides deterministic NLP parsing for clinical transcripts.
    -   **Self-Learning Engine:** Identifies knowledge gaps and auto-generates drafts.
    -   **Neural Link Engine:** Discovers cross-domain connections for insights.
    -   **Smart Commands:** Handles instant, local commands without AI API calls.
    -   **Goal Detection in Chat:** Detects goal-setting intent post-response via pattern matching and GPT-4.1-mini, auto-creating structured goals.
-   **AI Architecture:** Hybrid approach combining local processing for instant commands ("Alexa Mode"), deep reasoning with GPT-5.2 and RAG, and creative tasks using GPT.
-   **Smart Capabilities:** Persistent memory, goal and plan management, self-reflection via user feedback, proactive insights, and confidence scoring.
-   **Notifications System:** Generates notifications for welcome, goal creation, progress, streaks, and reminders.
-   **Database:** PostgreSQL with Drizzle ORM. Key tables include `arya_knowledge`, `arya_goals`, `arya_users`, `arya_notifications`, and tables for memory, usage, and caching.
-   **Multi-Tenancy:** Implemented via `tenant_id` and validation middleware.
-   **Learning Loop:** `ResponseCacheEngine` for golden response caching, similarity matching, and shadow-mode cache lookup to reduce LLM dependency.
-   **Usage & Cost Management:** Granular usage tracking, daily cost estimation, rate limiting, and cost cap enforcement. Beta mode with invite-only access and user caps.

## External Dependencies

-   **PostgreSQL:** Primary database.
-   **Sarvam.ai:** Used for Indian language Speech-to-Text (STT), Text-to-Speech (TTS), and Translation services.
-   **OpenAI (via Replit AI Integrations):** Provides LLM capabilities (gpt-5.2, gpt-4o-mini-transcribe) for conversational responses and voice transcription.
-   **Framer Motion:** Provides animated transitions — page transitions, panel slide-in/out, modal animations, chat message entrances, welcome screen staggered reveal, user menu dropdown, and mobile sidebar overlay fade.

### Recent Changes
-   **Quick Start Tutorial:** 7-step guided walkthrough for new users covering chat, voice, goals, memory, and customization. Auto-triggers after onboarding, accessible from user menu and welcome screen "Take a Tour" button. Completion persisted via API + localStorage.
-   **Feedback/Issue Reporting:** Users can report issues via "Report Issue" in user menu. Categories: bug, feature request, content quality, performance, other. Stored in `arya_user_feedback` table. Admin endpoints for listing and managing feedback.
-   **Theme Toggle (Light/Dark):** Users can switch between light and dark themes. ThemeProvider in `client/src/lib/theme.tsx` stores preference in localStorage. CSS variables swap via `[data-theme="dark"]` on `<html>`. Tailwind v4 `@custom-variant dark` enables `dark:` class prefix throughout. Toggle button available in chat header and admin sidebar. Logo wrapped in dark container since original image lacks true transparency.