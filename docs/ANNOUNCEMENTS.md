# Announcements

Added on 8 October 2026 as part of Phase 3. You subsequently confirmed applying migration `202610080020_announcements.sql` in Supabase. Do not rerun it. The browser checks below remain to be recorded individually.

## Who can publish and read

School Admin can create a notice for the whole school or one class. A teacher can create class notices while they have a current teaching assignment for that class. Both publish directly, without a review queue.

Class notices are a current noticeboard. Learners joining a class can read its earlier published notices; learners leaving the class lose access. Guardians need an explicit grant for the selected learner. This is different from homework, which follows the original publication-date enrollment.

School-wide published notices appear in the teacher, linked student and authorized guardian workspaces. Guardians select a permitted learner before opening their feed. A teacher cannot edit a school-wide notice. Switching modes on a combined teacher/guardian account does not turn class roster access into guardian access.

## How staff use it

Open **Announcements** in the sidebar. Create a notice, choose the audience, and enter a title and message. The title allows 160 characters and the message allows 10,000. Messages are plain text; line breaks are preserved.

New notices start as drafts. Selecting **Published** and saving makes the notice visible immediately in the portal. No email, SMS or WhatsApp message is sent. Withdrawal hides the notice from its readers, while authorized staff can still manage it. Previously published notices cannot be turned back into drafts.

The audience stays fixed after creation. To address another class or the whole school, create a new notice. This prevents an edit from unexpectedly widening who can read an existing message. Current teachers of the class share management access; authorship does not keep access after an assignment ends. School Admin can still manage those notices.

Saves check the record version. If another person has already changed a notice, reload and review their changes before saving again. Each successful save records an audit event in the same transaction.

## Where the implementation lives

| File | Purpose |
| --- | --- |
| `supabase/migrations/202610080020_announcements.sql` | Notice table, school/class ownership, RLS, bounded class search, reads and audited versioned saves. |
| `src/lib/announcement-validation.ts` | Input limits, explicit school/class scope, response types and links. |
| `src/lib/announcement-data.ts` | Reads a page of notices or a single permitted item for editing. |
| `src/app/dashboard/announcements/actions.ts` | Checks the signed-in school and role, validates the form and calls the save function. |
| `src/app/dashboard/announcements/search-actions.ts` | Searches only classes the selected staff role can manage. |
| `src/components/announcement-form.tsx` | Audience selection, message editor and publication controls. |
| `src/components/announcement-panel.tsx` | Staff management and paginated reader feeds, with guardian learner selection. |
| `tests/announcements-database.test.ts` | Permissions, transfers, school isolation, stale writes, audit rollback and pagination using fictional data. |
| `tests/announcements-actions.test.ts` | Trusted server context, form validation, search limits, safe errors and read results. |
| `tests/announcements-panel.test.ts` | Escaped messages, reader restrictions, guardian selection and editor controls. |

The dashboard, sidebar and role overview link to this module. It uses the existing user-context Supabase client, shared class picker and pagination. No packages, environment variables or elevated credentials were added. Direct client writes to the table are denied; the save function checks permissions again inside the database.

## Browser checks after applying 020

- [ ] As Admin, create a school-wide draft. It should stay hidden from teachers, students and guardians until published.
- [ ] Publish it. Check each linked role can read it and only Admin can edit it.
- [ ] As a teacher, create and publish a notice for a class you currently teach. A different class must not be available to you.
- [ ] Check a current learner and an explicitly authorized guardian can read the class notice. An unrelated learner or guardian must not see it.
- [ ] Test a combined teacher/guardian account in both modes. Guardian mode must not reveal other learners from the teacher's roster.
- [ ] Transfer a fictional learner using dated enrollment. Once the transfer takes effect, the old class notice disappears and the new class's published notices become readable.
- [ ] End a test teaching assignment, respecting existing timetable constraints. That teacher must lose class-notice editing access; Admin must retain it.
- [ ] Withdraw a notice, confirm it disappears for readers, then republish it.
- [ ] Edit the same notice in two tabs. The stale save must fail without overwriting the first change.
- [ ] Check denied reads and writes with a second fictional school and direct API requests. Local SQL tests do not replace these hosted checks.

PDF attachments, notifications, read receipts and scheduled publication are not part of this increment. The separate [Documents library](DOCUMENTS.md) is now built under its confirmed upload rules; it does not attach files to notices or homework.
