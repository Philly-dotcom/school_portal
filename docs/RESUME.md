# Where we left off

Updated 8 October 2026.

## Current position

We are in Phase 3. Role workspaces, personal timetables, attendance and view-only homework are built. You report the browser checks are about halfway through and everything checked so far works. This does not mark the remaining scenarios complete. You then approved continuing with announcements and confirmed their publishing and audience rules.

You confirmed that **020 is applied** and agreed the PDF uploader and audience rules. The private Documents library is now built locally. **Migration 021 is pending application**; it creates the private bucket, metadata and Storage policies. Start with [DOCUMENTS.md](DOCUMENTS.md) for setup, file explanations and browser checks.

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

## Testing in progress

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

Apply 021, verify the private bucket and document flows, and finish the outstanding announcement, timetable, attendance, homework and role checks. All planned Phase 3 modules now have local implementations, but Phase 3 acceptance is still open. Use ANNOUNCEMENTS.md and DOCUMENTS.md alongside the checklist above. No work on marks, report cards, fees, SaaS administration, external notifications or AI has been brought forward.

The pre-existing test dataset included a year named 2027 extending through 2030 and a grade named Thapelo. Do not silently rename or delete those records. The server belongs to your testing session; do not stop or restart it unnecessarily. Never print `.env.local`.

## Useful references

- [File guide](FILE_GUIDE.md)
- [Test guide](../tests/README.md)
- [Architecture](ARCHITECTURE.md)
- [Agreed product context](PROJECT_CONTEXT.md)
- [Roadmap and remaining gates](ROADMAP.md)
- [Verification history](VERIFICATION.md)
- [Original synthetic dataset](SYNTHETIC_DATA.md)

Older dated reports and archived repair scripts are history, not instructions to reapply migrations or patches.
