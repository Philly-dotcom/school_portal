# Where we left off

## Current handover — Phase 4.3 approval invalidation

Migrations 001–030 are applied. Staff can plan assessments, authorise scales, freeze eligible rosters and capture private draft marks. School Admin can amend frozen placements and grant a teacher dated access to one learner or a whole frozen assessment. The 4 November full local check passed lint, TypeScript, 683 tests in 60 files and the production build.

Migration 029 is user-confirmed applied. The Subject Workspace idea is on hold. Phase 4.3 continues with migration 030, which lets School Admin invalidate a current disputed approval with a reason while retaining its original decision. You confirmed 030 was applied on 6 November. Hosted checks remain open. The school reporting rules are still outstanding. Policy configuration/approval, adoption into a fresh review package and School Admin publication remain pending. Use the existing fictional assessments and accounts for the unchecked [hosted cases](ASSESSMENTS.md). The [Phase 4 plan](PHASE_4_PLAN.md) and [academic decisions](PHASE_4_ACADEMIC_DECISIONS.md) govern that work.

On 6 November the School A test assessment reached definition 2, draft 8 and submission 7, pending review. All temporary test grants were revoked. Resume with authenticated API checks and simultaneous reviewer decisions. The policy form also needs a fix for stale selection labels after a rejected save. School B was skipped. The [assessment checklist](ASSESSMENTS.md) records the individual results. Grade 10 Mathematics for 2027 is the proposed pilot while the user gathers [teacher input](TEACHER_REPORTING_POLICY_QUESTIONS.md).

The dated Phase 3 entries below are historical.

## Phase 3 signed off - 27 October 2026

The user confirmed final Phase 3 sign-off and completed the REVIEW-01/02 browser checks. Phase 3 is complete. Phase 4 has not started. The last full local validation remains the 26 October pass: ESLint, TypeScript, 524 tests in 57 files and production build; it was not rerun for this documentation update. Earlier pending-sign-off statements below describe prior checkpoints and are superseded. Production launch readiness remains separate.

## 26 October checkpoint

The user reports all remaining hosted/browser checks completed and has checked them in DOCUMENTS.md, including School B isolation, Guardian layout and UI/performance checks. No agent hosted rerun was performed and no timing figures were supplied.

Their npm run check passed lint and TypeScript, then stopped with 511 tests passed and one 5-second timeout in record-search.test.ts. The timed test includes PGlite startup, queries and shutdown; its local timeout is now 60 seconds, matching database setup hooks elsewhere. All assertions remain intact. The fresh npm run check passed ESLint, TypeScript, all 512 tests in 56 files and the production build on 26 October.

REVIEW-01 and REVIEW-02 are now implemented and locally verified. Teacher/Student identity stays in the dropdown; an explicit, non-prefetched profile link opens the existing subject/history component on demand. Student Overview still loads its enrolment summary. Admin links, pagination and timetable filters carry mode=school_admin; multi-role users following a mode-less legacy management URL get the workspace chooser. The full check passed ESLint, TypeScript, 524 tests in 57 files and production build. Phase 4 has not started. Earlier outstanding browser lists below are historical; use DOCUMENTS.md for the remaining targeted follow-up and final sign-off.


Updated 25 October 2026.

## Historical position - 25 October (superseded)

We are in **Phase 3: Daily Operations**. The core modules and daily dashboards are implemented; the user accepted Phase 3 on 27 October. Phase 4 has not started. Migrations through **021 are user-confirmed applied**. Do not rerun them. Use fictional records in the dedicated School Portal project.

All roles now use a top-right profile dropdown. It contains identity details, the active role and Sign Out. Multi-role accounts get a workspace chooser at the normal dashboard entry and Switch Workspace in the dropdown. Single-role accounts open their workspace directly. Switching opens the chosen overview in the same session and clears learner/edit context. Guardian users must explicitly select a permitted learner again. The old sidebar role switcher has been removed.

Student current grade/class/year tiles remain on the overview; identity is in the dropdown, with an on-demand enrolment-history link. Teacher subjects open through the same profile-menu pattern. Guardian learner selection stays on the overview. Admin management links are grouped under School management; their reference is the active school membership ID, not a separate staff reference.

## Historical verification - 25 October

On 25 October, after the Guardian overview fixes, **npm run check passed ESLint, TypeScript, 512 tests in 56 files and production build**. Two Guardian regression tests were added and the existing heading assertion was updated. The earlier 510-test result is superseded. This run did not include Playwright, hosted RLS/Storage checks or new role-browser acceptance.

The user marked P3-01 through P3-30, the original 13 document checks and DOC-ANON complete. Preserve those results as evidence for the versions tested. Earlier agent browser checks covered Teacher/Guardian navigation, Admin rendering/sidebar/profile and Student current 2026 versus upcoming 2027 placement. They do not validate the latest all-role dropdown and chooser.

## Historical next steps - superseded by the 29 October checkpoint

Use [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist) as the acceptance tracker. Do not repeat already passed cases without a relevant regression reason.

1. REVIEW-01/02 are implemented and the full 524-test check passed. Record only their targeted post-change browser results in DOCUMENTS.md; do not reset the user's passed acceptance cases.
2. The user reports School B isolation, dashboard, responsive, role and performance checks complete. No production timing numbers were supplied.
3. Review the final evidence together and explicitly sign off Phase 3 before starting Phase 4.

These earlier open questions are now resolved by the 29 October decision record, except actual numerical school policies and final report presentation. Marks, reports, finance, external notifications and AI have not been added.

## Existing fictional records

Reuse existing accounts, people and grants. Do not create duplicate schools, learners or logins. The user signs in without sharing credentials.

The authorised 2026 fixture was created as **Acceptance 12A**, class `11de7dc9-4a5e-477c-acec-370bcf311e48`, using existing ST-003, ST-002 and DEMO-ST-002 learners and Mrs Leruo (TE-003), dated 1 October to 26 November 2026. Later browser evidence showed the current Student class label as **12A - 2026**. Inspect current records before testing; labels, placements and grants may have changed during acceptance.

Keep the 2027 planning records intact. The approved 9 October repair corrected the original year to 18 January–26 November 2027, retained its ID/history, corrected ST-002's end date and reversed ST-003's accidental withdrawal. The existing 2026 year spans 18 January–26 November 2026. Archived repair SQL is not a setup script.

## Boundaries

No cross-request authorisation cache, elevated application credential or new authentication system was introduced. Mutations and RLS still enforce access. The measured 17-to-6 read reduction concerns the earlier context/actor/profile loader path, not the complete current dashboard or hosted latency.

Email remains off; live recovery, admin security policy, backups, monitoring, deployment and real-school approval are separate launch gates. Preserve migrations, local configuration and user work. Leave the user's dev server running unless asked otherwise.

## References

- [Verification evidence](VERIFICATION.md)
- [Phase 3 checklist](DOCUMENTS.md#remaining-phase-3-checklist)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [File guide](FILE_GUIDE.md)
- [October dashboard verification](../archive/README.md#october-dashboard-verification)

## Guardian overview follow-up — 25 October 2026

The updated Guardian design now keeps the learner picker and selected learner details in one panel. Accounts with no approved learner access get a clear explanation and a prompt to contact School Admin, rather than an unusable selection instruction. Accounts with linked learners still need to select one explicitly. The existing queries, role checks and RLS are unchanged.

The 10 profile tests passed, including new empty-access and selected-learner cases. The full npm run check also passed ESLint, TypeScript, all 512 tests and the production build. Desktop/mobile browser review of this layout remains outstanding; Phase 3 remains open.

## REVIEW-01/02 browser follow-up - 26 October

Teacher identity and on-demand subjects passed in the existing combined Teacher/Guardian session. Switching back to Guardian required explicit learner selection. Student identity/history passed, with current 2026 and upcoming 2027 labels and the existing overview summary retained. Admin sidebar/quick links and timetable filter/clear-filter retained explicit Admin mode. No school records or configuration were changed. Pagination and multi-role Admin legacy-link behaviour passed automated tests; those two scenarios were not repeated in a hosted browser session. The full local check passed 524 tests in 57 files, lint, TypeScript and production build. Both review fixes are implemented; final Phase 3 sign-off remains a separate decision.
