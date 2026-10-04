# Teaching assignments

## Ending or replacing a teacher — migration 014

Built locally on 4 October. Apply `supabase/migrations/202610040014_teaching_assignment_lifecycle.sql` once after 013 in the dedicated fictional-data project, then reload Teaching assignments. **014 has not been applied by this work.** Existing migrations stay unchanged. Before 014, creation/listing still work and the new controls say changes are not enabled yet.

Open **End or replace teacher** on an unclosed assignment:

- **End assignment:** choose the last teaching day, inclusive, within the current assignment. The record stays in history and cannot be closed again.
- **Replace teacher:** choose a different teacher from the same school and their first day, later than the original first day. The previous assignment ends the day before; a new assignment keeps the subject, class, academic year and original end date. Both changes and the audit record commit together.
- Review the dates and confirm. A stale form is refused rather than overwriting another change. There is no undo button; review carefully.

The same teacher can now have separate, non-overlapping periods for a subject/class. Inclusive dates cannot overlap. Co-teaching by different teachers remains allowed. Future replacements do not transfer current roster access early. Closing a row records a decision; its dates still determine which teacher has current access.

**Timetable rule:** a lesson's full stored date range must fit inside its assignment. If an existing lesson extends past the old teacher's new last day, the change is rejected without touching either assignment or lesson. Review that schedule first using the existing timetable controls. This workflow does not silently split, move or delete lessons, and it does not schedule lessons for the replacement teacher. Automatic timetable handover remains outside this increment. Historical lessons within the retained dates remain linked to the original assignment.

Subject/class/start-date corrections, first-day replacement and automatic promotion are not part of this editor. These remain separate scope decisions. No memberships, roles, accounts or emails are created by ending/replacing a teacher.

### Checks after applying 014

Use a disposable fictional assignment whose lessons already fit the planned cutoff. End or replace it, refresh and check the retained dates and audit entry. Try the old form in another tab and expect rejection. Also try a conflicting replacement period and a cutoff before an existing lesson ends; both should leave records unchanged. Verify dated access with separate teacher sessions. Local tests cover these SQL rules; hosted concurrent sessions and role-specific UI access remain unverified.

## Activate and test

Migration 005 introduced this module after 001–004. Existing hosted creation workflows have since been exercised; do not reapply the migration based on this guide. Confirm the actual migration baseline before an approved staging rehearsal. Sign in as School Admin and open **Teaching assignments** to review existing fictional records.

Use fictional records when ready to test:

1. Create a teacher in School registers, and a subject, year, grade and class in Academic setup if none exist.
2. Select the teacher, subject and class. Class choices include grade and academic year to distinguish repeated names.
3. Enter the assignment dates within the class year and save.
4. Reload and confirm the assignment remains visible. Check recent activity in People & access for `teaching_assignments.insert`.
5. Try the same teacher/subject/class for overlapping dates: it should be rejected. After 014, separate non-overlapping periods are allowed. A different teacher can share the subject/class for co-teaching.
6. Test non-admin and second-school access with synthetic accounts before real use. Only the school's active administrators may create assignments. After migration 010, an explicitly linked active teacher can read their own assignments through RLS; role-facing screens remain future Phase 3 work.

## Scope

Assignments are dated teaching responsibilities, not scheduled lessons. They do not create accounts, assign membership roles or send notifications. After migration 010, a linked active teacher’s current assignments determine current class/learner access. Explicit login linking is separate from creating the teaching record; neither should be treated as an implicit account-provisioning step.

Before 014, each teacher/subject/class combination has one assignment. After 014, separate non-overlapping periods are allowed, with versioned ending/replacement as described above. Subsequent years still use separate class records. Multiple teachers may share a subject/class, and a teacher may teach several classes or subjects. Corrections outside this editor need a separately reviewed change; do not overwrite history.

The database rejects cross-school teacher/subject/class links, a class paired with the wrong year, and dates outside the year. Creation is audited without names in the audit payload. Reads and writes use the caller's normal database context and RLS. Direct update/delete and caller-supplied IDs are not granted.

Lists are capped at 500 records per related category; larger datasets show a capacity notice rather than partial selections. Pagination is needed before larger pilots.

## Verification boundary

Local SQL and action tests use fictional schools and mocked application context. The user tested academic setup, school registers and teaching assignments; later synthetic creation workflows were also exercised in the connected app. Complete hosted role/RLS and concurrent-operation verification remains pending. See ROADMAP.md for current migration evidence and unresolved work. Email stays disabled.
