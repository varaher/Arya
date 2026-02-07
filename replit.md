# ARYA Core - AI Orchestration Platform

## Overview

ARYA (Augmented Reasoning & Yielding Analytics) is a multi-tenant AI agent platform built for VARAH Group. It integrates four knowledge domains — Medical, Business, Sanskrit (Vedic), and Chanakya (Governance/Leadership) — into a unified orchestration engine. The platform powers multiple downstream products:

- **ERmate** — Clinical documentation copilot that parses transcripts into structured medical data
- **ErPrana** — Patient monitoring and risk assessment from symptoms + wearable data
- **NÉVARH** — (Referenced but not yet built out)
- **VARAH Corp** — Corporate/business intelligence

The system uses a balanced orchestrator that routes queries to the appropriate knowledge domain(s) based on app context, language detection, and keyword analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure

The project is organized as a monorepo with three main areas:

| Directory | Purpose |
|-----------|---------|
| `client/` | React frontend (Vite + TypeScript) |
| `server/` | Express backend API (the primary running server) |
| `shared/` | Shared schemas, types, and validation (Drizzle ORM + Zod) |
| `arya-core/` | Standalone ARYA engine package (separate from main server, has its own package.json — currently not the primary entry point) |

**Important:** The app runs from the root `server/index.ts` entry point, NOT from `arya-core/`. The `arya-core/` directory is a separate package with its own Express server, database layer, and API routes — it appears to be an earlier or parallel implementation. The main server at `server/` imports and uses its own copies of the orchestrator, knowledge retriever, and medical engine from `server/arya/`.

### Frontend

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite with HMR
- **Routing:** Wouter (lightweight client-side router)
- **State Management:** TanStack React Query for server state
- **UI Components:** shadcn/ui (New York style) built on Radix UI primitives
- **Styling:** Tailwind CSS v4 with custom dark theme (deep navy background, cyan primary, amber secondary)
- **Fonts:** Space Grotesk (headings), Inter (body), JetBrains Mono (code)
- **Animations:** Framer Motion for page transitions

**Key Pages:**
- `/` — Dashboard with system metrics
- `/orchestrator` — Interactive query routing visualization with weight sliders
- `/knowledge` — Knowledge base browser with domain filtering
- `/learning` — Self-Learning engine: query patterns, knowledge gap detection, draft review/approval
- `/neural-link` — Neural Link: cross-domain knowledge graph, synthesis, connection explorer
- `/ermate` — Clinical transcript processor
- `/erprana` — Patient vitals monitor with risk assessment
- `/api` — API playground for testing endpoints

### Backend

- **Framework:** Express.js on Node.js with TypeScript
- **Runtime:** tsx for development, esbuild for production builds
- **Module System:** ESM (`"type": "module"`)
- **HTTP Server:** Node's `createServer` wrapping Express (supports WebSocket upgrade)
- **Dev Mode:** Vite dev server middleware is injected into Express for HMR
- **Production:** Static files served from `dist/public`

**API Routes (prefixed with `/api`):**
- `GET /api/health` — Health check
- `POST /api/knowledge/query` — Multi-domain knowledge query with orchestrated routing (auto-triggers self-learning)
- `POST /api/ermate/auto_fill` — Clinical transcript → structured medical JSON
- `POST /api/erprana/risk_assess` — Symptom + vitals → risk assessment
- `GET /api/learning/stats` — Self-learning statistics (total queries, gaps, drafts)
- `GET /api/learning/drafts` — List auto-generated knowledge drafts
- `POST /api/learning/drafts/:id/approve` — Approve draft → promote to published knowledge
- `POST /api/learning/drafts/:id/reject` — Reject a draft
- `GET /api/learning/patterns` — Query pattern tracking (frequency, gaps)
- `POST /api/neural-link/compute` — Compute cross-domain neural links
- `GET /api/neural-link/graph` — Full network graph (nodes + edges)
- `GET /api/neural-link/unit/:unitId` — Get connections for a specific knowledge unit
- `POST /api/neural-link/synthesize` — Cross-domain synthesis from multiple domains

### Knowledge Engine Architecture

The four-domain knowledge engine works as follows:

1. **Orchestrator** (`server/arya/orchestrator.ts`) — Receives a query, analyzes intent/language/keywords, and assigns weighted routing across domains. App-specific boosting (e.g., ERmate boosts medical weight). Supports three modes: `single`, `dual`, `four_pillar`.

2. **Knowledge Retriever** (`server/arya/knowledge-retriever.ts`) — Fetches published knowledge units from PostgreSQL. Currently uses keyword-based scoring (topic match, content match, tag overlap). Designed to be upgraded to pgvector semantic search later.

3. **Medical Engine** (`server/arya/medical-engine.ts`) — Deterministic NLP parser for clinical transcripts (chief complaint extraction, medication parsing, differential diagnosis). Has hooks for future LLM integration.

4. **Self-Learning Engine** (`server/arya/learning-engine.ts`) — Tracks every query, detects knowledge gaps (low-confidence or zero results), and auto-generates knowledge drafts when repeated gaps are detected. Supports admin review workflow to approve/reject drafts and promote them to published knowledge.

5. **Neural Link Engine** (`server/arya/neural-link-engine.ts`) — Discovers cross-domain connections between knowledge units using tag overlap, keyword similarity, conceptual bridges (e.g., Ayurveda ↔ Modern Medicine), and complementary patterns. Stores weighted links in database. Supports cross-domain synthesis queries that combine insights from multiple domains.

### Database

- **Database:** PostgreSQL (required, connected via `DATABASE_URL` environment variable)
- **ORM:** Drizzle ORM with `drizzle-zod` for schema validation
- **Schema Location:** `shared/schema.ts` (canonical), with a parallel schema in `shared/arya-schema.ts`
- **Migration Tool:** `drizzle-kit push` (schema push approach, not file-based migrations)
- **Connection:** `pg` Pool in `server/db.ts`

**Key Tables:**
- `users` — Basic user auth (username/password)
- `arya_knowledge` — Published knowledge units (id, tenant_id, domain, topic, content, tags, language, source_type, source_title, status, version, rules)
- `arya_knowledge_drafts` — AI-generated knowledge drafts awaiting review (includes confidence_score, learned_from_query, status: pending/approved/rejected)
- `arya_query_patterns` — Self-learning query tracking (normalized_query, query_count, avg_confidence, is_gap, draft_generated)
- `arya_neural_links` — Cross-domain knowledge connections (from_unit_id, to_unit_id, link_score, link_type, evidence)
- `arya_audit_logs` — API interaction audit trail

**Storage Layer:** There's an in-memory storage implementation (`MemStorage`) in `server/storage.ts` for users. The knowledge base uses direct Drizzle queries against PostgreSQL.

### Multi-Tenancy

- Tenant isolation via `tenant_id` field on all knowledge records
- Default tenant: `varah`
- Tenant validation middleware exists in `arya-core/src/middleware/tenant.ts` (checks for `tenant_id` in body or `X-Tenant-ID` header)

### Build Process

- **Development:** `npm run dev` runs tsx watching `server/index.ts`, which sets up Vite middleware for the client
- **Production Build:** `npm run build` runs `script/build.ts` which:
  1. Builds client with Vite → `dist/public/`
  2. Builds server with esbuild → `dist/index.cjs` (bundles key deps, externalizes UI/dev deps)
- **Production Start:** `npm start` runs `node dist/index.cjs`

### Seed Data

- `server/seed.ts` — Seeds medical, business, and general knowledge units
- `server/seed-sanskrit.ts` — Seeds extensive Sanskrit/Vedic knowledge (Rigveda, Upanishads, etc.)
- `arya-core/src/db/seed.ts` — Parallel seed script for the standalone arya-core package

## External Dependencies

### Required Services

| Service | Purpose | Config |
|---------|---------|--------|
| **PostgreSQL** | Primary database for knowledge base, users, audit logs | `DATABASE_URL` env var |

### Future/Planned Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| **Sarvam.ai** | Voice transcription for Indian languages (WebSocket streaming) | Stub implemented in `arya-core/src/api/voice.ts`, needs `SARVAM_API_KEY` |
| **OpenAI** | LLM integration for knowledge processing | Listed in build allowlist, not yet integrated |
| **Google Generative AI** | Alternative LLM provider | Listed in build allowlist, not yet integrated |
| **Stripe** | Payment processing | Listed in build deps, not yet integrated |
| **Nodemailer** | Email sending | Listed in build deps, not yet integrated |

### Key NPM Packages

- **Server:** express, drizzle-orm, pg, zod, uuid, ws, cors
- **Client:** react, wouter, @tanstack/react-query, framer-motion, recharts, shadcn/ui (Radix primitives), tailwindcss
- **Shared:** drizzle-zod, zod
- **Dev:** vite, tsx, esbuild, typescript, drizzle-kit