# Verification status

## November 2026 — Phase 4 verification

### 6 November 2026 — School A assessment checks

Separate Admin and Teacher sessions verified stale saves, reviewer revocation and correction access. A scoped audit lookup verified the retained approvals and invalidations. All 21 anonymous API probes returned permission denied. Authenticated API probes, simultaneous decision races and larger-roster checks remain open. School B was skipped. See the [assessment checklist](ASSESSMENTS.md) for the fixture and results. The review-detail UI passed TypeScript and 13 assessment panel tests. The last recorded full local check was on 4 November (683 tests and production build). Migrations through 030 are confirmed applied. See the individual checklist entries for hosted coverage.

The November entries below describe evidence available at each checkpoint. Later School A observations are recorded above.

### 4 November 2026 — Disputed approval invalidation

The full local check passed ESLint, TypeScript, 683 tests in 60 files and the production build. New cases cover Admin invalidation without reviewer authority, reason validation, retained approval evidence, fresh submission/review, stale and duplicate requests, cross-school/role/anonymous denial and rollback when the audit write fails. The targeted assessment database run also passed all 114 cases.

The first full run failed to load temporary transformed modules from the sandbox directory, reporting ENOENT before tests in 50 suites could run. The same full command passed outside the sandbox. No application or test configuration changes were made for that runner failure.

Migration 029 is user-confirmed applied. Migration 030 is user-confirmed applied. The [hosted checks](ASSESSMENTS.md) remain open. At this checkpoint the independent-session races and browser checks had not been run. The Subject Workspace idea is on hold. Numerical reporting-policy rules, policy approval/adoption and publication remain pending.

### 4 November 2026 — Reporting policy draft setup

The full local check passed ESLint, TypeScript, 668 tests in 60 files and the production build. Policy cases cover retained versions, safe repeated creates, unchanged saves, stale forms, fixed scope, future-year planning, school/date validation, pagination and denied reads/writes from other roles, anonymous sessions and the second synthetic school. Action and panel tests cover trusted school context and Admin workspace navigation.

Migration 029 was subsequently confirmed applied by the user. Hosted/browser tests remain unchecked in [ASSESSMENTS.md](ASSESSMENTS.md). The school policy is still being gathered. This slice records drafts and source notes only. Supported configuration, policy approval, adoption into a newly reviewed package and publication remain pending.

### 4 November 2026 — Complete submissions and reviewer decisions

The full local check passed ESLint, TypeScript, 640 tests in 60 files and the production build. New cases cover complete snapshots, Missing on another page, explicit self-review, return reasons, stale submissions and decisions, invalidation after mark and scale changes, retained approvals after later grant revocation, historical submission access and anonymous/other-school denial. Server-action and navigation tests check trusted school context, role boundaries and mixed Guardian context.

Migration 027 is confirmed applied. Migration 028 is user-confirmed applied. The PostgreSQL assertions ran through PGlite. Independent concurrent sessions, real hosted API permissions and signed-in browser behaviour remain unchecked for this slice. Use the [assessment checklist](ASSESSMENTS.md) with existing fictional records. Publication and approved reporting-policy binding remain future work.

### 4 November 2026 — Assessment reviewer grants

The full local check passed ESLint, TypeScript, 618 tests in 60 files and the production build. The reviewer tests cover explicit self-review authority, staff eligibility, term and school boundaries, overlapping dates, expiry, revocation and denied draft access. Migrations 026 and 027 were subsequently confirmed applied. Signed-in checks remain pending. See the [assessment checklist](ASSESSMENTS.md).

### 4 November 2026 — Frozen date and scale amendments

The full local check passed ESLint, TypeScript, 607 tests in 60 files and the production build. Twelve new database cases cover dated roster changes, old mark and definition history, scale-only amendments, incompatible precision and bounds, role and school isolation, empty rosters, required reasons and stale previews across pages. Migration 026 was subsequently confirmed applied. The signed-in browser checks remain pending in [ASSESSMENTS.md](ASSESSMENTS.md).

### Phase 4.2 — Historical teacher access and save feedback

The full local check passed ESLint, TypeScript, 595 tests in 60 files and the production build. Disposable SQL tests cover whole-assessment and single-learner access, atomic rejection of mixed batches, revocation, expiry, loss of teacher role/link and unauthorised issuance. Action tests cover explicit conflicts, an unclassified edit failure with a newer saved version and a mark save with an unknown outcome. Migration 025 is confirmed applied. Outstanding hosted acceptance, including the updated mark-conflict path, is tracked in [ASSESSMENTS.md](ASSESSMENTS.md).

### 3 November 2026 — Admin amendments to frozen draft rosters

ESLint, TypeScript, all 580 tests in 60 files and the production build passed locally, including seven new database cases for migration 024. They cover removing and restoring a learner, retaining earlier marks, updating a placement while keeping its score, requiring a reason, rejecting stale previews and denying preview and apply to unauthorised callers. The tester confirmed 023 was applied to Supabase. Migration 024 was subsequently applied. Hosted amendment checks remain on the assessment checklist.

### 3 November 2026 — Frozen rosters and draft marks

The full local check passed ESLint, TypeScript, all 573 tests in 60 files and the production build. The database tests apply migration 023 to a disposable database. They exercise a 26-learner roster, a placement change after freeze, partial saves, score validation, rollback, stale revisions, locked definitions and access denial for learners, guardians and staff from another school. The tester confirmed hosted migration 023. Browser checks remain pending in [ASSESSMENTS.md](ASSESSMENTS.md).

### 3 November 2026 — Admin authorisation from the assessment list

35 focused tests passed across assessment actions, database rules and the rendered list. TypeScript passed. The tests cover the pending scale button, staff access, saving the stored values and rejecting stale versions. The tester has marked migration 022, Admin assessment creation and Teacher proposal creation complete. The tester subsequently confirmed authorisation. Remaining hosted checks are recorded in [ASSESSMENTS.md](ASSESSMENTS.md).


## October 2026 — historical evidence

Phase 3 was signed off on 27 October. The dated entries below retain earlier results and gaps as they stood then. See the [signed checklist](DOCUMENTS.md#phase-3-sign-off---27-october-2026) for closure.

### Academic-term search regression - 30 October 2026

All 19 assessment database tests passed in a focused run after adding blank/matching/unmatched term-search and empty-year coverage. This is separate from the earlier full 553-test pass. A later blank search returned Term 4 for the selected 2026 assignment. No application code, migration or hosted record was changed.

### Assessment setup - 30 October 2026

A fresh `npm.cmd run check` completed successfully: ESLint, TypeScript, **553 tests in 59 files**, and the Next.js production build. This includes migration 022 in disposable local SQL tests and the new staff navigation test. The earlier sandbox run failed to load generated temporary SSR modules (ENOENT); the fresh outside-sandbox run passed without weakening any tests. The previous retry session was unavailable after the interruption, so its result was not assumed.

Migration 022 was subsequently applied. The [assessment checklist](ASSESSMENTS.md) records individual hosted outcomes. The 30 October run established local coverage only.


### Planning documentation - 29 October 2026

The Phase 4 decision record and plan have been reconciled, including the permission matrix and workflow rules. Documentation links, UTF-8 readability and whitespace were checked. The follow-on data design reviewed local migrations, access helpers, download handling and SQL test patterns; its P4-D01–P4-D17 matrix is planned, not executed. No application tests, build, browser checks or hosted database operations were run for this documentation-only work. The recorded 524-test/build pass below remains the last full validation, not a fresh check of today's checkout. Phase 4 implementation has not begun.

### Phase 3 signed off - 27 October 2026

The user confirmed final Phase 3 sign-off and completed the REVIEW-01/02 browser checks. Phase 3 is complete. Phase 4 had not started at this checkpoint. The last full local validation remains the 26 October pass: ESLint, TypeScript, 524 tests in 57 files and production build; it was not rerun for this documentation update. Earlier pending-sign-off statements below describe prior checkpoints and are superseded. Production launch readiness remains separate.

### 26 October checkpoint

The user reports all remaining hosted/browser checks completed and has checked them in DOCUMENTS.md, including School B isolation, Guardian layout and UI/performance checks. No agent hosted rerun was performed and no timing figures were supplied.

Their npm run check passed lint and TypeScript, then stopped with 511 tests passed and one 5-second timeout in record-search.test.ts. The timed test includes PGlite startup, queries and shutdown; its local timeout is now 60 seconds, matching database setup hooks elsewhere. All assertions remain intact. The fresh npm run check passed ESLint, TypeScript, all 512 tests in 56 files and the production build on 26 October.

REVIEW-01 and REVIEW-02 are now implemented and locally verified. Teacher/Student identity stays in the dropdown; an explicit, non-prefetched profile link opens the existing subject/history component on demand. Student Overview still loads its enrolment summary. Admin links, pagination and timetable filters carry mode=school_admin; multi-role users following a mode-less legacy management URL get the workspace chooser. The full check passed ESLint, TypeScript, 524 tests in 57 files and production build. Phase 4 had not started at this checkpoint. Earlier outstanding browser lists below are historical; the follow-up and final sign-off are recorded in DOCUMENTS.md.


Updated 25 October 2026. Local checks, user-reported hosted results and agent browser observations are separate evidence.

### 25 October — local result

**npm run check passed ESLint, TypeScript, 512 tests in 56 files and production build on 25 October 2026.** This covers the shared profile/workspace-choice implementation and the Guardian overview fixes. Presentation assertions were updated for the new heading; two regression tests cover missing learner access and explicit learner selection.

Earlier passes of 490, 504, 507 and 509 tests belong to earlier revisions. They are retained in the [October dashboard verification](../archive/README.md#october-dashboard-verification). The initial decision not to run checks was superseded when the user requested and authorised the full run.

This command does not run Playwright or hosted acceptance. PGlite tests execute SQL with fictional identities; they do not establish real gateway tokens, Storage HTTP access or independent hosted sessions. A successful build does not prove browser usability or production speed.

### 25 October — hosted and browser evidence

| Area | Recorded result | Boundary |
| --- | --- | --- |
| Migrations | Through 021 user-confirmed applied | Do not reapply; application alone does not prove permission behaviour. |
| P3-01 through P3-30 | User marked complete | Preserve passes for the versions tested; new navigation needs targeted regression checks. |
| Documents | Original 13 checks and DOC-ANON user-reported passed | DOC-B was open on 25 October. |
| Teacher/Guardian navigation | Agent observed role isolation, explicit learner selection and preserved links on 24 October | Predates the new profile-menu switching flow. |
| Admin/Student dashboards | Agent observed Admin counts and links; Student current 2026 placement, upcoming 2027 history and permitted timetable | Rendering checks, not an independent audit of all totals or populated cards. |
| Admin sidebar/header | Agent observed grouping, profile fields and Academic setup navigation on 25 October | Predates standardising the menu across all roles. |
| Academic date repair | Approved repair applied and checked on 9 October | Retained IDs/history; archived SQL must not be rerun as setup. |
| School B isolation | School B was unavailable on 25 October | Setup and all hosted cross-school testing belong to the user. |

### 25–26 October — checks pending at the time

- Latest chooser and profile dropdown in all four independent role sessions, including combined roles, learner reselection, revocation and sign-out.
- Populated daily cards, PDF links, count comparisons, pagination warnings and future/current date boundaries.
- Phone/wide desktop layouts, keyboard access, long names, loading feedback and error/retry context.
- Warm production-mode timing; no end-to-end baseline has been established.
- DOC-B/P3-31/P3-32 and P3-33–P3-35 closure; explicit Phase 3 sign-off.
- REVIEW-01/02 were fixed on 26 October; the earlier lightweight review did not implement them. DOCUMENTS.md records the later post-fix checks.

The earlier mocked loader measurement reduced context/actor/profile operations from 17 to 6, excluding the proxy. The current dashboard adds feed reads, and the shared profile menu loads history on module pages. Do not quote that measurement as the current whole-page request count or a hosted speed improvement.

The old attendance stale-save and selection failures have user-reported passing regressions. Reopen them only if reproduced. The reported data-mbtss-nonce hydration warning was not found in app source; browser injection was suspected, but a clean-browser reproduction result has not been recorded.

### 25 October — tracker and earlier evidence

The Phase 3 checklist is in [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist). The detailed [pre-20 October history](../archive/2026-10/docs/VERIFICATION_THROUGH_20261020.md) and [October dashboard verification](../archive/README.md#october-dashboard-verification) remain available.

The 25 October documentation reconciliation changed documentation only. It does not add browser evidence or close hosted tests. Phase 3 was still open at this checkpoint; email, recovery, backups, monitoring, deployment and real-school readiness remain separate gates.

### Guardian overview follow-up — 25 October 2026

The updated Guardian design now keeps the learner picker and selected learner details in one panel. Accounts with no approved learner access get a clear explanation and a prompt to contact School Admin, rather than an unusable selection instruction. Accounts with linked learners still need to select one explicitly. The existing queries, role checks and RLS are unchanged.

The 10 profile tests passed, including new empty-access and selected-learner cases. The full npm run check also passed ESLint, TypeScript, all 512 tests and the production build. Desktop/mobile browser review of this layout was outstanding on 25 October; Phase 3 was still open at this checkpoint.

### REVIEW-01/02 browser follow-up - 26 October

Teacher identity and on-demand subjects passed in the existing combined Teacher/Guardian session. Switching back to Guardian required explicit learner selection. Student identity/history passed, with current 2026 and upcoming 2027 labels and the existing overview summary retained. Admin sidebar/quick links and timetable filter/clear-filter retained explicit Admin mode. No school records or configuration were changed. Pagination and multi-role Admin legacy-link behaviour passed automated tests; those two scenarios were not repeated in a hosted browser session. The full local check passed 524 tests in 57 files, lint, TypeScript and production build. Both review fixes are implemented; final sign-off followed on 27 October.
