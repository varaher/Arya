---
name: Trial Budget System
description: Taper-up daily conversation/voice budget during 45-day trial — architecture decisions and gotchas
---

## Rule
Two completely separate layers for trial users:
1. **Feature access** — `getEffectivePlan(userId)` in `trial-notifications.ts`. Determines WHICH features are unlocked (Pro features during trial).
2. **Daily volume** — `checkTrialConversationBudget` / `checkTrialVoiceBudget` in `trial-budget.ts`. Determines HOW MANY conversations/voice minutes per day.

Never conflate them. A founding member gets all Pro features AND flat 20 conversations/day. A regular trial user gets Pro features AND a taper schedule.

## Taper Schedule
- Day  1-10:  5 conversations / 2 voice min per day
- Day 11-25: 12 conversations / 5 voice min per day
- Day 26-45: 20 conversations / 8 voice min per day
- Founding members: flat 20/day immediately (skip taper)

## Key Implementation Details
- `arya_trial_daily_usage` table: UNIQUE(user_id, usage_date), upserted via `onConflictDoUpdate`
- Budget checks go AFTER beta-guard and cost-budget checks in routes.ts, return 429 with `error: "trial_limit_reached"`
- `recordTrialUsage` is fire-and-forget AFTER `res.end()` — never block the stream
- `getTrialDay(trialStartedAt)` = floor(elapsed ms / msPerDay) + 1, minimum 1

## Plan-Status Mismatch Fix
- `GET /api/user/plan-status`: when user is on trial AND has a Razorpay subscription, return the paid plan (not "free")
- `GET /api/user/trial-status`: check `razorpaySubscriptionId` first for isPaidSubscriber (not just planExpiresAt)
- `PricingPage.tsx`: `currentPlan` must use `trialStatus?.effectivePlan` (not `user?.plan`) so paid trial users see their plan highlighted

**Why:** `arya_users.plan` stays "free" during trial even after subscribing, until activateUserPlan() fires. effectivePlan is computed at query time.
