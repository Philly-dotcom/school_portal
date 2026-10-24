# Foundation verification

## User-completed document checks — 20 October 2026

The user confirmed migration 021 is applied and marked 13 hosted document checks complete in DOCUMENTS.md. These cover bucket configuration, allowed uploads/downloads, denied draft access, role and guardian boundaries, file validation, transfers/revocations, assignment ending, withdrawal, interrupted-upload recovery and stale visibility saves. These are user-reported hosted results, not a new independent browser run by the agent.

The combined School B item was deliberately left open because School B is not registered. Its anonymous/public-access portion now has its own unchecked item so it can be recorded independently. No school or test records were created. The user restored the original PDF validation error; inspection shows no remaining diff in the document actions file.

The current working list is [DOCUMENTS.md — remaining Phase 3 checklist](../../../docs/DOCUMENTS.md#remaining-phase-3-checklist). It separates ready checks, known defects, deferred School B tests and dashboard development. Keep the completed document checks checked; older pending-document statements below are historical. The user also confirmed lint, TypeScript, 482 tests and build passed. No tests were rerun for this documentation-only update.

## Teacher, guardian and admin profiles — 20 October 2026

The other role overviews now show their requested profile fields. Guardians see their name, school and explicitly granted learners; selecting a learner is still required for daily records. Teachers see their name, reference, school and linked subjects grouped by year and date status. Admins see their saved profile name, authenticated email, school and existing school membership ID as their reference.

`npm run check` passed lint, TypeScript, 482 tests in 53 files, and the production build. The first run identified four overview call sites missing the new school-name prop; those were corrected before this passing run. Six new tests cover profile authorization, identity scoping, subject deduplication, errors and guardian selection. Routing tests mock the async profile panels while the profile suite tests their data and rendering.

Hosted browser checks for these additions remain pending. Use the existing teacher, guardian and admin accounts to compare the displayed details with their saved records. No database, RLS or configuration changes were made. The daily dashboard completion/redesign remains deferred until the pending tests are finished.

## Student profile and enrolments — 20 October 2026

The student overview now shows the linked name, reference and school, followed by enrolment cards with academic year, grade, class and dates. Current, Upcoming and Past labels use the school's timezone. Reads use the existing user's database context and RLS; no migration or hosted record was changed.

`npm run check` passed lint, TypeScript, all 476 tests in 52 files, and the production build. The five new tests cover identity/school scoping, unavailable or unlinked records, missing joins, local-date boundaries, transfer labels and history pagination. These are local checks, not hosted acceptance.

The browser tool could not initialize this session. Still check Overview while signed in as the existing student: confirm the profile and the 2026/2027 placements match the register, and that future placements remain labelled Upcoming. Phase 3 stays open.

## Admin follow-up checks — 19 October 2026

The attendance stale-save problem reproduced using two freshly loaded Admin tabs on the existing Acceptance 12A register for 19 October. The first tab saved ST-002 as Present. The second, older tab attempted Absent and stayed on “Saving…” for several minutes instead of displaying the expected conflict message. Its captured browser error/warning log was empty. After reloading the second tab, ST-002 was still Present, ST-003 Present and DEMO-ST-002 Unmarked. The newer value was preserved, but the conflict feedback check failed. [Pending-save evidence](../../../docs/attendance-stale-pending-20261019.png). This is a sequential two-tab test sharing one login, not an independent-session race test.

Source inspection found the expected version comparison and SQLSTATE 40001 in migration 018, and a corresponding user-facing error branch in the attendance server action. That does not establish where the hosted request stalled. Diagnose the request/response path before changing SQL or retry behaviour; no security policy or migration was changed to make the test pass.

Admin created **TEST ONLY — Phase 3 school notice**, ID `50fdadba-2218-4221-ba82-d417707d0aa4`, for the whole fictional school. Draft creation, publication, withdrawal and republication succeeded; reloads confirmed Withdrawn and then Published on the same record. The audience remained fixed and Draft was no longer offered after publication. [Final republication evidence](../../../docs/announcement-republished-20261019.png). No external notification was sent. Separate reader visibility at each transition and announcement stale-save checks remain open.

The browser remains signed in as Admin and the existing server was left running. No new students, schools, accounts or application code were created in this follow-up. Document publication/upload boundaries were not completed in this pass; the earlier allowed Admin download and denied role downloads remain the available evidence.

## Guardian browser checks — 19 October 2026

The user signed in as the existing Andiswa Besani account (GU-003). The initial workspace required explicit learner selection and offered only Mpoetsi (ST-003).

- After selecting Mpoetsi, attendance showed that learner's three recorded dates, matching the student session, without editing controls. The published test Geography homework was readable without submission or staff controls.
- Changing the attendance URL to the existing unrelated ST-002 ID returned an unavailable-workspace message and no attendance. [Denied unrelated learner evidence](../../../docs/guardian-unrelated-learner-denied-20261019.png).
- The Physics draft's direct download route returned “Document unavailable,” even with the correctly selected permitted learner.
- The timetable explained that no lessons were scheduled within the current placement. Actual lesson rendering remains untested because this fixture has no current-year lessons.
- Announcements required learner selection before showing a feed. After selection, the feed was empty; this does not prove a positive published-notice read.

Usability finding: clicking Announcements in the sidebar discarded the selected learner because its URL contained only `view=announcements`. The user had to select the learner again. The Documents sidebar link likewise omits the role/child parameters. This does not grant extra access, but the navigation should preserve the selected workspace and learner. No application code or database records were changed in this guardian session.

Still open: revoked grants, combined teacher/guardian accounts, cross-school and direct API checks, publication withdrawal/republication, transfers, Storage upload limits, stale saves and the dashboard integration work. These basic role-session passes do not complete Phase 3.

## Student browser checks — 19 October 2026

The user signed in with the existing ST-003 account. Its workspace resolved to Mpoetsi. Attendance displayed only that learner's recorded marks: Present on 19 October, Late on 15 October and Present on 14 October. The published test Geography homework was visible without editing or submission controls. [Learner homework evidence](../../../docs/student-homework-20261019.png).

The Documents feed showed no drafts or upload controls. Requesting the existing Physics draft download directly returned “Document unavailable.” Requesting the teacher attendance register through a changed URL returned an unavailable-view message, with no roster. These checks cover the portal and download route; forged writes and direct Supabase API requests remain separate checks.

## Teacher browser checks — 19 October 2026

The user signed in with the existing teacher account. The workspace resolved to Mrs Leruo (TE-003), and requesting `mode=school_admin` returned an unavailable-workspace message without Admin controls.

- The personal timetable correctly reported no lessons scheduled within the current assignment. No current-year lessons have been added to this fixture, so actual lesson rendering remains untested.
- Attendance search returned only Acceptance 12A (2026). The teacher saved ST-003 as Present for 19 October; reload confirmed persistence while the other two learners remained Unmarked.
- The 15 October register showed ST-003 as Late, with no editing controls and an explicit read-only explanation. A request for 30 September, before the assignment began, was denied; the selected class ID remained in the request. [Read-only history evidence](../../../docs/teacher-attendance-history-20261019.png).
- Homework assignment search returned only the current Geography assignment. The teacher published **TEST ONLY — Geography reading — 19 October**, due 23 October, ID `0fe154b2-35eb-4d1b-b1fd-25eb9455d9ee`. The item appeared as Published in the list. Reuse this item for learner visibility and publication lifecycle checks. [Published homework evidence](../../../docs/teacher-homework-published-20261019.png).
- The document list was empty for this teacher. Direct access to the existing Physics draft download returned “Document unavailable.” This is portal-route evidence, not a direct Storage API test.

Student and guardian checks, stale saves, transfer/assignment-ending scenarios, actual timetable lessons, document upload boundaries, direct API denials and hosted cross-school isolation remain open. No teacher session was impersonated and no permission policy was changed.

## Hosted Admin checks — 15 October; resumed 19 October 2026

With the user's approval, the existing 2026 year received one fictional class, Acceptance 12A (`11de7dc9-4a5e-477c-acec-370bcf311e48`), placements for existing ST-003, ST-002 and DEMO-ST-002, and a Geography assignment for existing TE-003. All run from 1 October through 26 November 2026. The existing 2027 placements and assignments were preserved. No school, person, login or guardian grant was created.

- **Passed through Admin UI and reload:** on 15 October, save two attendance marks while the third learner stays unmarked; update a mark; explicitly clear a mark. Final values: ST-003 Late, the other two Unmarked.
- **Passed through Admin UI and reload:** on 14 October, submission without a correction reason was blocked by browser validation. A reasoned save persisted ST-003 as Present. This does not independently prove a forged request is rejected or that its audit row is correct. [Historical register evidence](../../../docs/attendance-admin-history-20261015.png).
- **Passed:** Admin downloaded the existing Physics draft PDF (`0b6e73d4-c044-4469-af69-668108e172d9`) through the portal download route. This proves one allowed download, not the full Storage permission matrix or bucket limits.
- **Unresolved:** a stale attendance save in a second tab stayed on “Saving…” without displaying a conflict. A reload of the first tab retained its newer values. Do not count this as a successful stale-save or concurrent-session check.
- **Usability finding:** after enrollment saves, native selects reset while the selected-choice hint retained the old choice. A second submission needed explicit class reselection. No duplicate enrollment was created by that blocked submission.
- **Passed on 19 October:** the existing Admin session loaded the overview, and Sign out returned to the login page. Separate teacher/student/guardian verification is next.

No application code, migrations, RLS, email configuration or credentials were changed during these browser checks. No new automated suite result is claimed. The 13 October local suite remains the last recorded full check. Phase 3 is not complete.

## Attendance selection and empty-state messages — 13 October 2026

The full `npm run check` passed lint, TypeScript, **471 tests in 51 files**, and the production build. Fourteen new tests cover safe attendance diagnostics and timetable placement messages. No migration or permission changes were needed.

The production build was started temporarily on localhost. In the signed-in School Admin browser, choosing 12A (2027) and opening the register for 13 October 2026 kept **12A · 2027** selected and displayed the academic-year start date, 18 January 2027. The date restriction remained in force; no register was created or changed. [Browser evidence](../../../docs/attendance-future-year-20261013.png).

Student, guardian and teacher messages have local automated coverage, but their separate authenticated browser checks remain open. No current-year operational fixture was added. These results do not close Phase 3 acceptance, hosted school-isolation/concurrency checks or Storage verification. The academic-data repair from 9 October was not rerun.

## Private PDF documents — 8 October 2026

You confirmed applying migration 020 and approved the standalone Documents library rules. Migration **021 is prepared locally and pending application**. No hosted bucket, file or database record was changed by this development work.

The full `npm run check` passed lint, TypeScript, **457 tests in 49 files**, and production build, including the new authenticated download route. Documents add 43 tests: 22 SQL/Storage-policy tests and 21 action/rendering tests. They cover school and class access, current enrollment, guardian grants, denied guessed paths, overwrite/deletion denial even with unrelated permissive policies, file validation, partial upload failures, hash mismatches, stale saves and audit rollback.

PGlite tests use a minimal Storage metadata fixture, now shared by the existing full-migration suites. These results do not verify the real Storage HTTP service, bucket MIME/size enforcement or signed URL behaviour. A focused rendering run hit the known sandbox temporary-module issue; the rerun and full check outside the sandbox passed. DOCUMENTS.md lists the required hosted checks and upload-recovery steps.

No existing migrations, temporary Phase 3 guide, email settings or environment values were changed. No browser checks, deployment or live sends were performed. The user's earlier report of halfway-complete browser checks remains separate from these local results.

## Announcements — 8 October 2026

The full `npm run check` passed lint, TypeScript, **414 tests in 46 files**, and the production build. Announcements add 43 tests for publishing authority, current-class readers after transfers, explicit guardian grants, teacher/guardian mode separation, ended assignments, denied cross-school reads and writes, direct-write denial, stale versions, audit rollback, pagination and escaped messages. Server tests also check that a missing class selection cannot accidentally become a school-wide notice.

The initial focused database/rendering run passed 28 tests. A type error in a new test helper was corrected before the successful full check. The first full run encountered missing Vitest temporary modules inside the sandbox; rerunning outside the sandbox passed. No test configuration or application permissions were relaxed to make the checks pass.

Migration **020 is prepared locally and pending application**. Migrations through 019 remain user-confirmed applied. The user reports browser checks about halfway complete with everything checked so far working, but has not supplied a complete per-scenario result list. No hosted writes, browser checks, email sends or deployment were performed during this increment. ANNOUNCEMENTS.md has the new browser checklist; the temporary Phase 3 guide was left unchanged.

## Homework running and remaining tests underway — 8 October 2026

You confirmed that migration 019 ran and homework is functional. Migrations through 019 are now confirmed applied by you. You are still running the remaining tests; no detailed role, transfer, revoked-access or concurrency results have been reported yet.

The first role check exposed a missing setup step: only the Admin login existed. We explained how to prepare separate fictional logins, accept school memberships, link the register records and grant guardian access without enabling email delivery. Account setup and role-test completion are still awaiting your confirmation.

This update only changes documentation and saves the progress checkpoint. No application code, migrations, hosted settings or test records were changed, and no tests were rerun. The earlier 371-test local result remains the latest recorded full run. The entry below describes the state before your migration confirmation.

## Phase 3 through homework — 8 October 2026

The full local `npm run check` passed lint, TypeScript, **371 tests in 43 files**, and production build. The 58 focused homework tests also passed. They cover draft invisibility, direct publication, withdrawal/republication, original-date recipients after transfers, ended teaching responsibility, revoked access, two fictional schools, denied direct writes, stale versions, audit rollback, bounded search/paging and escaped text without learner submission controls.

Earlier Phase 3 checks passed with 253 tests after role workspaces/timetable and 313 after attendance. Attendance's final whitespace-only correction-reason check was also rerun successfully in its 29-test SQL suite. A sandbox temporary-file problem affected an initial attendance test attempt; successful test runs used the normal execution environment. These are local results, not hosted concurrency or browser acceptance.

The user confirmed 016, then 017 and 018 applied. Migration **019 is new and pending**. No hosted migration, data write, browser session, email or deployment was performed during the homework implementation. The user plans to do the outstanding checks after homework; RESUME.md lists them. Older entries below retain their historical status at the time they were written.

## Timetable assignment search — 5 October 2026

The final full `npm run check` passed: lint, TypeScript, **218 tests in 32 files**, and production build.

Timetable filters and lesson forms now search assignments without preloading capped catalogs. Migration 015 application is user-confirmed; new migration 016 has not been applied to hosted Supabase. Browser checks remain on hold.

The targeted register SQL suite passed all 14 tests, including 502 synthetic assignments, matching by related names/reference, date bounds, literal search text and denied school/role/anonymous access. During development, the new tests exposed fixture-ordering, date representation and SQL alias errors in the test code; these were corrected. Cleanup now preserves the original SQL error. The large embedded-SQL test has a 60-second timeout instead of the default five seconds. This is capacity correctness coverage, not a hosted latency benchmark.

No hosted data, existing migrations, save-time clash rules, email or deployment settings were changed.

## Sign-in account search — 5 October 2026

`npm run check` passed lint, TypeScript, **212 tests in 31 files** and production build. New tests cover trusted school context, malformed input, safe errors, retained current-link payload and SQL eligibility across 532 fictional memberships, including off-page ownership, role/status filtering, verified-email visibility and denied anonymous/non-admin/cross-school searches. Register tests now expect account search to remain available above 500 records and resolve current inactive links by ID.

Migration 015 adds a read-only eligibility search. It has not been applied to hosted Supabase. Existing migrations and link-save rules are unchanged. No browser checks, hosted writes, email, deployment or cloud changes were performed. Browser checks are on hold at the user's request. Timetable search is the next development item.

## Register relationship and enrollment searches — 5 October 2026

`npm run check` passed lint, TypeScript, **206 tests in 30 files**, and production build. Eight additional tests check student/guardian choices past 500, same-school/same-year transfer results, current-class exclusion, malformed filter rejection, form search parameters, confirmation/version fields and read-only closed history. Existing register tests now expect relationship/enrollment forms to remain available above their former reference limits. The first full check caught a leftover type in a test mock; it was removed and the complete check reran successfully.

No hosted writes, browser checks, migrations, enrollment mutations, account-link rules or permission policies changed. The user is doing the browser checks. Include guardian linking, initial enrollment date bounds, transfer search in the correct year, switching to withdrawal, and retained selections when paging. Sign-in account linking and timetable selectors still retain their existing capacity guards.

## Academic and teaching searchable selectors — 5 October 2026

`npm run check` passed lint, TypeScript, **198 tests in 29 files**, and production build. Fourteen new tests cover non-admin/inactive-context denial, invalid/forged input, bounded choices beyond 500, school-scoped class details, replacement exclusions, safe errors and initial required-selector markup. Literal percent/underscore/backslash search patterns were checked with local PostgreSQL. Existing academic/teaching pagination tests now verify that the converted forms remain available above the former reference cap.

The user said they will perform browser checks. Interactive search, retained selection while paging, class/date propagation and actual saves have not been independently verified in this increment. No hosted records, migrations, email settings or cloud resources were changed. The existing grade-helper wording and invitation example edits were preserved. Register/account-linking and timetable selectors retain their capacity guards for now.

## Teaching and timetable pagination — 4 October 2026

`npm run check` passed lint, TypeScript, **184 tests in 28 files**, and production build. Twelve new tests cover assignment/lesson records beyond 500, school-scoped reads, assignment filtering before the page range, filter-preserving links, malformed filters, partial-schedule wording, off-limit labels, retained history/removal controls, selector capacity boundaries and safe failures. The timetable is rendered with mocked reads and actions; no hosted records are inserted.

No migrations, scheduling mutations, conflict checks or permission rules changed. No connected-browser verification, emails or deployment were performed. The pre-existing development paths in `next-env.d.ts` were restored after the production build rewrote that generated file. Existing user edits and all migrations were preserved. Searchable selectors and connected page/filter verification remain Phase 2 work.

## Register pagination — 4 October 2026

`npm run check` passed lint, TypeScript, **172 tests in 27 files**, and production build. The 11 new register tests cover people and histories beyond 500, complete off-page choices, membership links owned by off-page people, related labels beyond reference limits, exact/over-limit capacity behavior, empty-page navigation and safe read/RPC failures. The academic tests also pass after extracting the shared page helper. A final focused rerun passed all 18 pagination tests after narrowing year/grade label lookups to visible enrollments.

These are local tests with synthetic mocked register reads. No connected-browser check, hosted writes, emails or migrations were performed. Existing SQL security tests still pass; mocked school filters do not constitute new hosted RLS verification. Searchable selectors remain unfinished, so this is list/history pagination rather than unrestricted large-school readiness.

## Phase 2 continuation — 4 October 2026

The user confirmed applying migration 014 and then completing all pending tests with fictional records. Development is proceeding on that confirmation. No detailed per-scenario results accompanied it, so this is recorded as user-reported completion rather than independently observed role/session/concurrency evidence. Email delivery remains disabled and unverified.

Academic setup now pages each of its five lists separately. New local tests cover records past the old 500-row cutoff, stable ordering and school filters, independent form choices and labels, capacity guards, empty pages, invalid URL parameters and safe query failures. No hosted data or migrations were changed for this increment. Connected browser verification of the new page controls remains separate.

`npm run check` passed: lint, TypeScript, **161 tests across 26 files**, and production build. No email, hosted mutation, deployment or browser verification was performed in this increment. The existing user edits to grade guidance and invitation example copy were preserved.

The dated entries below retain their original migration/testing status as history; 014 is no longer pending application.

## Teaching-assignment lifecycle — 4 October 2026

Local migration 014 and the admin end/replace workflow passed `npm run check`: lint, TypeScript, **154 tests across 25 files**, and production build. Migrations 001–013 were not changed. The new migration has not been applied to Supabase and no hosted record was changed.

The SQL tests upgrade existing assignments/lessons from 013, then exercise retained history, end-date inclusivity, stale/closed changes, current and future teacher roster access, non-overlapping periods, cross-school/non-admin denial, direct-update/delete denial, timetable date protection and rollback when replacement or audit fails. Action tests cover verified school ownership, confirmation, malformed input and safe error messages. The existing final-schema security tests run with 014 too.

The first focused run found a fixture parameter-type error and date-check ordering that reported overlap before rejecting reversed dates. Both were corrected; focused checks and the complete suite then passed. Hosted independent-session concurrency, browser submissions and role-session verification remain pending. No automatic lesson handover or broad assignment-correction feature is claimed. See TEACHING_ASSIGNMENTS.md for application steps and the timetable constraint.

## Post-formatting verification — 4 October 2026

Fresh `npm run check` passed lint, TypeScript, all 143 tests in 24 files and the production build. Running E2E with `SCHOOL_PORTAL_E2E_PRODUCTION=true` passed all six browser tests, with none skipped, including the production CSP/nonce check. No application changes were needed for the formatting or skip investigation.

The known Windows shutdown issue recurred after all six tests passed. The verified test-server process on port 3001 was stopped, after which Playwright exited successfully with `6 passed` and exit code 0. The user's separate development server was not stopped. Automatic E2E teardown remains maintenance work; test assertions passed, but unattended local shutdown is not yet reliable.

These results support continuing Phase 2. Hosted role/isolation, mutation/concurrency and email readiness checks remain open; this was a disconnected browser run, not a new hosted verification pass.

## Environment and file cleanup — 4 October 2026

`npm run check` passed lint, TypeScript, 143 tests across 24 files and production build. Two tests of an unused permission helper were removed with that helper; the active admin-helper test was moved to permissions.test.ts. Database boundary tests remain. The archived repair script's regression tests passed using its new path.

All 13 migrations are byte-for-byte unchanged against pre-cleanup hashes. `.env.local` is unchanged, ignored and untracked; the template now matches its six app variable names without copying values. The archive moves preserved file hashes. Relative links in 27 documentation files resolve. No hosted data/configuration, email or account changes were made; no new hosted verification was performed for this cleanup. See CLEANUP.md and ENVIRONMENT.md.

## Migration 013 application — 4 October 2026

The user confirms migration 013 ran in the dedicated Supabase project. It is no longer pending application. The investigation below records what happened before that confirmation; its hosted-error warning is historical.

Connected browser checks after that confirmation, using the existing School Admin session:

| View | Observed result |
| --- | --- |
| Overview | Verified School Admin dashboard loaded. |
| Academic setup | Existing structure and create/edit controls loaded. |
| School registers | Three students, three teachers, three guardians, three family links and three enrollments displayed. The unavailable error was absent, including after a full page reload. |
| Teaching assignments | Three existing assignments and the creation form loaded. |
| Timetable | Four existing weekly lessons displayed across Monday and Tuesday. |
| People & access | One active School Admin, zero invitations, recent audit activity and the email-disabled message displayed. |
| School settings | School name and Africa/Johannesburg timezone loaded. |

This confirms the register-loading regression is resolved in the connected app. It does not independently inspect every deployed function or policy. The guardian relationships displayed child access as not granted. No save, role change, grant, deletion, email send or hosted SQL was performed during this pass. The running server was left alone.

Still open: correction/transfer/withdrawal and timetable conflict/removal saves, stale forms and concurrent sessions, sign-out/recovery, and real-session denied reads/writes for other roles and a second fictional school. The current school lists only the admin; separate test logins are needed for the role checks. Existing records have future 2027 dates, so tests of current teacher access must deliberately account for those dates.

The documentation was updated, with each maintained file described across FILE_GUIDE.md, docs/README.md and tests/README.md. Local documentation links and inventory coverage were checked. Application code, tests and SQL were not edited in this documentation pass. The earlier 145-test result below was not rerun for these Markdown-only changes; the user plans to run checks too.

## Connected register-query investigation — 2026-10-04

Validation completed October 4: `npm run check` passed lint, TypeScript, **145 tests across 24 files**, and the production build. This validates the local correction, not its hosted application.

Read-only browser checks on October 3 loaded the signed-in admin dashboard, People & access and Academic setup. School registers showed its generic unavailable message. One active School Admin and zero invitations were visible; no hosted writes or email sends were performed. This is limited smoke evidence, not hosted RLS/workflow completion.

Local reproduction with `auth.users.email varchar(255)` produced SQLSTATE 42804 in migration 010's `list_linkable_members`, whose fifth result column is declared text. Supabase's [Auth schema](https://github.com/supabase/postgres/blob/develop/migrations/schema-17.sql) uses character varying(255). Previous local fixtures used text and masked the incompatibility. Migration 013 adds an explicit text cast without changing the signature, access boundaries or stored data. The deployed SQL error was not captured, so resolution of the hosted screen remains unverified until 013 is applied and the page reloaded.

The populated upgrade test checks the failure at 012 and successful reads plus non-admin/cross-school denial after 013. Membership-link tests cover verified versus unverified emails. No separate teacher/student/guardian sessions were available for hosted verification.

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
