# Grade spacing and save-log review — 2026-10-01

> Status reconciled 25 October 2026. This is a feature/setup reference. Use [RESUME.md](RESUME.md) for current progress, [VERIFICATION.md](VERIFICATION.md) for evidence and [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist) for acceptance. Existing migrations through 021 are applied; do not repeat setup on the current project.

The Next.js trace `createTeachingAssignment({"error":"","saved":false}, {})` displays the action's arguments. The first argument is React's previous form state, initially not saved; the second is FormData, which is not usefully represented as plain JSON. This trace does not show the result or prove failure. The current action returns `saved: true` on a successful insert and a nonempty error on each handled failure. HTTP 200 alone is also not proof of database success: confirm the success message and record persistence after a refresh.

At the original 1 October investigation, the attached terminal tool had no terminal session. The available `.next/dev/logs/next-development.log` did not contain the reported action trace; diagnosis uses the user's pasted trace and current source, not direct access to VS Code's terminal. That historical trace diagnosis was not independent evidence of the hosted save result.

## Grade fix

The application normalizes `Grade10`, `Grade 10`, `grade   10` and case variants to `Grade 10`; similarly `GradeR` becomes `Grade R`. Custom labels and other record types keep their meaning. `Grade 1 0` is not silently reinterpreted as Grade 10.

Migration 006 changes the school-scoped grade uniqueness index to use the equivalent key. It does not rename or merge any existing rows, change class references, or remove data. It locks grade writes while checking/replacing the index and fails transactionally if equivalents already exist.

The following procedure is reference for a fresh investigation, not an instruction to rerun the completed repair or migration. Migrations through 021, including 006, are user-confirmed applied.

1. Run the read-only `supabase/checks/grade_name_duplicates.sql` in the dedicated School Portal SQL editor.
2. If rows are returned, review the grade IDs and referencing class counts before deciding how to reconcile them. Do not delete a grade blindly: classes and their later records may depend on it. Any new reconciliation needs its own reviewed scope; the earlier record-specific repair is archived.
3. For a fresh project where 006 has not been applied, and only after duplicates are resolved, apply `supabase/migrations/202610010006_grade_name_normalization.sql` once. Do not rerun migrations 001–005.
4. Test a fictional grade with and without its separator. The second insert should show the existing-name error, and a refresh should show only the first record.

The normalisation is implemented and migration 006 is already applied in this project. Do not infer current duplicates from the old report. Client normalization alone is not a substitute for the database migration.
