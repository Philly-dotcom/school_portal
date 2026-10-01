# School Portal — resume checkpoint

Active development resumed on 2026-10-01 after user testing and record corrections. The latest status below supersedes historical pause notes.

## Start here next time

Work only in `C:\Users\moses\Documents\School_portal`. Read `AGENTS.md`, this checkpoint and relevant setup guides before changing anything. Keep all code, credentials, schema and decisions isolated from other projects. The user resumed development and authorized Phase 2 without email. No hosted test success should be inferred from migration application alone.

## Product decisions

- One school first; school-aware data ownership and permission boundaries from the beginning. Multi-school SaaS administration is postponed.
- Roles: School Admin, Teacher, Student, Parent/Guardian; multiple roles per membership.
- An authorized person reviews marks; School Admin publishes results. Whether the admin may also review is not yet settled.
- Homework is view-only for learners; no learner submissions.
- PDF documents only initially. Exact upload permissions need confirmation before that module.
- Broader notification channels are undecided. Resend SMTP settings are saved (user-reported), but the user owns no registered domain. Email remains disabled and delivery unverified.

## Implemented locally

- Academic years, terms, grades, subjects and classes, with specific form labels and examples.
- Student, teacher and guardian registers; guardian links; initial dated class enrollment.
- Teaching assignments connecting teacher records, subjects and year-specific classes with dates, RLS and audit.
- These Phase 2 modules support creation/listing. Editing, transfers, replacement periods, pagination and timetables remain pending.

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

2026-10-01 latest: user deferred reviewing the synthetic dataset and explicitly asked to move on. Enrollment lifecycle is implemented locally in migration 009: admin transfers/withdrawals, retained history, overlap checks, optimistic versions and atomic audit. Read `docs/ENROLLMENT_LIFECYCLE.md`. Migration 009 is not applied remotely. No demo records were transferred or withdrawn. Latest `npm run check` passed lint, TypeScript, 90 tests / 17 files and production build. Keep user review pending; next work is hosted lifecycle/security verification and remaining Phase 2 pagination/assignment lifecycle support.

The synthetic data-entry task independently exercised hosted-backed admin creates for academic/register/guardian/enrollment/teaching records and four timetable lessons, retained after refresh; see `docs/SYNTHETIC_DATA.md`. Timetable creation is confirmed available, superseding the historical 008 status below. Full hosted isolation, concurrency and removal checks remain pending. Existing year 2027 spans through 2030 and needs separate review. Email stays off. The local server was already running for this task and was not restarted or stopped.

Latest increment: weekly timetable foundation is local in migration 008, with an admin planning view, assignment filter, dated weekday lessons, teacher/class clash checks, deliberate recurring-lesson removal and audit. See `docs/TIMETABLE.md`. The user reports completing migration 007 and requested returning to Phase 2 development. Migration 008 has not been applied remotely. Hosted timetable/browser/RLS and concurrent-save checks remain pending. Email remains disabled. The next development areas after timetable validation include pagination/imports and enrollment/assignment lifecycle support before broader daily operations.

Latest increment: name/reference corrections are local in migration 007 with UI editors, school-admin RPC checks, duplicate protection, optimistic record versions and audit metadata. Read `docs/RECORD_CORRECTIONS.md`. The user accepted the Grade 10 repair preview and asked to continue after receiving commit/006 instructions; actual committed cleanup and 006 application were not independently verified. Apply 007 only after those prerequisites are complete. Latest check: lint, TypeScript, 79 tests / 15 files and production build passed. Hosted editor tests remain pending; email remains disabled.

User screenshots confirmed duplicate Grade 10 variants, one class each: valid 10A/2027 with one enrollment and one assignment, and a mistaken class/year named “Thapelo” with zero of either. User confirmed the latter entries were mistakes. A guarded, rollback-by-default repair is prepared at `supabase/repairs/review_grade10_typo.sql`; see `docs/GRADE10_REPAIR.md`. Local tests passed; hosted preview, approval, committed cleanup and migration 006 remain pending. Do not delete or merge records outside that reviewed scope.

2026-10-01: user resumed to report tested academic/register/teaching forms and review save logs plus Grade10 / Grade 10 duplicates. The supplied Next.js action trace shows previous-state arguments, not the returned save result. Grade input normalization and migration 006 are now local; see `docs/GRADE_NAME_FIX.md`. Run the read-only duplicate preflight before migration 006; existing hosted grade variants have not been merged or removed. Await exact hosted outcomes before claiming verification. This supersedes the earlier pause below.

The user is now testing and will report back. Do not continue development or start a server until requested. Migration 004 is user-reported applied; School registers had not yet been tested at that report. Migration 005 application has not been confirmed. Do not rerun migrations 001–004. Record actual test outcomes when supplied, then prioritize fixes before the next feature increment.

Latest local increment: **Teaching assignments** connects teacher records to subjects and year-specific classes, with dates inside the academic year. Migration `202610010005_teaching_assignments.sql` is local only; see `docs/TEACHING_ASSIGNMENTS.md` before activation. Corrections, assignment changes and timetables remain future work.

Latest decision: the user authorized continuing Phase 2 without email. Resend SMTP settings are saved (user-reported), but the user owns no registered domain. Both local email flags are explicitly false. Domain purchase, delivery setup and email tests are deferred, not completed.

The user reported migration 003 applied and viewed the academic forms; specific labels and examples were added at their request. The user also reported migration 004 applied, but has not tested School registers. Student/teacher/guardian creation, guardian links and initial enrollment are implemented locally. Read `docs/SCHOOL_REGISTERS.md` for the creation-only limits. No real learner data or user-created test records are needed for continued local development.

On resume, the user confirmed that `supabase/migrations/202609300002_account_management.sql` ran successfully and People & access lists their administrator. This is user-reported hosted verification, not an independently exercised write/RLS test. Do not rerun either migration.

After the user resumes, arrange hosted checks with synthetic accounts before real use. Email setup remains postponed until a registered domain and delivery configuration are ready. Do not rerun migrations reported applied.

## Still not activated or verified

- Hosted account-management, register and teaching workflow/RLS integration checks; migration 005 activation.
- Deployment and Deno-runtime verification of `invite-school-user`.
- SMTP provider, sender/domain verification, email templates, Site URL and redirect allowlist.
- Actual invitation inbox delivery, recovery lifecycle and session-revocation behaviour.
- Admin MFA, monitoring, backups/restore and production readiness.

Email features default to disabled until explicitly configured. See `docs/ACCOUNT_MANAGEMENT.md` for exact steps and templates. No real emails were sent and no hosted schema or external configuration was changed by the account-management implementation.

## Latest validation

Latest `npm run check` passed: lint, TypeScript, 65 tests across twelve files and production build. See `docs/VERIFICATION.md`. The earlier five Playwright tests covered foundation layouts and recovery, not the new signed-in academic, register or teaching workflows.

The actual migrations were tested in embedded PostgreSQL with fictional schools. Email/action tests use mocks. These do not replace hosted end-to-end tests. Windows browser-test teardown needed manual cleanup of only the test run's own Node processes.

## Running locally

The local Next.js development server and its verified School Portal workers were stopped at the user's request. A follow-up process check found zero School Portal Node processes and no listeners on ports 3000 or 3001. The user will restart it themselves for testing; do not automatically restart it.

For development, run `npm run dev` from this workspace. For the production preview, run `npm run build` then `npm run start`. Check for an existing server/port before starting another process, and only stop processes verified to belong to this project.

Useful pages: `/login`, `/dashboard?view=people`, `/dashboard?view=academic`, `/dashboard?view=registers`, `/dashboard?view=teaching`, `/forgot-password`, `/preview`.

On resume, a Git repository is present and its tracked files were initially clean. Only `supabase/.temp/` was untracked. No commit, push, deployment or scheduled continuation was performed by this resume work; remote backup status was not checked.

## Supporting references

- `docs/ACCOUNT_MANAGEMENT.md`: activation steps, SMTP, templates and function deployment.
- `docs/VERIFICATION.md`: evidence and explicit testing limits.
- `docs/ROADMAP.md`: remaining Phase 1 readiness and Phase 2 development.
- `docs/ACADEMIC_SETUP.md`, `docs/SCHOOL_REGISTERS.md`, `docs/TEACHING_ASSIGNMENTS.md`: activation steps and test workflows.
- `docs/PROJECT_CONTEXT.md` and `docs/ARCHITECTURE.md`: decisions and architecture.

On resume, verify current state rather than assuming an email service, migration or deployment was completed while paused. Finish the account-management activation and validation before declaring Phase 1 complete.
