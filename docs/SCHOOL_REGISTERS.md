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

Students, teachers, guardians, guardian links and enrollment history each show 50 records per page, with separate page controls. People sort by name then ID, guardian links by ID, and enrollment history by start date then ID. Records after the old 500-row limit remain reachable. Empty pages have links back to earlier pages. New or renamed records can move between pages because these are live lists, not fixed snapshots.

Guardian linking and initial enrollment now use searchable student, guardian and class choices, with 25 results per page. Search by name, or leave the search blank and press **Search choices** to browse. Names include the school reference to distinguish people with the same name. Your selected record stays selected while browsing. Choosing a class supplies its academic year and date bounds. These forms no longer depend on a 500-record choice list.

Transfer destinations use the same class search, limited to the enrollment's academic year and excluding its current class. Withdrawals need no destination. Saving still validates school ownership, year, dates, version and overlap rules; changing a search request cannot bypass those checks. Existing guardian access controls and closed enrollment history remain unchanged.

Sign-in linking now searches matching active memberships in pages of 25 by name or verified email. You confirmed applying migration 015; do not reapply it. SQL excludes accounts linked to any other person of the same type before pagination, including off-page records. Only current links on the visible page are loaded initially; inactive links remain visible for deliberate removal. Save-time ownership, role, confirmation and version checks remain in force. Browser checks are on hold.

Only names and internal references are collected at this stage; contact details and other personal fields need an agreed purpose before addition.

To check pagination in the connected app, use fictional records: navigate one list to page two, confirm the other lists keep their positions, and check that guardian/enrollment labels and dropdown choices still include off-page people. A list with fewer than 51 records correctly has no Next link. Automated tests simulate larger lists without inserting hosted records.

## Next

Verify the existing correction, linking and lifecycle workflows, then address list capacity and the remaining Phase 2 work. Academic imports are optional, not an agreed requirement. Email remains disabled pending a registered sending domain and tested delivery.
