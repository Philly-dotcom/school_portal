> Historical snapshot taken before the 25 October 2026 documentation reconciliation. Pending work and test totals below describe an earlier revision. Use the current project documentation for status.

# Verification status

Updated 24 October 2026. This page separates local checks, user-reported hosted results and still-open acceptance. The full earlier log is preserved in [verification history](../../docs/VERIFICATION_THROUGH_20261020.md), including screenshots and the scope of each run.

## Local checks

The latest full `npm run check` passed lint, TypeScript, **490 tests in 55 files**, and the production build on 24 October after the navigation/loading changes. The first full attempt hit a five-second PGlite timeout in record-search.test.ts; the complete rerun passed without relaxing its timeout or assertions. Profile tests cover identity/school scoping, guardian selection, subject deduplication, enrolment dates and error states. Routing tests separately cover role selection.

Local PGlite tests exercise SQL policies with fictional identities, but they do not prove issued-token behaviour, real Storage HTTP boundaries or independent-session concurrency. Disconnected browser tests are also separate from hosted role checks.

## Hosted results

| Area | Recorded result | Evidence boundary |
| --- | --- | --- |
| Migrations | Through 021 user-confirmed applied | Do not rerun them; migration application alone is not permission testing. |
| Documents | 13 hosted checklist items marked complete by the user | Includes bucket setup, uploads/downloads, invalid files, role/grant restrictions, transfers, ending assignments, withdrawal, interrupted-upload recovery and stale visibility saves. |
| Document school isolation | Deferred: School B is not registered | DOC-ANON is user-reported passed. DOC-B and P3-31/P3-32 remain outstanding and user-owned. |
| Teacher/student/guardian sessions | Basic permitted attendance/homework and several denied routes passed on 19 October | Does not close direct API, lifecycle, combined-role or concurrency cases for all modules. |
| Admin announcement lifecycle | Draft/publish/withdraw/republish passed on 19 October | Reader transitions and other announcement cases remain open. |
| Academic date repair | Approved repair committed and checked on 9 October | Retained IDs/history; archived SQL is not a setup script. |
| New profiles and P3-01 through P3-30 | User marked these checks complete | Includes combined Teacher/Guardian isolation; retain as user-reported evidence. |

The completed document results are the user's reported checks, not a new independent browser run by the agent. The original PDF validation error has been restored; no document action diff remained when inspected.

## Current follow-up

The user has marked the earlier stale-save and selection regressions passed. Their older failure notes remain historical evidence, not a claim that they still fail today.

The 24 October code changes reduce duplicate auth/context/profile reads within each render, preserve role/learner navigation, consolidate workspace controls and add loading/error feedback. Actions and RLS are unchanged. The real loader flow with a mocked backend measured 17 to 6 operations for teacher/student overview (proxy excluded); no comparable hosted latency baseline was collected.

Agent browser checks confirmed the existing combined account can open Teacher overview, explicitly select its granted learner in Guardian mode, retain that learner through Announcements and Documents, and switch to Teacher document management without carrying the learner. No record mutations were needed.

Outstanding: new loading/error/mobile regression acceptance, warm production timing, user-owned School B isolation, daily-dashboard completion and acceptance, and explicit Phase 3 sign-off.

Use [the combined Phase 3 checklist](../../../../docs/DOCUMENTS.md#remaining-phase-3-checklist) for case IDs, steps and expected results. Keep user-reported passes, agent-observed results and local automated results distinguishable when recording new evidence.

## Documentation refresh

On 20 October, superseded guides and full progress snapshots were archived and current status pages were refreshed. The 21 migration files retained their paths and SHA-256 hashes during archiving. No application code, hosted data, credentials or configuration was changed by this documentation task. Markdown links and documentation diffs are checked separately; the full application suite is not rerun for prose-only changes.

Phase 3 is still open. Live email/recovery, deployment, monitoring, backups and real-school readiness remain separate work.


## Approved dashboard UI implementation - 24 October 2026

After the approved UI changes, `npm run check` passed lint, TypeScript, **504 tests in 56 files**, and production build. Fourteen new tests cover dashboard authorization adapters, Admin count scoping/errors, published previews, learner-aware links, school-local dates and pagination caveats. This run passed without changing SQL, migrations, policies or test timeouts.

The agent observed the Teacher dashboard and the Guardian selection boundary using the existing combined account. Teacher cards rendered permitted notices and empty daily states. Guardian cards were absent before selection and appeared for the explicitly selected learner; inspected links retained mode and child. The current narrower desktop layout stacked cards. No records were created or changed.

Still unverified for this UI revision: independent Admin and Student browser sessions, populated scheduled-lesson/homework/PDF previews, phone widths, failed-card recovery and larger paginated fixtures. Use the added dashboard acceptance checklist in DOCUMENTS.md. P3-34/P3-35 remain open for acceptance; Phase 3 is not complete.

The earlier request-count improvement measures the profile path, not all new dashboard cards. Each card uses bounded existing readers, and its Suspense boundary allows independent progress. An end-to-end production timing comparison remains outstanding.


## Admin and Student reference-layout refinement - 25 October 2026

Revisited the approved images and made the two dashboards more distinct. Admin now starts with the authenticated profile name, followed by coloured registered-student/teacher/class tiles and a compact quick-actions panel beside the daily feeds on wide screens. The complete administrator profile is still available through its disclosure.

Student now starts with a single welcome heading and current grade, class and academic-year tiles. These are derived from the already loaded enrolments using the school-local date; future placements never fill the current tiles. Full identity, reference, school and current/upcoming/past history remain in an expandable profile section. The daily cards follow without the old expanded history dominating the page. Layouts stack at smaller widths.

Changed: dashboard/page.tsx, daily-overview.tsx, role-overview.tsx, student-profile.tsx, staff-profile.tsx and globals.css. Added targeted assertions in the existing student/staff profile suites. No new data queries, schema, permissions, dependencies, notifications, attendance charts or year-switching logic were added. Teacher and Guardian workflows remain as before.

The local server was initially unavailable, then the user started it and signed in as Admin. The agent confirmed the personalized Admin heading, live registered counts (5 students, 5 teachers, 4 classes across years), published notices and quick-action links. The count tiles were adjusted to stack at the narrower browser width. This is a rendering check, not an independent audit of database totals. Student acceptance and wide desktop/phone checks remain to be recorded, including expanded details, long names, future-only enrolments and existing daily-module links. This does not close P3-34/P3-35 or Phase 3.


Agent browser follow-up, 25 October: Admin rendering was checked with the user's existing Admin login. Student rendering was then checked as Mpoetsi (ST-003): tiles showed Grade 12, class 12A - 2026 and year 2026. Expanding profile/history showed the existing 2027 placement labelled Upcoming and 2026 labelled Current. No records were edited. The current narrower desktop width was visually inspected; wide desktop/phone acceptance and populated lesson/PDF/error cases remain separate.


Final validation for the 25 October Admin/Student refinement: `npm run check` passed ESLint, TypeScript, **507 tests in 56 files**, and production build. Three added profile tests cover the current-placement tiles, future-only placement handling and the Admin greeting without a duplicate profile read. Student timetable navigation also passed in the existing authenticated session and displayed permitted 2026 lessons. No data or security changes were made. Full responsive acceptance and the existing Phase 3 completion gates remain open.

## Admin navigation follow-up — 25 October 2026

The agent checked the existing Admin session: Workspace and School management were separate, the top-right profile opened with all existing identity fields and sign-out, and Academic setup loaded with the same header. No notification bell or record changes were introduced. This was a narrower desktop rendering/navigation check, not full responsive or keyboard acceptance. See DOCUMENTS.md for remaining gates.

Final check for the Admin sidebar/profile correction: npm run check passed ESLint, TypeScript, 509 tests in 56 files and production build. The two added tests cover sidebar/header placement and sharing the Admin profile read. Browser evidence is limited to the existing Admin session described above; remaining acceptance stays open.

## Shared profiles and workspace choice - 25 October 2026

Implemented for review, not verified yet. The user asked to handle all testing and verification themselves, so no tests, lint, type checks, builds, migrations or browser checks were run for this change. The earlier 509-test result applies to the previous revision.

Every active workspace now uses the same top-right profile dropdown. It shows the linked identity details, active role and sign-out. Accounts with multiple roles also get Switch Workspace. Teacher subjects and Student enrolment history are in the dropdown; Student current-placement tiles and Guardian learner selection remain on the overview.

After sign-in, the existing /dashboard entry asks multi-role accounts how they want to continue. A single-role account opens its workspace directly. Choices come from the existing server-verified active membership. Switching opens the chosen role's overview in the same session and drops any learner or edit context. Guardian users must select a permitted learner again. The old sidebar role switcher has been removed.

Explicit mode URLs are validated against current membership roles. Existing Admin management URLs still identify an Admin destination for authorised Admins. A Teacher or Guardian mode does not expose Admin management navigation. This changes navigation/presentation only; it does not add a role-grant mechanism, remembered browser permissions, schema changes or RLS changes.

User checks still needed: single-role sign-in for all four roles; multi-role welcome/selection; profile details and active label on daily and management pages; switching each direction without another login; explicit Guardian learner reselection; forged/revoked role denial; sign-out; narrow-screen and keyboard use. Run the updated automated checks and production build after review. Phase 3 stays open, including the existing School B and dashboard acceptance gates.

