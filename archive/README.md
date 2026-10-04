# Archived project material

These files are kept for reference, not for routine setup. Moved here on 4 October 2026 without changing their contents. No migration belongs in this archive.

| File | Why it is here | Remaining use |
| --- | --- | --- |
| [2026-10/review_grade10_typo.sql](2026-10/review_grade10_typo.sql) | One-off repair for the earlier fictional Grade 10 data mistake. It is not a general maintenance command. | `tests/grade-repair.test.ts` still rehearses its rollback and safety behavior against a local database. |
| [2026-10/school_portal_improvements.patch](2026-10/school_portal_improvements.patch) | The earlier supplied review patch. Current repairs already live in the working source. | Historical reference; do not reapply blindly. |

The grade-duplicate check remains in `supabase/checks` because it is a reusable read-only diagnostic. The production browser-test helper remains in `scripts` because Playwright and CI use it. Every migration remains in `supabase/migrations` at its original path.

To examine old material, open it here. Only copy an operator script back into active use after reviewing its assumptions against the current database; its age or successful regression test does not authorize a hosted run.
