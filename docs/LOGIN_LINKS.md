# Linking register records to sign-ins (migration 010)

School registers (`students`, `teachers`, `guardians`) are separate from sign-in accounts. Migration `202610020010` adds an optional `membership_id` to each, so a person's *record* can be tied to their *login*. Until a record is linked, that person sees none of its personal or relationship data.

## What each linked person can read (read-only; all writes stay administrator-only)

| Role | Sees |
| --- | --- |
| Any active member | Academic years, terms, grades, subjects of their own school |
| Teacher | Their own teacher record and assignments; classes they teach **today**; students on those rosters; those enrollments; lessons they teach |
| Guardian | Their own record; explicitly authorized child relationships; those children's enrollment history and current-placement lessons |
| Student | Their own record, enrollment history and class labels; current-placement lessons |

Access is re-evaluated on every query. Removing a role removes access derived from that role; suspending the member or deactivating the school blocks school access. An ended assignment removes its current class/roster grant; a teacher can still read their own assignment and lesson history. "Today" uses the school's timezone (falling back to UTC if the stored timezone is invalid).

## How to link

People & access → invite and accept → Registers → **Link sign-in** on the record. Selectable targets are active members who hold the matching role and are not already linked to another record of that type. An existing inactive link stays visible for deliberate removal. The database enforces the same rules (`public.link_register_to_member`), including one login per record, same school, and role match. Each link and unlink is audited.

## Extending this safely

New tables that hold learner data must follow the same pattern: no policy `using (true)`; derive scope from the `private.my_*` helpers; add a test next to `tests/membership-links-database.test.ts` proving unlinked, expired, suspended and cross-school callers see nothing. `tests/hardening-database.test.ts` fails automatically if a new table lacks row-level security, if a function is executable by `anon`, or if a `SECURITY DEFINER` function does not pin its `search_path`.

Policy performance note: helpers run per row. This is fine for a single school; if registers grow into the tens of thousands, review query plans (`explain analyze`) before adding more modules.

The dashboard UI is still administrator-focused. The database now permits scoped reads for other roles; building the teacher, guardian and student screens is the next step and should query only through the authenticated client so these policies apply.

## Pre-deployment repair rules (2026-10-02)

Migration 010 is still unapplied to hosted Supabase. `link_register_to_member` now requires `expected_version`. A stale form fails with 40001; reload and review before retrying. Both SQL and the UI require an active same-school membership with the matching role. Existing inactive links remain visible for removal; suspension does not silently unlink or reactivate anyone. The selector shows verified Auth email and the full stable membership ID alongside the editable display name, and requires confirmation.

Guardian relationships remain historical family records. New and existing rows have `access_enabled=false`; login linking alone does not grant access to children. The School Admin explicitly grants/revokes child access through the versioned, audited `set_guardian_access` RPC and the Guardian links form. Removing that grant preserves the relationship and immediately removes derived child access. Reactivation restores only still-granted relationships.

Teacher rosters and enrollment reads require today's school-local date within BOTH the teaching assignment and enrollment. A future transfer keeps access with the existing teacher until its effective date. Students/authorized guardians retain their own enrollment history and class labels, but lessons require a current placement and an actual lesson occurrence overlapping that placement. History is not deleted to implement current access.
