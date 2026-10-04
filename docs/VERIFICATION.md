# Foundation verification

## Enrollment lifecycle — 2026-10-01

`npm run check` passed lint, TypeScript, 90 tests across 17 files and production build. Migration 009 ran in embedded PostgreSQL: transfer/withdrawal history, overlap protection, stale forms, invalid/cross-school/cross-year destinations, re-entry, permission denials, audit and atomic rollback tested. Server-action validation/authorization tests passed. Hosted migration 009, UI workflows and independent concurrent sessions remain unverified; see `ENROLLMENT_LIFECYCLE.md`.

Earlier this session, fictional data creation through the signed-in local app independently verified hosted admin academic/register/link/enrollment/teaching/timetable saves and timetable persistence after refresh. User review remains deferred. See `SYNTHETIC_DATA.md`; these successes do not establish hosted RLS denial or concurrency coverage. Email remains disabled.

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
## Resume update

The user confirmed that the account-management migration was applied and People & access lists their administrator. Hosted role/status writes, audit effects and cross-school access checks remain unverified. The user later clarified that no domain is registered; Resend SMTP settings are saved but delivery is unverified. Email is deferred by user decision and both local flags are false. No email was sent.

## Phase 2 academic structure increment

`npm run check` passed: ESLint, TypeScript, 51 tests across nine files and the production build. The new migration was executed together with the two earlier migrations in embedded PostgreSQL. Tests cover academic creation/audit, cross-school and teacher read/write denial, composite ownership references, dates/duplicates, suspension, inactive schools and anonymous access. Server-action tests cover authorization, forged school IDs, invalid input and database errors.

At that checkpoint migration 003 had not been applied to hosted Supabase. The user subsequently reported activation and viewing the academic forms. This was user-reported, not an agent-driven signed-in browser check. Next.js regenerated its type-reference file during the build.

## Phase 2 school registers increment

`npm run check` passed: lint, TypeScript, 60 tests across eleven files and production build. The new migration was executed after all previous migrations in embedded PostgreSQL. Two populated fictional schools prove read isolation in both directions. Tests check denied writes with permission error codes, teacher/guardian/student/outsider restrictions, suspension/inactive-school/anonymous denial, cross-school references, class/year matching, enrollment dates, duplicates, audit actors and no Auth account creation. Action tests verify trusted school context, discarded injected identity fields, validation and safe errors.

Creation/listing of students, teachers and guardians, guardian links and initial class enrollment are local. The user subsequently reported migration 004 applied, but explicitly has not tested School registers. Hosted RLS checks and signed-in browser validation remain pending. No emails, cloud resources, commits or deployments were made by this increment.

## Phase 2 teaching assignments increment

`npm run check` passed: lint, TypeScript, 65 tests across twelve files and production build. Migration 005 was executed after migrations 001–004 in embedded PostgreSQL. Tests cover both schools' read isolation, permission-denied writes, non-admin and suspended/inactive/anonymous access, cross-school teacher/subject/class references, date limits, duplicate assignment rejection, co-teaching and audit actors. Action tests cover verified ownership, forged fields, invalid selections/dates and safe error messages.

Teaching assignment creation/listing is local only. Migration 005 has not been applied to hosted Supabase. No new signed-in browser or hosted RLS verification was performed; existing tests do not prove hosted behavior. Email remains disabled. Editing, ending/replacing assignments, timetable scheduling, pagination and account-to-record links remain outstanding.

## Grade name normalization and save-log review — 2026-10-01

The user supplied a Next.js action trace showing previous-state arguments, not a returned save result. The available local development log did not contain this trace, and no app terminal was attached; VS Code terminal access was not available. Hosted save success still needs confirmation by persistence after refresh.

Local npm run check passed: lint, TypeScript, 69 tests across 13 files and production build. New tests cover grade normalization, unchanged custom/subject labels, success versus initial action state, SQL duplicate rejection within a school, cross-school isolation, and safe migration rollback preserving existing grade/class references when collisions exist. No hosted data was changed. Migration 006 is local and requires the read-only duplicate preflight before activation; no existing duplicates were merged or deleted.

## Record corrections — 2026-10-01

npm run check passed: lint, TypeScript, 79 tests across 15 files and production build. Migration 007 adds versioned label/reference corrections via a narrow admin RPC. SQL tests cover all eight supported record types, same-school scope, stale version rejection, direct-write denial, grade/reference duplicate rejection, relationship preservation, non-PII audit metadata and suspended/inactive/anonymous/non-admin denial. Action tests cover verified context, normalized names, forwarded versions and safe errors.

No hosted SQL was executed. Migration 007 activation and browser validation remain pending. The user's approval to continue after the repair preview is not independent verification that the committed repair or migration 006 succeeded.

## Weekly timetable foundation — 2026-10-01

npm run check passed: lint, TypeScript, 85 tests across 16 files and production build. Embedded PostgreSQL tests execute migration 008 and verify adjacent lessons, teacher clashes across classes, class clashes across teachers, exact weekday recurrence overlap, invalid/no-occurrence date ranges, different weekdays, school-isolated reads, non-admin/suspended/inactive/anonymous mutation denial, direct-write denial, removal audit and preservation of enrollments/assignments. Action tests cover trusted school context, input conversion/validation, conflict messages and explicit removal confirmation.

Migration 007 is now user-reported applied. Migration 008 remains local only. No hosted SQL, browser workflow test or independent concurrent database-session test was performed by this increment. Timetable mutation RPCs serialize school writes; this needs hosted concurrent-save validation. Email remains disabled.


## 2026-10-02 — pre-migration repair validation

Read `REPAIR_REPORT.md` for the current complete evidence and staging checklist. Corrected migrations 010–012 remain local; 001–009 are unchanged. Final-schema fixtures cover dated access, stale links, explicit guardian grants, bounded delivery retries and owner-only scoped cleanup. A populated pre-010 database is upgraded in migration order. Production browser checks pass with a disconnected backend; no hosted acceptance, SMTP delivery, or real multi-session concurrency result is implied.

All six production browser tests passed with no retries. Windows teardown required stopping the identified test server; the runner then exited successfully and port 3001 was closed. Full dependency audit reported zero vulnerabilities. The heuristic working-tree secret scan found no matching secrets. No emails, cloud changes, migrations, deployment or pushes were performed.

Final `npm run check`: lint, TypeScript, all 144 tests across 24 files, and production build passed. Tests are fictional/local; hosted staging checks remain pending.


## 2026-10-03 — architecture consistency cleanup

Updated the current roadmap and corrected stale setup/access descriptions in the README and teaching guide/UI. Moved guardian grant input validation to the existing validation module without changing its rules. Replaced the account-management row cast with the exact register-login RPC response type, reusing the shared Role type. No migration, permission rule, hosted state or phase scope changed in this cleanup. Existing repair changes remain pending in the working tree.

Local `npm run check` passed: lint, TypeScript, all 144 tests across 24 files and the production build. Browser and hosted checks were not repeated for this documentation/type/validation-location cleanup; prior browser results remain historical evidence.
