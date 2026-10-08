# Documentation guide

Start with the [main README](../README.md). This folder holds the decisions, setup instructions and records of what we have tested. Updated 8 October 2026: migrations through 020 are applied, homework works, and your browser checks are about halfway complete. [Documents](DOCUMENTS.md) are built locally with migration 021 pending application. [Announcements](ANNOUNCEMENTS.md) and documents each have their own browser checklist. RESUME.md has the current checkpoint. The temporary Phase 3 guide is an older planning aid and is not being updated at your request.

## Read these first

| File | When it helps |
| --- | --- |
| [RESUME.md](RESUME.md) | You want the current position and the next steps without reading the whole history. |
| [FILE_GUIDE.md](FILE_GUIDE.md) | You want to know why a file exists and where to look for a particular feature. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | You want to follow the path from a form to the database, including permissions. |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | You want the product decisions we agreed on. This is not a list of completed features. |
| [ROADMAP.md](ROADMAP.md) | You want to see what belongs in each phase and what is still missing. |
| [VERIFICATION.md](VERIFICATION.md) | You want evidence of what actually passed, where it ran and what has not been checked. New entries are at the top. |
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
| [CLEANUP.md](CLEANUP.md) | The October 4 configuration and file-usage review, including what was deliberately retained. |
| [Archive index](../archive/README.md) | The old patch and one-off repair script, with their remaining test/reference uses. |
| [GRADE_NAME_FIX.md](GRADE_NAME_FIX.md) | Explains why Grade10 and Grade 10 are treated as the same grade. |
| [GRADE10_REPAIR.md](GRADE10_REPAIR.md) | The earlier, specific duplicate-data repair. It is not a general cleanup script to run again. |
| [SYNTHETIC_DATA.md](SYNTHETIC_DATA.md) | The fictional records entered through the portal and what was checked at that time. |
| [synthetic-timetable.jpg](synthetic-timetable.jpg) | A screenshot of that earlier timetable check, not proof of the current database state. |
| [REPAIR_PLAN.md](REPAIR_PLAN.md) | The October 2 repair scope. Its original migration status predates your application of 010–012. |
| [REPAIR_REPORT.md](REPAIR_REPORT.md) | What that repair changed and how it was tested. |

If an older dated report says a migration was not applied, check RESUME.md before doing anything. Migrations 009–013 are now user-confirmed applied. We keep past test results as history, not as instructions to repeat setup.
