# School registers: Phase 2 increment

Latest: enrollment lifecycle has local migration 009 and admin controls. See [Enrollment transfers and withdrawals](ENROLLMENT_LIFECYCLE.md). Earlier creation-only limitations below describe the original 004 release. Hosted 009 activation remains pending.

Update: person-name and school-reference corrections are now available locally through migration 007; see `docs/RECORD_CORRECTIONS.md`. Earlier creation-only notes below are superseded for these fields. Guardian links, enrollment dates, transfers and deletions remain unchanged.

## Activate

The code is local. This increment has not changed hosted Supabase or sent email.

1. Apply `supabase/migrations/202610010004_registers.sql` once in the dedicated School Portal SQL editor, after migrations 001–003. Do not rerun those earlier migrations.
2. Restart the local app. For a production preview, build before starting it.
3. Sign in as the existing test School Admin and open **School registers** (`/dashboard?view=registers`).
4. Use fictional records for the checks below. Real-data readiness and email delivery remain unfinished.

## Test the workflow

- Add a student with a unique admission number, a teacher with a unique staff number, and a guardian with a unique school reference. These references are not national identity numbers.
- Link the guardian to the student and enter their relationship. A guardian can link to multiple students; a student can have multiple guardians. The same pair cannot be added twice.
- Select a student and a class from Academic setup. The class selector includes its grade and academic year. Enter enrollment dates within that academic year.
- Reload and confirm records persist. Check recent activity in People & access for the creation audit entries.
- Confirm duplicate references fail even if capitalization or surrounding spaces differ. Duplicate student placements for the same year must fail.
- Test direct access using synthetic non-admin and second-school accounts before real use. An admin should see only their own school; teachers, guardians and students cannot access registers yet.

## Scope and boundaries

The register holds school records independently of Auth users and memberships. Creating a teacher record does not grant the teacher role. Guardian relationships are administrative records, not a legal custody determination and not permission to access a learner portal. Account linking and role-specific views will need explicit verification later.

This increment supports creation and listing, not edits, deletions, archiving or transfers. Check entries before saving. Corrections require a reviewed operator migration for now. Initial enrollment has one placement per student per academic year, enforced by a database uniqueness constraint, including concurrent submissions. Future transfers must preserve dated class history and replace this initial constraint with non-overlapping placement rules; do not overwrite historical class references.

All register reads and inserts require an active school administrator at both the application and database layers. Cross-school relationship IDs are rejected by composite foreign keys. Class/year consistency and enrollment dates are checked in the database. Audit entries record actor, action and record ID, not names or references. No elevated credentials are added to the app.

The initial UI supports up to 500 entries in each related list. It shows a capacity notice instead of incomplete lists when that is exceeded. Pagination/search are required before larger school pilots. Only names and internal references are collected at this stage; contact details and other personal fields need an agreed purpose before addition.

## Next

Record corrections and lifecycle management; teaching assignments connecting teachers, subjects and classes; timetable foundations; validated imports. Confirm enrollment transfer and withdrawal rules before adding those actions. Email remains disabled pending a registered sending domain and verified delivery.
