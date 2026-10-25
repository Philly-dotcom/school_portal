> Historical snapshot taken before the 25 October 2026 documentation reconciliation. Pending work and test totals below describe an earlier revision. Use the current project documentation for status.

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
- [ ] **DOC-B — Deferred until School B is available:** test direct reads, guessed paths, uploads, overwrite and deletion attempts between School A and School B users. Denied attempts must not expose or change the other school's data or files. Outstanding. School B setup and all hosted cross-school testing belong to the user; no agent setup or testing is authorized.
- [x] **DOC-ANON — Can run without School B:** in a signed-out/private browser, request an existing document download route and its Storage public URL. Neither should return the private PDF. Check anonymous direct metadata/Storage requests are denied too. The user has now marked this separate anonymous-access check complete; it does not require School B.

The app does not issue signed URLs. If another tool creates one, its lifetime and continued validity after a permission change need separate review; do not assume withdrawal invalidates an already issued signed URL.

The 13 completed document items above are your reported hosted results. Keep them checked. The upload validation message has been restored to its original wording and stays as it is.

## Remaining Phase 3 checklist

Updated 24 October 2026. Checked cases are user-reported passes; unchecked cases remain outstanding. These are checks from the existing roadmap, not new product features. The final local check on 24 October passed lint, TypeScript, 490 tests in 55 files and the production build. Passing those checks does not replace the hosted cases below.

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

### 1. Profiles and role access — ready to check

- [x] **P3-01 Student profile:** sign in as the existing linked student and open Overview. Check full name, student reference and school against the register. Confirm each enrolment shows the right academic year, grade, class and dates, with Current/Upcoming/Past matching the school date. Future enrolment visibility must not grant today's attendance or lessons.
- [x] **P3-02 Teacher profile:** sign in as the linked teacher. Confirm full name, teacher reference, school and subjects match their assignments. The same subject/year/status must not repeat merely because it is taught to several classes. Check upcoming or ended assignments have the right label.
- [x] **P3-03 Guardian profile:** confirm full name, school and the explicitly granted students. No classroom roster may appear as guardian children. Before selecting a child, the portal must ask for a learner selection; after selection, daily records must belong to that learner.
- [x] **P3-04 Admin profile:** confirm saved name, email, school and admin reference. The reference is the existing school membership ID, not a newly issued staff number. A missing saved name must say “Name not recorded”; another user's name or email must never appear.
- [x] **P3-05 Combined roles:** use the existing teacher/guardian account in both workspaces. Confirm teacher access works only within teaching scope and Guardian mode offers only explicitly granted children. Changing `mode` or `child` in a URL must not grant another role or learner.
- [x] **P3-06 Revoked/suspended access:** using a separate Admin session, revoke a fictional guardian grant or suspend a non-admin test membership. Reload and make a new protected request from that account. Previously available data must no longer load. Restore only the intended access through the normal Admin workflow after recording the result; do not suspend your only Admin.

### 2. Timetable and planning — ready to check

- [x] **P3-07 Actual lesson rendering:** inspect whether the existing 2026 fixture now has lessons; the last recorded check had none. If necessary, use an eligible existing assignment to add a clearly labelled fictional lesson within its dates. Check teacher, student and selected-guardian views show the correct subject, class, teacher, weekday and time for the current school week. An empty timetable alone does not pass this case.
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

### 4. Homework — remaining lifecycle checks

Teacher publication and permitted student/guardian reads have recorded passes. Reuse the existing labelled homework where suitable.

- [x] **P3-16 Draft and publication lifecycle:** confirm drafts are hidden from learners through the feed and direct requests. Withdraw a published item and check new student/guardian reads fail. Republish and confirm the original audience date is unchanged. Learners must have no submission, editing or grading controls.
- [x] **P3-17 Original recipients:** use a homework item published before a fictional newcomer joined. The newcomer must not gain access. An original recipient who later transfers out must retain access while the item remains published. Check both learner and guardian views. This is intentionally different from announcements/documents.
- [x] **P3-18 Guardian grant removal:** revoke the chosen fictional grant and confirm a new request cannot read that child's homework, including through a direct URL/RPC. Regrant only if that is the intended test setup.
- [x] **P3-19 Teacher assignment ending:** first inspect lessons that depend on the assignment. End it through the permitted workflow without deleting constraints/history. Confirm the former teacher cannot edit its homework and Admin still can. If the test is blocked by timetable dependencies, record them before deciding how to proceed.
- [x] **P3-20 Homework stale save and audit:** open the same item twice, save one version and try the stale version. Confirm a visible conflict, preserved first change and the expected successful-save audit. Check an independent-session attempt too.
- [x] **P3-21 Homework validation:** try a due date outside the academic year, an ineligible first publication date and a forged assignment/role. Expect rejection without a stored partial change. Check a permitted edit to already published overdue work still follows the agreed rules.

### 5. Announcements — remaining reader and lifecycle checks

The user has now marked the reader, lifecycle and concurrency checks below complete. The detailed rules remain in [ANNOUNCEMENTS.md](../../../../docs/ANNOUNCEMENTS.md).

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

### 7. Deferred hosted school isolation

School B is unavailable. The user will handle its setup and all cross-school tests. DOC-B, P3-31 and P3-32 remain outstanding.

- [ ] **P3-31 School B setup — deferred:** agree a small second fictional-school security fixture and its cleanup/retention plan first. This is a test fixture, not a request to build SaaS registration or a platform-owner dashboard. No second school is created by this checklist.
- [ ] **P3-32 Cross-school reads and writes — blocked by P3-31:** use ordinary School A and School B sessions to try each other's learner IDs, classes, assignments, attendance, homework, notices and documents. Test reads and writes, forged school IDs, direct RPC/table calls and file paths. Every cross-school request must fail or return no unauthorized rows, with no changed data. Complete DOC-B above as part of this test and record both directions.

### 8. Development work to finish after testing

These items are not ready for browser sign-off merely because the profile cards exist.

- [ ] **P3-33 Resolve reproduced defects:** review failures recorded above, make narrowly scoped fixes, then rerun their checks and relevant automated tests. Do not weaken date rules, roles or RLS to turn a failure into a pass.
- [ ] **P3-34 Complete and redesign the daily dashboard:** agree the role-specific layout and useful daily information after the current tests. Build it with existing authorized data and explicit guardian selection. Keep marks, fees, external notifications and other later-phase features out of this work.
- [ ] **P3-35 Dashboard acceptance:** once P3-34 is built, verify each role's daily information, links, learner context, empty/error states and mobile layout with existing fictional accounts. A teacher/guardian role switch must not mix the two views.

### Phase 3 completion gate

- [ ] All applicable cases above have a recorded result; failures are fixed and retested. Blocked fixture cases remain visible rather than being marked passed.
- [ ] Hosted School A/School B isolation, including Storage, is verified. Until then, hosted isolation remains unverified even though local two-school tests pass.
- [ ] The daily dashboard is completed and accepted. No known stale-save, selection or guardian-context defect remains unresolved.
- [ ] After the final code changes, lint, TypeScript, the test suite and the production build pass again. Do not repeat a full run just for ticking documentation boxes.
- [ ] Review the result log together and explicitly agree Phase 3 is complete before starting Phase 4.

Email/SMTP delivery, live account recovery, backup/restore, monitoring, deployment, document retention/scanning and real-school launch approval remain separate live-readiness work. They are not silently marked complete by this checklist.


## Performance and navigation follow-up — 24 October 2026

The user reported passes for P3-01 through P3-30 and DOC-ANON, including the new Teacher/Guardian account. Those results are retained. The mistaken School B tick has been removed; no second school or new person was created during this work.

What changed:

- The dashboard passes its freshly verified school context to its read-only panels. Profile readers also reuse the actor already resolved for this render. Nothing is cached between requests. Actions still verify access afresh and database reads still use the signed-in user's RLS context.
- Sidebar and home links retain the selected role and granted learner across daily modules. A single workspace switcher replaces the duplicate overview control. Switching roles stays in the same daily module, clears editor state and requires a new explicit learner selection when entering Guardian from Teacher.
- The header names the active workspace and selected guardian learner. Route/module/profile loading messages, link pending indicators, learner-selection feedback and a dashboard error boundary provide visible progress and a retry path. Retry retains the URL; it does not resubmit a save.

Measurement: a mocked Supabase request-count test ran the real context, actor and profile loaders before and after the change. Teacher and student overview flows fell from **17 to 6 backend operations**, with auth checks falling from **4 to 1**, excluding the unchanged proxy check. This is a round-trip count, not a measured percentage improvement in hosted response time. No comparable before/after hosted latency sample was collected. Network latency, development compilation and larger profile histories can still affect loading.

Follow-up acceptance:

- [ ] Exercise the new error boundary after a controlled request failure and confirm retry preserves role/learner context. Do not simulate failure by changing permissions or production data.
- [ ] Check the updated workspace controls and loading feedback at narrow mobile widths.
- [ ] Measure representative warm production-mode page loads before deciding whether further query optimisation is needed. Separate development compilation time from Supabase/network time.

Phase 3 remains open. This work does not complete the daily-dashboard redesign or its acceptance (P3-34/P3-35), hosted isolation, or the final sign-off.

Browser evidence (agent-observed, 24 October): the existing Teacher/Guardian account opened its teacher profile, switched to Guardian and explicitly selected its granted learner, then opened Announcements and Documents with the same learner retained. Switching Documents to Teacher cleared the learner and showed teacher management; returning to Guardian stayed on Documents and required selection again. The route loading screen was also observed. These were read-only checks, not a new lifecycle or cross-school test.

Final local result: `npm run check` passed ESLint, TypeScript, **490 tests in 55 files**, and production build on 24 October. The first full test attempt hit the existing five-second PGlite timeout in `record-search.test.ts`; the complete rerun passed without changing that timeout or its assertions. Eight new tests cover request reuse and workspace navigation. No migrations or hosted data were changed.

The browser home-link check also passed: returning from Documents to Overview retained Guardian mode and the explicitly selected learner. These fixes are complete at the code/local-test level; the follow-up acceptance items above and P3-33 remain open until reviewed with the remaining Phase 3 work.


## Daily dashboard implementation - 24 October 2026

The new overview follows the approved green card layout while keeping the existing school workspace and modules. It is an improvement to the current portal, not a replacement application.

- School Admin has school-scoped registered-student, registered-teacher and class counts; quick links to attendance, school registers, academic setup, timetable planning, announcements and settings; and published homework, announcement and PDF previews. Class counts include all academic years and are labelled that way.
- Teacher, Student and selected-Guardian overviews show today's scheduled lessons, upcoming due homework from the current preview page, published announcements and available PDFs. Each card links to the existing full module. Teacher actions point to the existing attendance and homework workflows; learner actions remain read-only.
- Guardian must choose an explicitly granted learner before daily cards load. The selected role and child remain on card links and document downloads. There is no self-service child linking.
- Existing profiles remain available. Student enrolment years and Current/Upcoming/Past labels remain visible; Teacher and Admin profile details can be expanded. Choosing a role or viewing a future enrolment does not change the school-local day or operational eligibility.
- Cards stream independently and distinguish a failed read from an empty list. Responsive styles stack cards on narrower screens and let the active-workspace header wrap.

The overview deliberately uses bounded first-page previews. It does not fetch every school record on each visit. If more pages exist, the card says so; filtered previews never claim to be whole-school totals. Homework has no submission/completion tracking, and a scheduled lesson is not labelled completed. Drafts and withdrawn items remain accessible only through their existing authorized management pages, not the published overview feeds.

Not included: attendance percentages/charts, missing-register totals with an undefined denominator, school-wide lesson aggregation, notification counters, global search, events, document expiry, marks, finance, or a new academic-year filter. Those mockup elements must not imply functionality or metrics we do not yet have. No schema, RLS policy, action, package, or environment change was required.

### Dashboard acceptance after this change

- [ ] Admin: compare each registered-record count with school-scoped records, including future-year classes. Open every quick action and expand the administrator profile.
- [ ] Student: confirm identity and enrolment years, current-day lessons, homework links and PDF downloads using the student's own session. Future planning records must not become today's lessons.
- [ ] Teacher: expand linked subjects, open attendance/homework from the overview and compare the cards with the existing modules.
- [ ] Guardian: verify no daily cards before selection; select a granted learner and compare each card/link/download with that learner's module view. Repeat a role switch and reselect deliberately.
- [ ] On a school day with existing lessons, verify displayed times and subject/class labels. An empty Saturday view does not validate populated lessons.
- [ ] Phone and desktop: check keyboard navigation, expanded profiles, long names/titles, header wrapping and all quick links. No page-wide horizontal scrolling should be needed.
- [ ] Check failed-card feedback and a list large enough to paginate: no false zero totals, false empty-day claims or hidden pagination warning.

P3-34 now has a dashboard implementation ready for acceptance. P3-34/P3-35 and Phase 3 remain unchecked until the user reviews the result. DOC-B/P3-31/P3-32 remain outstanding and entirely user-owned.


Dashboard verification: `npm run check` passed ESLint, TypeScript, **504 tests in 56 files**, and production build on 24 October. The 14 new dashboard tests passed. The existing routing, profile, request-count, module and SQL suites also passed. The earlier 17-to-6 request measurement applies to context/actor/profile reads only; the new dashboard deliberately adds bounded reads for its visible cards and has not been benchmarked end to end.

Agent browser observations: the existing Teacher/Guardian account rendered the Teacher dashboard, school-local date, published notices and honest empty lesson/homework/PDF states. Switching to Guardian hid the daily cards until a learner was explicitly selected. After selection, the cards appeared and every inspected quick/module link retained Guardian mode and that learner. The narrower browser layout stacked cards correctly. No account, grant or school record was changed. Separate Admin/Student sessions, populated lesson/homework/PDF cards, exact phone-width layout and the remaining acceptance cases above still need results.


## Admin and Student reference-layout refinement - 25 October 2026

Revisited the approved images and made the two dashboards more distinct. Admin now starts with the authenticated profile name, followed by coloured registered-student/teacher/class tiles and a compact quick-actions panel beside the daily feeds on wide screens. The complete administrator profile is still available through its disclosure.

Student now starts with a single welcome heading and current grade, class and academic-year tiles. These are derived from the already loaded enrolments using the school-local date; future placements never fill the current tiles. Full identity, reference, school and current/upcoming/past history remain in an expandable profile section. The daily cards follow without the old expanded history dominating the page. Layouts stack at smaller widths.

Changed: dashboard/page.tsx, daily-overview.tsx, role-overview.tsx, student-profile.tsx, staff-profile.tsx and globals.css. Added targeted assertions in the existing student/staff profile suites. No new data queries, schema, permissions, dependencies, notifications, attendance charts or year-switching logic were added. Teacher and Guardian workflows remain as before.

The local server was initially unavailable, then the user started it and signed in as Admin. The agent confirmed the personalized Admin heading, live registered counts (5 students, 5 teachers, 4 classes across years), published notices and quick-action links. The count tiles were adjusted to stack at the narrower browser width. This is a rendering check, not an independent audit of database totals. Student acceptance and wide desktop/phone checks remain to be recorded, including expanded details, long names, future-only enrolments and existing daily-module links. This does not close P3-34/P3-35 or Phase 3.


Agent browser follow-up, 25 October: Admin rendering was checked with the user's existing Admin login. Student rendering was then checked as Mpoetsi (ST-003): tiles showed Grade 12, class 12A - 2026 and year 2026. Expanding profile/history showed the existing 2027 placement labelled Upcoming and 2026 labelled Current. No records were edited. The current narrower desktop width was visually inspected; wide desktop/phone acceptance and populated lesson/PDF/error cases remain separate.


Final validation for the 25 October Admin/Student refinement: `npm run check` passed ESLint, TypeScript, **507 tests in 56 files**, and production build. Three added profile tests cover the current-placement tiles, future-only placement handling and the Admin greeting without a duplicate profile read. Student timetable navigation also passed in the existing authenticated session and displayed permitted 2026 lessons. No data or security changes were made. Full responsive acceptance and the existing Phase 3 completion gates remain open.

## Admin sidebar and profile placement — 25 October 2026

The Admin sidebar now separates everyday pages under Workspace from Academic setup, School registers, Teaching assignments, People & access and School settings under School management. Timetable remains with the everyday pages.

The Admin name, initials and role now sit at the top right. Open that control to see the full name, membership reference, email, school and sign-out button. The overview keeps its welcome heading without repeating the profile panel. The notification bell remains excluded.

The page starts one Admin profile read and shares its promise between the header and welcome heading for that render. There is no persistent cache. Existing permissions, navigation destinations, mutations and database policies are unchanged.

Browser check: the existing Admin account showed both sidebar sections and the expanded profile in the narrower desktop viewport. Academic setup opened successfully and retained the profile control. No school records were changed. Wide desktop, phone and keyboard acceptance remain open, as do P3-34/P3-35 and the user-owned School B checks. Phase 3 is not complete.

Final check for the Admin sidebar/profile correction: npm run check passed ESLint, TypeScript, 509 tests in 56 files and production build. The two added tests cover sidebar/header placement and sharing the Admin profile read. Browser evidence is limited to the existing Admin session described above; remaining acceptance stays open.

## Shared profiles and workspace choice - 25 October 2026

Implemented for review, not verified yet. The user asked to handle all testing and verification themselves, so no tests, lint, type checks, builds, migrations or browser checks were run for this change. The earlier 509-test result applies to the previous revision.

Every active workspace now uses the same top-right profile dropdown. It shows the linked identity details, active role and sign-out. Accounts with multiple roles also get Switch Workspace. Teacher subjects and Student enrolment history are in the dropdown; Student current-placement tiles and Guardian learner selection remain on the overview.

After sign-in, the existing /dashboard entry asks multi-role accounts how they want to continue. A single-role account opens its workspace directly. Choices come from the existing server-verified active membership. Switching opens the chosen role's overview in the same session and drops any learner or edit context. Guardian users must select a permitted learner again. The old sidebar role switcher has been removed.

Explicit mode URLs are validated against current membership roles. Existing Admin management URLs still identify an Admin destination for authorised Admins. A Teacher or Guardian mode does not expose Admin management navigation. This changes navigation/presentation only; it does not add a role-grant mechanism, remembered browser permissions, schema changes or RLS changes.

User checks still needed: single-role sign-in for all four roles; multi-role welcome/selection; profile details and active label on daily and management pages; switching each direction without another login; explicit Guardian learner reselection; forged/revoked role denial; sign-out; narrow-screen and keyboard use. Run the updated automated checks and production build after review. Phase 3 stays open, including the existing School B and dashboard acceptance gates.

