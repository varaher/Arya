# Original ARYA: Mumbai migration preview

Base: `arya` commit `a1e24d763136b228b378163b3986ab9f25650c6c`, matching the original Replit workspace. This branch does not use the separately modified AI Studio app.

## First deployment

- Repository: `varaher/Arya`; branch: `migration/cloudrun-mumbai`.
- Cloud Run service: `arya`; project: `arya-493007`; region: `asia-south1`.
- Build using the root `Dockerfile` with repository root as context. Do not use automatic language detection: the repository contains both Node and Python files.
- Runtime identity: `arya-runtime@arya-493007.iam.gserviceaccount.com`.
- Cloud SQL attachment: `arya-493007:asia-south1:arya-production`.
- Require Cloud Run authentication for the initial deployment. Keep the Replit service, domain and webhooks running there until testing and final synchronization are complete.
- Use request-based billing and minimum instances `0` during preview. Set service maximum instances `1` initially to limit scaling; this is not a billing cap.

## Runtime configuration

The Docker image defaults `ARYA_MIGRATION_PREVIEW=true`. Keep that value during testing. It pauses scheduler startup, the legacy one-time payment reconciliation, outgoing push and welcome emails, calendar event creation, and payment mutation/webhook endpoints. Existing Replit behavior remains the default when the flag is absent.

Set these ordinary environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `ARYA_MIGRATION_PREVIEW` | `true` |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| `ALLOWED_ORIGINS` | Exact HTTPS origins allowed to use the app, separated by commas; initially the Cloud Run service URL |
| `APP_URL` | The HTTPS URL used for this preview; use the final domain after cutover |

The existing `REPLIT_DOMAINS` setting continues to work. `ALLOWED_ORIGINS` accepts complete origins and must not contain credentials or a wildcard.

Inject the following Secret Manager references as environment variables, pinned to version `1` after confirming their values:

| Environment variable | Secret |
| --- | --- |
| `DATABASE_URL` | `arya-database-url` |
| `SESSION_SECRET` | `arya-session-secret` |
| `ADMIN_PASSWORD` | `arya-admin-password` |
| `SARVAM_API_KEY` | `arya-sarvam-api-key` |
| `GOOGLE_CLIENT_ID` | `arya-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | `arya-google-client-secret` |
| `RAZORPAY_KEY_ID` | `arya-razorpay-key-id` |
| `RAZORPAY_KEY_SECRET` | `arya-razorpay-key-secret` |
| `RAZORPAY_WEBHOOK_SECRET` | `arya-razorpay-webhook-secret` |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | `arya-openai-api-key` |

The database URL must use the Cloud SQL Unix socket attachment, user `arya_app`, and database `arya`. The OpenAI secret must contain the owner's direct OpenAI API key. Do not reuse Replit-managed AI proxy credentials.

## Validation

From a clean checkout with Node 22:

```bash
npm ci --include=dev --no-audit --no-fund
npm run build
node script/test-cloudrun-preview.mjs
```

The test uses mocked infrastructure to verify startup effects, payment route guards, origin allowlisting, generic readiness errors and outbound write suppression. It makes no provider calls and uses no real credentials.

After deploying, test `/healthz` for process health and `/readyz` for a read-only database connection check. Neither endpoint reveals credentials or user data. Then check existing-user login, saved conversations, plan display, text chat and voice. Verify direct OpenAI model access, billing and Sarvam independently; storing a key does not prove inference access.

## Before production cutover

1. Recheck current production configuration values, including `BETA_MODE`, usage/cost limits, all six monthly/annual Razorpay plan IDs, Google Calendar callback URI and SMTP settings if email is enabled. Preserve existing plan prices and budgets.
2. Configure the test and final Google OAuth origins/redirects, and verify the original account IDs and password hashes remain unchanged. Retain the existing notification signing secret and stored VAPID key pair.
3. Inventory uploaded files outside PostgreSQL and move persistent content to suitable storage. Cloud Run's writable container filesystem is temporary.
4. Test the full container in Cloud Build. The local preparation environment has no Docker daemon and cannot validate the complete Docker image or a real Cloud SQL mount.
5. Arrange reliable background scheduling before enabling reminders. The current in-process timers do not provide reliable scheduling on a request-based service that scales to zero; multiple active instances can also duplicate work. Do not simply disable preview mode and assume scheduling is solved.
6. Pause live writes for the final database synchronization, retain a rollback backup, and verify counts and representative records against the production source. The initial restored dump from 2026-10-25 07:07:23 UTC is a snapshot, not a final synchronization.
7. Review the legacy startup payment reconciliation before re-enabling it. Coordinate the single domain/webhook destination and only then switch traffic and disable the old workers. Do not run both reminder schedulers against live subscriptions.

The lockfile changes only replace 56 Replit-internal tarball URLs with public npm registry URLs. Package versions and integrity hashes are unchanged. The container installs FFmpeg for the existing audio conversion code and starts the existing production bundle as an unprivileged user. Database dumps and environment files are excluded from both Git additions and the Docker build context.
