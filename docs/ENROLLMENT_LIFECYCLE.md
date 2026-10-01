# Enrollment transfers and withdrawals

Local Phase 2 increment, 2026-10-01. Apply `supabase/migrations/202610010009_enrollment_lifecycle.sql` after migrations 001–008 in the dedicated School Portal project. The agent has not applied this migration remotely. Existing placement dates and links are preserved; version and closure fields are added.

## Behavior

School Admin can expand **Transfer or withdraw** on an unclosed enrollment in School registers.

- **Transfer:** choose another class in the same academic year and the first day in that class. This day must be after the old placement starts and no later than its end. The old row ends the preceding day and is marked transferred. A new row starts on the chosen day and retains the original end date. Both changes and the audit event commit together.
- **Withdrawal:** choose the last enrolled day, inclusive, within the existing placement. Its record stays visible with its shortened end date and withdrawal label.
- Closed rows cannot be changed again. Stale forms fail instead of overwriting newer decisions.
- Re-enrollment after withdrawal is allowed without overlapping dates. Only one unclosed placement per student/year is allowed. Date ranges are inclusive; re-entry must begin at least the next day.
- These controls change placements, not student records, accounts, roles, guardian permissions or teaching assignments. No automatic account deactivation or notifications.

Dated changes, including future changes, are supported. Closure labels describe the recorded transition, not whether the learner is currently attending. Undo, first-day placement corrections, cross-year promotion and automatic attendance changes are deferred. A mistaken placement requiring a change on its first day needs a separately reviewed correction rather than a zero-day history row.

## Database boundaries

`change_enrollment` is a narrowly scoped security-definer RPC using the signed-in caller's verified School Admin membership. No elevated key is used by the app. Direct updates/deletes remain denied, and callers cannot insert closure/version fields. Tenant-matching composite foreign keys remain in force.

Application enrollment inserts and lifecycle changes acquire the same school-row lock. An insert/update trigger checks inclusive date overlaps and year bounds; a partial unique index prevents multiple unclosed placements. The RPC checks ownership, expected version, destination year and dates before changing history. Audit events retain the previous row and replacement ID. Hosted concurrency verification with independent sessions remains pending; embedded tests do not establish it.

The register UI still loads before migration 009, with lifecycle controls unavailable. No existing demo records were transferred or withdrawn during implementation.

## Verification

Local `npm run check` passed lint, TypeScript, 90 tests across 17 files and production build. The actual SQL ran in embedded PostgreSQL with fictional schools. Tests cover school isolation, non-admin/suspended/anonymous denial, stale changes, same-class/cross-year/foreign destinations, date bounds, inclusive overlap rejection, transfer and withdrawal history, re-entry, audit data and rollback after a forced audit failure. Server-action tests cover permission checks, trusted school identity, validation and safe error handling.

Hosted activation and browser workflow verification for migration 009 remain pending. Use only fictional learners, preferably a separate test learner if keeping the original demo dataset intact matters:

1. Apply 009 once, then reload School registers. Confirm existing dates and enrollments remain intact.
2. Transfer a fictional learner to a second class in the same year partway through their date range. Confirm two rows, adjacent dates and the retained original end date.
3. Submit an old form from a second tab. Confirm rejection and no duplicate replacement.
4. Withdraw the replacement later in its date range. Confirm history remains; create re-entry starting the following day.
5. Try overlapping enrollment dates, same-class transfer, another year's class, invalid boundary dates and a missing confirmation. Confirm no unintended writes.
6. Check audit rows as the authorized admin. Test non-admin, suspended, anonymous and School B contexts for denied reads/writes, including direct RPC calls.
7. Submit simultaneous conflicting changes from independent sessions. Exactly one change should succeed; inspect dates and audit rows after reload.

The existing hosted academic year named 2027 ends in 2030. That pre-existing issue was not silently corrected by this feature.
