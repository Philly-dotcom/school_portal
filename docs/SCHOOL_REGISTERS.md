# School registers: Phase 2 increment

As of 4 October, the register includes creation/listing, name/reference corrections, enrollment transfers/withdrawals, account linking and explicit guardian grants. The user has confirmed 009–013 applied. See [Enrollment transfers and withdrawals](ENROLLMENT_LIFECYCLE.md) and [Login links](LOGIN_LINKS.md).

Migration 007 introduced name/reference corrections. Migration 009 preserves placement history during transfers and withdrawals. Neither is a general delete or undo facility.

## Activate

The project already contains fictional register data. No email is sent by register operations.

1. Keep the existing migrated database; do not rerun 004 or the later applied files.
2. Open the running local app. A SQL-only correction such as 013 should be checked by reloading the page.
3. Sign in as the existing test School Admin and open **School registers** (`/dashboard?view=registers`).
4. Use fictional records for the checks below. Real-data readiness and email delivery remain unfinished.

## Test the workflow

- Add a student with a unique admission number, a teacher with a unique staff number, and a guardian with a unique school reference. These references are not national identity numbers.
- Link the guardian to the student and enter their relationship. A guardian can link to multiple students; a student can have multiple guardians. The same pair cannot be added twice.
- Select a student and a class from Academic setup. The class selector includes its grade and academic year. Enter enrollment dates within that academic year.
- Reload and confirm records persist. Check recent activity in People & access for the creation audit entries.
- Confirm duplicate references fail even if capitalization or surrounding spaces differ. Overlapping placements and a second unclosed placement for the same student/year must fail; history may contain several non-overlapping placements.
- Test direct access using synthetic non-admin and second-school accounts before real use. An admin should see only their own school; unlinked teachers, guardians and students cannot read personal register records. After migration 010, explicitly linked logins have scoped read access; guardians also need an explicit child grant. See LOGIN_LINKS.md.

## Scope and boundaries

The register holds school records independently of Auth users and memberships. Creating a teacher record does not grant the teacher role. Guardian relationships are administrative records, not a legal custody determination and not permission to access a learner portal. Account linking and role-specific views will need explicit verification later.

Names and references can be corrected through versioned forms. Transfers/withdrawals use the separate lifecycle controls and keep the previous placement. There is no general deletion, archiving, promotion or undo flow. Existing history must not be overwritten to change a learner's current class.

The management screen and writes require an active School Admin. Linked non-admin accounts have the limited database reads described in LOGIN_LINKS.md. Composite foreign keys reject cross-school relationships; the database also checks class/year consistency and enrollment dates. Audit events identify the action and record; restricted correction history separately retains prior values. The app uses no elevated credentials.

The initial UI supports up to 500 entries in each related list. It shows a capacity notice instead of incomplete lists when that is exceeded. Pagination/search are required before larger school pilots. Only names and internal references are collected at this stage; contact details and other personal fields need an agreed purpose before addition.

## Next

Verify the existing correction, linking and lifecycle workflows, then address list capacity and the remaining Phase 2 work. Academic imports are optional, not an agreed requirement. Email remains disabled pending a registered sending domain and tested delivery.
