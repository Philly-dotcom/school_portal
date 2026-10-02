# Linking register records to sign-ins (migration 010)

School registers (`students`, `teachers`, `guardians`) are separate from sign-in accounts. Migration `202610020010` adds an optional `membership_id` to each, so a person's *record* can be tied to their *login*. Until a record is linked, that person sees none of its personal or relationship data.

## What each linked person can read (read-only; all writes stay administrator-only)

| Role | Sees |
| --- | --- |
| Any active member | Academic years, terms, grades, subjects of their own school |
| Teacher | Their own teacher record and assignments; classes they teach **today**; students on those rosters; those enrollments; lessons they teach |
| Guardian | Their own record and links; their linked children; those children's enrollments, classes and lessons |
| Student | Their own record, enrollments, classes and lessons |

Access is re-evaluated on every query. Removing the role, suspending the member, deactivating the school, or letting a teaching assignment end removes access immediately. "Today" uses the school's timezone (falling back to UTC if the stored timezone is invalid).

## How to link

People & access → invite and accept → Registers → **Link sign-in** on the record. The list shows only active members who hold the matching role and are not already linked to another record of that type. The database enforces the same rules (`public.link_register_to_member`), including one login per record, same school, and role match. Each link and unlink is audited.

## Extending this safely

New tables that hold learner data must follow the same pattern: no policy `using (true)`; derive scope from the `private.my_*` helpers; add a test next to `tests/membership-links-database.test.ts` proving unlinked, expired, suspended and cross-school callers see nothing. `tests/hardening-database.test.ts` fails automatically if a new table lacks row-level security, if a function is executable by `anon`, or if a `SECURITY DEFINER` function does not pin its `search_path`.

Policy performance note: helpers run per row. This is fine for a single school; if registers grow into the tens of thousands, review query plans (`explain analyze`) before adding more modules.

The dashboard UI is still administrator-focused. The database now permits scoped reads for other roles; building the teacher, guardian and student screens is the next step and should query only through the authenticated client so these policies apply.
