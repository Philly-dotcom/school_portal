# Teaching assignments

## Activate and test

Migration 005 introduced this module after 001–004. Existing hosted creation workflows have since been exercised; do not reapply the migration based on this guide. Confirm the actual migration baseline before an approved staging rehearsal. Sign in as School Admin and open **Teaching assignments** to review existing fictional records.

Use fictional records when ready to test:

1. Create a teacher in School registers, and a subject, year, grade and class in Academic setup if none exist.
2. Select the teacher, subject and class. Class choices include grade and academic year to distinguish repeated names.
3. Enter the assignment dates within the class year and save.
4. Reload and confirm the assignment remains visible. Check recent activity in People & access for `teaching_assignments.insert`.
5. Try the same teacher/subject/class again: it should be rejected. A different teacher can share the subject/class for co-teaching.
6. Test non-admin and second-school access with synthetic accounts before real use. Only the school's active administrators may create assignments. After migration 010, an explicitly linked active teacher can read their own assignments through RLS; role-facing screens remain future Phase 3 work.

## Scope

Assignments are dated teaching responsibilities, not scheduled lessons. They do not create accounts, assign membership roles or send notifications. After migration 010, a linked active teacher’s current assignments determine current class/learner access. Explicit login linking is separate from creating the teaching record; neither should be treated as an implicit account-provisioning step.

Each teacher/subject/class combination has one assignment. Since a class belongs to one academic year, subsequent years use separate class records. Multiple teachers may share a subject/class, and a teacher may teach several classes or subjects. Split periods for the same combination, corrections and ending/replacing assignments are not implemented yet. Timetable lessons and their class/teacher clash checks exist separately in migration 008. Review choices before creating; corrections currently require a reviewed operator migration. Do not overwrite history when adding lifecycle support.

The database rejects cross-school teacher/subject/class links, a class paired with the wrong year, and dates outside the year. Creation is audited without names in the audit payload. Reads and writes use the caller's normal database context and RLS. Direct update/delete and caller-supplied IDs are not granted.

Lists are capped at 500 records per related category; larger datasets show a capacity notice rather than partial selections. Pagination is needed before larger pilots.

## Verification boundary

Local SQL and action tests use fictional schools and mocked application context. The user tested academic setup, school registers and teaching assignments; later synthetic creation workflows were also exercised in the connected app. Complete hosted role/RLS and concurrent-operation verification remains pending. See ROADMAP.md for current migration evidence and unresolved work. Email stays disabled.
