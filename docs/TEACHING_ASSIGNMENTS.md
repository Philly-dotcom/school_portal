# Teaching assignments

## Activate and test

Apply `supabase/migrations/202610010005_teaching_assignments.sql` once in the dedicated School Portal SQL editor after migrations 001–004. This increment has not applied it remotely. Restart the app (rebuild first if using the production server), sign in as School Admin, and open **Teaching assignments**.

Use fictional records when ready to test:

1. Create a teacher in School registers, and a subject, year, grade and class in Academic setup if none exist.
2. Select the teacher, subject and class. Class choices include grade and academic year to distinguish repeated names.
3. Enter the assignment dates within the class year and save.
4. Reload and confirm the assignment remains visible. Check recent activity in People & access for `teaching_assignments.insert`.
5. Try the same teacher/subject/class again: it should be rejected. A different teacher can share the subject/class for co-teaching.
6. Test non-admin and second-school access with synthetic accounts before real use. Only the school's active administrators may read or create assignments in this increment.

## Scope

Assignments are dated teaching responsibilities, not scheduled lessons. They do not create accounts, grant permissions, or send notifications. Teacher login linking and scoped classroom access remain separate future work.

Each teacher/subject/class combination has one assignment. Since a class belongs to one academic year, subsequent years use separate class records. Multiple teachers may share a subject/class, and a teacher may teach several classes or subjects. Split periods for the same combination, corrections, ending/replacing assignments and timetable clash checks are not implemented yet. Review choices before creating; corrections currently require a reviewed operator migration. Do not overwrite history when adding lifecycle support.

The database rejects cross-school teacher/subject/class links, a class paired with the wrong year, and dates outside the year. Creation is audited without names in the audit payload. Reads and writes use the caller's normal database context and RLS. Direct update/delete and caller-supplied IDs are not granted.

Lists are capped at 500 records per related category; larger datasets show a capacity notice rather than partial selections. Pagination is needed before larger pilots.

## Verification boundary

Local SQL and action tests use fictional schools and mocked application context. Migration 004 is user-reported applied, but the user has not tested School registers yet. Hosted role/RLS tests, register/assignment browser workflows and migration 005 activation are still pending. Email stays disabled.
