> Historical snapshot taken before the 25 October 2026 documentation reconciliation. Pending work and test totals below describe an earlier revision. Use the current project documentation for status.

# Documentation guide

Start with the [main README](../../../../README.md). Updated 20 October 2026: migrations through 021 are applied, profiles exist for all four roles, and the user has completed 13 hosted document checks. Phase 3 remains open. Use the [combined checklist](../../../../docs/DOCUMENTS.md#remaining-phase-3-checklist) for remaining tests, known defects, deferred School B isolation and dashboard work.

RESUME.md is the current handover. VERIFICATION.md separates local and hosted evidence. Superseded repair notes, fixture snapshots and the temporary Phase 3 guide are in the [archive](../../../README.md); do not follow their older pending-migration instructions.

## Read these first

| File | When it helps |
| --- | --- |
| [DOCUMENTS.md](../../../../docs/DOCUMENTS.md#remaining-phase-3-checklist) | You want to work through the remaining Phase 3 tests and record results by case ID. |
| [RESUME.md](../../../../docs/RESUME.md) | You want the current position and the next steps without reading the whole history. |
| [FILE_GUIDE.md](../../../../docs/FILE_GUIDE.md) | You want to know why a file exists and where to look for a particular feature. |
| [ARCHITECTURE.md](../../../../docs/ARCHITECTURE.md) | You want to follow the path from a form to the database, including permissions. |
| [PROJECT_CONTEXT.md](../../../../docs/PROJECT_CONTEXT.md) | You want the product decisions we agreed on. This is not a list of completed features. |
| [ROADMAP.md](../../../../docs/ROADMAP.md) | You want to see what belongs in each phase and what is still missing. |
| [VERIFICATION.md](../../../../docs/VERIFICATION.md) | You want evidence of what actually passed, where it ran and what has not been checked. The earlier detailed log is archived and linked from this page. |
| [Tests README](../../../../tests/README.md) | You want to run tests or understand what each test file is checking. |

## Setup and feature guides

| File | What it covers |
| --- | --- |
| [ENVIRONMENT.md](../../../../docs/ENVIRONMENT.md) | The six web-app settings, why both env files exist, and separate CLI/Edge runtime settings. |
| [SUPABASE_SETUP.md](../../../../docs/SUPABASE_SETUP.md) | A fresh database and the first administrator. Do not repeat provisioning on the existing project. |
| [ACCOUNT_MANAGEMENT.md](../../../../docs/ACCOUNT_MANAGEMENT.md) | Memberships, invitations, email setup, recovery and delivery controls. Email instructions are future setup steps while delivery is off. |
| [AUTH_AND_PRIVACY.md](../../../../docs/AUTH_AND_PRIVACY.md) | Auth configuration, MFA limits, browser security headers and the controlled privacy-cleanup procedure. |
| [ACADEMIC_SETUP.md](../../../../docs/ACADEMIC_SETUP.md) | Years, terms, grades, subjects and classes. |
| [SCHOOL_REGISTERS.md](../../../../docs/SCHOOL_REGISTERS.md) | Students, teachers, guardians, relationships and initial enrollment. |
| [LOGIN_LINKS.md](../../../../docs/LOGIN_LINKS.md) | Connecting school records to accounts and deliberately granting guardian access. |
| [TEACHING_ASSIGNMENTS.md](../../../../docs/TEACHING_ASSIGNMENTS.md) | Teacher, subject and class responsibilities with dates. |
| [TIMETABLE.md](../../../../docs/TIMETABLE.md) | Weekly lesson planning, date ranges and clash checks. |
| [ENROLLMENT_LIFECYCLE.md](../../../../docs/ENROLLMENT_LIFECYCLE.md) | Transfers and withdrawals that preserve placement history. |
| [RECORD_CORRECTIONS.md](../../../../docs/RECORD_CORRECTIONS.md) | Name/reference editing, duplicate checks and stale-form protection. |

## Earlier work and test records

| File | Why we keep it |
| --- | --- |
| [CLEANUP.md](../../docs/CLEANUP.md) | The October 4 configuration and file-usage review, including what was deliberately retained. |
| [Archive index](../../../README.md) | The old patch and one-off repair script, with their remaining test/reference uses. |
| [GRADE_NAME_FIX.md](../../../../docs/GRADE_NAME_FIX.md) | Explains why Grade10 and Grade 10 are treated as the same grade. |
| [GRADE10_REPAIR.md](../../docs/GRADE10_REPAIR.md) | The earlier, specific duplicate-data repair. It is not a general cleanup script to run again. |
| [SYNTHETIC_DATA.md](../../docs/SYNTHETIC_DATA.md) | The fictional records entered through the portal and what was checked at that time. |
| [synthetic-timetable.jpg](../../../../docs/synthetic-timetable.jpg) | A screenshot of that earlier timetable check, not proof of the current database state. |
| [REPAIR_PLAN.md](../../docs/REPAIR_PLAN.md) | The October 2 repair scope. Its original migration status predates your application of 010–012. |
| [REPAIR_REPORT.md](../../docs/REPAIR_REPORT.md) | What that repair changed and how it was tested. |

If an archived report says a migration was not applied, check RESUME.md first. Migrations through 021 are user-confirmed applied. Keep historical results as evidence, not instructions to repeat setup.

The [Phase 2 explanation](../../../../docs/PHASE_2_EXPLAINED.md) remains available as a learning reference. Its dated completion notes are historical. [Announcements](../../../../docs/ANNOUNCEMENTS.md) and [Documents](../../../../docs/DOCUMENTS.md) explain their current workflows. The [archive index](../../../README.md) lists the old progress logs and temporary guide.
