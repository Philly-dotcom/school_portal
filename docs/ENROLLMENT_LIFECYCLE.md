# Enrollment transfers and withdrawals

## Attendance and homework update — 8 October

Migration 018, now user-confirmed applied, prevents a transfer or withdrawal from moving existing attendance outside its recorded enrollment. Later valid transfers retain the old marks. If a mark itself was entered incorrectly, an authorized staff member can explicitly clear it in the attendance register before an admin corrects the enrollment; its audit remains.

Homework migration 019 uses enrollment history on the original publication date. Original recipients keep access after later transfers; newcomers do not gain older homework. Correcting enrollment history can change eligibility. The user confirmed applying 019 and reported homework working. The specific hosted transfer and access checks remain outstanding.

Migration 009 introduced this Phase 2 feature on 1 October. The user has confirmed applying it, followed by 010–013. Do not rerun it. Existing placement dates and links are preserved; version and closure fields support history-preserving changes.

## Behavior

School Admin can expand **Transfer or withdraw** on an unclosed enrollment in School registers.

The destination selector searches classes by name in pages of 25. Results are restricted to this enrollment's academic year and exclude its current class. Leave the search blank to browse; a class on another search page remains selectable. This removes the old 500-class form limit. Withdrawal does not need a class choice. Database validation still rejects forged cross-year or cross-school destinations independently of the search filter.

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

Migration application is confirmed by the user; the following hosted workflow checks remain to be completed. Use only fictional learners, preferably a separate test learner to preserve the original demo dataset:

1. Reload School registers without reapplying 009. Confirm existing dates and enrollments remain intact.
2. Transfer a fictional learner to a second class in the same year partway through their date range. Confirm two rows, adjacent dates and the retained original end date.
3. Submit an old form from a second tab. Confirm rejection and no duplicate replacement.
4. Withdraw the replacement later in its date range. Confirm history remains; create re-entry starting the following day.
5. Try overlapping enrollment dates, same-class transfer, another year's class, invalid boundary dates and a missing confirmation. Confirm no unintended writes.
6. Check audit rows as the authorized admin. Test non-admin, suspended, anonymous and School B contexts for denied reads/writes, including direct RPC calls.
7. Submit simultaneous conflicting changes from independent sessions. Exactly one change should succeed; inspect dates and audit rows after reload.

The existing hosted academic year named 2027 ends in 2030. That pre-existing issue was not silently corrected by this feature.
