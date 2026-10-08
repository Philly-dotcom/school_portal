# Weekly timetable foundation

## Current status — 8 October

Migrations 016 and 017 are now user-confirmed applied. Do not repeat the old application instructions below. The original admin planning screen remains available. Linked teachers, students and guardians also have a read-only **My timetable** view for the current school week; guardian access requires an explicit child grant. Hosted role/date acceptance is outstanding and will be checked by the user after homework.

Migration 008 introduced the timetable. Hosted creation and persistence were checked with fictional lessons earlier; do not reapply it. Open **Timetable** as School Admin to review the existing schedule. Conflict, removal and concurrent-save checks are separate from confirming that the page loads.

## Workflow

1. Choose an existing teaching assignment. Its subject, class, grade, year and teacher reference appear together.
2. Choose a weekday, local start/end time, and inclusive date range within the assignment. The selected weekday must actually occur in the date range.
3. Add the lesson and find it under its weekday, using the page controls if needed. Choose an assignment and press **Apply filter** to search its lessons across the whole school schedule. Changing the filter starts at page one; page links retain it. **Clear filter** returns to all assignments.
4. Reload to verify persistence. Try an overlapping lesson for the same teacher or class; expect a clash error. Back-to-back lessons, different weekdays and non-overlapping recurring occurrences are allowed.
5. To correct a planned lesson, open **Remove recurring lesson**, explicitly confirm removal for its entire date range, then add the corrected lesson. This removes the schedule entry, not the teaching assignment or enrollment. Removal stores the schedule's IDs/times/dates in the admin-only audit trail.

Use fictional records for testing. Creating register data, assignments and lessons does not create Auth accounts or send email.

## Interpretation and limits

Times are local wall-clock times in the school's configured timezone. Changing that timezone later changes their interpretation; this increment does not perform timezone conversion. Date ranges are inclusive; time ranges exclude the ending instant, allowing a 09:00–10:00 lesson followed by 10:00–11:00. Overnight lessons are not supported.

The weekly view lists planning rules and their dates, including past/future rules; it is not a view of only today's active lessons. A shared weekday must occur in the overlapping dates before it is considered a clash. Holidays, closures, term exceptions, alternating-week cycles, rooms, publication approvals, printing and learner/guardian/teacher timetable access are future work.

One lesson uses one teaching assignment and teacher. Shared co-teaching sessions are not represented yet; simultaneous lessons for the same class are rejected even if different teachers share that class/subject. Define shared-lesson requirements before extending this model.

All timetable reads and mutations are administrator-only. Creation and removal derive school context from the verified session. The database checks admin access again, derives teacher/class IDs from the assignment, validates dates and serializes application timetable mutations using a school-row lock. Direct application table inserts/updates/deletes are denied. Future scheduling or assignment-edit operations must use the same locking protocol and maintain date/relationship constraints. Parallel hosted-request verification is still needed; the embedded SQL tests do not emulate independent concurrent PostgreSQL sessions.

The timetable shows up to 50 recurring lessons per page, ordered by weekday, start time and ID. It is a partial schedule: an empty weekday section means no lessons on this page, not that the day is free. Assignment filtering runs in the database before pagination. Save operations still check conflicts against all relevant lessons, including those on other pages.

More than 500 lessons or assignment choices no longer blocks the screen. Both filtering and lesson creation search assignments in pages of 25. Enter a teacher name/reference, subject, class, grade or academic year, or leave search blank to browse. Labels include assignment dates to distinguish repeated teaching periods. The selected choice remains while browsing other search pages. Lesson date inputs use the chosen assignment bounds; the database checks those dates again on save. No timetable publication or notification is sent automatically.

## Hosted verification still needed

After activation, test create/list/filter/remove, stale repeated removal, and cross-school/non-admin requests with synthetic accounts. Verify two simultaneous conflicting saves cannot both succeed on hosted Supabase. Check audit entries and confirm teaching assignments/enrollments remain after removal. Do not infer full hosted readiness from a successful migration or local test suite.

## Search migration 016 — 5 October 2026

Migration 015 application is user-confirmed. Apply only `202610050016_timetable_assignment_search.sql` after it to enable timetable search; 016 has not yet been confirmed applied. The new function is read-only, checks School Admin access, uses the caller's RLS context and joins every related record within the same school. It returns 25 results plus one lookahead, with bounded text/page input and literal case-insensitive matching. Historical assignments remain searchable for their stored periods; date/clash checks are unchanged.

The page loads only referenced assignment labels, including the active filter even when it has no lessons. **Apply filter** starts at page one; page links retain it. Hidden ID fields preserve choices if submitted while search is busy. **All assignments** and **Clear filter** remove the filter deliberately. Removal still requires confirmation. A missing search function shows a safe error rather than an incomplete dropdown.

Browser checks are on hold. On resuming them, check search → select → browse another page, date bounds, filter persistence with empty results, clear filter, and save/conflict/removal behavior using fictional records only.
