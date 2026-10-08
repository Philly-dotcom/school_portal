# How School Portal fits together

Updated 8 October 2026. This describes the local implementation. Hosted acceptance remains separate. The stack and one-school-first plan have not changed.

## A request from start to finish

```mermaid
flowchart TD
    User[Admin / Teacher / Student / Guardian] --> UI[Next.js pages and forms]
    UI --> Server[Server pages and form actions]
    Server --> Auth[Supabase Auth: verify current user]
    Auth --> Context[Active school and membership]
    Context --> Roles[Role and record checks]
    Roles --> Client[User-scoped Supabase client]
    Client --> DB[(PostgreSQL: grants, RLS and constraints)]
    DB --> Result[Rows or a safe error]
    Result --> UI
    DB --> Audit[Audit events and correction history]
```

Next.js serves the UI and handles backend work. We do not have a separate Express API server. Read queries are made by server-rendered panels; form submissions go through server actions. Shared validation and identity checks live in `src/lib`. More complex operations call PostgreSQL functions, also called RPCs.

For example, a transfer is not two independent saves from the browser. The server validates the request and calls a database function that closes the old enrollment, creates the replacement and records the audit event together. If part of that operation fails, it should not leave half a transfer behind.

## Who can do what

Supabase Auth proves which account is signed in. A membership connects that account to this school; its roles determine permitted actions. The server checks that the school and membership are active. The database checks access again through RLS, or row-level security.

`SCHOOL_PORTAL_SCHOOL_ID` tells this installation which school to open. It does not give anyone permission. Editable user metadata, a role selector or a URL parameter cannot grant access. Normal app requests use the signed-in user's database context, not a service-role key.

The dashboard now includes role workspaces, personal timetable, attendance and homework. A role URL selects a view; it never grants a role. Guardian screens resolve explicit child grants independently of any teacher roster access on the same account.

- A linked teacher can read their own assignments and lessons, plus current classes and learners allowed by dated teaching/enrollment relationships.
- A linked student can read their own permitted records and enrollment history; timetable access follows the relevant current placement.
- A linked guardian also needs an explicit child-access grant. A family relationship by itself is not authorization.
- School Admin manages the school's records. This is not a platform-owner role.

See [LOGIN_LINKS.md](LOGIN_LINKS.md) for the exact read boundaries and [FILE_GUIDE.md](FILE_GUIDE.md) for where the checks live.

## The data model

| Part | Why it exists |
| --- | --- |
| `schools` | School identity, timezone and active state. |
| Auth users and `profiles` | Login identity and a global display profile. A profile is not a learner record. |
| `school_memberships`, `membership_roles` | The account's relationship with a school, status and one or more roles. |
| Academic years, terms, grades, subjects, classes | The school structure. Classes belong to a year and grade. |
| Students, teachers, guardians | School-owned records that can exist before a login is linked. |
| `student_guardians` | Family relationships and the separate child-access permission. |
| `enrollments` | Dated placements, including retained transfer/withdrawal history. |
| `teaching_assignments`, `timetable_lessons` | Teaching responsibilities and weekly lesson schedules. |
| `attendance_sessions`, `attendance_entries` | One dated class register and explicit learner marks, with versions and historical enrollment references. |
| `homework_items` | Assignment-owned drafts/published/withdrawn work, fixed first-publication audience date and versioned edits. |
| `announcements` | School-wide or class notices with a fixed audience scope, current-enrollment reads and versioned staff edits. |
| `documents` | School/class ownership, immutable PDF size/hash, upload progress and versioned visibility. Bytes live in the private Storage bucket. |
| `school_invitations` | Pending access offers and delivery state; a pending invitation is not membership. |
| `audit_events`, `record_history` | An append-only activity trail and restricted previous versions of corrected records. |

School-owned relationships use school-matching foreign keys as well as RLS. Profiles are deliberately global: one login might eventually join more than one school. This does not mean school records should be global.

SQL migrations are the database change history. Migrations 001–021 exist and application through 020 is user-confirmed. Migration 021 adds documents and private Storage policies and is pending application. The user reports homework working and browser checks about halfway complete; remaining scenarios are still open. Do not edit or rerun an applied migration to fix a new issue; add a follow-up migration.

Academic setup reads 50 records per list, plus one lookahead to decide whether to offer the next page. Each list uses its own validated URL parameter, with name and ID ordering. Visible class/term labels use school-scoped ID lookups. Year and grade form choices are searched on demand instead of preloading a capped list. These reads use the existing user-context Supabase client and RLS; pagination changes no permissions. Offset pages reflect current data, so a concurrent rename or creation may move a row between pages.

School registers uses the same page validation and URL-building helper. Its server-only `register-data.ts` loads the five visible pages and resolves only their current membership IDs. Sign-in choices use the admin-only `search_register_members` RPC from migration 015; role and ownership eligibility are applied before pagination. No complete people/account lists are needed. Guardian relationships and enrollments use on-demand searches; class/year/grade labels for visible enrollments are fetched by school-scoped ID lookups instead of loading full catalogs. A paged list is never treated as a complete set of people or linked accounts.

`planning-data.ts` uses the same user client and school-scoped reads for teaching assignments and timetable lessons. Timetable filtering is a validated URL parameter applied before the database range. Teaching and timetable choices are searched on demand, so page loads fetch only labels needed by displayed assignments/lessons and the active filter. Missing labels are fetched in batches of at most 100 IDs. Database conflict checks, locks and permissions are unchanged.

`dashboard/search/actions.ts` is a read-only Server Action, but still verifies the active School Admin context on every call. Its allowlisted input accepts a record category, short search text, bounded page number and optional excluded record ID. It does not accept a school ID. It uses the user's Supabase client, school filters and RLS, returns at most 25 choices plus a next-page flag, and supplies class year/date details through separately scoped reads. Percent, underscore and backslash are escaped for literal ILIKE matching. Save actions independently validate the submitted IDs; search results are not an authorization token. `record-search-select.tsx` keeps selected choices separate from search results and ignores superseded responses. No new API route or elevated application credential is needed. Basic record searches use existing tables; account and timetable search use migrations 015 and 016 respectively.

Student and guardian searches return names and school references only. Class searches may also accept a validated academic-year ID, used by enrollment transfers to narrow destinations before paging. This filter only narrows school-scoped reads; the enrollment save independently enforces the original year and all relationship/date rules. Withdrawal unmounts the destination selector, so it submits no transfer destination.

## Sessions, scripts and the public preview

The request proxy refreshes session cookies and adds a fresh script-security nonce. User pages are rendered per request, with private/no-store behavior. Security headers reduce unwanted embedding and browser access to unused capabilities.

`/preview` uses hardcoded planning content only. It does not query school data or offer an authorization bypass. Planned modules shown there are not evidence of working modules.

## Email and other services

Invitation preparation is built. The separate Supabase Edge Function for sending invitations has its own runtime boundary; privileged Auth credentials belong there, never in the Next.js app. The function checks the caller, claims an authorized invitation and records delivery outcomes. Membership acceptance still happens through controlled database logic.

Delivery remains disabled and unverified. Saved SMTP settings are not enough while the sending domain is unregistered. Password recovery also needs a working delivery path before live use.

Private PDF uploads, document metadata and authenticated downloads are now implemented; hosted Storage verification is pending. Notifications, n8n and AI remain future work. Results will need review and School Admin publication states in Phase 4. School selection, SaaS billing and platform administration remain later decisions.

## What the tests establish

The local database suites execute SQL in PGlite with fictional schools and simulated Auth identities. They test actual database rules, but not the hosted gateway, issued tokens, independent concurrent sessions or email delivery. Browser tests use a disconnected app; hosted verification uses the dedicated fictional-data project.

The migration 013 issue showed why this distinction matters: the earlier local Auth fixture used the wrong email column type. That fixture is now corrected in the relevant final-schema tests. See [tests/README.md](../tests/README.md) and [VERIFICATION.md](VERIFICATION.md) for results and limits.

Timetable choice search uses `search_timetable_assignments` (migration 016), an admin-checked, security-invoker read with the caller's RLS. Teacher/reference, subject, class, grade and year matching happens before bounded pagination. `planning-data.ts` resolves only visible assignment/lesson references and the active filter. Migration 016 application is user-confirmed.

## Daily operations

Migration 017 adds a narrow personal-timetable projection. It supplies permitted lesson labels without widening direct access to teacher records. The database derives the caller and checks the selected role, child grant and current dated placement.

Migration 018 keeps attendance saves atomic: lock the school like enrollment changes do, recheck access, compare the register version, validate each dated enrollment, save only submitted marks and audit. Omitted learners remain unchanged. Explicitly clearing a mark leaves its audit trail. Enrollment changes that would contradict recorded attendance are rejected. Teachers edit today and read only the permitted history; older admin changes require a reason.

Migration 019 keeps homework ownership tied to the original assignment. Staff can draft, publish, edit and withdraw. Teachers need current assignment access; School Admin can manage orphaned work. First publication fixes the audience date. Learner reads require a historical enrollment covering that date, and guardian reads additionally require a current explicit child grant. Current class membership alone does not expose old homework. Enrollment history is the source for this rule, rather than a separate recipient snapshot table.

These modules use the existing user-context Supabase client. Narrow `SECURITY DEFINER` RPCs pin their search path, authorize the exact records and revoke anonymous execution. Attendance, homework, announcement and document tables have RLS and deny direct client mutations. List RPCs also check the selected role, so an account's teacher privileges do not leak into its guardian view. Text is escaped by React. No homework submissions, external notifications or additional backend service were added.

Migration 020 adds announcements. Admin manages school-wide and class notices; teachers manage notices only for classes they currently teach. Published class notices follow current dated enrollment, unlike homework's original-publication audience. Guardians need a current explicit learner grant. School/class scope is immutable after creation, and saves use the same school lock, version check and atomic audit approach. See ANNOUNCEMENTS.md for the workflow and remaining hosted checks.

Migration 021 adds document metadata and the private `school-documents` bucket. It reuses those same current-class permission helpers. The server action reserves metadata, uploads an immutable generated path using the user's credentials, then finalizes a draft. Unfinished entries stay staff-only and can be reviewed or withdrawn. The authenticated download route applies selected-role checks, verifies stored size/hash, and returns an attachment with no-store headers. Storage RLS independently controls the bytes. Restrictive bucket guards prevent unrelated permissive policies from granting overwrite or deletion. Basic PDF checks are not malware scanning; retention and physical cleanup remain live-readiness work. See DOCUMENTS.md for details.
