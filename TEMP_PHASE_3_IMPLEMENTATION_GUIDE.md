# School Portal — temporary Phase 3 implementation guide

Prepared against the project on **5 October 2026**.

**Purpose:** a working guide for Phase 3. The original instructions below remain a plan unless the progress board or dated checkpoint says otherwise. On 7 October you asked me to review your first files, fix them and resume implementation. You can delete this file when the phase is accepted and any useful completion evidence has been retained.

**Project root:** `C:\Users\moses\Documents\School_portal`

All `src/...`, `tests/...` and `supabase/...` paths below are relative to that root. For example, `src/lib/attendance-validation.ts` means `C:\Users\moses\Documents\School_portal\src\lib\attendance-validation.ts`.

Do not update the existing project Markdown files with this plan. This temporary file is the planning and progress exception you requested. Keep implementation within this project. Do not copy schemas, credentials or business rules from other projects.

## How to use this guide

1. Work in section order. Check a box only after its stated result has been demonstrated.
2. Record policy decisions in section 02 before building the dependent feature.
3. Treat snippets labelled **pattern** as focused examples, not complete implementations. Where a snippet calls a proposed function, create and test that function before using the snippet.
4. Save a small local commit after each working section. Never commit `.env.local`, credentials or real records.
5. When you return, send the checkpoint ID, changed files, applied migrations and test results using the handover form at the end.
6. I will review what you actually completed before continuing. An unchecked item is not assumed complete. Guidance is not permission for me to implement the feature on your behalf.

### Progress board

| ID | Section | Current status | Your evidence / commit / blocker |
| --- | --- | --- | --- |
| 00 | Baseline and migration 016 | 016 user-confirmed applied on 7 October | Do not reapply |
| 01 | Phase 2 prerequisite checks | Earlier testing reported; newer checks deferred | |
| 02 | Phase 3 policy decisions | Daily attendance rules accepted 7 October; teacher history rule accepted 8 October | Other proposed rules still need decisions before dependent implementation |
| 03 | Synthetic accounts and testing setup | Existing data available; coverage to confirm | |
| 04 | Role-aware navigation and person context | Implemented locally; browser acceptance outstanding | See 7 October checkpoint below |
| 05 | Role-facing timetable | 017 user-confirmed applied 8 October; browser/hosted acceptance outstanding | Do not reapply 017 |
| 06 | Attendance database and permissions | Implemented locally; 018 not yet applied | See 8 October checkpoint |
| 07 | Attendance UI and workflow | Implemented locally; browser acceptance outstanding | See 8 October checkpoint |
| 08 | View-only homework | Not started | |
| 09 | Announcements | Not started | |
| 10 | Private PDF documents and attachments | Not started | |
| 11 | Daily dashboard integration | Not started | |
| 12 | Full acceptance checks | Not started | |

**Known checkpoint:** migrations 015–017 are user-confirmed applied. The Phase 2 baseline passed lint, TypeScript, **218 tests in 32 files**, and production build. The dated Phase 3 checkpoints below record newer work. Browser acceptance is outstanding. Email and invitations stay disabled.

### 7 October — role workspaces and personal timetable

Your initial four files supplied the linked-person loader, role types, guardian selector and overview. They were not yet wired into the dashboard. I connected them and fixed the state types, invalid child handling, selector prop name, and safe handling of failed reads. Guardian links now load in ordered batches instead of relying on a single Supabase response limit. A guardian workspace uses explicit child grants even when the same account also has a teacher role.

The dashboard now has teacher, student and guardian workspaces, a child selector and read-only **My timetable**. School Admin retains the existing admin overview and scheduling screen; an admin with another assigned role can open that role separately. The public preview stays static.

Files added beyond your initial work:

- `src/lib/my-timetable-data.ts`: user-context RPC call, bounded pagination and response validation.
- `src/components/my-timetable-panel.tsx`: the current school week's lesson dates, times and display labels. No schedule editing controls.
- `supabase/migrations/202610070017_role_read_models.sql`: narrow `list_my_timetable` projection. It verifies active school/membership, exact role, linked person and selected child grant on every request. Teacher records retain their existing table-level restrictions.
- `tests/portal-context.test.ts`: actor resolution, forged child requests, multi-role filtering and loader errors.
- `tests/portal-routing.test.ts`: role routing, admin boundaries and preview separation.
- `tests/my-timetable-database.test.ts`: real migrations in embedded PostgreSQL, including revoked grants, suspended members, cross-school denial, anonymous denial, denied writes and dated timetable access.

The timetable computes the current school week in PostgreSQL with the existing `private.school_today`. It returns the actual lesson date. A separate JavaScript `school-date.ts` is unnecessary for this read-only screen; add a shared date helper only when an input workflow needs one. The deployed function parameter is `portal_mode`, not the guide's earlier proposed `requested_mode`.

Local full-check result on 7 October: `npm run check` passed lint, TypeScript, **253 tests in 35 files**, and the production build. This is local evidence; hosted Auth/RLS and browser acceptance have not been performed in this session.

Next steps for this checkpoint:

- [x] Migration 017 applied — confirmed by you on 8 October. Earlier references below to `202610050017_role_read_models.sql` mean the actual file `202610070017_role_read_models.sql`; do not create a second 017 or reapply it.
- [ ] Sign in as linked teacher and student test accounts; confirm the correct workspace and current-week lessons.
- [ ] Sign in as a guardian, select each authorized learner, then try a different learner UUID in the URL. Unrelated learners must be denied.
- [ ] Test a teacher/guardian account in both modes. A classroom roster must not become its guardian child list.
- [ ] Revoke a guardian grant or suspend a test membership, reload, and confirm access is gone.
- [ ] Confirm the admin scheduling screen still works and `/preview` does not load school records.
- [ ] Retain the broader Phase 2 acceptance checks and hosted two-school checks; local SQL tests do not replace them.

**Next development block:** sections 06–07, attendance database and UI. No attendance implementation is included in this checkpoint. Daily class registers, assigned teachers marking today and admin corrections to older dates with a reason are now accepted. Homework publishing, announcement and PDF upload policies are still proposals.

### 8 October — daily attendance

Attendance now has a local implementation. You confirmed that teachers may read past registers only for classes they still teach and dates covered by that current assignment. They still write today only. School Admin can enter or correct older attendance with a reason. Students and guardians have a separate read-only history for the permitted learner.

The actual migration is **`supabase/migrations/202610080018_attendance.sql`**, replacing the proposed filename `202610050018_attendance.sql` below. It creates sessions, marks, same-school constraints, RLS, bounded read/search functions and an atomic save function. No older migration was changed. 018 has not been applied to Supabase by me.

What the implementation does:

- One register per school, class and date, with a version to detect stale saves.
- Explicit `present`, `absent`, `late` and `excused` marks. No row means unmarked. Choosing Unmarked clears a mistaken mark explicitly; omitted learners remain unchanged.
- Saves only changed marks on the displayed page. Rosters use 50 rows per page, class search 25 choices, and learner history 50 marks per page.
- Rejects future dates, dates outside the class academic year, learners without a matching dated enrollment and unauthorized classes.
- Locks the school row like enrollment changes do. A stale register returns a reload message. An invalid learner or failed audit insert rolls back the entire save.
- Audits changed statuses and the correction reason in the existing school-admin audit table. No attendance payloads are printed to logs.
- Prevents a backdated enrollment change that would put existing marks outside their enrollment. Ordinary later transfers retain history. If the original mark was a mistake, clear it in the authorized register first, then correct the enrollment; the attendance audit remains.

New application files:

| File | Responsibility |
| --- | --- |
| `src/lib/attendance-validation.ts` | Status/input/read schemas and attendance links |
| `src/lib/school-date.ts` | School-local default date for the picker; database still authorizes dates |
| `src/lib/attendance-data.ts` | User-context reads of staff registers and learner history |
| `src/app/dashboard/attendance/actions.ts` | Validate a staff save, derive the school, call SQL and return safe errors |
| `src/app/dashboard/attendance/search-actions.ts` | Dedicated authorized staff class search; existing admin search stays unchanged |
| `src/components/attendance-panel.tsx` | Staff versus learner/guardian view, dated roster and pagination |
| `src/components/attendance-picker.tsx` | Class search and register date form |
| `src/components/attendance-form.tsx` | Explicit changed marks, correction reason and stale-save recovery |
| `tests/attendance-database.test.ts` | Schema, authorization, two-school denial, version conflicts, rollback, history and pagination |
| `tests/attendance-actions.test.ts` | Trusted school, staff mode, malformed input, conflict/error handling and reads |
| `tests/attendance-form.test.ts` | Initial unmarked state, read-only history and required correction reason |
| `tests/attendance-validation.test.ts` | Dates, batches, statuses and timezone boundaries |

Dashboard, sidebar and role overview now link to attendance. There are no new packages or environment variables. This iteration uses paginated full learner history rather than a date-range filter. The RPC argument for register dates is `target_date`; use the actual action and migration together rather than copying the older pattern below unchanged.

Verification on 8 October: `npm run check` passed lint, TypeScript, **313 tests in 39 files**, and the production build. All 60 focused attendance tests passed as well. After rejecting whitespace-only correction reasons at the SQL boundary, the 29 attendance database tests were rerun and passed. Vitest initially hit missing temporary files in the sandbox; the successful reruns used the normal execution environment. The tests use embedded PostgreSQL and mocked actions; they do not prove hosted concurrent-session behavior or browser acceptance.

Before accepting this block:

- [ ] Apply 018 once in the dedicated Supabase project; do not reapply 017 or earlier migrations.
- [ ] Use fictional enrollment, academic-year and teaching-assignment dates that include today. Existing 2027-only fixtures will not appear as today's roster in 2026.
- [ ] As an assigned teacher, open Attendance, search for a class, and mark only two learners. Save and reload: the rest must remain unmarked.
- [ ] Change one mark and explicitly clear another. Confirm the results after reload.
- [ ] Check multiple roster pages and verify saving one page leaves other pages unchanged.
- [ ] As School Admin, open yesterday's register. An empty reason must fail; a reason must allow the authorized save.
- [ ] As a teacher, view a permitted past date. There must be no editing controls. A date outside the assignment must be denied.
- [ ] Open the same register in two signed-in tabs. Save one; saving stale marks in the other must show a conflict. Reload before retrying.
- [ ] Sign in as student and guardian accounts. Confirm only the selected learner's recorded history is shown, including after a later transfer.
- [ ] Confirm unrelated teachers, School B accounts, revoked grants and suspended accounts cannot read/write protected records. Check direct RPC/table requests as well as hidden UI controls.
- [ ] Check that a contradictory backdated transfer fails and a later valid transfer preserves attendance.
- [ ] Finish outstanding timetable and earlier Phase 2 browser checks. Neither a migration success nor local tests complete those checks.

Next module: view-only homework. Its author/publishing and audience rules still need confirming before implementation. Announcements and PDF documents remain later Phase 3 work.

---

## 00 — Preserve the starting point and enable the completed timetable search

### What and why

Start from a reproducible Phase 2 baseline. New daily workflows depend on correct enrollment, teaching responsibility and timetable data. Do not mix an unapplied existing migration with a new feature failure.

### Open these existing files

- [docs/RESUME.md](docs/RESUME.md): latest development checkpoint; read only.
- [docs/PHASE_2_EXPLAINED.md](docs/PHASE_2_EXPLAINED.md): explanations and historical scope; read the later-update note first.
- [package.json](package.json): existing scripts and packages.
- [.env.example](.env.example): allowed app configuration names. Do not overwrite an existing `.env.local`.
- [Migration 016](supabase/migrations/202610050016_timetable_assignment_search.sql): read-only assignment search.

### Actions

- [ ] Run `git status --short` and `git diff` from the project root. There is existing uncommitted work; review it rather than resetting the checkout.
- [ ] Inspect what will be included before staging or committing. Preserve the existing work.
- [ ] Confirm whether 016 has already been applied. If not, run its contents once in the dedicated fictional-data Supabase project. Do not reapply 001–015.
- [ ] Verify the function exists. A read-only SQL Editor check is:

```sql
select to_regprocedure('public.search_timetable_assignments(uuid,text,integer)');
```

The result should identify the function, not be null. This confirms existence, not correct user authorization.

- [ ] Run the existing checks:

```powershell
Set-Location 'C:\Users\moses\Documents\School_portal'
npm run check
```

Use the installed dependencies. Only use `npm ci` if you are deliberately restoring a missing/broken install from the existing lockfile. Do not upgrade packages as part of this phase by default.

- [ ] Start the local server when needed with `npm run dev`. Use `http://127.0.0.1:3000`. If your server is already running, use it; do not start a conflicting process.

### Configuration

Keep the existing six app settings: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SCHOOL_PORTAL_SCHOOL_ID`, `SCHOOL_PORTAL_SITE_URL`, `SCHOOL_PORTAL_EMAIL_ENABLED`, `SCHOOL_PORTAL_INVITATIONS_ENABLED`. Keep the last two `false`. Do not add a service-role key, SMTP password or Resend key to the app.

No new environment variable is required for the basic Phase 3 modules. Storage bucket name and upload-size policy can be non-secret constants introduced in section 10.

**Expected result:** Phase 2 checks pass and its timetable search works after 016. Record your actual test count; it will increase as you add tests.

**Common mistakes:** applying a migration to another project's database; rerunning already-applied migrations; treating an SQL Editor success as a successful authenticated browser test; copying example env placeholders over working settings.

---

## 01 — Close the prerequisite checks without expanding Phase 2

No code change is required merely to execute this section. Fix an actual failure before building a dependent feature.

- [ ] Academic setup: create/reload a fictional year, grade, subject and class; verify names and date bounds.
- [ ] Registers: verify student/teacher/guardian creation and allowed corrections.
- [ ] Search controls: search, select, browse another search page and confirm the selected value stays selected.
- [ ] Login links: active matching-role accounts are selectable; accounts already linked to a different person of the same type are excluded; inactive current links can be deliberately removed.
- [ ] Guardian grant: a relationship with `access_enabled=false` gives no child access.
- [ ] Enrollment: transfer and withdrawal retain history and reject overlaps/stale forms. Future transfer dates do not change today's roster early.
- [ ] Teaching lifecycle: ending/replacing a teacher preserves dates/history and refuses a cutoff that would strand existing lessons.
- [ ] Timetable: filter before paging, clear filter, dates, clash denial and confirmed removal all behave correctly.
- [ ] Resolve or explicitly defer broader academic-date, class-relationship and first-day correction cases. The existing editors do not provide arbitrary undo or promotion.
- [ ] Review the fictional calendar. Earlier notes mention a year labelled 2027 ending in 2030. Use deliberately chosen dates; do not silently delete older test records.

Open `tests/register-database.test.ts`, `tests/membership-links-database.test.ts`, `tests/teaching-lifecycle-database.test.ts` and `tests/planning-pagination.test.ts` for existing coverage and examples.

**Expected result:** you can explain which records are current on the school's date and which tests remain deferred. If browser checks remain paused, record that here and do not mark the dependent workflow accepted.

---

## 02 — Choose the rules that drive the database

These are proposed simple defaults, not new product decisions made on your behalf. Write **accepted** or your replacement rule in the last column before implementing that module. You can make these decisions yourself; you do not need another chat just to select a policy.

| Decision | Suggested baseline for this guide | Your accepted rule |
| --- | --- | --- |
| Attendance unit | One daily class register, not attendance per lesson | Accepted 7 October |
| Who marks attendance | Admin, or a linked teacher currently assigned to that class | Accepted 7 October |
| Teacher dates | Today only, using the school's timezone | Accepted 7 October |
| Older attendance corrections | Admin only, with a correction reason | Accepted 7 October |
| Statuses | `present`, `absent`, `late`, `excused`; no entry means not marked | |
| Teacher attendance history | Read current class history only where their responsibility covered that date; admins retain full school oversight | Accepted 8 October |
| Homework writers | Admin and teachers for their own current assignments | |
| Homework audience | Published work for the learner's current class; historical access only when enrollment overlaps the work's fixed audience date | |
| Guardian content | Explicitly granted children may see their timetable, attendance, homework and permitted PDFs | |
| Announcement writers | Admin school-wide; teachers for their current classes, without an extra approval workflow | |
| Audience date | Set on first publication; never silently move it during editing | |
| Former author | Retained authorship does not preserve write permission; admin manages orphaned content | |
| PDF uploaders | Admin and authorized teachers only; students/guardians never upload | |
| Standalone PDF scope | Class resources, with linked homework/announcement attachments also supported; no personal medical/identity document repository | |
| PDF maximum | 2 MiB for the first implementation; increase only with matching app/bucket/host limits | |
| PDF delivery | Authenticated application download, not public URLs or embedded PDF frames | |
| File safety | Define what validation is required and whether a trusted malware/content scanner is required before real use | |
| Timetable date scope | Current school week/current placement first; no unrestricted future/historical learner timetable browsing | |

### Important distinctions

- “Teacher” is not enough authority. Check the linked teacher record, class/assignment ownership and effective dates.
- “Guardian” is not enough authority. Check the particular child relationship and explicit grant every time.
- RLS policies are usually permissive and OR together. A broad new `authenticated` policy can accidentally undo a narrow one.
- A multi-role user may legitimately have more than one capability. A UI mode selects the intended view, never adds permissions.
- Existing student timetable access uses today's placement. If you choose future-week or full historical access, implement a new date-aware rule and tests rather than removing that restriction casually.
- Homework has no learner submissions, marks or grading. Results review/publication stays in Phase 4.

**Done when:** every rule required by the next feature is written here. If you choose per-lesson attendance or designated register teachers, adapt section 06 before creating its schema; those choices require additional relationships.

---

## 03 — Prepare test identities and the development pattern

### Fictional accounts

- [ ] School A admin; two teachers responsible for different classes; two students; a guardian with a grant; another guardian relationship without a grant.
- [ ] A teacher+guardian multi-role account, to test that the child selector does not become the teacher's whole class roster.
- [ ] An unlinked account and a suspended account.
- [ ] School B admin, teacher and student with their own records.
- [ ] Use clearly fictional names and `example.invalid` addresses in fixtures. These addresses do not deliver email.

Create test Auth users through the trusted Supabase administrative process, then link their school memberships/roles/person records deliberately. Read `docs/SUPABASE_SETUP.md` and `docs/ACCOUNT_MANAGEMENT.md` as examples. Do not enable public signup or add a provisioning shortcut to the application. Keep passwords outside committed files and this guide.

The app is configured for one school. A School B account may correctly be forbidden by the School A UI. Use normal authenticated database/API sessions for cross-school denial tests; do not add a school switcher to test this. If you need a separate School B UI instance later, use an explicitly separate local process/configuration without changing the first instance's session or committing credentials.

### Existing patterns to reuse

| Existing file | Use it as an example for |
| --- | --- |
| `src/lib/auth-context.ts` | Verified identity, active school and membership; redirect behavior |
| `src/lib/supabase/server.ts` | User-session Supabase client; server-only cookie integration |
| `src/lib/permissions.ts` | Role type and coarse admin capability checks |
| `src/app/dashboard/registers/lifecycle-actions.ts` | Validate, call controlled RPC, handle stale version, revalidate |
| `src/components/enrollment-editor.tsx` | Client action state, confirmation and safe feedback |
| `src/lib/planning-data.ts` | Server-only reads and bounded related-record loading |
| `src/lib/list-pagination.ts` | Shared 50-row paging conventions |
| `src/components/record-search-select.tsx` | Retained selection, 25-choice search and error handling |
| `src/app/dashboard/search/actions.ts` | Admin-only search; **do not relax it for teachers** |
| `supabase/migrations/202610020010_register_membership_links.sql` | Existing identity helpers and role-scoped policies |
| `supabase/migrations/202610040014_teaching_assignment_lifecycle.sql` | Locks, expected versions, atomic history changes |
| `tests/register-database.test.ts` | Real SQL in PGlite with synthetic schools and authenticated-role tests |
| `tests/hardening-database.test.ts` | RLS/grant/function-hardening checks across migrations |

### Import and file-boundary rules

Put imports at the top, **after** `"use client"` or `"use server"` when that directive is required.

| File kind | Typical imports | Why |
| --- | --- | --- |
| Validation/types (`src/lib/*-validation.ts`) | `z` from `zod`; shared `Role` or input types via `import type` | Pure validation safe to share; no database or cookies |
| Server data (`src/lib/*-data.ts`) | `"server-only"`; existing `createClient`; `getSchoolContext`; pagination utilities | Keeps credentials/session reads on the server |
| Server action (`src/app/dashboard/<feature>/actions.ts`) | `revalidatePath` from `next/cache`; context/client; validation and permissions | Validates each mutation independently and refreshes affected views |
| Interactive component | `useActionState`, `useState` as needed from `react`; feature action; types | Handles interaction; does not authorize a request |
| Server panel | Data loader; pure row types; child forms; `Link` when needed | Fetches permitted data before rendering |
| Download route | Existing context/client and document helpers; `NextResponse` only if you actually use its methods | Authenticated HTTP file response |
| Tests | `it`, `expect`, `vi`, setup hooks from `vitest`; `PGlite` for SQL; React render helpers for markup | Uses the existing test tools |

Export synchronous schemas/types from `src/lib`, not from a `"use server"` action module. Do not import `server-only` loaders into client components. Do not add Prisma, another auth package, another router, React Query, a second database or a separate API server.

### Migration sequence proposed for your implementation

Use the next available numbers at the time you implement. These files **do not exist yet**. A date prefix is the date you create the migration; the example below assumes 5 October.

| Proposed path | Responsibility |
| --- | --- |
| `supabase/migrations/202610050017_role_read_models.sql` | Narrow role-facing context/timetable read functions |
| `supabase/migrations/202610050018_attendance.sql` | Attendance schema, policies and controlled save/read functions |
| `supabase/migrations/202610050019_homework.sql` | Homework, visibility and mutations |
| `supabase/migrations/202610050020_announcements.sql` | Announcements and audience rules |
| `supabase/migrations/202610050021_document_metadata.sql` | Document metadata and parent relationships |
| `supabase/migrations/202610050022_document_storage.sql` | Private bucket and Storage policies |

Never modify applied migrations to add these features. Introduce a later corrective migration if needed. Use `begin; ... commit;` for transactional schema changes. No migration should insert real users or send messages.

---

## 04 — Add role-aware navigation and explicit person context

### What and why

Give each role a useful workspace before attaching operational modules. Resolve the current person's linked records, not every row that a multi-role user's RLS happens to permit.

### Files and responsibilities

| Action | File | Responsibility and imports |
| --- | --- | --- |
| Create | `src/lib/portal-validation.ts` | `z` schemas for `mode`, `child`, dates and pages; `PortalMode`/`PortalActor` types |
| Create | `src/lib/portal-data.ts` | `import "server-only"`; context/client/types; resolve the caller's linked teacher/student/guardian and explicitly granted children |
| Create | `src/components/role-overview.tsx` | Server panel for the selected permitted mode; imports actor types and `Link` |
| Create | `src/components/child-selector.tsx` | Server-rendered GET form over already-authorized children; no client state library needed |
| Modify | `src/components/portal-shell.tsx` | Add verified role/mode-aware navigation for the live portal; leave its preview branch unchanged |
| Modify | `src/app/dashboard/page.tsx` | Parse allowed URL parameters and render new panels after verified context |
| Create | `tests/portal-context.test.ts` | Mode validation, child ownership, multi-role and empty-state tests |

### Implementation order

- [ ] In `portal-validation.ts`, define modes `teacher`, `student`, `guardian`. Keep admin planning as the existing admin views. Validate UUID child IDs and reject repeated query values for security-sensitive selectors.
- [ ] In `portal-data.ts`, call `getSchoolContext()`, narrow `status === "ready"`, then resolve the caller's membership with `school_id=context.school.id` and `user_id=context.userId` using the existing client. Do not accept a membership ID from the URL.
- [ ] Find person records through that verified membership ID. Query only the matching role's record. For guardians, fetch relationships for that guardian with `access_enabled=true`, then fetch only those child IDs.
- [ ] Require the selected child to be in this guardian list. Do not use the full readable `students` result as the guardian's children: a teacher+guardian can read additional students as a teacher.
- [ ] Treat a missing link as an empty state; treat a database error as unavailable. Do not translate every error into “you have no children.”
- [ ] Add `roles?: Role[]` and, if needed, `mode?: PortalMode` props to `PortalShell`. Import those with `import type` from the relevant lib files. Preserve its current defaults for `/preview`.
- [ ] Add links for `my-timetable`, `attendance`, `homework`, `announcements`, `documents` only as those sections become usable. Do not render unfinished modules as live features.
- [ ] Pass verified `context.roles` to live shell instances in `dashboard/page.tsx`; keep every existing admin branch protected.
- [ ] Replace only the current non-settings overview content with `RoleOverview` once ready. Preserve the settings branch and existing admin actions.

**Small pattern — add to `portal-validation.ts`:**

```ts
import { z } from "zod";

export const portalModeSchema = z.enum(["teacher", "student", "guardian"]);
export type PortalMode = z.infer<typeof portalModeSchema>;
export const selectedChildSchema = z.uuid();
```

Parsing makes the input well-formed. Checking `context.roles.includes(mode)` makes the mode permitted. Resolving the selected child makes the record relationship permitted. You need all three.

For a guardian GET selector, preserve `view` and `mode`, add `child`, and intentionally omit the old feature page number so selection returns to page one. Display child name plus school reference where needed to distinguish names. Never send a child's unrelated personal fields to the browser.

### Database/auth changes

Use existing memberships and roles; no new Auth system or user table. Existing RLS already supports own linked person records. If you introduce a context RPC in 017, give it the same narrow contract and test it; do not return all school members.

### Checks before moving on

- [ ] Teacher, student and guardian see appropriate empty/populated overviews.
- [ ] A guardian+teacher sees only linked children in the child selector.
- [ ] Forged `mode=school_admin`, another child's ID and repeated `child` parameters do not widen access.
- [ ] Suspended membership and inactive school fail closed on reload.
- [ ] Sign out/in across accounts and verify no cached personal content survives.
- [ ] Run `npm test -- tests/portal-context.test.ts`, then `npm run check`.

**Common mistakes:** replacing all of `dashboard/page.tsx`; changing the admin helper to mean “any teacher”; trusting a hidden role field; treating an unlinked register as a failed login; using public preview data as real dashboard content.

**Checkpoint 04:** role navigation works, and selected person/child context is explicitly validated.

---

## 05 — Build the read-only role timetable

### Existing limitation you must handle

`private.my_current_lesson_ids` in migration 010 uses today's enrollment. Teachers can read their own assignments, but students/guardians cannot simply join every teacher or teaching-assignment row. Reusing the admin `loadPlanning()` for them will produce missing labels or tempt you to broaden permissions incorrectly.

### Files

| Action | Path | Responsibility/imports |
| --- | --- | --- |
| Create | `src/lib/school-date.ts` | Pure school-timezone date/week helpers; built-in `Intl`, no date library initially |
| Create | `src/lib/my-timetable-data.ts` | `server-only`, context/client, portal types; call the narrow read function |
| Create | `src/components/my-timetable-panel.tsx` | Server display; imports loader and existing `weekdays`, `minuteLabel` from `@/lib/timetable-validation` |
| Modify | `src/app/dashboard/page.tsx` | Add `view=my-timetable` branch before final overview; import new panel |
| Create | Migration 017 above | `public.list_my_timetable` read contract below |
| Create | `tests/my-timetable-database.test.ts` and `tests/my-timetable.test.ts` | SQL permissions/date cases and rendering/input cases |

### Read-function contract to implement

`list_my_timetable(target_school uuid, requested_mode text, selected_student uuid, page_number integer)` returns only lesson ID, weekday, start/end minutes, effective lesson dates, subject name, class label and teacher display name. Bound pages consistently; return one lookahead row. Do not return teacher email, membership IDs or school-wide rosters.

- [ ] Validate active caller/school and exact permitted mode.
- [ ] For teacher mode, derive `private.my_teacher_id(target_school)`; ignore any client-supplied teacher ID.
- [ ] For student mode, require the linked student's own ID. For guardian mode, require a current explicit grant to `selected_student` belonging to the caller's guardian identity.
- [ ] Restrict lessons to that teacher or the selected student's current enrollment, with actual date/weekday overlap in the current school week. Do not return sibling lessons when one child is selected.
- [ ] Join related label tables inside this narrow function. A `SECURITY DEFINER` read is justified only if required to supply those labels through existing restrictions; pin `search_path=''`, qualify tables, explicitly authorize every returned lesson, revoke `public,anon`, grant only `authenticated`.
- [ ] Do not widen general `teachers` or `teaching_assignments` SELECT policies just to obtain labels.
- [ ] Retain pagination or fetch all bounded pages before claiming to display a complete week. A single page must say it is partial.

Use `private.school_today` for database decisions. In UI date code, use `Intl.DateTimeFormat(..., { timeZone: context.school.timezone, ... }).formatToParts()` to assemble a school-local date. Do not derive school “today” from the user's laptop timezone or assume `toISOString().slice(0,10)` is the local date.

### Browser/tests

- [ ] Check today, midnight/timezone boundaries, expired assignments and upcoming transfers.
- [ ] Confirm a future transfer does not expose the destination class early.
- [ ] Confirm teacher/student/guardian views contain no scheduling buttons.
- [ ] Test requested child tampering and teacher+guardian mode separation.
- [ ] Confirm an empty day is distinct from an incomplete page.
- [ ] Run targeted tests, `npm run check`, then apply 017 once and test with real Auth sessions using fictional people.

**Expected result:** read-only daily schedules use the existing lesson records and permissions. Admin timetable creation/removal continues unchanged.

**Common mistake:** using the unrestricted admin timetable search for a teacher/student view. Migration 016 is intentionally admin-only.

**Good first return point:** stop after 05 and send your checkpoint before building attendance.

---

## 06 — Build attendance rules in PostgreSQL first

This section assumes you selected daily class attendance in 02. If not, change this design before writing the migration.

### New files

- `supabase/migrations/202610050018_attendance.sql`: schema, constraints, permissions and controlled operations.
- `src/lib/attendance-validation.ts`: pure status/input/row types with `zod`.
- `tests/attendance-database.test.ts`: PGlite schema, permission, overlap and atomicity tests.
- `tests/attendance-validation.test.ts`: malformed dates, duplicate entries and status validation.

### Proposed schema contract

| Table | Required fields and rules |
| --- | --- |
| `attendance_sessions` | `id`, `school_id`, `class_id`, `attendance_date`, `record_version`, `created_by`, `created_at`, `updated_at`; unique `(school_id,class_id,attendance_date)` and `(id,school_id)` |
| `attendance_entries` | `id`, `school_id`, `session_id`, `student_id`, `enrollment_id`, `status`, `recorded_by`, `updated_at`; unique `(session_id,student_id)` |

Use same-school composite foreign keys for class, session and student. To reference an enrollment's school/student reliably, add a new unique constraint on existing `enrollments(id,school_id,student_id)` in 018, then use that tuple as the entry's FK. The save function must additionally prove enrollment class and attendance date match the session. Do not assume an enrollment primary key proves those relationships by itself.

Use finite dates and bounded strings. Index `(school_id,attendance_date,class_id)` and entry lookups such as `(school_id,student_id,session_id)`. Derive actor IDs from `auth.uid()` inside SQL; do not accept them from a form.

**Constraint example — add within 018 after both tables exist:**

```sql
alter table public.attendance_entries
  add constraint attendance_entry_session_school_fk
  foreign key (session_id, school_id)
  references public.attendance_sessions(id, school_id);
```

This shows the ownership pattern. Add the other constraints described above; this one FK does not authorize attendance writes.

### SQL functions to implement

| Function | Inputs | Required result/behavior |
| --- | --- | --- |
| `list_attendance_classes` | school, page | Admin sees school classes; teacher sees only their currently assigned classes; bounded labelled results |
| `get_attendance_register` | school, class, date, page | Authorized staff only; session/version plus dated roster and existing marks, bounded with lookahead |
| `save_attendance` | school, class, date, expected version, JSON entries, correction reason | Validate and atomically save explicit entries, return session ID/new version |
| `list_my_attendance` | school, mode, selected student, date range, page | Only the selected authorized child's/learner's entries and dates; never classmates' marks |

For `save_attendance`, implement this order:

1. Validate active school/member and admin or linked-teacher identity.
2. Validate class ownership and date; teacher must be assigned and, under the default policy, date must equal `private.school_today(school)`.
3. Acquire the same school-row lock used by enrollment lifecycle mutations. Re-check permission after locking. This serializes changes against transfers as well as concurrent attendance edits.
4. Locate the unique session. Use expected version `0` for a new session; existing sessions must match their positive version. Reject a racing creation/update with `40001` rather than silently overwriting.
5. Bound the JSON array size (for example, 100 entries per save), require valid statuses, reject duplicate student IDs and unknown extra fields where applicable.
6. For every entry, verify same-school student, matching session class and enrollment covering the attendance date. Resolve enrollment on the server; do not trust a supplied enrollment ID blindly.
7. Upsert only submitted marks. Omitted rows stay unchanged; no row means not marked. Never default the roster to present or absent.
8. Increment version once, derive actors and insert the audit event in the same transaction. Admin corrections to saved marks need the agreed reason; keep sensitive detail out of general logs.
9. Return the saved session/version. Any failed entry or audit operation must roll back the entire save.

Keep direct attendance mutations denied to ordinary authenticated clients; use controlled RPCs. Enable RLS on both tables. Admin reads may cover their school; teacher reads must follow the accepted date/responsibility rule. Student/guardian reads must be restricted to their own permitted entries. If you expose session rows to learners, do not expose class totals or other learners through that path.

For narrowly privileged functions, copy the *security pattern*, not the entire body, from migration 014: pinned search path, qualified names, permission checks, lock, version check, transaction and restricted grants. SQL functions live in SQL migrations; do not invent TypeScript imports for `private.*` helpers.

### Validation example — create in `attendance-validation.ts`

```ts
import { z } from "zod";

export const attendanceStatus = z.enum(["present", "absent", "late", "excused"]);
export type AttendanceStatus = z.infer<typeof attendanceStatus>;
export const attendanceBatch = z.object({
  classId: z.uuid(),
  date: z.iso.date(),
  version: z.coerce.number().int().min(0),
  entries: z.array(z.object({
    studentId: z.uuid(),
    status: attendanceStatus,
  }).strict()).min(1).max(100),
  reason: z.string().trim().max(500).default(""),
}).strict().refine(v => new Set(v.entries.map(e => e.studentId)).size === v.entries.length);
```

This validates shape, not authority. Mirror the necessary bounds in SQL because clients can call an RPC directly.

### Tests before any attendance UI

- [ ] Success for admin and authorized teacher; failure for unrelated teacher, student, guardian, anonymous, suspended and School B callers.
- [ ] Duplicate session/entry protection; missing entries remain unmarked.
- [ ] Wrong class, wrong enrollment, cross-school IDs, invalid dates, future dates for teacher, unsupported statuses.
- [ ] Two stale versions: one succeeds, second fails without partial edits.
- [ ] Enrollment changes serialize correctly; attendance history remains retained after later transfers.
- [ ] Forced audit failure rolls back marks and version.
- [ ] Denied direct INSERT/UPDATE/DELETE, not only denied UI actions.

Run `npm test -- tests/attendance-database.test.ts tests/attendance-validation.test.ts` and `npm run check`. Apply 018 only once after local SQL tests pass. Do not call the module complete because its migration ran.

---

## 07 — Add attendance server actions and screens

### File work

| Action | File | Responsibility/imports |
| --- | --- | --- |
| Create | `src/lib/attendance-data.ts` | `server-only`, context/client, pagination and attendance types; call the bounded read RPCs |
| Create | `src/app/dashboard/attendance/actions.ts` | `"use server"`, `revalidatePath`, context/client, `attendanceBatch`; staff save requests |
| Create | `src/app/dashboard/attendance/search-actions.ts` | Staff-authorized class-choice search using `list_attendance_classes`; return `RecordSearchResult` |
| Create | `src/components/attendance-panel.tsx` | Server panel: resolve permitted mode/class/date, read roster or own-history view |
| Create | `src/components/attendance-form.tsx` | `"use client"`, `useActionState`, `useState`, types and `saveAttendance`; mark explicit rows and submit |
| Modify | `src/app/dashboard/page.tsx`, `src/components/portal-shell.tsx` | Add the view branch and permitted navigation; preserve existing admin guards |
| Create | `tests/attendance-actions.test.ts`, `tests/attendance-form.test.ts` | Action/validation/error contracts; controlled form and empty-state behavior |

Do not add a general teacher bypass to `isSchoolAdminContext`. In the new action, make a coarse active staff check, then let the SQL function check the particular class/date. Use the existing user-context client.

**Action pattern — in the new `attendance/actions.ts`, after defining the complete SQL contract:**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { attendanceBatch } from "@/lib/attendance-validation";

export async function saveAttendance(
  _previous: { error: string; saved: boolean }, form: FormData,
) {
  const context = await getSchoolContext();
  if (context.status !== "ready" ||
      !context.roles.some(r => r === "school_admin" || r === "teacher")) {
    return { error: "Attendance access is required.", saved: false };
  }
  let entries: unknown;
  try { entries = JSON.parse(String(form.get("entries") ?? "")); }
  catch { return { error: "Check the attendance entries.", saved: false }; }
  const parsed = attendanceBatch.safeParse({
    classId: form.get("classId"), date: form.get("date"),
    version: form.get("version"), entries, reason: form.get("reason") ?? "",
  });
  if (!parsed.success) return { error: "Check the register and try again.", saved: false };
  const client = await createClient();
  const { data, error } = await client.rpc("save_attendance", {
    target_school: context.school.id,
    target_class: parsed.data.classId,
    attendance_date: parsed.data.date,
    expected_version: parsed.data.version,
    entries: parsed.data.entries,
    correction_reason: parsed.data.reason,
  });
  if (error || !data) return {
    error: error?.code === "40001" ? "This register changed. Reload before saving."
      : "Could not save attendance. Check your access and entries.", saved: false,
  };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
```

Match your SQL argument names exactly to this action or update both together. Catch transport failures around the database call with a generic user message, without swallowing the authentication redirect. Do not log form payloads or private database errors.

### UI implementation

- [ ] Use the shared search selector with a dedicated staff search action; preserve its selected ID while searching. Do not call the existing admin-only generic search as a teacher.
- [ ] Put the current session version in a hidden field. Key the editor by session ID/version so a refreshed record initializes correctly.
- [ ] Use controlled status inputs. Serialize only intentional marks into the hidden JSON `entries` field. Show unmarked rows explicitly.
- [ ] Submit at most the configured batch size. If a class roster spans pages, make “save this page” clear; omitted pages must never be reset.
- [ ] Disable duplicate submissions while pending. Display errors with `role="alert"` and saved feedback with `role="status"`.
- [ ] For learners/guardians, render a separate read-only history list from `list_my_attendance`, not the staff form with disabled buttons.
- [ ] Keep correction reasons staff-only; do not display internal notes to children by accident.

**Browser gate:** mark a fictional class; refresh; correct as admin; submit an old form in another tab; transfer a learner; test related/unrelated guardian and teacher accounts. Expected result is correct dated marks and safe conflict feedback, not silent overwriting.

**Common mistakes:** treating a role check as class authorization; defaulting every row to present; forgetting to pass the refreshed version; clearing marks on an unsubmitted page; using UTC as the school date.

---

## 08 — Implement homework without submissions

### Files

Create `src/lib/homework-validation.ts`, `src/lib/homework-data.ts`, `src/app/dashboard/homework/actions.ts`, `src/components/homework-panel.tsx`, `src/components/homework-form.tsx`, `tests/homework-database.test.ts`, `tests/homework-actions.test.ts` and `tests/homework-validation.test.ts`. Use the import/file recipes in 03: Zod/types in validation, `server-only` in data, action directive/context/client/revalidation in actions, React action state only in the interactive form.

Create migration 019. Modify the dashboard's parameter type/view branch and shell navigation only after the read/write paths are ready.

### Database and functions

- [ ] Create `homework_items`: UUID identity, school, teaching assignment, class, academic year, title, instructions, due date, `draft|published|withdrawn`, fixed audience date, author, first publication timestamp, version and timestamps.
- [ ] Add `(id,school_id)` uniqueness for later document links. Add any composite unique assignment tuple needed to enforce matching assignment/school/class/year. Derive class/year from the assignment in the save RPC.
- [ ] Use a `date` due date initially if you do not need time-of-day deadlines. Do not render a timezone-less `datetime-local` value as UTC.
- [ ] Bound title/instructions, for example 160 and 10,000 characters. Render plain text, not arbitrary HTML.
- [ ] Implement `save_homework` for create/update/publish/withdraw. Validate assignment ownership, active current responsibility, dates and version; lock consistently; derive author on create and prevent clients changing it.
- [ ] Author identity alone must not grant permanent editing. Admin can manage school content; a teacher must still meet the current permission rule.
- [ ] Set `audience_date` once at initial publication. Avoid silently retargeting historical content by changing that date on edit.
- [ ] Implement read predicates using the policy accepted in 02. A suggested learner rule is published work for their current class, plus past class work whose audience date overlapped their enrollment. Guardian access adds the current explicit child grant.
- [ ] Implement `list_homework` as bounded, school-scoped reads with validated mode/child/filters. Use a narrow read function when you need labels the caller cannot obtain directly.
- [ ] Direct mutations remain denied; drafts and withdrawn records are readable only by permitted staff, not recipients.

### Assignment choices: reuse carefully

Add a new `src/app/dashboard/homework/search-actions.ts` if a selector is needed. Teachers need their own currently writable assignments, not `search_timetable_assignments`, which is admin-only. Add a bounded SQL search in 019 that derives the teacher identity and returns only permitted assignment labels/dates. Admin can receive school-wide choices. The shared `RecordSearchSelect` accepts a custom `searchAction`; reuse that UI rather than building another dropdown system.

### Frontend

- [ ] Teacher form: assignment, title, instructions, due date, save draft/publish, explicit withdrawal/edit controls.
- [ ] Student/guardian list: title, subject/class context, instructions, due date and publication state appropriate to recipients.
- [ ] No submit/upload/grade/mark-complete control for learners. Do not create a submissions table.
- [ ] Add plain text attachment placeholders only when the document module is actually connected; do not expose fake download links.

**Safe body rendering — in `homework-panel.tsx`:**

```tsx
<p className="whitespace-pre-wrap">{item.instructions}</p>
```

React escapes this text. Do not replace it with `dangerouslySetInnerHTML` to preserve line breaks.

### Acceptance

- [ ] Test draft invisibility, publication, withdrawal, stale update, invalid assignment, old teacher without current rights, multi-role mode and forged child/school IDs.
- [ ] Test learner transfer before/after audience date under your chosen policy.
- [ ] Test two teaching periods with the same subject/class; date labels must disambiguate them.
- [ ] Run targeted tests, then full check; apply 019 and exercise with separate fictional accounts.

**Expected result:** authorized staff publish work and intended recipients read it. There is no submission or marking workflow.

---

## 09 — Implement announcements inside the portal

### Files/imports

Create `src/lib/announcement-validation.ts`, `src/lib/announcement-data.ts`, `src/app/dashboard/announcements/actions.ts`, `src/components/announcements-panel.tsx`, `src/components/announcement-form.tsx`, `tests/announcements-database.test.ts`, `tests/announcements-actions.test.ts` and migration 020. Follow the same import boundaries as homework; reuse the existing client, context, action state and pagination.

If teachers choose classes, reuse the authorized class search from attendance, provided its contract matches current class responsibility. Do not duplicate it just to rename the button. Add view wiring in the existing dashboard and shell.

### Proposed schema

- `announcements`: school-owned identity, title, body, author, draft/published/withdrawn status, first publication/audience date, optional expiry, version and timestamps.
- For a minimal first release, select exactly one audience: whole school or one class. Use an `audience_kind` check and a nullable same-school `class_id` whose nullability matches the audience kind.
- If you decided one announcement must target several classes, use `announcement_classes(announcement_id,school_id,class_id)` with composite FKs and uniqueness. Do not put comma-separated IDs into a text column. This is a decision in 02, not a required extra feature.
- Add `(id,school_id)` uniqueness for document references.

### SQL/backend rules

- [ ] Admin may manage school announcements. A teacher may create/manage only within the accepted current class responsibility rule.
- [ ] Only admin may select school-wide audience unless you explicitly chose otherwise.
- [ ] Set first publication and author server-side. Use version checks and audit each mutation.
- [ ] Drafts/withdrawn announcements never appear in recipient reads. Expiry and audience must be evaluated on every read, not merely filtered in JSX.
- [ ] School-wide published notices are readable by active school members; class notices require the relevant current/dated relationship you selected in 02.
- [ ] An audience edit must not silently broaden an existing publication. Prefer an explicit reviewed update or withdraw/new publication under the accepted policy.

### UI and checks

- [ ] Staff authoring form with clear audience wording and explicit publication action.
- [ ] Recipient feed with date/context; paginate by publication time and ID.
- [ ] Plain text rendering and bounded text lengths; test `<script>` and HTML-like input as text.
- [ ] Test school-wide/class separation, expired content, drafts, stale edits, audience tampering, changed teacher responsibility and child grants.
- [ ] No email/SMS/WhatsApp delivery code, provider keys, scheduled jobs or n8n workflows.

**Expected result:** announcements are visible inside the portal to the intended audience. A portal feed is not proof of an external notification service.

---

## 10 — Add private PDF documents, then attach them to content

This module has two independent security surfaces: metadata in PostgreSQL and bytes in Storage. Both must enforce the same audience.

### 10A. Choose the upload path and limits

The current CSP in `src/lib/csp.ts` allows browser connections only to this app. Keep that architecture: browser → Server Action → user-context Supabase Storage. Download through an authenticated same-origin route. No browser Supabase client, public bucket, frame embedding or broad CSP exception is required.

The installed Next.js guide states Server Actions default to a 1 MB body limit. For a **2 MiB file policy**, configure a **3 MB request-body allowance** for multipart overhead. Check the eventual hosting limit separately before deploying. This is a real configuration change needed for this chosen upload size.

**Modify `next.config.ts`: add this property to the existing `config` object; do not replace its root, headers or logging settings:**

```ts
experimental: {
  serverActions: { bodySizeLimit: "3mb" },
},
```

If `experimental` already exists when you get here, merge into it. Read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` before editing. Restart the local dev server yourself after config changes. Keep plain attendance/homework inputs bounded too; the larger request allowance applies to all actions.

### 10B. File map and imports

| Action | File | Responsibility/imports |
| --- | --- | --- |
| Create | `src/lib/document-validation.ts` | `z`, metadata schemas, `DOCUMENT_BUCKET`, `MAX_PDF_BYTES`; pure types/constants |
| Create | `src/lib/document-files.ts` | `server-only`; bounded byte/header checks and safe download-name helper; no claims of malware scanning |
| Create | `src/lib/document-data.ts` | `server-only`, context/client; authorized metadata reads and parent labels |
| Create | `src/app/dashboard/documents/actions.ts` | `"use server"`, context/client, `revalidatePath`, validation/file helpers; upload/finalize/remove workflow |
| Create | `src/components/documents-panel.tsx` | Server list of permitted files and attachment context |
| Create | `src/components/document-upload-form.tsx` | `"use client"`, `useActionState`, upload action/types; PDF chooser and feedback |
| Create | `src/app/dashboard/documents/[id]/download/route.ts` | Authenticated GET download using existing server client and document helpers |
| Modify | `src/components/homework-panel.tsx`, `src/components/announcements-panel.tsx` | Show only authorized ready attachments; links to the same-origin download route |
| Modify | dashboard page and portal shell | Documents view, staff upload controls, read-only recipient list |
| Create | `tests/documents-database.test.ts`, `tests/documents-actions.test.ts`, `tests/document-files.test.ts`, `tests/document-download.test.ts` | Metadata ACL, state transitions, mocked Storage failures, size/type and HTTP header tests |

No extra package is needed for a bounded byte check and download response. `File`, `Uint8Array`, `TextDecoder` and `Response` are available APIs. A prefix check is not a PDF parser or malware scanner. Add a scanning/parser dependency only after choosing and evaluating that requirement; do not label files “safe” based on extension or prefix.

### 10C. Metadata schema and ownership

In migration 021 create `documents` with:

- `id`, `school_id`, `bucket_id`, generated `storage_path`, original display filename, declared MIME type and byte size.
- Uploader derived from `auth.uid()`, created time, version.
- State such as `pending`, `ready`, `deleting`, `deleted`, `failed`.
- Exactly one parent: homework ID, announcement ID or class ID, enforced with a CHECK and same-school composite FKs.

For the first implementation, one file belongs to one parent. This avoids a file accidentally becoming readable to the union of unrelated audiences through shared attachments. To reuse the same PDF for another audience, create a separate document object until a shared-document policy is deliberately designed.

Create a narrow `private.can_read_document(school,id)` helper that derives access from the parent and document state. It must not grant access merely because the caller is the uploader, knows the path or belongs to the school. Staff draft access and recipient publication access differ. Add an equivalent upload/manage predicate based on authorized parent ownership; a teacher cannot attach a file to an unrelated teacher's draft.

If helpers use `SECURITY DEFINER` to avoid recursive RLS, constrain them to this purpose, derive caller identity internally, pin the search path and test forged IDs directly. Do not let a helper accept a caller-supplied user ID as authority.

Implement controlled metadata functions:

| Function | Required behavior |
| --- | --- |
| `begin_document_upload` | Check parent/write authority, size/type bounds; create pending row and generated path; return ID/path |
| `finish_document_upload` | Re-check caller, ownership, pending state, intended storage object and metadata; make it ready atomically with audit |
| `begin_document_delete` | Check current manage authority/version; set deleting so normal reads stop |
| `finish_document_delete` | Record completed physical removal; retain minimal audit/history |
| `list_documents` | Bounded permitted ready/staff-pending metadata only, with validated parent/child filters |

Generated paths can follow `<school_uuid>/<document_uuid>/<random_uuid>.pdf`. Use server/SQL-generated UUIDs; do not use raw user filenames as object keys. Do not let the browser choose another school's prefix.

### 10D. Storage configuration and policies

In migration 022, configure a private bucket named `school-documents`, maximum 2 MiB, allowed MIME `application/pdf`. These are restrictions, not proof of safe contents. Keep the setup reproducible. If you use the Dashboard to create the bucket, make your migration handle its already-existing state deliberately rather than creating an unrelated second bucket. [Supabase bucket rules](https://supabase.com/docs/guides/storage/buckets/fundamentals)

Define narrow policies on `storage.objects` scoped to this bucket:

- INSERT: exact pending metadata path; caller is its authorized uploader; parent authorization still valid.
- SELECT: permitted ready document, or tightly scoped uploader/admin access needed to verify their own pending upload. A pending file must not become visible to recipients.
- DELETE: permitted deletion workflow/cleanup for that exact metadata record.
- UPDATE: deny initially. Use unique paths and `upsert:false`; replacements create a new document instead of overwriting bytes already linked to a record.

Never use a policy that allows every authenticated user to read the entire bucket. Storage policies are separate from your `documents` table policies. [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

**Test-harness consequence:** the current PGlite fixtures create `auth`, not a full Supabase Storage service. Once migration 022 references `storage.buckets`/`storage.objects`, add a small test-only Storage schema stub *before migrations* in SQL fixtures that apply the full chain. Prefer one `tests/helpers/storage-fixture.ts` setup helper imported by those fixtures, rather than repeating stub SQL everywhere. Reproduce only fields/functions your policies use, enable RLS and appropriate test grants, and clearly label this as a policy fixture. Do not skip the migration when Storage is missing in production. Actual bucket/file operations still require hosted checks.

### 10E. Upload action sequence

- [ ] Verify active context and staff capability before parsing/processing file bytes.
- [ ] Validate parent ID/type, filename length, `File` presence and `file.size` before allocating an ArrayBuffer.
- [ ] Enforce 2 MiB on the server and bucket. Browser `accept="application/pdf"` is only a convenience.
- [ ] Check declared MIME, extension and PDF header bytes. Reject obvious mismatches; do not mistake this for a full safety scan.
- [ ] Call `begin_document_upload`; use its generated path.
- [ ] Upload with the existing user-context Supabase client, `contentType:"application/pdf"`, `upsert:false`.
- [ ] Call finalization only after a successful upload and required validation. Re-check the parent permission/publication state there.
- [ ] If upload fails, keep a recoverable failed/pending state. If finalization fails, remove the newly uploaded object through the Storage API where permitted; if cleanup also fails, keep enough metadata for admin cleanup.
- [ ] Revalidate affected dashboard views only after the actual outcome is known.

**Focused pattern — inside the upload action after context and file checks:**

```ts
const bytes = new Uint8Array(await file.arrayBuffer());
const prefix = new TextDecoder("ascii").decode(bytes.subarray(0, 5));
if (prefix !== "%PDF-") {
  return { error: "Choose a PDF document.", saved: false };
}
// `path` must come from your authorized begin_document_upload result.
const { error: uploadError } = await client.storage
  .from(DOCUMENT_BUCKET)
  .upload(path, bytes, { contentType: "application/pdf", upsert: false });
```

This is intentionally a strict basic header check for the chosen upload path. It can reject unusual PDFs and cannot detect malicious PDFs. **An authorized caller can also invoke Storage/RPC endpoints directly.** Application byte checks are not a database-enforced guarantee that every stored object was scanned. `ready` should mean workflow completion, not “malware-free.” If your accepted policy requires trusted validation before any download, use a separately authorized validation service and restrict its state transition; do not invent a client-set `scan_passed` flag or put an elevated key in this app.

### 10F. Authenticated download route

Create `src/app/dashboard/documents/[id]/download/route.ts`. This is a Route Handler, not a `page.tsx`, because it returns PDF bytes rather than a UI page. Keep downloads as attachments initially; existing CSP blocks object/frame embedding intentionally.

**Route shape — implement the indicated checks before returning bytes:**

```ts
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DOCUMENT_BUCKET } from "@/lib/document-validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getSchoolContext();
  if (context.status !== "ready") return new Response(null, { status: 403 });
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return new Response(null, { status: 404 });
  const client = await createClient();
  // Read only the authorized ready metadata by parsed.data + context.school.id.
  // Return 404 if absent/denied; do not reveal whether another school owns it.
  // Download its stored path with client.storage.from(DOCUMENT_BUCKET).download(...).
  // Check download error/size and apply your accepted file-validation policy.
  // Return the Blob with private no-store and safe attachment headers.
  return new Response(null, { status: 501 }); // Scaffold: replace only after checks exist.
}
```

The 501 is a deliberate unimplemented scaffold, not a finished endpoint. Do not leave it in a completed feature. Final response headers should include `Content-Type: application/pdf`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment` with a sanitized/encoded filename. Never interpolate raw CR/LF or quotes from an uploaded filename into a header. Use a safe fallback such as `document.pdf`.

Return the downloaded `Blob`/stream as the response body. Reuse the existing cookie-aware client; do not create a service-key client or redirect to a public object URL. Set private no-store headers on sensitive error responses too. Permission changes cannot retract a file already downloaded to a user's device.

Signed URLs are an alternative, not required here. They are bearer links and have revocation/cache implications; do not claim a removed guardian grant immediately invalidates a previously issued link. [Supabase download guidance](https://supabase.com/docs/guides/storage/serving/downloads)

### 10G. Deletion, attachments and acceptance

- [ ] Use Storage `.remove()` for bytes. Do not delete rows from `storage.objects` using raw SQL to pretend the physical file is removed.
- [ ] Preserve the metadata row until byte deletion outcome is known, so policy checks and retries can locate it. A deleting record must no longer appear in recipient reads.
- [ ] Replacement uploads use new IDs/paths and an explicit attachment change; do not overwrite an old file while someone is reading it.
- [ ] Add attachment links to homework/announcements only after permission checks apply to both metadata and bytes.
- [ ] Test School B guessed paths, anonymous downloads, student uploads, unauthorized teacher parents, guardian grant removal, draft parents, filenames with CR/LF, oversize/fake PDF, duplicate upload, interrupted upload, finalize failure, cleanup failure and delete retry.
- [ ] Run local policy/action/route tests and the full check. Apply 021/022 in order and perform actual hosted uploads/downloads with fictional PDFs.

**Expected result:** authorized staff upload bounded PDFs, permitted recipients download them, denied requests reveal no protected content, and failure states remain recoverable.

---

## 11 — Integrate the daily overview without duplicating feature logic

Modify `src/components/role-overview.tsx` and, if useful, create `src/lib/dashboard-data.ts` with `import "server-only"`. Reuse the feature read functions; do not introduce parallel SQL with weaker filters just for counts.

| Mode | Useful content |
| --- | --- |
| Admin | Today's attendance completion, relevant operational links and published notices |
| Teacher | Own current schedule, permitted class registers and homework/announcement shortcuts |
| Student | Current schedule, published homework/notices and own attendance summary |
| Guardian | Explicit child selector and that child's permitted daily information |

- [ ] Count only permitted records. “There are 12 absent learners” can leak information even without names.
- [ ] Define attendance completion accurately: missing entries are unmarked, not absent. Do not call a partially saved class register complete.
- [ ] Use bounded reads and date filters. Avoid a separate query for every child or list row; batch authorized IDs as existing loaders do.
- [ ] Keep each selected mode/child scoped even when the caller has multiple roles.
- [ ] Remove outdated overview text saying attendance is unavailable only after it is working. Keep marks/finance described as future modules.
- [ ] Check mobile navigation, focus states, keyboard operation, labels, empty states, error states, loading and duplicate clicks.
- [ ] Keep `/preview` static. Do not point its cards at protected data as a shortcut.

New tests can live in `tests/dashboard-data.test.ts` and `tests/role-overview.test.ts`, using `vi`-mocked loaders and React static rendering. Existing preview browser tests must still pass.

**Expected result:** daily information is connected through the existing architecture, with no duplicated authorization paths.

---

## 12 — Run the acceptance sequence

### 12A. Local commands

Run focused tests as you implement; then run the full suite once the increment is ready:

```powershell
npm run check
npm run test:e2e
```

The existing `playwright.config.ts` deliberately clears Supabase settings and uses port 3001. It tests disconnected/preview behavior, **not** hosted attendance, document policies or real Auth sessions. Do not silently point it at school data.

For its production-only security-header coverage:

```powershell
$env:SCHOOL_PORTAL_E2E_PRODUCTION = "true"
try { npm run test:e2e }
finally { Remove-Item Env:SCHOOL_PORTAL_E2E_PRODUCTION -ErrorAction SilentlyContinue }
```

This builds/starts a disconnected test server. Run it separately from a build that is using the same `.next` output. If a test server fails to exit, identify only its process; do not kill all Node processes or your regular app server blindly. An intentional development-mode skip of the production-header test is not a Phase 3 pass/fail result.

### 12B. Database verification

- [ ] Apply the migration chain to a fresh disposable local test fixture and test upgrade from the existing fictional-data baseline.
- [ ] Verify all new public tables have RLS, expected same-school FKs, uniqueness and useful indexes.
- [ ] Verify function grants: anonymous/public execution revoked where appropriate; privileged functions pin `search_path` and derive caller identity.
- [ ] Exercise denied direct reads AND writes with real authenticated contexts for two fictional schools.
- [ ] Test stale versions and simultaneous changes using independent sessions. PGlite serial tests alone do not establish hosted concurrency behavior.
- [ ] Verify Storage policies separately with real file operations; the test stub cannot prove the Storage service's behavior.
- [ ] Review audit entries for correct actor, action, school and version without leaked credentials or excessive personal data.

A read-only inventory query for your SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('attendance_sessions','attendance_entries','homework_items','announcements','documents');

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname in ('public','storage')
order by schemaname, tablename, policyname;
```

These queries inventory configuration; they do not test a user's authorization. SQL Editor queries often run with privileges that ordinary users do not have. Test normal authenticated requests with the publishable key and a user session, never a service-role key as your “RLS test.”

For denied reads, zero rows can be the correct outcome. For denied writes, verify unchanged data as well as the error. A UI button disappearing is not evidence of backend denial.

### 12C. Browser matrix — record results, not just a general tick

| Scenario | Expected result | Result / date / notes |
| --- | --- | --- |
| Admin operates own-school modules | Allowed under defined rules | |
| Teacher operates assigned class today | Allowed; unrelated classes denied | |
| Student requests own vs another student's data | Own only | |
| Guardian switches to granted vs forged child ID | Granted child only | |
| Relationship exists without access grant | No child data | |
| Teacher+guardian changes mode | Mode-specific data; no expanded child list | |
| Unlinked/suspended account, inactive school | No protected derived access | |
| School B guesses School A IDs/paths | No protected reads or writes | |
| Anonymous URL/action/Storage request | No protected data or mutation | |
| Future transfer/replacement | No early access change | |
| Draft/withdrawn/expired content | Hidden from recipients as agreed | |
| Two tabs submit an old version | Safe conflict, no partial overwrite | |
| Parent removed while another session is open | Subsequent requests re-check permissions | |
| PDF bytes and metadata operations fail separately | Recoverable state; no unauthorized object leak | |
| Refresh, sign out/in, back navigation | No prior user's cached data | |
| Page/search/filter boundaries | No hidden required choices or false “complete” lists | |
| Keyboard/mobile/error behavior | Usable and clear | |

Inspect network responses and database state when checking a failure. Omit passwords/tokens from screenshots, notes and logs. Use only fictional data. Keep the local server bound to localhost; no public deployment is required for this acceptance exercise.

### 12D. Phase 3 completion checklist

- [ ] Policy decisions in 02 are accepted and reflected consistently in SQL, actions and UI.
- [ ] Role navigation, linked-person resolution and guardian child selection work.
- [ ] Read-only role timetables use correct current/date-scoped access and complete/clearly paged results.
- [ ] Daily attendance records explicit statuses, preserves history, rejects unauthorized/concurrent invalid changes and supports agreed corrections.
- [ ] Homework has drafts/publication/withdrawal as agreed, correct audiences and no learner submissions.
- [ ] Announcements enforce school/class audience, publication and expiry rules.
- [ ] PDF upload/download/removal enforces parent ownership, private storage, bounds and the accepted file-safety policy.
- [ ] Dashboard summaries reuse the same permissions as detail views.
- [ ] All new tables/functions/storage policies have tested role and school boundaries.
- [ ] Local checks and production build pass; test counts and failures are recorded accurately.
- [ ] Connected browser and Storage checks are complete; no deferred scenario is described as passed.
- [ ] All new migrations are applied once to the intended test project; old migrations remain intact.
- [ ] Existing Phase 1/2 workflows and `/preview` still work.
- [ ] No elevated app credentials, real records, submissions, marks, fees, notifications service, n8n, AI or SaaS-owner UI were introduced accidentally.
- [ ] Remaining live-readiness tasks are explicitly separated: account recovery/email delivery, admin security policy, backup/restore rehearsal including stored files, monitoring, deployment and school acceptance before real learner data.
- [ ] You have reviewed the result and accepted Phase 3. A successful build alone does not complete it.

---

## Returning to this chat and keeping progress consistent

Update this temporary progress board as you work. Do not mark a proposed migration as applied until you actually apply it. Do not mark a browser scenario complete because an automated unit test passed.

Use one line per milestone:

| Date | Checkpoint/task IDs | Change or decision | Local tests | Hosted migration/check | Commit / outstanding issue |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

When you return, paste:

```text
School Portal — Phase 3 checkpoint
Completed sections/tasks:
Current unfinished task:
Accepted/changed policy decisions:
New or changed files:
Migration filenames actually applied:
Local test commands/results:
Browser/security scenarios completed:
Known errors or deferred checks:
Git commit or uncommitted-work notes:
What I want help with next: explanation / read-only review / specific implementation
```

Do not include credentials or real personal data. I will use your report and the actual files as the new checkpoint, retain unfinished items, and ask before assuming a policy decision you have not made. Your instruction is guidance-first: I should not code, apply SQL or operate the browser unless you specifically ask.

This guide is the only project Markdown file created for the Phase 3 plan. Existing documentation stays at the completed-work checkpoint. The project memory records where this guide is and that Phase 3 implementation is user-led; it does not claim any of these tasks are complete.
