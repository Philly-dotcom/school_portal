# Archived project material

These files are kept for reference, not routine setup. The first archive pass was on 4 October; superseded documentation was added on 20 October 2026. No migration belongs in this archive. Current status lives in [RESUME.md](../docs/RESUME.md) and the [Phase 3 checklist](../docs/DOCUMENTS.md#remaining-phase-3-checklist).

| File | Why it is here | Remaining use |
| --- | --- | --- |
| [2026-10/review_grade10_typo.sql](2026-10/review_grade10_typo.sql) | One-off repair for the earlier fictional Grade 10 data mistake. It is not a general maintenance command. | `tests/grade-repair.test.ts` still rehearses its rollback and safety behavior against a local database. |
| [2026-10/school_portal_improvements.patch](2026-10/school_portal_improvements.patch) | The earlier supplied review patch. Current repairs already live in the working source. | Historical reference; do not reapply blindly. |

The grade-duplicate check remains in `supabase/checks` because it is a reusable read-only diagnostic. The production browser-test helper remains in `scripts` because Playwright and CI use it. Every migration remains in `supabase/migrations` at its original path.

To examine old material, open it here. Only copy an operator script back into active use after reviewing its assumptions against the current database; its age or successful regression test does not authorize a hosted run.

## Documentation archived on 20 October 2026

| File | Why it is retained |
| --- | --- |
| [Old resume log](2026-10/docs/RESUME_BEFORE_20261020_REFRESH.md) | Full mixed progress/history notes before the current handover was shortened. |
| [Verification history](2026-10/docs/VERIFICATION_THROUGH_20261020.md) | Earlier detailed test results, limits and screenshot links. Historical pending statements are not current status. |
| [Temporary Phase 3 implementation guide](2026-10/docs/TEMP_PHASE_3_IMPLEMENTATION_GUIDE.md) | Original step-by-step planning guide, superseded by implementation and the current checklist. |
| [October 4 cleanup](2026-10/docs/CLEANUP.md) | Records the earlier environment/file cleanup and its validation. |
| [Repair plan](2026-10/docs/REPAIR_PLAN.md) | Earlier repair scope, not current work instructions. |
| [Repair report](2026-10/docs/REPAIR_REPORT.md) | What those repairs changed and how they were tested. |
| [Grade 10 repair notes](2026-10/docs/GRADE10_REPAIR.md) | Record-specific repair history; do not rerun its SQL as setup. |
| [Fictional-data snapshot](2026-10/docs/SYNTHETIC_DATA.md) | Earlier entered records and test evidence, not a live database inventory. |

These documents were retained rather than deleted. Relative links were adjusted for their archive locations. All 21 migration paths and hashes were preserved. Active architecture, security, feature guides, Phase 2 explanation and test instructions remain in docs/ and tests/.

Other retained history: [applied academic-date repair](2026-10/20261009_academic_dates_repair.sql), [teaching assignment history](2026-10/Teaching_Assignment_History.md) and [earlier Phase 3 checkpoints](2026-10/SCHOOL_PORTAL_PHASE_3_WORKING_CHECKPOINTS.md). None is an instruction to reapply a hosted change.


## October dashboard verification

On 24 October, the navigation and loading changes passed 490 tests in 55 files. The first run timed out during PGlite startup; the rerun passed with the same timeout and assertions. In the mocked Teacher and Student overview loaders, backend operations fell from 17 to 6 and authentication checks from 4 to 1, excluding the proxy. This measured calls within a render. No hosted page timing was collected. The daily dashboard then passed 504 tests in 56 files.

In the combined Teacher/Guardian session, Teacher showed permitted notices. Guardian displayed daily cards only after explicit learner selection, and navigation through Announcements, Documents and Overview retained that selection. On 25 October, the fictional Admin dashboard displayed 5 students, 5 teachers and 4 classes across years. This verified the rendered tiles. The Student dashboard showed Grade 12 and class 12A in 2026, the 2027 placement as Upcoming, and permitted 2026 timetable lessons. The narrower desktop check covered stacked cards, the Admin sidebar groups and the top-right profile on Academic setup. Phone and wide-screen coverage were separate checks.

The Admin/Student layout revision passed 507 tests and the sidebar/profile revision passed 509, each in 56 files with the production build. The [Phase 3 acceptance record](../docs/DOCUMENTS.md#remaining-phase-3-checklist) records the later sign-off.

The full 24-file snapshot is recoverable from Git commit `c10062d`. To read an original without changing the working tree, run `git show c10062d:archive/2026-10/docs-before-20261025-reconciliation/docs/VERIFICATION.md`, substituting the desired file.
