# ARYA Core - AI Orchestration Platform

## Overview

ARYA (Augmented Reasoning & Yielding Analytics) is a multi-tenant AI agent platform designed for the VARAH Group. Its core purpose is to unify and orchestrate AI capabilities across four critical knowledge domains: Medical, Business, Sanskrit (Vedic), and Chanakya (Governance/Leadership). This platform serves as the foundation for several downstream products, including ERmate (clinical documentation copilot) and ErPrana (patient monitoring and risk assessment). ARYA's vision is to provide a comprehensive, intelligent system capable of nuanced understanding and actionable insights across diverse, complex domains, leveraging a balanced orchestrator for intelligent query routing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The project is structured as a monorepo with a React frontend, an Express backend, and a shared module for schemas and types. The application runs from the root `server/index.ts` entry point.

### Frontend

-   **Framework:** React 18 with TypeScript
-   **UI/UX:** shadcn/ui (New York style) based on Radix UI, Tailwind CSS v4 for styling (dark theme: deep navy, cyan, amber), Space Grotesk (headings), Inter (body), JetBrains Mono (code).
-   **Key Pages:**
    -   `/`: Public conversational chat with ARYA (text and voice input, streaming AI responses with RAG).
    -   Admin-only pages for dashboard, orchestrator visualization, knowledge base management, self-learning engine, neural link explorer, ERmate processing, ErPrana monitoring, API playground, and developer portal.
-   **Authentication:** Password-based admin authentication with in-memory session tokens.

### Backend

-   **Framework:** Express.js on Node.js with TypeScript
-   **Core Components:**
    -   **Orchestrator:** Routes queries to appropriate knowledge domains based on intent, language, keywords, and app context. Supports single, dual, or four-pillar domain weighting.
    -   **Knowledge Retriever:** Fetches knowledge units from PostgreSQL using keyword-based scoring, with future plans for semantic search.
    -   **Medical Engine:** Provides deterministic NLP parsing for clinical transcripts.
    -   **Self-Learning Engine:** Tracks queries, identifies knowledge gaps, and auto-generates knowledge drafts for admin review.
    -   **Neural Link Engine:** Discovers and stores cross-domain connections between knowledge units for synthesis and insights.
    -   **Smart Commands:** Handles instant, local commands (time, date, math) without AI API calls for rapid responses.
-   **AI Architecture:** Hybrid approach combining:
    -   **Alexa Mode (Instant):** Local processing for quick commands.
    -   **Gemini Mode (Deep Reasoning):** Uses GPT-5.2 with RAG for complex analysis.
    -   **GPT Mode (Creative):** Leverages GPT for creative tasks.
-   **AGI Capabilities:**
    -   **Persistent Memory:** Extracts and remembers facts, preferences, and context from conversations using GPT-4.1-mini.
    -   **Goal & Plan Manager:** Breaks down complex tasks into prioritized, trackable steps.
    -   **Self-Reflection & Feedback:** Incorporates user feedback (thumbs up/down) to refine responses and memory.
    -   **Proactive Insights:** Analyzes patterns and gaps to generate unprompted insights.
    -   **Confidence & Uncertainty:** Provides confidence scores for responses, explicitly stating uncertainty when knowledge is low.
-   **Database:** PostgreSQL with Drizzle ORM for schema definition and migrations.
    -   Key tables include `arya_knowledge`, `arya_knowledge_drafts`, `arya_query_patterns`, `arya_neural_links`, `arya_memory`, `arya_goals`, and `arya_feedback`.
-   **Multi-Tenancy:** Achieved via `tenant_id` on all knowledge records and validation middleware.

## External Dependencies

-   **PostgreSQL:** Primary database for all persistent data.
-   **Sarvam.ai:** Used for Indian language Speech-to-Text (STT), Text-to-Speech (TTS), and Translation services.
-   **OpenAI (via Replit AI Integrations):** Provides LLM capabilities for conversational responses and voice transcription (gpt-5.2, gpt-4o-mini-transcribe).