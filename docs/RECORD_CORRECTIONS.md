# Record corrections

## Activate

Migration 007 introduced corrections, and the existing test project now has the later migrations through user-confirmed 013. Do not rerun 007 or the earlier Grade 10 repair from this guide. Review the current fictional records and use the checks below to verify the editors.

Refresh Academic setup or School registers (restart/rebuild if using a production preview). Each academic/person record has an **Edit [name]** control and specific input labels. Academic records allow name corrections. Students, teachers and guardians allow full-name and school-reference corrections.

## Test with fictional records

1. Correct a subject or class name, save and refresh; confirm the revised label persists.
2. Correct a student's name or admission number. Confirm the guardian link and enrollment still refer to that student.
3. Correct a teacher name and check Teaching assignments reflects the same teacher's revised label.
4. Attempt a duplicate grade name (including Grade10 versus Grade 10) or duplicate person reference. Expect an error and no saved change.
5. Open the same record in two browser tabs. Save an edit in the first tab, then submit the unchanged second tab. Expect a reload/review message rather than an overwrite.
6. Check People & access for a `.correct` audit event. Verify non-admin and second-school accounts cannot invoke the correction RPC successfully before real use.

## Boundaries

These are typo corrections to the same record. Do not rename a person to replace them with someone else, rename a year to perform rollover, or rename a class to simulate a transfer. Dates, ownership, academic year/grade relationships, enrollment, teaching assignments and guardian relationships are not editable here. Deletion/archiving and lifecycle changes still need separate workflows.

The database RPC validates active admin access, an allowlisted record type, school ownership, field lengths and an expected record version. The atomic update increments that version; stale or unavailable records produce the same generic conflict. Direct table updates remain denied. Unique indexes retain their existing school/year/grade scopes.

Audit events record actor, record ID, field names and version numbers; they do not copy names or references into logs. This is traceability, not a complete version-history/undo feature.

Local checks passed lint, TypeScript, 79 tests across 15 files and production build. Database tests exercise all eight record types and preserve full enrollment, teaching assignment and guardian-link rows across edits. Hosted RPC/RLS behavior and signed-in browser testing of the editors remain pending.
