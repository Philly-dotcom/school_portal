# File guide

Updated 8 October 2026. This is a map of the current checkout, not a proposed new folder structure. Start with the part you are working on; you do not have to read every file in order.

A `.tsx` file can contain screen markup and TypeScript. A `.ts` file contains TypeScript without that markup. `page.tsx` makes a route; our `actions.ts` files handle form submissions on the server. A migration is a saved SQL change to the database. An RPC is a database function the app calls. RLS means row-level security: the database checks which rows the signed-in account may read or change.

## Follow one example

When you create a grade, `src/app/dashboard/page.tsx` selects the Academic setup panel. `academic-panel.tsx` loads the existing structure, and `academic-form.tsx` displays the form. Submitting calls `src/app/dashboard/academic/actions.ts`, which verifies the school admin and validates the input using `academic-validation.ts`. The user's Supabase client writes to PostgreSQL, where grants, constraints and RLS check the request again. The form then shows success or an error. `academic-actions.test.ts` checks the handler with mocked calls, while `academic-database.test.ts` checks real SQL locally.

A **register record** is a student, teacher or guardian entry. An **Auth account** is a sign-in. A **membership** connects that account to a school and roles. Keeping those separate is why the login-link files exist.

## Root files and tooling

| File | What it does |
| --- | --- |
| [README.md](../README.md) | The starting point: current progress, how to run the app and where to read next. |
| [AGENTS.md](../AGENTS.md) | Project rules for coding assistants: keep the project isolated, preserve permissions and use the agreed stack. |
| [package.json](../package.json) | Lists dependencies and the commands behind npm run dev, check, build and test:e2e. |
| [package-lock.json](../package-lock.json) | Records the exact dependency versions npm ci installs. Keep it with package.json. |
| [.env.example](../.env.example) | A blank configuration template. It contains variable names, not your actual credentials. |
| [.gitignore](../.gitignore) | Keeps local secrets, installed packages, generated builds and test output out of Git. |
| [next.config.ts](../next.config.ts) | Next.js settings: project roots, security headers and avoiding token-confirmation request logging. |
| [next-env.d.ts](../next-env.d.ts) | Generated Next.js TypeScript references. The dev server and build may update it; it is not feature code. |
| [tsconfig.json](../tsconfig.json) | TypeScript rules and the @/ import shortcut for src/. |
| [eslint.config.mjs](../eslint.config.mjs) | The code-quality rules used by npm run lint. |
| [postcss.config.mjs](../postcss.config.mjs) | Connects Tailwind to the CSS build. |
| [vitest.config.mts](../vitest.config.mts) | Selects the local test files and configures the test runner, including a single worker. |
| [playwright.config.ts](../playwright.config.ts) | Starts a separate disconnected browser-test app on port 3001; chooses Edge on Windows and supports production mode. |
| [.github/workflows/check.yml](../.github/workflows/check.yml) | Defines GitHub checks for dependency audit, lint, types, tests, build and production browser tests. Having this file does not prove a remote run passed. |
| [.github/dependabot.yml](../.github/dependabot.yml) | Asks GitHub to propose dependency/action updates. Proposed updates still need review. |
| [scripts/production-e2e-server.mjs](../scripts/production-e2e-server.mjs) | Builds and starts the app for production-mode browser tests, using the disconnected environment supplied by Playwright. |
| [archive/2026-10/school_portal_improvements.patch](../archive/2026-10/school_portal_improvements.patch) | The earlier supplied patch, now archived for reference. It is not loaded by the application and should not be applied again blindly. |

## Routes and form handlers — src/app

| File | What it does |
| --- | --- |
| [src/app/layout.tsx](../src/app/layout.tsx) | Wraps every page with the app's HTML layout, metadata, styles and request nonce for script security. |
| [src/app/globals.css](../src/app/globals.css) | Shared appearance: layout, navigation, panels, forms and responsive styles. |
| [src/app/page.tsx](../src/app/page.tsx) | Sends the root URL to the dashboard when configured, or the public preview otherwise. |
| [src/app/error.tsx](../src/app/error.tsx) | Shows the route error screen with a retry action. |
| [src/app/not-found.tsx](../src/app/not-found.tsx) | Shows the page for an unknown route. |
| [src/app/preview/page.tsx](../src/app/preview/page.tsx) | Chooses the static preview view. It does not read school records. |
| [src/app/login/page.tsx](../src/app/login/page.tsx) | Displays sign-in and handles the unconfigured-app state. |
| [src/app/login/actions.ts](../src/app/login/actions.ts) | Handles password sign-in and sign-out on the server. |
| [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx) | Verifies school access and selects the overview or an admin panel using the view query parameter. |
| [src/app/dashboard/actions.ts](../src/app/dashboard/actions.ts) | Validates and saves the school name and timezone for an authorized admin. |
| [src/app/dashboard/academic/actions.ts](../src/app/dashboard/academic/actions.ts) | Handles creation of academic years, terms, grades, subjects and classes. |
| [src/app/dashboard/registers/actions.ts](../src/app/dashboard/registers/actions.ts) | Handles student, teacher and guardian creation, family links and initial class enrollment. |
| [src/app/dashboard/registers/link-actions.ts](../src/app/dashboard/registers/link-actions.ts) | Handles explicit login links and guardian child-access changes, including confirmation/version checks. |
| [src/app/dashboard/registers/lifecycle-actions.ts](../src/app/dashboard/registers/lifecycle-actions.ts) | Handles an enrollment transfer or withdrawal through the database lifecycle function. |
| [src/app/dashboard/teaching/actions.ts](../src/app/dashboard/teaching/actions.ts) | Handles assignment creation and validated, confirmed end/replacement requests using the verified school. |
| [src/app/dashboard/timetable/actions.ts](../src/app/dashboard/timetable/actions.ts) | Handles lesson creation and deliberate removal. |
| [src/app/dashboard/corrections/actions.ts](../src/app/dashboard/corrections/actions.ts) | Handles name/reference corrections; takes school ownership from verified context, not the submitted form. |
| [src/app/dashboard/people/actions.ts](../src/app/dashboard/people/actions.ts) | Handles role/status changes, invitation preparation, bulk preparation, revocation and controlled delivery/reset actions. |
| [src/app/forgot-password/page.tsx](../src/app/forgot-password/page.tsx) | Shows recovery instructions and a gated recovery form. |
| [src/app/auth/confirm/page.tsx](../src/app/auth/confirm/page.tsx) | Checks the shape of an invitation/recovery link and shows an explicit confirmation step. |
| [src/app/account/accept/page.tsx](../src/app/account/accept/page.tsx) | Shows the signed-in invitation acceptance screen. |
| [src/app/account/password/page.tsx](../src/app/account/password/page.tsx) | Shows the signed-in password-setting screen. |
| [src/app/account/actions.ts](../src/app/account/actions.ts) | Handles recovery requests, link confirmation, password changes, session-revocation feedback and invitation acceptance. |

## Screens and forms — src/components

| File | What it does |
| --- | --- |
| [src/components/portal-shell.tsx](../src/components/portal-shell.tsx) | Shared sidebar, page heading, school name and preview notice. Navigation visibility is not the permission boundary. |
| [src/components/preview-content.tsx](../src/components/preview-content.tsx) | Hardcoded overview, planned modules, role descriptions and setup content for the public preview. |
| [src/components/login-form.tsx](../src/components/login-form.tsx) | Sign-in inputs and feedback from the server action. |
| [src/components/settings-form.tsx](../src/components/settings-form.tsx) | School name/timezone inputs and save feedback. |
| [src/components/academic-panel.tsx](../src/components/academic-panel.tsx) | Server-rendered academic lists; loads options and places the create/edit forms on the page. |
| [src/components/academic-form.tsx](../src/components/academic-form.tsx) | Client form for the chosen type of academic record, with specific field labels. |
| [src/components/registers-panel.tsx](../src/components/registers-panel.tsx) | Loads register records, relationships, enrollments and linkable accounts, then assembles the admin screen. |
| [src/components/register-forms.tsx](../src/components/register-forms.tsx) | Forms for people, guardian relationships and initial enrollments. |
| [src/components/record-editor.tsx](../src/components/record-editor.tsx) | Reusable correction form for a supported record's name/reference. |
| [src/components/enrollment-editor.tsx](../src/components/enrollment-editor.tsx) | Transfer/withdrawal controls for an existing enrollment. |
| [src/components/login-link.tsx](../src/components/login-link.tsx) | Account selector for linking or unlinking a register record; includes deliberate confirmation. |
| [src/components/guardian-access.tsx](../src/components/guardian-access.tsx) | The separate control that grants or revokes access to a child's records. |
| [src/components/teaching-panel.tsx](../src/components/teaching-panel.tsx) | Loads teacher assignments and the options used by the assignment form. |
| [src/components/teaching-form.tsx](../src/components/teaching-form.tsx) | Teacher, subject, class, year and date inputs for a new assignment. |
| [src/components/teaching-editor.tsx](../src/components/teaching-editor.tsx) | Versioned end/replacement form and closed-history labels. Available after migration 014. |
| [src/components/timetable-panel.tsx](../src/components/timetable-panel.tsx) | Loads timetable lessons and assignment choices for the admin planning screen. |
| [src/components/timetable.tsx](../src/components/timetable.tsx) | Renders lesson lists and lesson creation/removal controls. |
| [src/components/people-panel.tsx](../src/components/people-panel.tsx) | Loads school members, one page of invitations and recent audit activity. |
| [src/components/access-management.tsx](../src/components/access-management.tsx) | Member editors, role choices, invitation forms and invitation action controls. |
| [src/components/account-page.tsx](../src/components/account-page.tsx) | Shared page layout for recovery, confirmation and account tasks. |
| [src/components/account-forms.tsx](../src/components/account-forms.tsx) | Recovery, confirmation, password and acceptance forms, including retry feedback for session revocation. |

## Shared helpers — src/lib, plus the request proxy

| File | What it does |
| --- | --- |
| [src/proxy.ts](../src/proxy.ts) | Adds a request-specific Content Security Policy nonce, refreshes session cookies and sets private response caching behavior. |
| [src/lib/supabase/server.ts](../src/lib/supabase/server.ts) | Creates the server Supabase client using the request's cookies and publishable key. |
| [src/lib/auth-context.ts](../src/lib/auth-context.ts) | Verifies the Auth user and loads the active configured school, membership and roles. It distinguishes unavailable access from no permission. |
| [src/lib/permissions.ts](../src/lib/permissions.ts) | Known roles, readable role labels and shared school-admin checks. |
| [src/lib/config.ts](../src/lib/config.ts) | Validates the Supabase URL/key and configured school ID; tells the app whether it is configured. |
| [src/lib/account-config.ts](../src/lib/account-config.ts) | Reads the trusted site origin and email/invitation enable flags. |
| [src/lib/csp.ts](../src/lib/csp.ts) | Builds the browser script-security policy and generates nonces. |
| [src/lib/account-validation.ts](../src/lib/account-validation.ts) | Checks membership/invitation/password inputs and allowed link destinations. |
| [src/lib/academic-validation.ts](../src/lib/academic-validation.ts) | Checks academic record inputs, dates and the choices used by academic forms. |
| [src/lib/register-validation.ts](../src/lib/register-validation.ts) | Checks register, relationship and enrollment inputs; supplies labels/types used by forms. |
| [src/lib/correction-validation.ts](../src/lib/correction-validation.ts) | Limits which records and fields can be corrected and validates record versions. |
| [src/lib/enrollment-validation.ts](../src/lib/enrollment-validation.ts) | Checks transfer/withdrawal inputs, confirmation and date/destination rules. |
| [src/lib/teaching-validation.ts](../src/lib/teaching-validation.ts) | Checks teacher assignment choices and date inputs. |
| [src/lib/timetable-validation.ts](../src/lib/timetable-validation.ts) | Checks weekday/time/date inputs and removal confirmation; formats lesson times. |
| [src/lib/link-validation.ts](../src/lib/link-validation.ts) | Checks register-to-account links and guardian access inputs; defines the RPC member result type. |
| [src/lib/grade-name.ts](../src/lib/grade-name.ts) | Normalizes standard grade names so Grade10 and Grade 10 match, without changing unrelated names. |
| [src/lib/bulk-invitation.ts](../src/lib/bulk-invitation.ts) | Parses pasted invitation CSV and rejects malformed or oversized input. Duplicate invitation handling is enforced separately in the database. |
| [src/lib/invitation-pagination.ts](../src/lib/invitation-pagination.ts) | Validates invitation page numbers and calculates page ranges. |
| [src/lib/academic-pagination.ts](../src/lib/academic-pagination.ts) | Validates each academic list's page number and builds links that retain the other lists' positions. |
| [src/lib/list-pagination.ts](../src/lib/list-pagination.ts) | Shared 50-row page size, safe page-number parsing and allowlisted page-link construction for academic and register lists. |
| [src/lib/register-pagination.ts](../src/lib/register-pagination.ts) | Defines the five register lists and their URL page parameters. |
| [src/lib/register-data.ts](../src/lib/register-data.ts) | Server-only register reads: paged rows, independent form choices, capacity flags and school-scoped labels for related records. Uses the existing user client and RLS. |
| [src/lib/planning-data.ts](../src/lib/planning-data.ts) | Server-only teaching/timetable reads. Loads pages and separate form choices, applies the timetable assignment filter before paging, and resolves missing labels in batches of at most 100 IDs. |
| [src/lib/planning-pagination.ts](../src/lib/planning-pagination.ts) | Validates timetable filter IDs and builds teaching/timetable page links that preserve the filter. |
| [src/lib/record-search.ts](../src/lib/record-search.ts) | Allowed search categories, input limits, choice/result types and literal search-pattern escaping. |
| [src/app/dashboard/search/actions.ts](../src/app/dashboard/search/actions.ts) | Admin-only, school-scoped searches for academic, teaching and register relationship/enrollment choices. Returns small pages, names/references and class year/date details; transfer searches can narrow by year. |
| [src/components/record-search-select.tsx](../src/components/record-search-select.tsx) | Search box, native required selector and previous/next result buttons. Keeps the selected record while browsing and reports loading/errors without submitting the containing form. |
| [src/components/planning-pagination.tsx](../src/components/planning-pagination.tsx) | Shared First, Previous and Next controls for teaching history and timetable lessons. |
| [src/lib/member-label.ts](../src/lib/member-label.ts) | Builds an account label using display name, verified email and membership ID so similar names are distinguishable. |

## Database and the isolated email function

| File | What it does |
| --- | --- |
| [supabase/config.toml](../supabase/config.toml) | Supabase CLI configuration, including local Auth settings. Editing this file does not change the hosted dashboard settings. |
| [supabase/migrations/202609290001_foundation.sql](../supabase/migrations/202609290001_foundation.sql) | 001: schools, profiles, memberships, roles, initial audit and access policies. |
| [supabase/migrations/202609300002_account_management.sql](../supabase/migrations/202609300002_account_management.sql) | 002: controlled member edits and invitations, acceptance, delivery claims and last-admin protection. |
| [supabase/migrations/202610010003_academic_structure.sql](../supabase/migrations/202610010003_academic_structure.sql) | 003: academic years, terms, grades, subjects and classes with school ownership. |
| [supabase/migrations/202610010004_registers.sql](../supabase/migrations/202610010004_registers.sql) | 004: student/teacher/guardian records, family relationships and enrollments. |
| [supabase/migrations/202610010005_teaching_assignments.sql](../supabase/migrations/202610010005_teaching_assignments.sql) | 005: dated teacher/subject/class assignments and relationship constraints. |
| [supabase/migrations/202610010006_grade_name_normalization.sql](../supabase/migrations/202610010006_grade_name_normalization.sql) | 006: grade-name normalization and duplicate protection. |
| [supabase/migrations/202610010007_record_corrections.sql](../supabase/migrations/202610010007_record_corrections.sql) | 007: versioned name/reference corrections and their audit records. |
| [supabase/migrations/202610010008_timetable.sql](../supabase/migrations/202610010008_timetable.sql) | 008: weekly lessons, teacher/class clash rules and controlled removal. |
| [supabase/migrations/202610010009_enrollment_lifecycle.sql](../supabase/migrations/202610010009_enrollment_lifecycle.sql) | 009: transfer/withdrawal history, overlap protection and version checks. |
| [supabase/migrations/202610020010_register_membership_links.sql](../supabase/migrations/202610020010_register_membership_links.sql) | 010: links school records to accounts, adds explicit guardian grants and role/date-scoped reading rules. |
| [supabase/migrations/202610020011_invitation_bulk_and_reset.sql](../supabase/migrations/202610020011_invitation_bulk_and_reset.sql) | 011: transactional bulk invitations, delivery attempt limits and reviewed retry/reset handling. |
| [supabase/migrations/202610020012_audit_history_and_cleanup.sql](../supabase/migrations/202610020012_audit_history_and_cleanup.sql) | 012: append-only audit protections, correction snapshots and an owner-only school-member privacy procedure. |
| [supabase/migrations/202610030013_linkable_members_email_type.sql](../supabase/migrations/202610030013_linkable_members_email_type.sql) | 013: fixes the register-login query's email return type. It replaces one function without changing stored records. |
| [supabase/migrations/202610040014_teaching_assignment_lifecycle.sql](../supabase/migrations/202610040014_teaching_assignment_lifecycle.sql) | 014: assignment end/replacement history, non-overlapping periods, stale-form checks and timetable date protection. Hosted application is user-confirmed. |
| [supabase/checks/grade_name_duplicates.sql](../supabase/checks/grade_name_duplicates.sql) | Read-only check for names that would collide after grade normalization. |
| [archive/2026-10/review_grade10_typo.sql](../archive/2026-10/review_grade10_typo.sql) | The archived one-off Grade 10 repair. The regression test still reads this copy; it is not an active setup step. |
| [supabase/functions/invite-school-user/index.ts](../supabase/functions/invite-school-user/index.ts) | Supabase Edge Function entry point; reads its runtime configuration and supplies clients to the handler. It is outside the Next.js app. |
| [supabase/functions/invite-school-user/handler.ts](../supabase/functions/invite-school-user/handler.ts) | Verifies an invitation-send request, claims authorized work and records the provider outcome. Tests mock the provider; live delivery is still disabled. |
| [supabase/functions/invite-school-user/deno.json](../supabase/functions/invite-school-user/deno.json) | Runtime/import configuration for the Supabase function. |

## Test files

Every test file is explained individually in [tests/README.md](../tests/README.md), including the database suites, mocked server actions and browser tests. `e2e/foundation.spec.ts` is included there too. The test guide separates local evidence from checks against hosted Supabase.

## Documentation files

[ENVIRONMENT.md](ENVIRONMENT.md) explains which settings belong to the web app, CLI and invitation function. [CLEANUP.md](CLEANUP.md) records what was kept, removed or archived. [archive/README.md](../archive/README.md) explains the archived material.

Every document and the saved timetable image are explained in [docs/README.md](README.md). This file is the source/tooling map; that index is the reading map. The root README is the entry point, and the two folder READMEs explain their respective contents.

## Local and generated files

These are not handwritten application features:

| File or folder | What it is |
| --- | --- |
| `.env.local` | Your private local connection settings. Do not share or commit it. This guide deliberately does not list its values. |
| `node_modules/` | Installed third-party packages. Use npm to manage them rather than editing their source. |
| `.next/` | Next.js development/build output, recreated by the relevant commands. |
| `next-env.d.ts` | Generated type references, also listed above because it is part of the checkout. |
| `tsconfig.tsbuildinfo` / other `*.tsbuildinfo` | TypeScript's incremental-check cache. |
| `test-results/` and `playwright-report/` | Browser-test output, screenshots and traces when generated. These are not hosted verification results. |
| `coverage/` | Coverage output if a coverage run is configured; a folder name does not mean coverage has been measured. |
| `supabase/.temp/` | Local Supabase CLI connection/state files if the CLI is used. |
| `.git/` | Version history and Git's internal state. |

This inventory covers the maintained project files, not every dependency or generated cache file. No separate API service, storage uploader, marks module or notification worker has been built inside an omitted folder.


## Account search added on 5 October

- [search/member-actions.ts](../src/app/dashboard/search/member-actions.ts) validates the request, derives the school from the verified admin context, calls the bounded SQL search and returns safe labels/errors.
- [Migration 015](../supabase/migrations/202610050015_register_member_search.sql) adds read-only, admin-only eligibility search. It excludes accounts linked elsewhere before paging. Hosted application of 015 is user-confirmed.
- [member-search.test.ts](../tests/member-search.test.ts) checks server authorization/input handling, bounded output, private errors and preservation of the current login in the form payload. The membership database suite checks actual SQL eligibility and isolation beyond 500 records.

`login-link.tsx` now uses the shared search selector. `register-data.ts` loads only current links for visible people; it no longer preloads complete person/member catalogs. Browser checks are on hold.

## Timetable search added on 5 October

- [Migration 016](../supabase/migrations/202610050016_timetable_assignment_search.sql) adds bounded, school-scoped assignment search under the caller's RLS. Application is user-confirmed.

## Phase 3 files — added 7–8 October

The existing dashboard route and portal shell connect these modules. They still use the same Supabase server client and authentication context. No separate backend or new package was introduced.

| File | Why it exists |
| --- | --- |
| `src/lib/portal-validation.ts` | Role-view types, child ID validation, labels and links. A valid mode is not permission. |
| `src/lib/portal-data.ts` | Resolves the signed-in account's linked school record. Guardian choices come only from explicit grants, even for teacher/guardian accounts. |
| `src/components/child-selector.tsx` | Lets a guardian choose an authorized learner while keeping the current module and clearing old pagination. |
| `src/components/role-overview.tsx` | Shows the linked person's workspace, access errors and links to available daily modules. |
| `src/lib/my-timetable-data.ts` | Calls the narrow personal timetable RPC and validates its response. |
| `src/components/my-timetable-panel.tsx` | Shows current-week lessons without scheduling controls. |
| `src/lib/school-date.ts` | Supplies a school-local default date for the attendance picker. SQL independently authorizes dates. |
| `src/lib/attendance-validation.ts` | Attendance status, batch and response schemas, types and page links. Explicit null clears a mark; omitted learners remain unchanged. |
| `src/lib/attendance-data.ts` | Reads staff registers or a permitted learner's attendance history. Failures remain distinct from empty results. |
| `src/app/dashboard/attendance/actions.ts` | Validates a staff save, derives the school and calls the atomic attendance RPC. |
| `src/app/dashboard/attendance/search-actions.ts` | Searches classes allowed for the selected staff role. It does not weaken the older admin-only search. |
| `src/components/attendance-picker.tsx` | Reuses the shared search selector to choose a class and date. |
| `src/components/attendance-form.tsx` | Collects changed marks, maintains the loaded version, asks for older-date reasons and shows conflicts. |
| `src/components/attendance-panel.tsx` | Chooses the staff register or learner/guardian history screen and handles pagination. |
| `src/lib/homework-validation.ts` | Homework field limits, states, version rules, read types and links. |
| `src/lib/homework-data.ts` | Reads an authorized homework page or a specific item for editing. |
| `src/app/dashboard/homework/actions.ts` | Validates staff input and calls the versioned save/publication/withdrawal RPC. |
| `src/app/dashboard/homework/search-actions.ts` | Searches permitted teaching assignments with bounded results. |
| `src/components/homework-form.tsx` | Staff editor for title, plain-text instructions, due date and visibility. Existing assignment ownership is fixed. |
| `src/components/homework-panel.tsx` | Staff management and read-only learner/guardian feeds. Text is escaped; there are no learner submission controls. |
| `supabase/migrations/202610070017_role_read_models.sql` | Personal timetable projection with role, school, child and date checks. User-confirmed applied. |
| `supabase/migrations/202610080018_attendance.sql` | Attendance tables, RLS, save/read/search RPCs, audits and enrollment-history guard. User-confirmed applied. |
| `supabase/migrations/202610080019_homework.sql` | Homework table, assignment ownership, RLS, immutable publication audience and staff/read RPCs. User-confirmed applied; homework is working and remaining tests are in progress. |
| `supabase/migrations/202610080020_announcements.sql` | Announcement ownership, current-class readers, RLS, class search and audited/versioned saves. User-confirmed applied. |
| `src/lib/announcement-validation.ts` | Announcement limits, explicit audience scope, types and links. |
| `src/lib/announcement-data.ts` | Reads permitted notices with pagination or a specific editor item. |
| `src/app/dashboard/announcements/actions.ts` | Validates the staff form and saves using the verified school context. |
| `src/app/dashboard/announcements/search-actions.ts` | Searches classes the staff role can currently manage. |
| `src/components/announcement-form.tsx` | Audience, message and publication editor. |
| `src/components/announcement-panel.tsx` | Staff management and reader feeds with guardian learner selection. |
| `supabase/migrations/202610080021_documents.sql` | Private PDF bucket, metadata, Storage RLS, upload reservations and versioned visibility. Pending application. |
| `src/lib/document-validation.ts` | Shared document types, 2 MiB limit, audience validation, generated paths and links. |
| `src/lib/document-file.ts` | Server-only PDF header/end-marker, size and content-hash checks. |
| `src/lib/document-data.ts` | Role-aware metadata reads with bounded pagination. |
| `src/app/dashboard/documents/actions.ts` | Uploads drafts, checks stored files, finishes interrupted uploads and changes visibility. |
| `src/app/dashboard/documents/[id]/download/route.ts` | Downloads an authorized PDF as a private, non-cached attachment. |
| `src/components/document-form.tsx` | Staff upload and fixed-file visibility controls. |
| `src/components/document-panel.tsx` | Staff and reader document feeds with guardian selection. |
| `tests/helpers/storage-stub.ts` | Minimal test-only Storage metadata schema for full-migration PGlite suites. Actual HTTP storage behaviour still needs hosted tests. |

See [ANNOUNCEMENTS.md](ANNOUNCEMENTS.md) for the workflow, permission rules and tests. The dashboard, sidebar and role overview link to this module.

[DOCUMENTS.md](DOCUMENTS.md) covers the new PDF library and its test files. `next.config.ts` now permits a 3 MiB server-action body so a 2 MiB PDF fits with multipart overhead; file and bucket validation keep the lower file limit. No extra packages or environment variables were added.

The [test guide](../tests/README.md) explains each corresponding test file. `TEMP_PHASE_3_IMPLEMENTATION_GUIDE.md` and the archived working-checkpoint document are earlier planning aids, not current migration status. The temporary guide is deliberately unchanged following the latest user instruction; use RESUME.md for the current checkpoint.
- [Search actions](../src/app/dashboard/search/actions.ts) now accept `teaching_assignments` and return assignment date bounds alongside labels. Unsupported filters are rejected by `record-search.ts`.
- [Timetable](../src/components/timetable.tsx) uses searchable choices for its GET filter and lesson form. Hidden fields preserve selected IDs during search; date inputs follow the selected assignment.
- [Planning data](../src/lib/planning-data.ts) reads only the assignment labels required by visible lessons and the active filter. It no longer loads capped reference catalogs.
- [Timetable search form tests](../tests/timetable-search-forms.test.ts) check search wiring, preserved filter IDs, empty results and page reset. Actual SQL search/isolation tests are in `register-database.test.ts`; action tests are in `record-search.test.ts`.
