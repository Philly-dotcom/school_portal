# Private PDF documents

Added in Phase 3 on 8 October 2026. Migrations **020 and 021 are confirmed applied**. Do not rerun them. On 20 October you confirmed completing the document checks below except for the deferred School B check.

This file also contains the [remaining Phase 3 checklist](#remaining-phase-3-checklist) so you can record the rest of your testing in one place.

## What is available

**Documents** is a separate library in the dashboard. School Admin uploads school-wide or class PDFs. Teachers upload PDFs for classes they currently teach. Students and guardians can download published documents but cannot upload.

Class documents follow current enrollment, just like announcements: a learner joining the class gains access to earlier published PDFs, and leaving removes access. Guardians need an explicit grant for the selected learner. Teachers lose class management access when their assignment ends. School Admin can still manage those documents.

Homework attachments are not included. They need homework's original-recipient rules, so they must not be added by simply linking a current-class document.

## Uploading and publishing

1. Open **Documents → New document**.
2. Choose the school or class audience, enter a title and select a PDF up to **2 MiB (2,097,152 bytes)**.
3. Upload it. A successful upload creates a staff-only draft.
4. Open the entry, download and review the file, then change its visibility to **Published**.

The file, title and audience are fixed after upload. To replace a document, upload a new entry and withdraw the old one. Files are never overwritten in place. Withdrawal hides an entry from learners and guardians; authorized staff retain access. It does not erase the stored file or copies someone already downloaded.

## If an upload is interrupted

The app reserves a document record first, uploads the bytes, then finishes the draft. These are separate operations because PostgreSQL and Storage are separate services.

If the upload fails or its result is uncertain, the list keeps an **uploading** entry visible to authorized staff only. Open it and save it as a draft. The app checks whether the stored PDF exists and matches the original size and hash. If that succeeds, you can review and publish it. If the bytes are missing or do not match, withdraw the unfinished entry and upload a new copy.

Check the list before retrying after a connection failure. The first request may have succeeded even if the browser did not receive its result. There is no automatic physical cleanup job in this release. Withdrawn and unfinished files count toward storage usage and need an agreed retention policy before live use. When physical cleanup is needed, use the Storage API or dashboard, not SQL deletes against `storage.objects`; SQL removes metadata without deleting the underlying file. [Supabase storage schema guidance](https://supabase.com/docs/guides/storage/schema/design)

## Supabase setup

- `supabase/migrations/202610080021_documents.sql` has been applied after 020 in the dedicated School Portal project. Leave all migrations intact; these notes explain the existing setup, not an instruction to run it again.
- The migration creates the **school-documents** private bucket, a 2 MiB limit, the `application/pdf` MIME allowlist, document metadata, permission functions and Storage policies. It does not upload any files.
- If a bucket with that exact name already exists, the migration deliberately fails instead of silently changing an existing bucket. Investigate its purpose and configuration before proceeding.
- Confirm the bucket is **private** and that its allowed type and size limit are correct. Supabase's global upload limit must also allow a 2 MiB file.
- No new environment variables, packages or service-role key are needed. Normal operations use the signed-in user's Supabase context.
- The Next.js server-action request limit is now 3 MiB to allow multipart overhead. The actual PDF limit remains 2 MiB in application validation and the bucket. If your running development server does not pick up the config change, restart it before testing.

Bucket restrictions and RLS follow [Supabase's bucket configuration](https://supabase.com/docs/guides/storage/buckets/creating-buckets) and [Storage access-control guidance](https://supabase.com/docs/guides/storage/security/access-control).

## How access is enforced

Document records carry school ownership and an optional class. A generated path contains the school UUID and document UUID; the user's original filename is not used as a storage path. Table reads, upload reservations, publication changes and Storage reads each check access. A prepared row authorizes only its creator to upload to that exact path while the entry is unfinished.

Downloads pass through an authenticated route under `/dashboard/documents/`. It checks the requested mode and selected learner, fetches the private file with the user's credentials, checks its size and hash, and returns an attachment with private/no-store headers. The app does not create public or signed download links. Direct Storage access still follows the account's actual combined permissions; the portal's selected-role feed and download route apply the narrower selected role.

The upload form checks the PDF filename/type, size, header and end marker. These are basic format checks, not a full PDF parser or malware scanner. Bucket MIME restrictions also do not prove file contents are safe. Use trusted fictional PDFs for testing; decide on scanning and file-retention procedures before live school use. Your completed hosted checks are recorded below, separately from local SQL tests. Cross-school Storage behaviour remains unverified.

## Files added

| File                                                 | What it does                                                                                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/202610080021_documents.sql`     | Creates the bucket, metadata, read/write functions and Storage policies.                                                                                                               |
| `src/lib/document-validation.ts`                     | Shared types, form limits, bucket name, generated paths and page/download links.                                                                                                       |
| `src/lib/document-file.ts`                           | Checks PDF format hints and size, then calculates the content hash. Server-only.                                                                                                       |
| `src/lib/document-data.ts`                           | Reads a permitted page or one document through the role-aware database function.                                                                                                       |
| `src/app/dashboard/documents/actions.ts`             | Uploads a draft, finishes interrupted uploads, validates stored bytes and changes visibility.                                                                                          |
| `src/app/dashboard/documents/[id]/download/route.ts` | Authenticated download with role/learner checks and no public URL.                                                                                                                     |
| `src/components/document-form.tsx`                   | Upload form and fixed-file visibility controls.                                                                                                                                        |
| `src/components/document-panel.tsx`                  | Staff management and learner/guardian library feeds.                                                                                                                                   |
| `tests/documents-database.test.ts`                   | Fictional school isolation, transfers, guardian grants, Storage policies, failed uploads and atomic audit checks.                                                                      |
| `tests/documents-actions.test.ts`                    | File validation, upload failures, hash mismatches, download authorization and response headers.                                                                                        |
| `tests/documents-panel.test.ts`                      | Escaped titles, learner restrictions, guardian selection and visibility controls.                                                                                                      |
| `tests/helpers/storage-stub.ts`                      | Minimal Storage metadata tables for PGlite. Existing full-migration suites now use this fixture too. It is test-only and does not model the Storage HTTP service or actual file bytes. |

Documents reuse the existing announcement class picker and current-class permission helpers because the agreed access rules are the same. The dashboard, sidebar and role overview link to the new library.

## Browser and hosted checks

- [x] Apply 021 and inspect the private bucket configuration.
- [x] Upload a small trusted fictional PDF as Admin. Confirm it starts as a draft and downloads correctly for Admin.
- [x] Check students, guardians and unrelated teachers cannot read that draft, including by its direct download path and Storage API.
- [x] Publish a school-wide PDF. Confirm each permitted role can download it, while teachers cannot edit its visibility.
- [x] Upload and publish a class PDF as a currently assigned teacher. A different class must not be selectable.
- [x] Try a non-PDF file, a renamed text file and a PDF over 2 MiB. They must fail. Check the boundary with a valid file near 2 MiB too.
- [x] Check learners cannot upload by using a forged form or direct Storage request.
- [x] Use a guardian account with one explicit learner grant and try another learner's ID. Repeat with a combined teacher/guardian account in Guardian mode.
- [x] Transfer a fictional learner. Access must leave the old class and follow the new class on the effective date. Revoke a guardian grant and confirm new download requests fail.
- [x] End a teacher assignment, respecting existing timetable constraints. The teacher must lose class-document management and downloads derived solely from that assignment.
- [x] Withdraw a published PDF. Learner downloads must fail afterwards. Staff should still be able to review or republish it.
- [x] Test an interrupted upload and the unfinished-entry recovery described above. Never expose the incomplete entry to learners.
- [x] Open visibility controls in two tabs. A stale save must not overwrite a newer change.
- [x] **DOC-B — User-reported passed 26 October 2026:** test direct reads, guessed paths, uploads, overwrite and deletion attempts between School A and School B users. Denied attempts must not expose or change the other school's data or files. The user reports this check completed. School B setup and hosted testing were user-owned; no agent rerun was performed.
- [x] **DOC-ANON — Can run without School B:** in a signed-out/private browser, request an existing document download route and its Storage public URL. Neither should return the private PDF. Check anonymous direct metadata/Storage requests are denied too. The user has now marked this separate anonymous-access check complete; it does not require School B.

The app does not issue signed URLs. If another tool creates one, its lifetime and continued validity after a permission change need separate review; do not assume withdrawal invalidates an already issued signed URL.

The 13 completed document items above are your reported hosted results. Keep them checked. The upload validation message has been restored to its original wording and stays as it is.

## Remaining Phase 3 checklist

Updated 26 October 2026. All hosted/browser cases are now user-reported passed. The latest local check passed ESLint, TypeScript, 524 tests in 57 files and production build after REVIEW-01/02. Local and user-reported hosted evidence remain separate.

Use this as the current combined checklist. Older module checklists and dated verification notes describe earlier checkpoints. If you have already completed a case below, add its result here; you do not need to repeat a passed check just because the old notes are out of date.

### Before testing

- Use the existing fictional accounts and people. Do not create duplicate learners, guardians or logins.
- Check the current fixture before changing anything: document testing may have changed enrolments, grants or teaching assignments. Record the relevant class, dates and access state first.
- Use the existing 2026 daily-operations fixture where its dates cover the school-local day. Keep the 2027 planning records intact. Do not move those records into 2026 to force an operational test through.
- Use separate browser profiles for separate signed-in users. Two tabs in the same profile share a session; do not sign one tab in as a different role and assume the other kept its original login.
- For transfer, revocation or assignment-ending checks, write down the starting state and choose a fictional record deliberately. Use the normal audited workflows. Do not delete history or remove timetable constraints to make a test pass.
- A hidden button is not proof that a write is denied. Where a case calls for API checks, use the ordinary test user's authenticated request, never an elevated key or a privileged SQL Editor session. Do not paste tokens, passwords or cookies into this checklist.
- Tick an item only when its expected result is confirmed. If it fails, leave it unchecked and record what happened. A blocked case is not a pass.

Record results under each item, using this format:

`Date | case ID | role/student reference | fictional record/date tested | actual result | passed / failed / blocked`

### 1. Profiles and role access — recorded passes

- [x] **P3-01 Student profile:** sign in as the existing linked student and open the top-right profile. Check full name, student reference and school against the register. Confirm each enrolment shows the right academic year, grade, class and dates, with Current/Upcoming/Past matching the school date. Future enrolment visibility must not grant today's attendance or lessons.
- [x] **P3-02 Teacher profile:** sign in as the linked teacher. Confirm full name, teacher reference, school and subjects match their assignments. The same subject/year/status must not repeat merely because it is taught to several classes. Check upcoming or ended assignments have the right label.
- [x] **P3-03 Guardian profile:** confirm full name, school and the explicitly granted students. No classroom roster may appear as guardian children. Before selecting a child, the portal must ask for a learner selection; after selection, daily records must belong to that learner.
- [x] **P3-04 Admin profile:** confirm saved name, email, school and admin reference. The reference is the existing school membership ID, not a newly issued staff number. A missing saved name must say “Name not recorded”; another user's name or email must never appear.
- [x] **P3-05 Combined roles:** use the existing teacher/guardian account in both workspaces. Confirm teacher access works only within teaching scope and Guardian mode offers only explicitly granted children. Changing `mode` or `child` in a URL must not grant another role or learner.
- [x] **P3-06 Revoked/suspended access:** using a separate Admin session, revoke a fictional guardian grant or suspend a non-admin test membership. Reload and make a new protected request from that account. Previously available data must no longer load. Restore only the intended access through the normal Admin workflow after recording the result; do not suspend your only Admin.

### 2. Timetable and planning — recorded passes

- [x] **P3-07 Actual lesson rendering:** inspect the existing 2026 fixture and its eligible lessons. If necessary, use an eligible existing assignment to add a clearly labelled fictional lesson within its dates. Check teacher, student and selected-guardian views show the correct subject, class, teacher, weekday and time for the current school week. An empty timetable alone does not pass this case.
- [x] **P3-08 Date boundaries:** check lessons are visible only when the learner's enrolment and teacher's assignment cover the relevant lesson dates. Future 2027 planning remains available to Admin, but it must not appear as a current 2026 lesson. Check a school-week boundary and the first/last eligible dates where suitable existing records allow it.
- [x] **P3-09 Planning controls:** as Admin, check assignment search, selection, filters, clear filter and pagination retain the intended context. Try a teacher/class overlap and confirm rejection; a valid back-to-back lesson should be allowed. Remove only a disposable fictional lesson and confirm the assignment and enrolments remain. A non-admin must not gain planning controls through a changed URL or API request.
- [x] **P3-10 Concurrent timetable saves:** from independent sessions, attempt two lessons that conflict for the same class or teacher. At most one may succeed. Reload and check the persisted records and available audit history; an error message alone is not proof that no duplicate was saved.

### 3. Attendance — user-reported passes

The basic mark/save/reload, explicit clear, Admin correction reason, teacher history and learner history checks already have recorded passes. Do not repeat them unless a relevant fix or changed fixture needs a regression check.

- [x] **P3-11 Stale-save regression:** load the same register in two Admin tabs before saving. Save a change in one, then save from the stale second tab. The second must stop saving and show a clear conflict/reload message; the first value must survive. The earlier stuck “Saving…” observation is historical; the user has now marked this regression passed. Reopen it if it recurs.
- [x] **P3-12 Independent-session attendance conflict:** after P3-11 is resolved, repeat competing saves from separate authenticated browser profiles. Confirm one accepted version, a clear conflict for the stale request, no silent overwrite and no duplicate register. Two tabs sharing a login do not replace this check.
- [x] **P3-13 Roster pages:** if the existing fictional fixture has multiple roster pages, save a partial page and move between pages. Confirm untouched learners remain unmarked and saved marks persist on the correct learner. If the fixture is too small, record “blocked — needs agreed larger fixture”; do not create new learners without approval.
- [x] **P3-14 Dates and retained selection:** choose a future-year class with today's date, then an out-of-assignment date. Confirm a useful explanation and that the selected class stays visible. A teacher must not edit a past/future register by changing the date or mode in the request. Admin corrections to older eligible dates must require a reason.
- [x] **P3-15 Attendance read/write denial:** as student or guardian, try another learner's attendance and a staff save request. As teacher, try an unrelated class. Verify denied reads and writes through the user's API context as well as the UI, and confirm no records changed.

### 4. Homework — recorded lifecycle passes

Teacher publication and permitted student/guardian reads have recorded passes. Reuse the existing labelled homework where suitable.

- [x] **P3-16 Draft and publication lifecycle:** confirm drafts are hidden from learners through the feed and direct requests. Withdraw a published item and check new student/guardian reads fail. Republish and confirm the original audience date is unchanged. Learners must have no submission, editing or grading controls.
- [x] **P3-17 Original recipients:** use a homework item published before a fictional newcomer joined. The newcomer must not gain access. An original recipient who later transfers out must retain access while the item remains published. Check both learner and guardian views. This is intentionally different from announcements/documents.
- [x] **P3-18 Guardian grant removal:** revoke the chosen fictional grant and confirm a new request cannot read that child's homework, including through a direct URL/RPC. Regrant only if that is the intended test setup.
- [x] **P3-19 Teacher assignment ending:** first inspect lessons that depend on the assignment. End it through the permitted workflow without deleting constraints/history. Confirm the former teacher cannot edit its homework and Admin still can. If the test is blocked by timetable dependencies, record them before deciding how to proceed.
- [x] **P3-20 Homework stale save and audit:** open the same item twice, save one version and try the stale version. Confirm a visible conflict, preserved first change and the expected successful-save audit. Check an independent-session attempt too.
- [x] **P3-21 Homework validation:** try a due date outside the academic year, an ineligible first publication date and a forged assignment/role. Expect rejection without a stored partial change. Check a permitted edit to already published overdue work still follows the agreed rules.

### 5. Announcements — recorded reader and lifecycle passes

The user has now marked the reader, lifecycle and concurrency checks below complete. The detailed rules remain in [ANNOUNCEMENTS.md](ANNOUNCEMENTS.md).

- [x] **P3-22 School notice readers:** reuse the labelled school-wide notice. Check draft/withdrawn states are hidden from teacher, student and selected-guardian readers, and Published is readable. Teachers must not edit a school-wide notice. Check new requests after each visibility change.
- [x] **P3-23 Class notice:** as a currently assigned teacher, publish a fictional class notice. Unrelated classes must not be selectable or accepted through a forged request. Only eligible class learners and their explicitly authorized guardians may read it.
- [x] **P3-24 Current-class audience:** after a dated fictional transfer takes effect, old-class notices must disappear and earlier published new-class notices must become readable. Revoking the guardian grant must remove that guardian's access. Do not apply homework's original-recipient rule here.
- [x] **P3-25 Lost teacher responsibility:** after the relevant assignment ends, the teacher must lose class-notice management access, even if they wrote the notice. Admin retains management. Respect existing lesson dependencies.
- [x] **P3-26 Roles, stale saves and audit:** check the combined teacher/guardian account stays within the selected workspace. Try competing notice edits from two tabs and independent sessions. Expect conflicts rather than overwrites and audit entries for successful changes. Plain-text messages must display as text, not execute HTML.

### 6. Shared navigation and error states

- [x] **P3-27 Guardian sidebar context:** select a learner, then open Announcements and Documents from the sidebar and return to Overview. The selected role and child should remain. Previously those links dropped the selection. If this still fails, leave it open for a fix; do not treat selecting the child again as a pass.
- [x] **P3-28 Selected-choice reset:** after an enrolment form save, compare the native selected option, the “Selected” hint and what the next submission would use. They must agree, including after an error or reset. Previously the hint retained an old choice while the select reset.
- [x] **P3-29 Empty versus failed reads:** with suitable existing fictional accounts/records, distinguish an unlinked account, no guardian grant, future placement, no current assignment, no published homework and a loading failure. If the backend request fails, the screen must not say the student has no records. Confirm retry/reload works once connectivity returns.
- [x] **P3-30 Sessions and small screens:** sign out and confirm protected requests require login. Switch accounts using separate sessions and check no previous person's data appears. Check the overview and daily modules at a narrow phone width: labels, learner selection, save/error messages, lists and downloads must remain usable.

### 7. Hosted school isolation

On 26 October, the user reported completing School B setup and the cross-school checks and marked DOC-B, P3-31 and P3-32 passed. These are user-reported hosted results, not agent-observed results.

- [x] **P3-31 School B setup — user-reported complete:** agree a small second fictional-school security fixture and its cleanup/retention plan first. This is a test fixture, not a request to build SaaS registration or a platform-owner dashboard. No second school is created by this checklist.
- [x] **P3-32 Cross-school reads and writes — user-reported passed:** use ordinary School A and School B sessions to try each other's learner IDs, classes, assignments, attendance, homework, notices and documents. Test reads and writes, forged school IDs, direct RPC/table calls and file paths. Every cross-school request must fail or return no unauthorized rows, with no changed data. Complete DOC-B above as part of this test and record both directions.

### 8. Development work to finish after testing

The user marked the dashboard and browser acceptance items below complete on 26 October. The separate code-review items at the end still need resolution.

- [x] **P3-33 Resolve reproduced defects:** review failures recorded above, make narrowly scoped fixes, then rerun their checks and relevant automated tests. Do not weaken date rules, roles or RLS to turn a failure into a pass.
- [x] **P3-34 Daily dashboard implementation acceptance:** the agreed role-specific layouts, authorised daily cards and shared top-right profiles are built. Review and accept the result using the regression list below. Keep marks, fees, external notifications and other later-phase features out of this work.
- [x] **P3-35 Dashboard acceptance:** verify the implemented P3-34 result: each role's daily information, links, learner context, empty/error states and mobile layout with existing fictional accounts. A teacher/guardian role switch must not mix the two views.

### Phase 3 completion gate

- [x] All applicable cases above have a recorded result; failures are fixed and retested. Blocked fixture cases remain visible rather than being marked passed.
- [x] Hosted School A/School B isolation, including Storage, is user-reported passed on 26 October.
- [x] The daily dashboard is completed and accepted. No known stale-save, selection or guardian-context defect remains unresolved.
- [x] Latest code revision: ESLint, TypeScript, 524 tests in 57 files and production build passed on 26 October after REVIEW-01/02. Reopen this gate after further code changes; do not rerun merely for documentation edits.
- [x] Final Phase 3 sign-off: the user confirmed completion on 27 October 2026, including the REVIEW-01/02 browser checks. Phase 4 has not started.

Email/SMTP delivery, live account recovery, backup/restore, monitoring, deployment, document retention/scanning and real-school launch approval remain separate live-readiness work. They are not silently marked complete by this checklist.


## Current implementation and remaining regressions

All four roles now use a top-right profile dropdown with identity details, active role and Sign Out. Multi-role accounts choose a workspace at the normal post-login entry and switch through that dropdown. Single-role accounts open directly. Switching starts at the selected overview, clears learner/edit context and keeps the same session. Guardian selection remains explicit. The sidebar no longer duplicates workspace switching.

The daily dashboard is implemented with authorised timetable/homework/announcement/PDF previews and role-specific quick links. Admin counts cover registered records/classes across years. Student current grade/class/year tiles remain on the overview; full history is in the profile menu. No notification bell, attendance chart, marks, finance, global search or events feature was added.

The user marked the following UI and performance checks complete on 26 October. Preserve these as user-reported results; detailed timing figures were not supplied.

- [x] **UI-01:** each single-role account signs in directly to its own workspace and sees its own top-right identity, active role and working Sign Out.
- [x] **UI-02:** the Teacher/Guardian account gets the welcome chooser with only authorised roles. Test both choices and profile-menu switching in both directions, without another login. Verify sidebar changes and explicit Guardian learner reselection; no Teacher roster becomes Guardian access.
- [x] **UI-03:** invalid, removed or revoked role/learner requests do not reveal protected data. Check profile and workspace error feedback.
- [x] **UI-04:** compare Admin counts with school-scoped records including future-year classes; open every quick action. Compare Teacher subjects, Student history and Guardian linked learners with their permitted records.
- [x] **UI-05:** on an eligible school day, compare populated lesson/homework/PDF cards and links against each role's module. Future planning must not become today's activities. Test Guardian links/downloads with the selected learner.
- [x] **UI-06:** check phone and wide desktop layout, keyboard controls, long names/titles, dropdown scrolling and header wrapping without page-wide horizontal scrolling.
- [x] **UI-07:** exercise controlled card/request failures and retry. Preserve role/learner context and distinguish failure from zero/empty data. Check larger lists and pagination warnings.
- [x] **PERF-01:** measure warm production-mode page loads, separating dev compilation from network/database latency. The earlier mocked 17-to-6 loader count is not a current whole-dashboard benchmark.
- [x] **REVIEW-01 — fixed 26 October:** the dropdown renders existing identity data without Teacher/Student history queries. A non-prefetched profile link loads the existing authorised detail component on demand. Student Overview still loads its current enrolment summary.
- [x] **REVIEW-02 — fixed 26 October:** removed implicitAdmin. Multi-role users must choose a workspace on mode-less legacy links. Admin quick links, sidebar links, pagination, recovery links and timetable GET filters preserve explicit school_admin mode. Single-role users still open directly; membership checks are unchanged.

The 25 October full local run passed all 512 tests and the production build after the Guardian overview fixes. No new browser run accompanied it. School B checks and P3-33–P3-35 are now user-reported complete. Both review items were subsequently fixed and covered by the 26 October 524-test run; see the follow-up below.

## Evidence history

Earlier progress appendices, test totals and browser observations are preserved in the [pre-refresh document](../archive/2026-10/docs-before-20261025-reconciliation/docs/DOCUMENTS.md). Use [VERIFICATION.md](VERIFICATION.md) for the current evidence summary. Historical passes do not imply the latest UI revision was browser-tested.

## Guardian overview follow-up — 25 October 2026

The updated Guardian design now keeps the learner picker and selected learner details in one panel. Accounts with no approved learner access get a clear explanation and a prompt to contact School Admin, rather than an unusable selection instruction. Accounts with linked learners still need to select one explicitly. The existing queries, role checks and RLS are unchanged.

The 10 profile tests passed, including new empty-access and selected-learner cases. The full npm run check also passed ESLint, TypeScript, all 512 tests and the production build. Desktop/mobile browser review was subsequently reported complete by the user on 26 October. The two code-review items were subsequently fixed; final sign-off remains separate.

## Local test timeout - 26 October 2026

The user's run passed lint and TypeScript, then stopped at 511 passed tests and one timeout; the build did not run. The PostgreSQL literal-search test includes PGlite startup and shutdown inside Vitest's default 5-second limit. Its timeout is now 60 seconds, consistent with the database suites' setup allowance. Assertions and application behaviour are unchanged. The fresh full npm run check passed lint, TypeScript, all 512 tests in 56 files and production build.

## REVIEW-01/02 follow-up - 26 October 2026

The focused run passed 76 tests in nine files. The first sandbox run failed to load generated temporary modules; the rerun outside that sandbox passed. The full check then passed lint, TypeScript, all 524 tests in 57 files and production build.

The menu regression tests measure zero extra client/profile-loader calls for a ready Teacher or Student actor. Routing tests prove Student module requests do not eagerly load enrolment history, while the explicit profile view does. This is not a claim about whole-page latency: the existing overview summary still reads enrolments and the authorised profile view still reads full history.

No schema, RLS, authentication, account, dependency or environment configuration change was needed. Reused StudentProfile/TeacherProfile and their existing school-scoped readers; no new API or client-side authorization was added.

- [x] Agent browser: Teacher menu shows identity/reference, opens the linked subject list, and retains Teacher mode. Switching to Guardian keeps the session and requires explicit learner selection.
- [x] Agent browser: Student menu shows ST-003 identity and the history link; Overview retains Grade 12 / 12A - 2026 / 2026. The profile view shows current 2026 and upcoming 2027 enrolments with their dates.
- [x] Agent browser: Admin sidebar and quick links include mode=school_admin; the timetable quick link, assignment-filter submission and clear-filter link retain Admin mode. Pagination URLs and multi-role Admin legacy entry are covered by automated tests; no multi-role Admin hosted session or multi-page fixture was exercised in this follow-up.

## Phase 3 sign-off - 27 October 2026

The user completed the REVIEW-01/02 browser follow-up and explicitly signed off Phase 3. These final browser results are user-reported; the earlier agent observations and local checks remain recorded above. No application or Auth setting was changed for sign-off. Live email/recovery, backups, deployment and other real-school launch requirements remain separate.
