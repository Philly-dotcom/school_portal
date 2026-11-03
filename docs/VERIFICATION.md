# Verification status

## 3 November 2026 — Frozen rosters and draft marks

The full local check passed ESLint, TypeScript, all 573 tests in 60 files and the production build. The database tests apply migration 023 to a disposable database. They exercise a 26-learner roster, a placement change after freeze, partial saves, score validation, rollback, stale revisions, locked definitions and access denial for learners, guardians and staff from another school. Hosted migration 023 and browser checks remain pending in [ASSESSMENTS.md](ASSESSMENTS.md).

## 3 November 2026 — Admin authorisation from the assessment list

35 focused tests passed across assessment actions, database rules and the rendered list. TypeScript passed. The tests cover the pending scale button, staff access, saving the stored values and rejecting stale versions. The tester has marked migration 022, Admin assessment creation and Teacher proposal creation complete. The tester subsequently confirmed authorisation. Remaining hosted checks are recorded in [ASSESSMENTS.md](ASSESSMENTS.md).


## Academic-term search regression - 30 October 2026

All 19 assessment database tests passed in a focused run after adding blank/matching/unmatched term-search and empty-year coverage. This is separate from the earlier full 553-test pass. The reported hosted 2026 term links remain unverified; browser tools failed to initialise. No application code, migration or hosted record was changed.

## Assessment setup - 30 October 2026

A fresh `npm.cmd run check` completed successfully: ESLint, TypeScript, **553 tests in 59 files**, and the Next.js production build. This includes migration 022 in disposable local SQL tests and the new staff navigation test. The earlier sandbox run failed to load generated temporary SSR modules (ENOENT); the fresh outside-sandbox run passed without weakening any tests. The previous retry session was unavailable after the interruption, so its result was not assumed.

Migration 022 has not been applied to hosted Supabase by the agent. No hosted accounts, assessments or other fixtures were created. Browser forms, independent-session stale saves and direct hosted RLS/API checks remain unchecked in [ASSESSMENTS.md](ASSESSMENTS.md). Phase 4.1 is locally implemented and validated; Phase 4 is not complete. Earlier dated results below remain historical evidence.


## Planning documentation - 29 October 2026

The Phase 4 decision record and plan have been reconciled, including the permission matrix and workflow rules. Documentation links, UTF-8 readability and whitespace were checked. The follow-on data design reviewed local migrations, access helpers, download handling and SQL test patterns; its P4-D01–P4-D17 matrix is planned, not executed. No application tests, build, browser checks or hosted database operations were run for this documentation-only work. The recorded 524-test/build pass below remains the last full validation, not a fresh check of today's checkout. Phase 4 implementation has not begun.

## Phase 3 signed off - 27 October 2026

The user confirmed final Phase 3 sign-off and completed the REVIEW-01/02 browser checks. Phase 3 is complete. Phase 4 has not started. The last full local validation remains the 26 October pass: ESLint, TypeScript, 524 tests in 57 files and production build; it was not rerun for this documentation update. Earlier pending-sign-off statements below describe prior checkpoints and are superseded. Production launch readiness remains separate.

## 26 October checkpoint

The user reports all remaining hosted/browser checks completed and has checked them in DOCUMENTS.md, including School B isolation, Guardian layout and UI/performance checks. No agent hosted rerun was performed and no timing figures were supplied.

Their npm run check passed lint and TypeScript, then stopped with 511 tests passed and one 5-second timeout in record-search.test.ts. The timed test includes PGlite startup, queries and shutdown; its local timeout is now 60 seconds, matching database setup hooks elsewhere. All assertions remain intact. The fresh npm run check passed ESLint, TypeScript, all 512 tests in 56 files and the production build on 26 October.

REVIEW-01 and REVIEW-02 are now implemented and locally verified. Teacher/Student identity stays in the dropdown; an explicit, non-prefetched profile link opens the existing subject/history component on demand. Student Overview still loads its enrolment summary. Admin links, pagination and timetable filters carry mode=school_admin; multi-role users following a mode-less legacy management URL get the workspace chooser. The full check passed ESLint, TypeScript, 524 tests in 57 files and production build. Phase 4 has not started. Earlier outstanding browser lists below are historical; use DOCUMENTS.md for the remaining targeted follow-up and final sign-off.


Updated 25 October 2026. Local checks, user-reported hosted results and agent browser observations are separate evidence.

## Latest local result

**npm run check passed ESLint, TypeScript, 512 tests in 56 files and production build on 25 October 2026.** This covers the shared profile/workspace-choice implementation and the Guardian overview fixes. Presentation assertions were updated for the new heading; two regression tests cover missing learner access and explicit learner selection.

Earlier passes of 490, 504, 507 and 509 tests belong to earlier revisions. They are retained in the [previous verification notes](../archive/2026-10/docs-before-20261025-reconciliation/docs/VERIFICATION.md). The initial decision not to run checks was superseded when the user requested and authorised the full run.

This command does not run Playwright or hosted acceptance. PGlite tests execute SQL with fictional identities; they do not establish real gateway tokens, Storage HTTP access or independent hosted sessions. A successful build does not prove browser usability or production speed.

## Hosted and browser evidence

| Area | Recorded result | Boundary |
| --- | --- | --- |
| Migrations | Through 021 user-confirmed applied | Do not reapply; application alone does not prove permission behavior. |
| P3-01 through P3-30 | User marked complete | Preserve passes for the versions tested; new navigation needs targeted regression checks. |
| Documents | Original 13 checks and DOC-ANON user-reported passed | DOC-B remains open. |
| Teacher/Guardian navigation | Agent observed role isolation, explicit learner selection and preserved links on 24 October | Predates the new profile-menu switching flow. |
| Admin/Student dashboards | Agent observed Admin counts and links; Student current 2026 placement, upcoming 2027 history and permitted timetable | Rendering checks, not an independent audit of all totals or populated cards. |
| Admin sidebar/header | Agent observed grouping, profile fields and Academic setup navigation on 25 October | Predates standardising the menu across all roles. |
| Academic date repair | Approved repair applied and checked on 9 October | Retained IDs/history; archived SQL must not be rerun as setup. |
| School B isolation | Not completed; School B unavailable | Setup and all hosted cross-school testing belong to the user. |

## Outstanding acceptance and review

- Latest chooser and profile dropdown in all four independent role sessions, including combined roles, learner reselection, revocation and sign-out.
- Populated daily cards, PDF links, count comparisons, pagination warnings and future/current date boundaries.
- Phone/wide desktop layouts, keyboard access, long names, loading feedback and error/retry context.
- Warm production-mode timing; no end-to-end baseline has been established.
- DOC-B/P3-31/P3-32 and P3-33–P3-35 closure; explicit Phase 3 sign-off.
- REVIEW-01/02 were fixed on 26 October; the earlier lightweight review did not implement them. Follow the targeted post-fix checks in DOCUMENTS.md.

The earlier mocked loader measurement reduced context/actor/profile operations from 17 to 6, excluding the proxy. The current dashboard adds feed reads, and the shared profile menu loads history on module pages. Do not quote that measurement as the current whole-page request count or a hosted speed improvement.

The old attendance stale-save and selection failures have user-reported passing regressions. Reopen them only if reproduced. The reported data-mbtss-nonce hydration warning was not found in app source; browser injection was suspected, but a clean-browser reproduction result has not been recorded.

## Current tracker and history

Record new results in [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist). The detailed [pre-20 October history](../archive/2026-10/docs/VERIFICATION_THROUGH_20261020.md) and [pre-refresh notes](../archive/2026-10/docs-before-20261025-reconciliation/docs/VERIFICATION.md) remain available.

The 25 October documentation reconciliation changed documentation only. It does not add browser evidence or close hosted tests. Phase 3 remains open; email, recovery, backups, monitoring, deployment and real-school readiness remain separate gates.

## Guardian overview follow-up — 25 October 2026

The updated Guardian design now keeps the learner picker and selected learner details in one panel. Accounts with no approved learner access get a clear explanation and a prompt to contact School Admin, rather than an unusable selection instruction. Accounts with linked learners still need to select one explicitly. The existing queries, role checks and RLS are unchanged.

The 10 profile tests passed, including new empty-access and selected-learner cases. The full npm run check also passed ESLint, TypeScript, all 512 tests and the production build. Desktop/mobile browser review of this layout remains outstanding; Phase 3 remains open.

## REVIEW-01/02 browser follow-up - 26 October

Teacher identity and on-demand subjects passed in the existing combined Teacher/Guardian session. Switching back to Guardian required explicit learner selection. Student identity/history passed, with current 2026 and upcoming 2027 labels and the existing overview summary retained. Admin sidebar/quick links and timetable filter/clear-filter retained explicit Admin mode. No school records or configuration were changed. Pagination and multi-role Admin legacy-link behavior passed automated tests; those two scenarios were not repeated in a hosted browser session. The full local check passed 524 tests in 57 files, lint, TypeScript and production build. Both review fixes are implemented; final Phase 3 sign-off remains a separate decision.
