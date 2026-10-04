# Weekly timetable foundation

Migration 008 introduced the timetable. Hosted creation and persistence were checked with fictional lessons earlier; do not reapply it. Open **Timetable** as School Admin to review the existing schedule. Conflict, removal and concurrent-save checks are separate from confirming that the page loads.

## Workflow

1. Choose an existing teaching assignment. Its subject, class, grade, year and teacher reference appear together.
2. Choose a weekday, local start/end time, and inclusive date range within the assignment. The selected weekday must actually occur in the date range.
3. Add the lesson and verify it appears under that weekday. Use the assignment filter to focus the list.
4. Reload to verify persistence. Try an overlapping lesson for the same teacher or class; expect a clash error. Back-to-back lessons, different weekdays and non-overlapping recurring occurrences are allowed.
5. To correct a planned lesson, open **Remove recurring lesson**, explicitly confirm removal for its entire date range, then add the corrected lesson. This removes the schedule entry, not the teaching assignment or enrollment. Removal stores the schedule's IDs/times/dates in the admin-only audit trail.

Use fictional records for testing. Creating register data, assignments and lessons does not create Auth accounts or send email.

## Interpretation and limits

Times are local wall-clock times in the school's configured timezone. Changing that timezone later changes their interpretation; this increment does not perform timezone conversion. Date ranges are inclusive; time ranges exclude the ending instant, allowing a 09:00–10:00 lesson followed by 10:00–11:00. Overnight lessons are not supported.

The weekly view lists planning rules and their dates, including past/future rules; it is not a view of only today's active lessons. A shared weekday must occur in the overlapping dates before it is considered a clash. Holidays, closures, term exceptions, alternating-week cycles, rooms, publication approvals, printing and learner/guardian/teacher timetable access are future work.

One lesson uses one teaching assignment and teacher. Shared co-teaching sessions are not represented yet; simultaneous lessons for the same class are rejected even if different teachers share that class/subject. Define shared-lesson requirements before extending this model.

All timetable reads and mutations are administrator-only. Creation and removal derive school context from the verified session. The database checks admin access again, derives teacher/class IDs from the assignment, validates dates and serializes application timetable mutations using a school-row lock. Direct application table inserts/updates/deletes are denied. Future scheduling or assignment-edit operations must use the same locking protocol and maintain date/relationship constraints. Parallel hosted-request verification is still needed; the embedded SQL tests do not emulate independent concurrent PostgreSQL sessions.

Up to 500 entries per related list are supported. Larger datasets show a capacity message rather than partial options. Pagination and lifecycle management remain prerequisites for larger pilots. No timetable publication or notification is sent automatically.

## Hosted verification still needed

After activation, test create/list/filter/remove, stale repeated removal, and cross-school/non-admin requests with synthetic accounts. Verify two simultaneous conflicting saves cannot both succeed on hosted Supabase. Check audit entries and confirm teaching assignments/enrollments remain after removal. Do not infer full hosted readiness from a successful migration or local test suite.
