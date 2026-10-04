# Academic setup: first Phase 2 increment

Academic setup supports creation, listing and name corrections. Migration 007 added the name editor; see [Record corrections](RECORD_CORRECTIONS.md). Dates, relationships, rollover and archiving remain outside the editor's scope.

The user reports completing activation and viewing the academic forms. All five creation forms now use specific field labels, example placeholders, buttons and success messages (for example, Subject name / Create subject). This is a presentation change; no additional migration is needed.

Email delivery is deliberately deferred at the user's request. Both local email flags are false. Resend SMTP settings were saved by the user, but no registered domain is available and delivery is unverified. Do not enable email or create real accounts yet.

## Activate after review

Migration 003 introduced this module and has already been used in the connected test project. Do not rerun it. For a fresh approved project, apply migrations in order; for this project, review the existing fictional records.

Restart the local server after environment changes. Sign in as the test school administrator, then open `/dashboard?view=academic`.

1. Create a fictional academic year with start and end dates.
2. Create a grade and subject.
3. Create a term inside the year's dates.
4. Create a class linked to that year and grade.
5. Reload and confirm persistence. Check People & access's recent activity for creation audit events.

Duplicate names are rejected within their scope, ignoring capitalization and surrounding spaces. Class names are unique within a school/year/grade; terms within a school/year. No country-specific grade names or term counts are assumed. Overlapping year/term dates are currently allowed; confirm the school's calendar policy before adding stricter rules.

## Boundaries

- Admins can create records and correct names. Dates and class relationships cannot be changed through that editor. Archiving and year rollover are not built; academic imports remain optional and undecided.
- Creation and corrections require an active School Admin. After 010, active members can read their school's reference years, terms, grades and subjects; class reads depend on the relevant role/relationships. The management screen stays admin-only.
- Composite foreign keys enforce school ownership on class/year/grade and term/year relationships. RLS checks the current database identity. Creation is audited, with no record contents in the audit payload.
- Normal users cannot update/delete these rows, set IDs or move their ownership. Later update support must validate term/year dependencies and concurrency.
- The UI lists at most 500 records per category and reports that limit. Larger catalogs need pagination before use.
- Fictional records were entered through the connected app during earlier testing. This module creates neither Auth users nor emails.

## Next increments

Registers, guardian links, dated enrollment, teaching assignments and timetable foundations now exist. The next work is verification and the remaining Phase 2 gaps in ROADMAP.md, rather than building those modules again.

Hosted write/RLS checks and signed-in browser validation remain necessary after activation. Local database tests exercise real SQL with fictional schools; they do not verify hosted configuration.
