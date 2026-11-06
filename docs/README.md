# Documentation guide

Start with the [main README](../README.md). Phase 3 is signed off. Phase 4.3 submission and review are implemented locally, and Phase 4 hosted checks remain open. Use the [assessment guide](ASSESSMENTS.md) for the workflow and hosted checklist, the [phase plan](PHASE_4_PLAN.md) for implementation order and the [academic decisions](PHASE_4_ACADEMIC_DECISIONS.md) for permissions and school policy.

RESUME.md is the current handover. VERIFICATION.md separates local and hosted evidence. Superseded repair notes, fixture snapshots and the temporary Phase 3 guide are in the [archive](../archive/README.md); do not follow their older pending-migration instructions.

## Read these first

| File | When it helps |
| --- | --- |
| [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist) | You want the completed Phase 3 acceptance record. |
| [Teacher reporting policy questions](TEACHER_REPORTING_POLICY_QUESTIONS.md) | A questionnaire to share with a teacher while researching the first reporting policy. |
| [ASSESSMENTS.md](ASSESSMENTS.md) | Assessment setup, draft marks, amendments, historical grants and hosted checks. |
| [PHASE_4_PLAN.md](PHASE_4_PLAN.md) | You want the Phase 4 sequence, confirmed review/publication rules and decisions still needed before implementation. |
| [PHASE_4_ACADEMIC_DECISIONS.md](PHASE_4_ACADEMIC_DECISIONS.md) | The user's academic policy report, final permission matrix, correction rules and outstanding school inputs. |
| [PHASE_4_DATA_DESIGN.md](PHASE_4_DATA_DESIGN.md) | Proposed relationships, integrity/versioning rules, first-slice file plan and unexecuted acceptance matrix. |
| [RESUME.md](RESUME.md) | You want the current position and the next steps without reading the whole history. |
| [FILE_GUIDE.md](FILE_GUIDE.md) | You want to know why a file exists and where to look for a particular feature. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | You want to follow the path from a form to the database, including permissions. |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | You want the product decisions we agreed on. This is not a list of completed features. |
| [ROADMAP.md](ROADMAP.md) | You want to see what belongs in each phase and what is still missing. |
| [VERIFICATION.md](VERIFICATION.md) | You want evidence of what actually passed, where it ran and what has not been checked. The earlier detailed log is archived and linked from this page. |
| [Tests README](../tests/README.md) | You want to run tests or understand what each test file is checking. |

## Setup and feature guides

| File | What it covers |
| --- | --- |
| [ENVIRONMENT.md](ENVIRONMENT.md) | The six web-app settings, why both env files exist, and separate CLI/Edge runtime settings. |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md) | A fresh database and the first administrator. Do not repeat provisioning on the existing project. |
| [ACCOUNT_MANAGEMENT.md](ACCOUNT_MANAGEMENT.md) | Memberships, invitations, email setup, recovery and delivery controls. Email instructions are future setup steps while delivery is off. |
| [AUTH_AND_PRIVACY.md](AUTH_AND_PRIVACY.md) | Auth configuration, MFA limits, browser security headers and the controlled privacy-cleanup procedure. |
| [ACADEMIC_SETUP.md](ACADEMIC_SETUP.md) | Years, terms, grades, subjects and classes. |
| [SCHOOL_REGISTERS.md](SCHOOL_REGISTERS.md) | Students, teachers, guardians, relationships and initial enrollment. |
| [LOGIN_LINKS.md](LOGIN_LINKS.md) | Connecting school records to accounts and deliberately granting guardian access. |
| [TEACHING_ASSIGNMENTS.md](TEACHING_ASSIGNMENTS.md) | Teacher, subject and class responsibilities with dates. |
| [TIMETABLE.md](TIMETABLE.md) | Weekly lesson planning, date ranges and clash checks. |
| [ENROLLMENT_LIFECYCLE.md](ENROLLMENT_LIFECYCLE.md) | Transfers and withdrawals that preserve placement history. |
| [RECORD_CORRECTIONS.md](RECORD_CORRECTIONS.md) | Name/reference editing, duplicate checks and stale-form protection. |

## Earlier work and test records

| File | Why we keep it |
| --- | --- |
| [CLEANUP.md](../archive/2026-10/docs/CLEANUP.md) | The October 4 configuration and file-usage review, including what was deliberately retained. |
| [Archive index](../archive/README.md) | The old patch and one-off repair script, with their remaining test/reference uses. |
| [GRADE_NAME_FIX.md](GRADE_NAME_FIX.md) | Explains why Grade10 and Grade 10 are treated as the same grade. |
| [GRADE10_REPAIR.md](../archive/2026-10/docs/GRADE10_REPAIR.md) | The earlier, specific duplicate-data repair. It is not a general cleanup script to run again. |
| [SYNTHETIC_DATA.md](../archive/2026-10/docs/SYNTHETIC_DATA.md) | The fictional records entered through the portal and what was checked at that time. |
| [synthetic-timetable.jpg](synthetic-timetable.jpg) | A screenshot of that earlier timetable check, not proof of the current database state. |
| [REPAIR_PLAN.md](../archive/2026-10/docs/REPAIR_PLAN.md) | The October 2 repair scope. Its original migration status predates your application of 010–012. |
| [REPAIR_REPORT.md](../archive/2026-10/docs/REPAIR_REPORT.md) | What that repair changed and how it was tested. |

If an archived report says a migration was not applied, check RESUME.md first. Migrations through 021 are user-confirmed applied. Keep historical results as evidence, not instructions to repeat setup.

The [Phase 2 explanation](PHASE_2_EXPLAINED.md) remains available as a learning reference. Its dated completion notes are historical. [Announcements](ANNOUNCEMENTS.md) and [Documents](DOCUMENTS.md) explain their current workflows. The [archive index](../archive/README.md) lists the old progress logs and temporary guide.
