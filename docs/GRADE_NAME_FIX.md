# Grade spacing and save-log review — 2026-10-01

The Next.js trace `createTeachingAssignment({"error":"","saved":false}, {})` displays the action's arguments. The first argument is React's previous form state, initially not saved; the second is FormData, which is not usefully represented as plain JSON. This trace does not show the result or prove failure. The current action returns `saved: true` on a successful insert and a nonempty error on each handled failure. HTTP 200 alone is also not proof of database success: confirm the success message and record persistence after a refresh.

The attached Codex terminal tool had no terminal session. The available `.next/dev/logs/next-development.log` did not contain the reported action trace; diagnosis uses the user's pasted trace and current source, not direct access to VS Code's terminal. Hosted save behavior has not been independently reproduced.

## Grade fix

The application normalizes `Grade10`, `Grade 10`, `grade   10` and case variants to `Grade 10`; similarly `GradeR` becomes `Grade R`. Custom labels and other record types keep their meaning. `Grade 1 0` is not silently reinterpreted as Grade 10.

Migration 006 changes the school-scoped grade uniqueness index to use the equivalent key. It does not rename or merge any existing rows, change class references, or remove data. It locks grade writes while checking/replacing the index and fails transactionally if equivalents already exist.

1. Run the read-only `supabase/checks/grade_name_duplicates.sql` in the dedicated School Portal SQL editor.
2. If rows are returned, review the grade IDs and referencing class counts before deciding how to reconcile them. Do not delete a grade blindly: classes and their later records may depend on it. No merge has been authorized or implemented here.
3. If no duplicates remain, apply `supabase/migrations/202610010006_grade_name_normalization.sql` once. Do not rerun migrations 001–005.
4. Test a fictional grade with and without its separator. The second insert should show the existing-name error, and a refresh should show only the first record.

The code change is local. Existing hosted duplicates and migration 006 activation still need review. Client normalization alone is not a substitute for the database migration.
