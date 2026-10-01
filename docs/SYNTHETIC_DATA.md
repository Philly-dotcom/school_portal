# Synthetic verification dataset — 2026-10-01

Created through the signed-in School Admin UI in School Portal Test School. These are fictional school records, not login accounts. No emails, access grants, existing-record changes or deletions were performed.

## Records added

- Class: Demo 10B, existing Grade 10 and academic year 2027.
- Subjects: Demo Mathematics and Demo English.
- Students: Demo Student One (DEMO-ST-001), Demo Student Two (DEMO-ST-002).
- Teachers: Demo Teacher One (DEMO-TE-001), Demo Teacher Two (DEMO-TE-002).
- Guardians: Demo Guardian One (DEMO-GU-001), Demo Guardian Two (DEMO-GU-002).
- Each numbered student is linked to the matching numbered guardian as Parent.
- Both students are enrolled in Demo 10B from 2027-01-18 through 2027-11-22.
- Teacher One teaches Demo Mathematics; Teacher Two teaches Demo English, both in Demo 10B from 2027-01-18 through 2027-11-22.
- Four recurring timetable records: Monday and Tuesday, Mathematics 09:00–10:00, English 10:00–11:00. Date range 2027-01-18 through 2027-02-26, Africa/Johannesburg.

## Observed verification

All create operations returned success in the hosted-backed local app. The four lessons remained visible after page reload. Adjacent Monday and Tuesday lessons were accepted. This establishes successful authenticated creation/listing for this dataset, not full RLS or concurrency coverage.

Existing academic year 2027 currently spans 2027-01-18 through 2030-11-22. It was left unchanged; review that end date separately. Existing records were preserved.

## User verification checklist

1. Academic setup: locate Demo 10B and both Demo subjects.
2. School registers: check the two students, teachers, guardians, matching guardian links and enrollments.
3. Teaching assignments: check each teacher's subject, class and 2027 date bounds.
4. Timetable: check the four Monday/Tuesday lessons; filter by each demo assignment, then return to All assignments.
5. Refresh and confirm records persist.

Still pending: hosted denied reads/writes with two synthetic schools, non-admin authorization, conflicting/concurrent saves, removal/audit and stale-editor verification. No second school or new authentication identities were created by this data-entry task.

After user verification, finish the Phase 2 validation gaps and prioritize enrollment lifecycle (transfer/withdrawal with history) before Phase 3 attendance. Email remains deferred.

Evidence: [Fictional timetable](synthetic-timetable.jpg).
