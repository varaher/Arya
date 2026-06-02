---
name: Drishya Architecture
description: How the Drishya — Stories segment is built; knowledge domain, routes, DB table, navigation.
---

# Drishya Architecture

## Knowledge Core
- Domain: `'stories'` — added to `DomainSchema` in `shared/schema.ts`
- 16 records seeded in `arya_knowledge` via `scripts/seed-drishya-knowledge.sql`
- Records cover: Vedas/Upanishads, character archetypes, Mahabharata, Ramayana, Panchatantra, Jataka, Kalidasa, Tagore, Premchand, MT Vasudevan Nair, OV Vijayan, Basheer, Navarasa, Natyashastra 5-act arc, Regional voices
- Sources NEVER cited in user-facing output — invisible knowledge core

## Backend
- Service: `server/arya/drishya.ts` — `generateDrishyaStory(world, request, language)` async generator
- Uses GPT-4o, temp 0.9, retrieves domain='stories' knowledge from DB
- System prompt: NEVER cite sources, choose one of 9 rasas, end with a quiet question in italics
- Routes in `server/routes.ts` (before `return httpServer`):
  - `POST /api/drishya/story` — SSE streaming (optionalUser)
  - `POST /api/drishya/stories/save` — save story (requireUser)
  - `GET /api/drishya/stories` — list saved stories (requireUser)
  - `DELETE /api/drishya/stories/:id` — delete (requireUser)

## Database
- Table: `arya_drishya_stories` — created via raw SQL (also defined in `shared/schema.ts`)
- Columns: id, user_id, tenant_id, world (night/film/everyday), request, story, language, created_at

## Frontend
- Page: `client/src/pages/DrishyaPage.tsx` — dark cinematic UI, inline styles, no Tailwind classes
- Three worlds: 🌙 Night (indigo), 🎬 Film (crimson), ✨ Everyday (amber)
- SSE streaming with ReadableStream fetch pattern (same as AryaChat)
- Route: `/drishya` in `client/src/App.tsx`

## Navigation
- MoreTray: First item in `mainFeatures` (Clapperboard icon, purple #a78bfa)
- AryaChat user menu: After Prana button, "✦ Drishya — Stories"
- NOT in BottomNav (5 items already at limit) — accessible via MoreTray + user menu

**Why:** Sources invisible per project rule — philosopher/text names never shown to users. Knowledge is the river; users feel the water.
