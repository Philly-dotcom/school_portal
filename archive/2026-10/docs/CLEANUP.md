# Configuration and file cleanup — 4 October 2026

This pass reviewed the source imports, configuration readers, npm/test commands, CI, documentation links and migration inventory. It was a maintenance pass, not a redesign or a new feature phase.

## What changed

- `.env.example` now contains only the six variables read by the web app. Its local site URL matches the dev server's `127.0.0.1` address. It still uses placeholders and leaves email off.
- `.env.local` already had the correct six variables, with no duplicate names and both email flags false. It was left byte-for-byte unchanged; no connection values were printed.
- CLI redirect settings and the Edge Function's delivery switch remain supported in their actual runtimes. They are explained in ENVIRONMENT.md instead of being mixed into the web-app template.
- The earlier supplied patch and one-off Grade 10 repair were moved to `archive/2026-10` with identical contents. The repair test now reads the archived script, and links were updated.
- The unused `canManageSchool` helper and its unused `Membership` type were removed. Only their own tests called them; live code already uses `isSchoolAdminContext`. That active helper's test was moved into `permissions.test.ts`, and the obsolete helper tests were removed. Database and action tests still cover identity, school boundaries and denied operations.

## What stayed, and why

| Item | Reason |
| --- | --- |
| All 13 migrations | They are the applied schema history. None was edited, moved or removed in this pass. |
| Application pages, panels, forms and shared modules | The import review found no orphan non-entrypoint source files. Framework entrypoints are also required even when no other source file imports them. |
| `scripts/production-e2e-server.mjs` | Used by Playwright's production mode and CI. |
| `supabase/checks/grade_name_duplicates.sql` | A reusable read-only diagnostic, unlike the archived record-specific repair. |
| Supabase function and configuration | Email is deferred, not abandoned. Their runtime settings do not belong in Next.js's environment. |
| Package lock and build/test/lint configs | Required for repeatable installs, local builds, browser tests and CI. |
| Overlapping database tests | Some verify an earlier schema; others verify the final schema or an upgrade with existing records. They exercise different failure modes. |
| Preview components | Still serve the explicitly separate public design preview. |
| Dated reports and verification notes | Preserve the reason for past changes. They are marked historical and point to current status. |
| Local build/dependency caches | Not obsolete source. The user's dev server is running, so they were not cleared underneath it. |

No hosted data, settings, roles or email were changed. Existing staged work was not reset or restaged. The new archive moves will need to be included when the user chooses to commit; do not discard the archive because the old path still appears in the current index.

## Validation

`npm run check` passed: lint, TypeScript, **143 tests across 24 files**, and the production build. The reduction from 145 is the removal of two tests for the unused helper, not the removal of active permission checks. The archive's repair test passed at its new path.

All 13 migration SHA-256 hashes match the pre-cleanup snapshot. `.env.local` also has an identical fingerprint, is ignored by Git and is not tracked. Both env files list the same six app-variable names. All relative Markdown links in 27 documents resolve. These local checks do not replace the remaining hosted workflow/security tests.
