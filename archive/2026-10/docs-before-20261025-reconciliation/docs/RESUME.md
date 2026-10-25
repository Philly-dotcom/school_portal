> Historical snapshot taken before the 25 October 2026 documentation reconciliation. Pending work and test totals below describe an earlier revision. Use the current project documentation for status.

# Where we left off

Updated 24 October 2026.

## Current position

We are in **Phase 3: Daily Operations**. Migrations through **021 are user-confirmed applied**. Do not rerun them. We still use fictional records in the dedicated School Portal project.

Role workspaces, personal timetables, attendance, view-only homework, announcements and private PDF documents are implemented. Read-only profiles now appear on each role's overview:

- Student: linked name, reference, school and enrolments, with year, grade, class, dates and Current/Upcoming/Past labels.
- Teacher: linked name, reference, school and subjects grouped by academic year and date status.
- Guardian: name, school and explicitly granted learners. A learner must still be selected before opening daily records.
- Admin: saved name, authenticated email, school and school membership ID as the admin reference. There is no separate admin reference field.

The daily dashboard UI is now implemented with role-specific quick actions, bounded authorized previews and responsive cards. Admin counts are labelled across years. Guardian selection and existing profiles are retained. The new dashboard still needs role/browser acceptance before P3-34/P3-35 can close. Phase 4 has not started.

## Testing now

Use [DOCUMENTS.md — remaining Phase 3 checklist](../../../../docs/DOCUMENTS.md#remaining-phase-3-checklist). Cases P3-01–P3-35 have steps and expected results. Record the case ID, role, fictional record/date, actual result and pass/fail/blocked status. Do not repeat a completed case merely because an archived note says it was pending.

The user has marked P3-01 through P3-30, the original 13 document checks and DOC-ANON complete, including combined Teacher/Guardian role isolation. Keep these user-reported passes. DOC-B, P3-31 and P3-32 remain outstanding: School B is unavailable and the user owns all setup and hosted cross-school testing.

## Current code follow-up

Dashboard reads now reuse the server-verified context and actor within one render. There is no cross-request cache; actions still check access afresh. Sidebar/home links preserve mode and the explicitly selected learner. A single workspace switcher keeps the daily module when changing roles, and entering Guardian from Teacher requires a new learner selection. Loading messages and an error/retry boundary have been added.

The request-count regression measured teacher/student overview reads falling from 17 to 6 backend operations, excluding the unchanged proxy. That does not establish a hosted latency improvement. Final `npm run check` passed lint, TypeScript, 504 tests in 56 files and production build on 24 October. See DOCUMENTS.md for the measurement boundary and the initial timeout followed by a passing full rerun.

Agent browser checks on 24 October confirmed Teacher overview, explicit Guardian selection, retained learner context through Announcements and Documents, and Teacher document management without a carried guardian learner. No accounts or records were created or changed.

The earlier attendance stale-save and enrolment-selection failures are historical observations; the user has marked their regressions passed. Do not reopen them without a new failure. Remaining acceptance covers the new loading/error/mobile behaviour, hosted isolation, daily dashboard work and final sign-off. Phase 3 stays open.

## Existing fictional records

Reuse the existing accounts and people; do not create duplicate schools, learners, accounts or guardian grants. The user logs into role accounts themselves and does not share credentials.

The authorized 2026 fixture is **Acceptance 12A**, Grade 12, class `11de7dc9-4a5e-477c-acec-370bcf311e48`. It was created using existing ST-003, ST-002 and DEMO-ST-002 learners and Mrs Leruo (TE-003), with placements/assignment from 1 October to 26 November 2026. Inspect the current state before testing: the user's document lifecycle checks may have changed placements, grants or assignments. Do not assume the older fixture snapshot is still exact.

Keep the 2027 planning records intact. The approved 9 October repair corrected the original year's dates to 18 January–26 November 2027, retained its ID/history, corrected ST-002's end date and reversed ST-003's accidental withdrawal. The existing 2026 year spans 18 January–26 November 2026. The applied repair is archived; never rerun it as setup.

Basic separate-session teacher, student and guardian checks passed on 19 October for permitted attendance/homework reads and several route denials. Admin notice draft/publish/withdraw/republish passed. These results are preserved in the [verification history](../../docs/VERIFICATION_THROUGH_20261020.md).

## Resume safely

1. Read the current checklist and the user's latest results.
2. Inspect the working tree before editing; preserve the user's UI changes and `.env.local`.
3. Reuse current fictional records and normal authenticated permissions. Do not weaken date rules or RLS.
4. Resolve recorded defects and retest their cases. Leave School B setup and testing entirely to the user.
5. Complete the daily dashboard after testing, then agree Phase 3 acceptance together.

Email/invitation/recovery delivery remains disabled or unverified. Live recovery, backup/restore, monitoring, deployment and real-school approval remain separate gates. Do not deploy, start Phase 4 or treat this checkpoint as live readiness. The user's dev server belongs to their testing session; leave it running unless asked otherwise.

## References

- [Current checklist](../../../../docs/DOCUMENTS.md#remaining-phase-3-checklist)
- [Current verification summary](../../../../docs/VERIFICATION.md)
- [Roadmap](../../../../docs/ROADMAP.md)
- [Architecture](../../../../docs/ARCHITECTURE.md)
- [File guide](../../../../docs/FILE_GUIDE.md)
- [Archive index](../../../README.md)
- [Full resume notes before this refresh](../../docs/RESUME_BEFORE_20261020_REFRESH.md)


Latest work: the approved daily dashboard uses `daily-overview.tsx` and `dashboard-data.ts`, reusing the existing module readers. No SQL or permission changes. Read DOCUMENTS.md's dashboard acceptance section before resuming; do not mark Phase 3 complete based on local tests alone.


25 October follow-up: Admin and Student layouts were refined against the reference images. Admin has a personalized header, coloured summary tiles and side quick actions; Student has current grade/class/year tiles with expandable full profile/history. No new reads or permission changes. The local server was initially unavailable, then the user signed in as Admin and Student for agent rendering checks. Both layouts rendered; Student current 2026 tiles and Upcoming 2027 history were confirmed. Full responsive and populated-card acceptance remains outstanding.


Final validation for the 25 October Admin/Student refinement: `npm run check` passed ESLint, TypeScript, **507 tests in 56 files**, and production build. Three added profile tests cover the current-placement tiles, future-only placement handling and the Admin greeting without a duplicate profile read. Student timetable navigation also passed in the existing authenticated session and displayed permitted 2026 lessons. No data or security changes were made. Full responsive acceptance and the existing Phase 3 completion gates remain open.

Latest placement correction, 25 October: Admin management links are grouped under School management. The Admin profile disclosure has moved from the overview body to the top-right header on Admin pages; the welcome heading remains. One profile-read promise is shared within the render. The existing Admin session passed the menu and Academic setup navigation check. Continue with the outstanding dashboard acceptance checklist; Phase 3 remains open.

Final check for the Admin sidebar/profile correction: npm run check passed ESLint, TypeScript, 509 tests in 56 files and production build. The two added tests cover sidebar/header placement and sharing the Admin profile read. Browser evidence is limited to the existing Admin session described above; remaining acceptance stays open.

## Shared profiles and workspace choice - 25 October 2026

Implemented for review, not verified yet. The user asked to handle all testing and verification themselves, so no tests, lint, type checks, builds, migrations or browser checks were run for this change. The earlier 509-test result applies to the previous revision.

Every active workspace now uses the same top-right profile dropdown. It shows the linked identity details, active role and sign-out. Accounts with multiple roles also get Switch Workspace. Teacher subjects and Student enrolment history are in the dropdown; Student current-placement tiles and Guardian learner selection remain on the overview.

After sign-in, the existing /dashboard entry asks multi-role accounts how they want to continue. A single-role account opens its workspace directly. Choices come from the existing server-verified active membership. Switching opens the chosen role's overview in the same session and drops any learner or edit context. Guardian users must select a permitted learner again. The old sidebar role switcher has been removed.

Explicit mode URLs are validated against current membership roles. Existing Admin management URLs still identify an Admin destination for authorised Admins. A Teacher or Guardian mode does not expose Admin management navigation. This changes navigation/presentation only; it does not add a role-grant mechanism, remembered browser permissions, schema changes or RLS changes.

User checks still needed: single-role sign-in for all four roles; multi-role welcome/selection; profile details and active label on daily and management pages; switching each direction without another login; explicit Guardian learner reselection; forged/revoked role denial; sign-out; narrow-screen and keyboard use. Run the updated automated checks and production build after review. Phase 3 stays open, including the existing School B and dashboard acceptance gates.

