# Phase 2: what was built and why

Updated 25 October 2026. This remains the learning guide for Academic Setup. The project is now in Phase 3 acceptance, not Phase 2 development. Academic/register workflows, searchable account links and timetable choices are implemented. Migrations through 021 are user-confirmed applied, including searches 015 and 016. The latest local check passed ESLint, TypeScript, 510 tests in 56 files and production build.

This guide explains the Phase 2 design without claiming all hosted or launch gates are closed. Use [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist) for current case results and [RESUME.md](RESUME.md) for the next step. The original dated explanation is [archived](../archive/2026-10/docs-before-20261025-reconciliation/docs/PHASE_2_EXPLAINED.md).

## 1. What Phase 2 was meant to achieve

The original scope was students, teachers, grades, classes, subjects, guardian links and basic timetables. In practical terms, an administrator should be able to answer:

- Who attends this school, and who teaches here?
- Which academic year, grade and class does each learner belong to?
- Which subjects does each teacher teach, to which classes, and during which dates?
- Which guardians are linked to a learner, and which are allowed to see that learner's information?
- When are classes scheduled, and does the timetable contain clashes?

Academic years, enrollment dates and teaching history support those answers. They are part of making academic setup reliable. Attendance was subsequently implemented in Phase 3; marks and fees still belong to later phases.

The design remains **one school first, with school ownership built in**. We have not added a platform-owner dashboard, subscriptions or automated school onboarding.

## 2. How the implementation connects

The application uses Next.js, TypeScript and Tailwind. Supabase provides authentication and PostgreSQL. File storage is part of the agreed architecture, but school document uploads are not a completed Phase 2 feature.

```mermaid
flowchart TD
    A[School Admin] --> B[Dashboard and forms]
    B --> C[Next.js server-side reads or actions]
    C --> D[Verify identity, active school membership and role]
    D --> E[Validate input and derive school context]
    E --> F[Supabase client using the signed-in user's session]
    F --> G[PostgreSQL: RLS, constraints and controlled functions]
    G --> H[School records, retained history and audit events]
    H --> I[Return permitted data or a safe error]
    I --> B
```

RLS means **row-level security**: database rules governing which records a signed-in person may access. A hidden button is not a security boundary. The server verifies the caller, and the database independently enforces the relevant school and role rules.

Sensitive changes use controlled database functions, also called RPCs. Some run with defined database privileges, but they check the caller's authority before making changes. The application does not use an elevated Supabase key to bypass normal user access.

## 3. What I built, and why

### Academic years, terms, grades, subjects and classes

Academic setup now supports creating and listing these records, with school ownership and validation of their relationships. Classes belong to a grade and an academic year; terms belong within their year's dates.

**Why:** a class name such as “10A” can recur in different years. Keeping the year as a separate relationship avoids confusing this year's class with last year's history. Terms and date bounds also give later attendance, assessments and reports a consistent academic calendar.

I replaced confusing generic labels with labels such as **Grade name**, **Subject name** and **Class name**. Grade names are normalized so variations such as `Grade10` and `Grade 10` do not create separate versions of the same grade. Custom grade labels remain possible; normalization should not guess what an unrelated label means.

The earlier duplicate Grade 10 test-data repair preserved the valid class and its enrollment and teaching links. That record-specific repair is archived as history. It is not a script to rerun routinely.

**Current limit:** the correction interface supports agreed name fields. It is not a general editor for changing academic dates, moving classes between grades or rewriting year relationships.

### Student, teacher and guardian registers

School registers now hold student, teacher and guardian records, including their names and school references. These records can exist before someone receives a portal account.

**Why:** the school register describes people. Authentication describes who can sign in. Treating them as the same thing would make it difficult to register a learner without an email address, record a guardian without portal access, or retain history after access is removed.

Creating a register record therefore does **not** create a login, grant a role or send an email.

### Guardian relationships and account links

A learner can have more than one guardian, and a guardian can be linked to more than one learner. A relationship record does not automatically grant access: child access must be explicitly enabled.

Person records can also be deliberately linked to school memberships. The membership must belong to the same school and have the matching role. Multiple membership roles are supported, but a membership cannot be reused for several different people of the same record type.

**Why:** knowing that someone is listed as a guardian is different from authorizing their account to see a child's information. Keeping that distinction explicit prevents accidental disclosure.

```mermaid
flowchart LR
    U[Supabase Auth user] --> M[School membership and roles]
    M --> L[Explicit account link]
    L --> S[Student record]
    L --> T[Teacher record]
    L --> G[Guardian record]
    G --> R[Guardian-student relationship]
    R --> S
    R --> P[Explicit child-access permission]
```

This is a conceptual diagram. One person does not need all three record types. The important distinction is between a sign-in identity, school membership and the school's person records.

Account-link and guardian-access changes include confirmation, version checks and audit records. Changing a link does not silently provision a new account.

### Enrollment, transfers and withdrawals

An enrollment records a student's class placement for a date range. The admin can transfer a student to another class in the same year or record a withdrawal while preserving the earlier placement.

For example, suppose a fictional learner is enrolled in 10A from 1 January to 31 December. A transfer to 10B starting on 1 July produces two records:

| Placement | Dates |
| --- | --- |
| Original 10A enrollment | 1 January–30 June |
| New 10B enrollment | 1 July–31 December |

**Why:** simply replacing the class ID would make the old class disappear from the student's history. Later attendance and reporting would then have the wrong context.

```mermaid
flowchart TD
    A[Admin confirms transfer date and destination] --> B[Check permission, saved version, year and date bounds]
    B --> C{All checks pass?}
    C -->|No| D[Reject without changing records]
    C -->|Yes| E[One database transaction]
    E --> F[Close old placement the preceding day]
    F --> G[Create new placement with original end date]
    G --> H[Record audit event]
    H --> I[Commit all changes together]
```

The database rejects overlapping placements and multiple unclosed placements for the same learner and year. Withdrawal dates include the learner's last enrolled day. Re-entry must not overlap the previous placement.

Future transfers use their dates when determining current access; they should not give a new teacher access early. Stale forms are rejected instead of overwriting a newer decision.

**Current limits:** no automatic year promotion, undo, first-day placement rewrite or account deactivation on withdrawal. Those are different decisions, not side effects we should introduce into a transfer button.

### Teaching assignments and changes of teacher

A teaching assignment connects a teacher, subject and class for a date range. It records responsibility; it is separate from a scheduled lesson.

Migration 014 added **ending an assignment** and **replacing a teacher**, with retained history and version checks. Replacement closes the original assignment the day before the new teacher starts. The replacement keeps the subject, class and original end date.

Separate, non-overlapping periods for the same teacher, subject and class are allowed. Overlapping duplicates are rejected. Different teachers can share responsibility for a subject and class.

**Why:** staff changes should not rewrite who taught a class earlier in the year or give a replacement teacher access before their start date.

An important safeguard connects this to the timetable: existing lessons must fit within their assignment dates. If shortening an assignment would leave lessons outside those dates, the change is rejected. It does not silently move, split or delete lessons. The administrator must review the schedule first.

**Current limits:** changing an assignment's subject, class or original start date is outside this editor. Automatic timetable handover and first-day replacement are also not implemented.

### Basic timetable

The admin timetable supports creating, listing, filtering and removing recurring weekly lessons. A lesson belongs to a teaching assignment and has a weekday, start/end time and date range.

The database checks that:

- The lesson fits within the teaching assignment's dates.
- The selected weekday actually occurs in the date range.
- The teacher and class do not have conflicting lessons on the relevant occurrences.
- Another simultaneous save cannot bypass the controlled scheduling checks.

Back-to-back lessons are permitted. Removing a lesson requires confirmation and records the action; it removes that stored recurring entry for its full range.

**Why:** timetable correctness must hold even when another lesson is on a different page or two admins submit forms at almost the same time. Checking only the rows currently visible in the browser would be unreliable.

**Phase 2 boundary:** this section describes the admin scheduling foundation. Teacher, learner and guardian timetable screens have since been implemented in Phase 3. Holiday exceptions, rotating weeks, room scheduling and automatic timetable generation are not included. Shared teaching responsibility does not yet provide a special shared-lesson scheduling model.

### Safe corrections, history and audit records

Name/reference corrections use an explicit set of editable fields. A record version changes when the record is updated. If an admin submits an older version, the save fails safely rather than replacing someone else's newer work.

History preserves previous values where required, with restricted admin access. Audit events record the action and relevant identifiers without unnecessarily copying personal details into general logs.

**Why:** typo correction, a transfer and a change of teacher are not interchangeable operations. Each needs rules that preserve the meaning of previous records. A universal “edit anything” form would make those safeguards easy to bypass.

### Pagination and searchable choices

All Phase 2 display lists now have pagination, generally **50 records per page**. This includes academic records, registers, guardian relationships, enrollments, teaching assignments and timetable entries.

Academic, teaching, guardian-link and enrollment forms use searchable choices with **25 results per search page**. Selected choices stay selected while browsing other results. Class choices include academic context, and selecting a class provides its year and date bounds. Transfer searches restrict destinations to the enrollment's year and exclude its current class.

**Why:** displaying records and choosing a related record are different tasks. A paginated student list is useful, but it does not fix a dropdown that only contains the first 500 students. Both paths need to reach the required records.

Timetable filtering now happens in the database **before** pagination. A filtered page therefore represents the chosen assignment rather than a filter applied to one incomplete page. An empty day on the current page is not presented as proof that the whole day is free.

**Completed follow-up:** account-link choices and timetable assignment choices now use on-demand searches through migrations 015 and 016. They no longer depend on a 500-choice catalogue.

## 4. How the academic records relate

```mermaid
flowchart TD
    SCHOOL[School ownership on records] --> YEAR[Academic year]
    YEAR --> TERM[Terms]
    YEAR --> CLASS[Class]
    GRADE[Grade] --> CLASS
    STUDENT[Student] --> ENROLL[Enrollment with dates]
    CLASS --> ENROLL
    TEACHER[Teacher] --> ASSIGN[Teaching assignment with dates]
    SUBJECT[Subject] --> ASSIGN
    CLASS --> ASSIGN
    ASSIGN --> LESSON[Recurring timetable lesson]
    GUARDIAN[Guardian] --> LINK[Relationship and child-access grant]
    LINK --> STUDENT
```

School ownership applies throughout, not just to the academic-year branch drawn here. Database relationships prevent linking a record from School A to a record from School B. RLS controls which records each caller can read or change.

Phase 2 management screens are for School Admin. Phase 3 now provides linked Teacher, Student and Guardian workspaces, with dated placement/responsibility checks and explicit child grants.

## 5. Database changes made during this work

Migrations are the ordered history of schema and permission changes. They remain intact in [supabase/migrations](../supabase/migrations).

| Migration | Purpose |
| --- | --- |
| 003 — academic structure | Years, terms, grades, subjects and classes. |
| 004 — registers | Students, teachers, guardians, relationships and enrollments. |
| 005 — teaching assignments | Dated teacher/subject/class responsibilities. |
| 006 — grade-name normalization | Prevent equivalent grade spellings becoming separate grades. |
| 007 — record corrections | Controlled corrections and stale-update protection. |
| 008 — timetable | Basic recurring lessons and scheduling safeguards. |
| 009 — enrollment lifecycle | History-preserving transfers and withdrawals. |
| 010 — register membership links | Explicit account links, guardian access and role-scoped reads. |
| 011 — invitation bulk and reset | Supporting account-management work from Phase 1. |
| 012 — audit history and cleanup | Restricted correction history and audit/privacy maintenance. |
| 013 — linkable-members email type | Fix a database return-type mismatch that prevented the register account-link query from working. |
| 014 — teaching assignment lifecycle | End or replace a teacher while retaining history. |
| 015 — register member search | Search eligible sign-in links with ownership and role checks. |
| 016 — timetable assignment search | Search eligible dated assignments without a capped catalogue. |

Migrations 001–002 established the earlier foundation and account management. They remain part of the full chain.

You have confirmed applying migrations through 021. **Do not rerun them because they appear in this document.** Search functionality uses 015 and 016; later migrations support Phase 3.

The 013 defect was reproduced in a local SQL test before being fixed. It was a query return-type problem, not a reason to recreate school records or broaden permissions.

## 6. Where the work lives

The project keeps UI, server actions, data reads and database rules in separate places.

| Location | What it does |
| --- | --- |
| [Dashboard page](../src/app/dashboard/page.tsx) | Checks context and loads the selected admin view and its pages. |
| [Academic actions](../src/app/dashboard/academic/actions.ts) | Handles academic-structure creation. |
| [Register actions](../src/app/dashboard/registers/actions.ts) | Creates people, relationships and enrollments. |
| [Enrollment lifecycle actions](../src/app/dashboard/registers/lifecycle-actions.ts) | Validates requests to transfer or withdraw learners. |
| [Account-link actions](../src/app/dashboard/registers/link-actions.ts) | Handles explicit login links and guardian access changes. |
| [Correction actions](../src/app/dashboard/corrections/actions.ts) | Handles the allowed record corrections. |
| [Teaching actions](../src/app/dashboard/teaching/actions.ts) | Creates, ends and replaces teaching assignments. |
| [Timetable actions](../src/app/dashboard/timetable/actions.ts) | Handles lesson creation and removal. |
| [Search actions](../src/app/dashboard/search/actions.ts) | Returns permitted school-scoped choices after server-side authorization. |
| [Components](../src/components) | Forms, panels, editors and reusable search/pagination controls. |
| [Register data](../src/lib/register-data.ts) and [planning data](../src/lib/planning-data.ts) | Fetch paged records and resolve related labels, including off-page references. |
| [Shared pagination](../src/lib/list-pagination.ts) and [search validation](../src/lib/record-search.ts) | Keep page limits, input validation and search behavior consistent. |
| [Migrations](../supabase/migrations) | Defines persistent tables, constraints, permissions and controlled database operations. |
| [Tests](../tests) and [browser tests](../e2e) | Checks behavior at different layers; explained below. |
| [Archive](../archive) | Keeps obsolete one-off scripts as history, outside the active workflow. |

For a broader file-by-file reference, see [FILE_GUIDE.md](FILE_GUIDE.md). This document focuses on why the Phase 2 pieces exist and what they deliver.

## 7. Supporting work that should not be mistaken for new Phase 2 features

Some work during this period repaired or maintained the foundation:

- Invitation preparation, retry/reset handling and password/session handling belong to account management from Phase 1.
- Environment cleanup clarified the purpose of the private local settings file and the shareable example template. Credentials do not belong in documentation or source control.
- Old one-off scripts were archived; migrations were preserved.
- Documentation, test explanations and verification notes were updated to distinguish implemented behavior from unverified hosted behavior.

Email remains disabled by agreement. Saving SMTP settings did not make delivery ready: a registered, verified sending domain and delivery testing are still needed. General school notifications have not been completed early under the account-management work.

## 8. What has been tested, and what that proves

At the 5 October checkpoint, the full check passed **lint, TypeScript, 206 tests across 30 files, and the production build**. I have not rerun those checks merely to write this document.

| Check | What it helps establish | What it does not establish |
| --- | --- | --- |
| Lint and TypeScript | Code consistency and type correctness. | Correct school workflows by themselves. |
| Validation, action and rendering tests | Input handling, authorization paths, safe errors and expected component behavior. | A complete real-browser session against hosted Supabase. |
| Data-query tests | Page boundaries, filters, search behavior and related-record loading. | Real-school performance at an unmeasured size. |
| Embedded PostgreSQL tests using PGlite | Actual SQL behavior with synthetic schools, role contexts, constraints, denied operations and history rules. | Every hosted Auth/RLS configuration or independent-session race. |
| Disconnected browser tests | Preview/application behavior without live school data. | Hosted enrollment, account-linking or school-isolation acceptance. |

The last recorded production-mode browser run on 4 October passed all six tests. The ordinary browser-test mode intentionally skips one production-only security-header test. That skip is not evidence that a Phase 2 workflow is broken. A Windows test-server teardown issue was also recorded; passing assertions and clean process shutdown are separate outcomes.

Connected admin creation/read checks were performed earlier, and you reported completing the pending fictional-data tests after 014. I am not treating those as untested. However, that broad confirmation does not identify every separate-role, cross-school or concurrent-save scenario. The evidence should say exactly what was checked before final acceptance.

## 9. Acceptance and remaining boundaries

The account-link and timetable search conversions are complete. The user reported Phase 2 fictional-data testing, and P3-01–P3-30 now record relevant role, timetable, lifecycle and concurrency passes. Preserve those results rather than treating older to-do lists as current failures.

Hosted School A/School B isolation remains outstanding and user-owned. Latest profile/chooser navigation also needs targeted browser acceptance. The current case list and evidence boundaries are in DOCUMENTS.md and VERIFICATION.md; this explanation is not a second checklist.

Broad date/relationship editing, first-day replacement, undo, promotion and rollover remain outside the existing editors. Agree a support/correction workflow and pilot capacity before real-school use. The earlier mistaken academic-year dates were repaired with approval on 9 October; that repair is historical, not an instruction to alter the current records again.

Phase 3 development was authorised without declaring every earlier live-readiness gate closed. Explicit phase acceptance, email/recovery, security policy and operational readiness remain separate decisions.

## 10. What stays outside Phase 2

| Later phase or decision | Work deliberately left for later |
| --- | --- |
| Phase 3 — Daily Operations | Attendance, role-facing timetables, view-only homework, announcements and private PDF documents. Upload rules are now confirmed: Admin school/class PDFs, assigned Teachers class PDFs; learners and permitted Guardians download only. |
| Phase 4 — Academic Performance | Assessments, marks, authorized review, School Admin publication, report cards and performance summaries. |
| Phase 5 — Finance and Communication | Fees, payment records, balances, parent communication and chosen notification channels. Online payment collection needs its own scope decision. |
| Phase 6 — Smart Features | n8n automation, AI assistance and advanced analytics after the core workflows are stable. |
| Later multi-school platform | Platform-owner administration, onboarding, subscriptions, domains and tenant provisioning. |
| Optional, Phase 2 requirements | Academic CSV imports, automatic promotions, broad undo/archive tools and advanced scheduling. |

There are also **Phase 1 live-readiness requirements** still to close before real users depend on the portal: invitation/recovery delivery, administrator recovery/security policy, relevant session tests, deployment settings, monitoring, backup/restore rehearsal and school acceptance before real learner data.

Email remains off during fictional-data development, as agreed. That should be recorded as a live-readiness limitation rather than used to claim either that email is complete or that all academic development must stop.

Those search conversions are complete. The next work is the current Phase 3 review and acceptance checklist; this documentation changes no application code, database records or migration state.
