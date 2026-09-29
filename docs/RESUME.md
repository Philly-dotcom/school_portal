# School Portal — resume checkpoint

Saved 2026-09-30 at the user's explicit request to pause and continue later.

## Start here next time

Work only in `C:\Users\moses\Documents\School_portal`. Read `AGENTS.md`, this checkpoint and `docs/ACCOUNT_MANAGEMENT.md` before changing anything. Keep all code, credentials, schema and decisions isolated from other projects. Earlier planning-only instructions were superseded by the user's explicit authorization to build Phase 1; work is now paused until the user resumes.

## Product decisions

- One school first; school-aware data ownership and permission boundaries from the beginning. Multi-school SaaS administration is postponed.
- Roles: School Admin, Teacher, Student, Parent/Guardian; multiple roles per membership.
- An authorized person reviews marks; School Admin publishes results. Whether the admin may also review is not yet settled.
- Homework is view-only for learners; no learner submissions.
- PDF documents only initially. Exact upload permissions need confirmation before that module.
- Broader notification channels are undecided. Custom SMTP has not been configured for authentication emails.

## Implemented locally

- Next.js/TypeScript/Tailwind responsive shell, public static preview, login, protected dashboard and school settings.
- First migration: schools, profiles, memberships, roles, RLS and audit events.
- Second increment: People & access UI; role/status edits with stale-form detection; last-active-admin protection; suspension/reactivation; audit details.
- Invitation preparation, revocation and confirmed-email acceptance with expiry and issuer checks.
- Recovery, token confirmation and password-setting screens.
- Isolated Supabase invitation sender at `supabase/functions/invite-school-user`. Privileged Auth credentials stay in the Supabase runtime, never in the Next.js app.

## What is actually connected

- The user completed the initial dedicated Supabase setup and reported successful School Admin login, dashboard and settings access.
- Read-only checks confirmed backend connectivity, denied anonymous database reads, and a signed-out dashboard redirect to login.
- Public sign-ups were independently rechecked and confirmed disabled on 2026-09-30.
- `.env.local` contains local configuration. Do not print, copy into documentation, commit or request secret values.

## Immediate next step

The user was asked to apply `supabase/migrations/202609300002_account_management.sql` once in the dedicated project's SQL editor. **No confirmation that this second migration was applied has been received.** Check that status before retrying it; do not rerun the first migration.

Then verify People & access against hosted Supabase with synthetic accounts. The page currently explains the missing update if its RPCs/tables are unavailable.

## Still not activated or verified

- Hosted account-management migration and its full RPC/RLS integration checks.
- Deployment and Deno-runtime verification of `invite-school-user`.
- SMTP provider, sender/domain verification, email templates, Site URL and redirect allowlist.
- Actual invitation inbox delivery, recovery lifecycle and session-revocation behaviour.
- Admin MFA, monitoring, backups/restore and production readiness.

Email features default to disabled until explicitly configured. See `docs/ACCOUNT_MANAGEMENT.md` for exact steps and templates. No real emails were sent and no hosted schema or external configuration was changed by the account-management implementation.

## Latest validation

`npm run check` passed: lint, TypeScript, 42 tests across seven files and production build. Five Playwright browser tests passed, including 1440/390/320px layouts, recovery gating and invalid links. The recovery screen was visually inspected at 320px.

The actual migrations were tested in embedded PostgreSQL with fictional schools. Email/action tests use mocks. These do not replace hosted end-to-end tests. Windows browser-test teardown needed manual cleanup of only the test run's own Node processes.

## Running locally

The production server was started at `http://127.0.0.1:3000` before this pause; do not assume it remains running when resuming. No server was stopped as part of saving this checkpoint.

For development, run `npm run dev` from this workspace. For the production preview, run `npm run build` then `npm run start`. Check for an existing server/port before starting another process, and only stop processes verified to belong to this project.

Useful pages: `/login`, `/dashboard?view=people`, `/forgot-password`, `/preview`.

The latest workspace inspection found no Git repository. Progress is saved in local files, not a Git commit or remote backup. No commit, push, deployment or scheduled continuation was performed.

## Supporting references

- `docs/ACCOUNT_MANAGEMENT.md`: activation steps, SMTP, templates and function deployment.
- `docs/VERIFICATION.md`: evidence and explicit testing limits.
- `docs/ROADMAP.md`: remaining Phase 1 work; Phase 2 has not started.
- `docs/PROJECT_CONTEXT.md` and `docs/ARCHITECTURE.md`: decisions and architecture.

On resume, verify current state rather than assuming an email service, migration or deployment was completed while paused. Finish the account-management activation and validation before declaring Phase 1 complete.
