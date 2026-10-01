# Academic setup: first Phase 2 increment

Update: name corrections are now available locally through migration 007; see `docs/RECORD_CORRECTIONS.md`. The creation-only restrictions below describe the earlier increment. Dates, relationships, rollover and archiving remain outside the editor's scope.

The user reports completing activation and viewing the academic forms. All five creation forms now use specific field labels, example placeholders, buttons and success messages (for example, Subject name / Create subject). This is a presentation change; no additional migration is needed.

Email delivery is deliberately deferred at the user's request. Both local email flags are false. Resend SMTP settings were saved by the user, but no registered domain is available and delivery is unverified. Do not enable email or create real accounts yet.

## Activate after review

Apply `supabase/migrations/202610010003_academic_structure.sql` once in the dedicated School Portal Supabase SQL editor, after migrations 001 and 002. This work has not applied it remotely. Do not rerun the earlier migrations.

Restart the local server after environment changes. Sign in as the test school administrator, then open `/dashboard?view=academic`.

1. Create a fictional academic year with start and end dates.
2. Create a grade and subject.
3. Create a term inside the year's dates.
4. Create a class linked to that year and grade.
5. Reload and confirm persistence. Check People & access's recent activity for creation audit events.

Duplicate names are rejected within their scope, ignoring capitalization and surrounding spaces. Class names are unique within a school/year/grade; terms within a school/year. No country-specific grade names or term counts are assumed. Overlapping year/term dates are currently allowed; confirm the school's calendar policy before adding stricter rules.

## Boundaries

- This increment creates and lists structure only. Editing, archiving, year rollover and bulk imports are not yet implemented. Check entries before saving; correction currently requires a reviewed operator migration.
- All five tables allow only active school administrators to read/create. Other-role academic views will be introduced with enrollment and teaching relationships, rather than exposing all data now.
- Composite foreign keys enforce school ownership on class/year/grade and term/year relationships. RLS checks the current database identity. Creation is audited, with no record contents in the audit payload.
- Normal users cannot update/delete these rows, set IDs or move their ownership. Later update support must validate term/year dependencies and concurrency.
- The UI lists at most 500 records per category and reports that limit. Larger catalogs need pagination before use.
- No academic sample data is inserted remotely. No Auth users or emails are created by this module.

## Next increments

Student, teacher and guardian registers independent of Auth accounts; guardian links; dated enrollment and class-subject teaching assignments; basic timetable structure and validated imports. Separate school records from login identities, and define narrow teacher/guardian/student access from those relationships.

Hosted write/RLS checks and signed-in browser validation remain necessary after activation. Local database tests exercise real SQL with fictional schools; they do not verify hosted configuration.
