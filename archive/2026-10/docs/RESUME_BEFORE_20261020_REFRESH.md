# Where we left off

Updated 20 October 2026.

## Current testing checklist — 20 October

Use [DOCUMENTS.md — remaining Phase 3 checklist](../../../docs/DOCUMENTS.md#remaining-phase-3-checklist) as the combined working checklist. It gives each remaining case an ID, practical steps and the expected result. Record failures and blocked cases there as well as passes. Older lists below are historical checkpoints, not instructions to repeat completed work.

Migration **021 is user-confirmed applied**. The 13 document hosted checks marked complete are accepted as the user's reported results. School B isolation remains deferred because that school is not registered. Anonymous/public document requests are listed separately because they do not depend on School B and their result was not separately recorded. The upload error message is restored to its original wording; no code change is needed for it.

The latest local validation remains lint, TypeScript, **482 tests in 53 files**, and production build passed, also confirmed by the user. This update changes documentation only. Profile checks, the remaining non-document cases, the previously reported defects and daily dashboard completion/redesign remain on the checklist. Document passes do not automatically close the same scenarios in attendance, homework or announcements.

## Profiles for the other roles

Guardian Overview now shows the guardian's full name, school and explicitly granted students. Selecting a learner is still required before opening that learner's daily records. The guardian reference is no longer displayed on Overview.

Teacher Overview shows the linked full name, teacher reference, school and assigned subjects. Subjects are grouped by academic year and Current, Upcoming or Past status; teaching the same subject in several classes does not repeat the same year/status entry.

Admin Overview shows the saved profile name, authenticated account email, school and the existing school membership ID, labelled as the admin reference. There is no separate admin reference field in the schema. A blank saved name says “Name not recorded” rather than inventing one.

These are read-only profile additions using existing permissions. No migrations, accounts or hosted records were changed. Check all three views with the existing role accounts. The user has confirmed that completing and redesigning the daily dashboard comes after the pending tests; these profile additions do not replace that work.

## Student profile and enrolment overview

Students now see their linked name, student reference and school on the overview after login. Their enrolment cards show the academic year, grade, class and placement dates, with Current, Upcoming or Past labels based on the school's date. Transfer and withdrawal records stay visible. Future enrolments are shown without granting access to today's operations.

`src/lib/student-profile-data.ts` resolves the signed-in student and reads their enrolments through the existing RLS policies. `src/components/student-profile.tsx` displays them inside the student role overview. No migration or configuration change is needed. Missing enrolments and failed reads have separate messages. The existing teaching-form label edits were left alone.

The signed-in student browser check is still pending: open Overview and check the existing 2026 and 2027 placements against the register. This change does not complete the daily dashboard work or Phase 3 acceptance.

## Browser testing resumed

Latest Admin follow-up: the stale attendance save reproduced on 19 October. It stayed pending for several minutes; reload confirmed the first save survived (ST-002 Present, ST-003 Present, DEMO-ST-002 Unmarked). The missing conflict response remains a blocker. The labelled school-wide notice `50fdadba-2218-4221-ba82-d417707d0aa4` passed Admin draft/publish/withdraw/republish checks and is currently Published. Reader visibility across those changes is still untested. The browser is left signed in as Admin and the server remains running.

Before signing off Phase 3, resolve the pending-save behaviour, selected-choice reset mismatch and guardian sidebar context loss. Then finish the remaining publication/transfer/grant-revocation checks, actual timetable lesson rendering, Storage boundaries, direct API and existing-second-school isolation checks, and the daily dashboard integration work. Do not treat the separate role-session passes as completion of those scenarios. Reuse the existing fixtures; no new school or student is authorized.

Guardian checks are now recorded too: GU-003 required explicit selection of its only granted learner, ST-003; attendance and published homework matched the student session. An unrelated ST-002 attendance URL and the Physics draft download were denied. The timetable showed the expected no-lessons message. The Announcements sidebar drops the learner selection and asks the guardian to select again; the Documents sidebar also omits role/child parameters. Track this navigation issue alongside the stale-save and form-reset findings below. No grants were changed. Next, resume Admin checks for stale saves and the remaining publication/document workflows; the full Phase 3 gate remains open.

The current-year fixture was added with your approval on 15 October. Reuse it; do not create another school or student. **Acceptance 12A**, Grade 12, belongs to the existing 2026 year (class ID `11de7dc9-4a5e-477c-acec-370bcf311e48`). Existing learners ST-003, ST-002 and DEMO-ST-002 have placements from 1 October to 26 November 2026. Mrs Leruo (TE-003) has a Geography assignment for the same dates. Their 2027 planning records remain intact. No new accounts or guardian grants were created.

Admin browser checks passed on 15 October: partial attendance saves persisted after reload, untouched learners stayed unmarked, and an explicit clear removed a mark. For 14 October, the browser required a correction reason and the reasoned save persisted. ST-003 was left Present on 14 October and Late on 15 October; the other two learners were unmarked on 15 October. These are fictional test marks. The existing Physics draft PDF also downloaded successfully for Admin.

Two findings still need investigation: the second attendance tab stayed on “Saving…” during the stale-save test, and an enrollment form's dropdown reset after saving while its “Selected” hint still showed the previous choice. Neither is recorded as a pass. The first tab's newer attendance values persisted; independent-session concurrency is still unverified.

On 19 October, the user signed in separately as the existing teacher and student. Teacher checks passed for current-class search, saving today's attendance, read-only history, denied history before assignment start, and denying a requested Admin workspace. The teacher published the labelled test Geography homework (ID `0fe154b2-35eb-4d1b-b1fd-25eb9455d9ee`, due 23 October). ST-003's student session displayed it read-only and showed only that learner's attendance history, including today's Present mark. Both roles were denied the Physics draft's direct download route; the student was also denied a teacher-register URL. The teacher timetable correctly explained that no current-week lessons were scheduled. These checks do not prove direct API denials, transfers or full concurrency. Guardian verification is next; the user enters all credentials. See VERIFICATION.md for the individual results and screenshots.

Three draft PDFs were visible on 15 October, so the older note saying 021 was wholly pending is no longer a reliable description of the hosted library. Metadata reads and one Admin download work. Exact migration application, bucket settings, denied Storage requests and other role downloads still need verification; do not rerun 021 blindly. Phase 3 remains open, including the daily dashboard integration question and the remaining hosted acceptance checklist below.

The sections below retain the earlier checkpoints. Their pending-fixture statements describe the dates on which they were written; the fixture above now exists.

## Attendance and timetable messages

The remaining message and selection fixes are implemented. Attendance keeps the selected class after a rejected request. Admins get an explanation when a class belongs to a future year or the date falls outside its year; teachers get a reminder that their assignment must cover today and the requested date. Loading failures stay separate from eligibility messages. These explanations do not grant access or replace the database checks.

The personal timetable now checks the signed-in person's permitted dated records when the first page has no lessons. It explains a future assignment/enrolment, no current or upcoming placement, or a current placement with no lessons this week. A failed date query is reported as a failure, not as missing data. Guardian checks use the selected learner, not a teacher's roster. Learner homework now says when no published homework is available and explains that drafts are hidden.

No migration, dependency, environment setting or hosted-data change is needed for these UI fixes. The 2026 daily-operations fixture and the separate signed-in role checks remain pending. These changes do not complete Phase 3 acceptance.

Verification finished on 13 October: `npm run check` passed lint, TypeScript, 471 tests in 51 files, and the production build. A signed-in Admin browser check against hosted data confirmed that 12A stays selected after today's register is rejected, with the correct 2027 start-date explanation. No attendance data was written. See [VERIFICATION.md](../../../docs/VERIFICATION.md) for the evidence and remaining role checks.

## Hosted academic-data correction — 9 October

The approved fictional-data repair is complete. The original `2027_mistake` year is now `2027`, from 18 January to 26 November 2027, with its original ID and relationships. ST-002's enrolment now ends on 26 November 2027. ST-003's accidental withdrawal was reversed on the existing enrolment, restoring 18 January–26 November 2027; its original withdrawal audit is still present. The empty year named `2026` now spans 18 January–26 November 2026. These are fictional test dates, not an official school calendar.

Read-only SQL checks found no attendance sessions or entries and no published homework audience before the repair. A rollback rehearsal passed, then the same guarded transaction was committed. A separate query verified the persisted dates and four before/after audit entries. Classes (3), terms (2), teaching assignments (7), lessons (6), homework (1), announcements (1), and documents (2) remain. No migrations, RLS policies, accounts or guardian links were changed. The applied SQL is archived at `archive/2026-10/20261009_academic_dates_repair.sql`; do not rerun it.

Future-year planning is intentional. Keep 2027 records for that scenario and use a separate current-year fixture for daily operations; 2026 still had no classes at the repair checkpoint. Current-day attendance remains unavailable for the future 2027 classes by design. The role-session checks remain outstanding. The correction does not complete Phase 3 acceptance or verify document Storage policies. The older development checkpoint below remains historical where it refers to pending hosted work.

## Earlier checkpoint — 8 October

We are in Phase 3. Role workspaces, personal timetables, attendance and view-only homework are built. You report the browser checks are about halfway through and everything checked so far works. This does not mark the remaining scenarios complete. You then approved continuing with announcements and confirmed their publishing and audience rules.

You confirmed that **020 is applied** and agreed the PDF uploader and audience rules. The private Documents library is now built locally. **Migration 021 is pending application**; it creates the private bucket, metadata and Storage policies. Start with [DOCUMENTS.md](../../../docs/DOCUMENTS.md) for setup, file explanations and browser checks.

Migrations through **020 are user-confirmed applied**. Do not rerun them. Homework working and the report that browser checks are going well do not close the remaining individual permission, transfer and concurrency checks.

The latest full `npm run check`, after documents, passed lint, TypeScript, **457 tests in 49 files**, and the production build on 8 October. Documents add 43 tests. Storage SQL tests use a minimal PGlite fixture; they do not prove real Storage HTTP behaviour, bucket limits or uploaded file handling. Those checks remain yours to complete after applying 021.

The temporary Phase 3 guide is unchanged at your request. Current progress now belongs in these main project docs. You still own the pending browser checks. Email, invitations and recovery delivery remain disabled/unverified. No hosted records, deployment or cloud configuration were changed by this development work.

## What homework does

- School Admin and teachers with current access to an assignment can create drafts, publish directly, edit and withdraw homework. There is no extra approval step for homework.
- The original assignment remains fixed after creation. Teachers lose editing access when their assignment ends; admins can still manage the item.
- First publication fixes the audience date. Only learners enrolled in that class on that date can read it, plus guardians with current explicit access to those learners. Later joiners cannot read older work just because they now share the class.
- Editing, withdrawal and republication keep the original audience date. This rule uses recorded enrollment history, so an authorized correction to that history can change who qualifies.
- Drafts and withdrawn items stay hidden from learners. There are no submissions, grading, completion buttons, files or external notifications in this module.
- Due dates must fit the academic year. First publication requires a current academic year and a due date today or later. Published work can still be corrected after its due date.
- Staff edits use a version check and audit. Stale edits must be rejected, not silently overwritten.

## Earlier testing checklist — superseded by the combined checklist above

When you started the role-access check, you had only the Admin login. School register records do not create login accounts. We walked through creating separate fictional teacher, student, guardian and combined teacher/guardian accounts without email delivery, accepting prepared school invitations, and using **Link sign-in** to connect the records. Guardian access also needs an explicit learner grant. You have not yet confirmed completing that setup or the role checks. Keep the existing Admin account separate.

Resume with the account setup and role-access check below. Record each result as you finish; nothing in this list is marked passed just because homework works from the Admin account.

Use fictional accounts and records only. Dates must cover the school-local day you test; the older 2027 fixtures will not automatically work as current records in 2026.

1. **Role access:** sign in as linked teacher, student and guardian accounts. A guardian must select an explicitly granted learner. Test a teacher/guardian account in both modes; classroom roster access must not become child access.
2. **Timetable:** check the current school week, dated placements and assignment boundaries. Try an unrelated child ID and a suspended account. Confirm the admin planning screen and public static preview still behave correctly.
3. **Attendance:** mark just two learners, save, reload and confirm the rest remain unmarked. Edit a mark and explicitly clear one. Test multiple roster pages. School Admin needs a reason for an older date; teachers can only edit today and read history covered by their current assignment.
4. **Homework visibility:** save a draft as a teacher. Check that student/guardian accounts cannot see it, including by direct RPC or table requests. Publish it and verify access for the original recipients. Withdraw it and verify it disappears; republish and confirm its audience date is unchanged.
5. **Homework transfers:** use an item published before a newcomer joined. The newcomer must not see it. An original recipient who later transfers out must retain access while the item is published. Test revoked guardian access too.
6. **Lost teacher responsibility:** end the relevant test assignment and confirm its former teacher cannot edit the homework. School Admin should still be able to withdraw it. Review existing timetable constraints before ending an assignment; do not delete lessons merely to force the test through.
7. **Stale saves:** open the same attendance register or homework item in two tabs. Save one, then try the stale other tab. Confirm a conflict, reload and inspect the stored result. Independent hosted sessions are still needed for real concurrency evidence.
8. **School isolation:** test denied reads and writes from School B, including direct database/API calls. Local tests are not proof that the hosted configuration is correct.

Earlier Phase 1 account/security readiness and Phase 2 correction/search/lifecycle acceptance checks remain open. Keep invitation/recovery delivery, admin recovery/MFA policy, backups, deployment checks and school acceptance as separate live-use requirements.

## What remains in Phase 3

Finish the remaining cases in [DOCUMENTS.md](../../../docs/DOCUMENTS.md#remaining-phase-3-checklist), resolve reproduced defects, and complete/redesign the daily dashboard after testing. Migration 021 is already applied; do not rerun it. Hosted cross-school isolation remains deferred until the second fictional-school test setup is agreed. Phase 3 acceptance is still open. No work on marks, report cards, fees, SaaS administration, external notifications or AI has been brought forward.

The mistaken 2030 year end was corrected with explicit approval on 9 October, as recorded above. Do not reapply that repair or silently change the remaining fictional records. The server belongs to your testing session; do not stop or restart it unnecessarily. Never print `.env.local`.

## Useful references

- [File guide](../../../docs/FILE_GUIDE.md)
- [Test guide](../../../tests/README.md)
- [Architecture](../../../docs/ARCHITECTURE.md)
- [Agreed product context](../../../docs/PROJECT_CONTEXT.md)
- [Roadmap and remaining gates](../../../docs/ROADMAP.md)
- [Verification history](../../../docs/VERIFICATION.md)
- [Original synthetic dataset](SYNTHETIC_DATA.md)

Older dated reports and archived repair scripts are history, not instructions to reapply migrations or patches.
