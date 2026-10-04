# Tests: what they check and how to run them

Updated 4 October 2026. The latest full local run passed **143 tests in 24 files**, plus lint, TypeScript and the production build. Cleanup retired two tests of the unused `canManageSchool` helper and moved the existing active admin-helper test into permissions.test.ts. No hosted test success is implied. These numbers describe that run; your next run is a new result.

## Start here

From `C:\Users\moses\Documents\School_portal`:

```powershell
npm run check
```

This runs four things in order. **Lint** checks code conventions and common mistakes. **TypeScript** checks that values and function calls fit the declared types. **Vitest** runs the unit and local database tests below. **Build** checks that Next.js can produce the application. A failure stops the sequence, so a failed lint run has not also tested the database.

For a quicker test-only run:

```powershell
npm test
```

For the recent migration fix alone:

```powershell
npx vitest run tests/final-upgrade-database.test.ts tests/membership-links-database.test.ts
```

You do not need the portal server running for those commands. They do not apply SQL to hosted Supabase or send email. `npm run check` also reads local configuration during the build; do not share environment values with test output.

## Three different kinds of evidence

| Kind | What it tells us | What it does not tell us |
| --- | --- | --- |
| Unit and action tests | Validation, authorization decisions and error handling behave as expected. Mocked calls let us simulate failures. | That the real network, Auth service or database returned those responses. |
| Database tests | Real migration SQL, constraints, grants and RLS work in PGlite, a local PostgreSQL engine. Fictional schools and simulated Auth users are created there. | That hosted Supabase configuration, tokens, concurrent sessions or email work. |
| Browser tests | The disconnected app's preview, layout and guarded routes work in an actual browser. | That your signed-in hosted school workflows work. |

Hosted verification is a separate exercise through the running app and dedicated test project. We still need role-specific sessions and denied reads **and writes** across two fictional schools. A green local suite is useful evidence, not completion of those checks.

## Each test file

All files below are in this folder. A test with an expected permission error is passing when the unauthorized operation is refused.

| File | What it checks |
| --- | --- |
| [permissions.test.ts](permissions.test.ts) | Checks role parsing and the active admin-context helper used by server actions. Identity, membership and school isolation are checked by the database/action suites. |
| [database.test.ts](database.test.ts) | Runs the foundation SQL against two fictional schools. Checks RLS, school settings permissions, ownership references and audit behavior. |
| [academic-actions.test.ts](academic-actions.test.ts) | Checks admin authorization, validated academic input and safe error handling with mocked database calls. |
| [academic-database.test.ts](academic-database.test.ts) | Runs academic-structure SQL: school isolation, academic relationships, date constraints, duplicate protection and grade normalization. |
| [register-actions.test.ts](register-actions.test.ts) | Checks person/relationship/enrollment creation handlers reject non-admin calls, forged ownership and malformed inputs. |
| [register-database.test.ts](register-database.test.ts) | The larger academic workflow suite: registers, teaching assignments, corrections, timetable clashes/removal and enrollment lifecycle, with SQL permission and ownership checks. |
| [teaching-actions.test.ts](teaching-actions.test.ts) | Checks creation of a teaching assignment uses the verified school, validates selections/dates and reports duplicates safely. |
| [timetable-actions.test.ts](timetable-actions.test.ts) | Checks lesson creation/removal, time conversion, invalid ranges, confirmation and scheduling-error messages. |
| [correction-actions.test.ts](correction-actions.test.ts) | Checks name/reference correction authorization, grade normalization, version forwarding and stale/duplicate error handling. |
| [enrollment-actions.test.ts](enrollment-actions.test.ts) | Checks transfer/withdrawal authorization, dates, destination rules, confirmation and stale-form handling. |
| [grade-name.test.ts](grade-name.test.ts) | Checks standard grade spacing/casing normalization while leaving custom grades and unrelated names alone. |
| [grade-repair.test.ts](grade-repair.test.ts) | Rehearses the archived one-off Grade 10 repair in a local database: rollback, refusal when dependencies make cleanup unsafe and preservation of valid references. |
| [account-validation.test.ts](account-validation.test.ts) | Checks permitted roles, matching passwords, safe site origins and accepted invitation/recovery link types. |
| [access-actions.test.ts](access-actions.test.ts) | Checks admin member/invitation actions, school ownership, version checks and delivery gating. Calls are mocked; no emails are sent. |
| [account-actions.test.ts](account-actions.test.ts) | Checks recovery, confirmation, password changes, session-revocation failures/retries and invitation acceptance with mocked Auth/database calls. |
| [account-database.test.ts](account-database.test.ts) | Runs member/invitation SQL: last-admin protection, school boundaries, suspension, expiry, verified-recipient acceptance and controlled delivery claims. |
| [bulk-invitation.test.ts](bulk-invitation.test.ts) | Checks CSV parsing and rejection of invalid or oversized bulk invitation input before database calls. |
| [invitation-handler.test.ts](invitation-handler.test.ts) | Tests the isolated email handler with a mocked provider: authorization, claim/delivery failures and outcome handling without sending messages. |
| [invitation-pagination.test.ts](invitation-pagination.test.ts) | Checks invitations remain reachable past the old first-100 limit, safe page input and distinguishing accounts with identical names. |
| [new-actions.test.ts](new-actions.test.ts) | Despite the broad filename, covers a specific group: bulk invitations, delivery reset, register-login linking and guardian grants. The shared admin helper is tested in permissions.test.ts. |
| [membership-links-database.test.ts](membership-links-database.test.ts) | Runs SQL for linked/unlinked roles, explicit guardian access, school isolation, suspension, stale edits and date-sensitive teacher/student/guardian reads. Also checks verified versus unverified account emails. |
| [hardening-database.test.ts](hardening-database.test.ts) | Checks security properties across the final schema, audit immutability, correction history, bulk/retry limits and privacy cleanup constraints. |
| [final-upgrade-database.test.ts](final-upgrade-database.test.ts) | Seeds records at migration 009, applies the later migrations and checks preservation. Reproduces the email-type failure at 012, verifies 013 fixes it and tests multi-role school-scoped privacy cleanup. |
| [csp.test.ts](csp.test.ts) | Checks the generated Content Security Policy and nonce format, including differences between development and production. |

The database files deliberately overlap in places. Some cover a feature when it was introduced; others check the complete migration chain or an upgrade with existing records. That is why a final-schema regression can be caught separately from an earlier feature test.

## Browser tests

[e2e/foundation.spec.ts](../e2e/foundation.spec.ts) covers preview navigation, disconnected login/protected routes, gated recovery, malformed confirmation links and layouts at 1440, 390 and 320 pixels. A production-only test also checks that allowed scripts receive fresh nonces and an untrusted inline script is blocked.

```powershell
npm run test:e2e
```

[playwright.config.ts](../playwright.config.ts) starts an isolated app on **port 3001**, with Supabase configuration cleared and email flags off. It uses one browser worker and Microsoft Edge on Windows. Leave port 3001 free; it will not reuse an existing server. Your normal app uses port 3000.

The default browser run skips the production-only CSP test. To include it:

```powershell
$env:SCHOOL_PORTAL_E2E_PRODUCTION = 'true'
try {
    npm run test:e2e
} finally {
    Remove-Item Env:SCHOOL_PORTAL_E2E_PRODUCTION
}
```

The [production helper](../scripts/production-e2e-server.mjs) builds and starts the test app. Prefer running build/browser checks separately from interactive testing so you are not competing for laptop memory or changing build output while reviewing a page. Windows browser-test shutdown has previously needed attention; see the dated repair report if all tests finish but the command does not exit. Do not kill unrelated Node processes.

## Reading a failure

The file and test title usually identify the behavior that failed. `expected` describes the intended outcome; `received` is what happened. Database errors may have codes such as `42501` (permission denied), `40001` (a stale/conflicting operation here) or `42804` (a type mismatch). Those can be intentional in a test that expects rejection.

For example, the migration 013 regression first expects the old function to fail with `42804`, then checks that the corrected function succeeds while still refusing the wrong school or role. The earlier fixture defined Auth email as `text`; the real column is `varchar(255)`. Correcting that fixture made the test reflect the defect we found.

If a check fails, keep the test name and nearby error output. Remove credentials or account details before sharing logs. Do not weaken an assertion simply to get a green result.

## Supporting files

- [vitest.config.mts](../vitest.config.mts) selects `tests/**/*.test.ts` and runs one worker.
- [package.json](../package.json) defines the npm commands.
- [GitHub workflow](../.github/workflows/check.yml) runs checks and production browser tests in CI; its existence is not evidence of a successful remote run.
- [Verification log](../docs/VERIFICATION.md) records completed runs and hosted checks separately.

There is no dedicated Storage, attendance, marks or finance test suite yet because those modules have not been built. No coverage percentage is claimed here.

