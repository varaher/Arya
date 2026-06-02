---
name: Prana health profile
description: Google Health-style personal health coaching in PranaPage — DB columns, routes, and UI components added
---

## What was added

Four new columns on `arya_users` (added via ALTER TABLE + Drizzle schema):
- `height_cm` INTEGER
- `weight_kg` DECIMAL(5,1)
- `sex` VARCHAR(20)
- `activity_level` VARCHAR(20) DEFAULT 'moderate'

## New backend routes (server/routes.ts)

- `GET /api/user/health/profile` — returns profile fields from arya_users
- `PUT /api/user/health/profile` — updates height/weight/sex/activityLevel/age
- `POST /api/user/health/coach` — SSE streaming health coaching. Builds context from profile (BMI, BMR) + last 14 days of health readings. Uses gpt-4o-mini, max_tokens 450. Uses `x-user-token` header (NOT Authorization: Bearer).

## New frontend components (PranaPage.tsx)

- `ProfileSetupModal` — two-step bottom sheet: intro screen + form (height, weight, sex, activity level). Google Health "Tell us about yourself" style. Shown automatically if profile incomplete on first load.
- `PersonalizedStatsCard` — shows BMI (with category + color), daily calorie goal (TDEE via Mifflin-St Jeor × activity multiplier), step goal. Appears at top of DailyLog tab when profile exists.
- `CoachTab` — streaming ARYA health coaching chat. Has 6 quick-question chips, text input, and SSE reader pattern (same as other stream consumers in codebase).

## Tab system

PranaPage now has 4 tabs: Daily Log, Trends, ARYA Insights, Coach. Profile button in header top-right.

## Key rules applied

- All Prana routes use `x-user-token` header (NOT `Authorization: Bearer`)
- Health coaching never diagnoses; always "worth mentioning to your doctor" for concerning values
- BMR uses Mifflin-St Jeor equation (male: +5, female: -161, other: -78)
- Activity multipliers: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9

**Why:** User wanted Google Health / Fitbit-style onboarding (height, weight, sex) + ARYA as personal health coach replacing Gemini branding.
