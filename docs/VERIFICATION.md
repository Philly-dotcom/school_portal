# Foundation verification

## Account-management increment — 2026-09-30

- Supabase Auth settings were rechecked read-only and returned `disable_signup: true`. The earlier public-signup finding below is resolved.
- The user confirmed custom SMTP is not configured. Email features remain gated off; no messages were sent.
- `npm run check` passed: lint, TypeScript, 42 tests across seven files, and production build.
- `npm run test:e2e`: five browser tests passed, including recovery gating, invalid confirmation links, unsigned password/acceptance access, and 1440/390/320px layouts. Windows test-server cleanup again required stopping only this run's Node processes.
- The 320px recovery screenshot was visually inspected.
- The actual new migration was executed in embedded PostgreSQL, testing role/status edits, last-admin protection, stale forms, denied cross-school operations, invitation rate limits, verified-email acceptance, expiry/revocation, suspended-member protection, issuer revocation, delivery claims, grants and audit details.
- Mocked server-action/function tests verify fixed redirects, authenticated password updates, generic recovery responses, administrator-only dispatch, provider failures and no automatic resend. They do not send email or replace hosted integration tests.

Not applied or live-verified: migration `202609300002_account_management.sql`, Supabase invitation function deployment/Deno runtime, SMTP/templates, hosted account-management RPCs, invitation inbox delivery, recovery lifecycle and actual session-revocation behaviour. Activate these using ACCOUNT_MANAGEMENT.md. No hosted schema or external configuration was changed during this increment.

## Connection checkpoint — 2026-09-30

The user reported completing the dedicated Supabase setup and confirmed that the School Admin can sign in and open both dashboard and school settings.

Independent, read-only checks confirmed:
- Local URL, publishable-key type and school-UUID format are valid. No credentials or identifiers were printed.
- The configured Supabase Auth settings endpoint returned HTTP 200.
- An anonymous schools query returned HTTP 401 / PostgreSQL code 42501 (permission denied).
- The running local login page recognizes configuration, and the signed-out dashboard redirects to /login.

Outstanding finding: the Auth settings endpoint reported `disable_signup: false`. Public sign-ups must be disabled to match school-provisioned accounts. No external configuration was changed during these checks.

Scope limits: admin login/dashboard/settings success is user-reported, not an agent-driven browser test. School-setting writes/audit events, sign-out/session refresh, membership suspension, hosted cross-school access boundaries, email, Storage and deployment remain unverified. An anonymous denial does not prove the full migration or every RLS policy is correct.

## Initial local milestone — 2026-09-29

## Completed locally

- `npm run check`: passed. ESLint, TypeScript, 12 permission/database tests and a production build completed successfully.
- `npm run test:e2e`: 4 browser tests passed in Microsoft Edge. Test-server shutdown required manually stopping only this run's verified Node processes on Windows; the runner then exited successfully.
- Browser coverage: preview links, unknown-view fallback, disabled unconfigured login, no settings action exposed by the unconfigured protected route, and viewport overflow checks at 1440, 390 and 320 pixels.
- Desktop and 390px mobile overview screenshots were visually inspected.
- Dependency installation reported zero known vulnerabilities at installation time.
- Explicit project-root configuration prevents Next.js from selecting an unrelated parent-directory lockfile.

## Database evidence

The actual migration was executed inside embedded PostgreSQL with simulated Auth users and two fictional schools. Tests cover tenant reads, own-membership access, allowed school-admin edits, denied cross-school edits, denied teacher edits, denied role escalation and audit modification, cross-school foreign-key rejection, suspended memberships, inactive schools and anonymous access.

## Not verified or complete

- No Supabase cloud project was created or contacted by the app tests.
- No live login, cookie refresh, password recovery, invitation, SMTP, Storage, or production deployment was tested.
- Only foundation database tables exist. No learner, attendance, marks, finance, file-upload or notification runtime is implemented.
- The public preview describes future modules; it does not claim they are working features.

This is a local Phase 1 increment, not a production readiness approval.
