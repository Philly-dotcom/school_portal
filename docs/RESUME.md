# Where we left off

Updated 20 October 2026.

## Current position

We are in **Phase 3: Daily Operations**. Migrations through **021 are user-confirmed applied**. Do not rerun them. We still use fictional records in the dedicated School Portal project.

Role workspaces, personal timetables, attendance, view-only homework, announcements and private PDF documents are implemented. Read-only profiles now appear on each role's overview:

- Student: linked name, reference, school and enrolments, with year, grade, class, dates and Current/Upcoming/Past labels.
- Teacher: linked name, reference, school and subjects grouped by academic year and date status.
- Guardian: name, school and explicitly granted learners. A learner must still be selected before opening daily records.
- Admin: saved name, authenticated email, school and school membership ID as the admin reference. There is no separate admin reference field.

The daily dashboard is not finished. The user wants it completed and redesigned after the pending tests, within the existing architecture and permissions. Phase 4 has not started.

## Testing now

Use [DOCUMENTS.md — remaining Phase 3 checklist](DOCUMENTS.md#remaining-phase-3-checklist). Cases P3-01–P3-35 have steps and expected results. Record the case ID, role, fictional record/date, actual result and pass/fail/blocked status. Do not repeat a completed case merely because an archived note says it was pending.

The user completed **13 document hosted checks**, including bucket configuration, file validation, role restrictions, transfers/revocations, interrupted uploads and stale visibility saves. Those boxes stay checked. School B isolation is deferred because School B is not registered. Anonymous/public document access has a separate unchecked item because its result was bundled into the deferred item and has not been recorded separately.

The latest full local validation passed **lint, TypeScript, 482 tests in 53 files and production build** on 20 October; the user also confirmed a passing run. These results do not prove the remaining hosted cases. The document upload error message is restored to its original wording and should stay as it is.

## Known issues still open

- Attendance: a second stale Admin tab stayed on “Saving…” for minutes. Reload preserved the first save, but the expected conflict feedback was missing. Do not change SQLSTATE mapping or retry logic without tracing the stalled request.
- Enrolment form: the select reset while the “Selected” hint retained an older choice. Displayed and submitted choices must agree.
- Guardian navigation: Announcements and Documents sidebar links dropped the selected learner/context. Re-selecting the learner is a workaround, not a pass.

Profile browser checks, actual current-year lesson rendering, remaining non-document lifecycle/security tests and independent-session concurrency still need their own results. Document passes do not close similar cases in homework or announcements.

## Existing fictional records

Reuse the existing accounts and people; do not create duplicate schools, learners, accounts or guardian grants. The user logs into role accounts themselves and does not share credentials.

The authorized 2026 fixture is **Acceptance 12A**, Grade 12, class `11de7dc9-4a5e-477c-acec-370bcf311e48`. It was created using existing ST-003, ST-002 and DEMO-ST-002 learners and Mrs Leruo (TE-003), with placements/assignment from 1 October to 26 November 2026. Inspect the current state before testing: the user's document lifecycle checks may have changed placements, grants or assignments. Do not assume the older fixture snapshot is still exact.

Keep the 2027 planning records intact. The approved 9 October repair corrected the original year's dates to 18 January–26 November 2027, retained its ID/history, corrected ST-002's end date and reversed ST-003's accidental withdrawal. The existing 2026 year spans 18 January–26 November 2026. The applied repair is archived; never rerun it as setup.

Basic separate-session teacher, student and guardian checks passed on 19 October for permitted attendance/homework reads and several route denials. Admin notice draft/publish/withdraw/republish passed. These results are preserved in the [verification history](../archive/2026-10/docs/VERIFICATION_THROUGH_20261020.md).

## Resume safely

1. Read the current checklist and the user's latest results.
2. Inspect the working tree before editing; preserve the user's UI changes and `.env.local`.
3. Reuse current fictional records and normal authenticated permissions. Do not weaken date rules or RLS.
4. Resolve recorded defects and retest their cases. Agree a separate School B test fixture before provisioning anything.
5. Complete the daily dashboard after testing, then agree Phase 3 acceptance together.

Email/invitation/recovery delivery remains disabled or unverified. Live recovery, backup/restore, monitoring, deployment and real-school approval remain separate gates. Do not deploy, start Phase 4 or treat this checkpoint as live readiness. The user's dev server belongs to their testing session; leave it running unless asked otherwise.

## References

- [Current checklist](DOCUMENTS.md#remaining-phase-3-checklist)
- [Current verification summary](VERIFICATION.md)
- [Roadmap](ROADMAP.md)
- [Architecture](ARCHITECTURE.md)
- [File guide](FILE_GUIDE.md)
- [Archive index](../archive/README.md)
- [Full resume notes before this refresh](../archive/2026-10/docs/RESUME_BEFORE_20261020_REFRESH.md)
