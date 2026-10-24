# School Portal repair report — 2026-10-02

## Outcome and architecture

This report records the October 2 repair. The user subsequently applied 009–013; statements below about unapplied migrations describe the earlier repair session. Use RESUME.md for current instructions.

The repairs preserve the existing Next.js/TypeScript/Supabase application, navigation, ownership model and lifecycle. Auth identities remain separate from school memberships, which remain separate from register records. Register/login links are explicit. School boundaries remain enforced by verified server context, composite ownership constraints and RLS. Enrollments retain transfer/withdrawal history; invitations still use one prepare → send → accept → link workflow. Supabase remains the Auth/data authority. No platform-owner or multi-school SaaS UI was added.

Only migrations **010, 011 and 012** changed, in place, in their existing order. No migration was applied to hosted Supabase. The user’s `school_portal_improvements.patch` was left untouched.

## Problems corrected

| Area | Repair |
| --- | --- |
| Temporal access | Current teacher rosters and enrollment reads use inclusive school-local start/end dates. Future transfers do not transfer access early. Students/authorized guardians retain enrollment history while lesson access follows the current placement and overlapping lesson occurrences. |
| Register/login links | Expected record version prevents stale overwrites. SQL requires an active same-school matching-role membership. The selector identifies logins by verified email and full membership ID, with explicit confirmation. Existing inactive links remain removable. |
| Guardian access | Existing family relationships default to no child access. An audited, versioned administrator grant/revocation on the same relationship separates history from authorization. |
| Invitations | Stable 50-row pages expose records beyond the former 100-row cutoff. Bulk preparation stays transactional with existing limits; malformed role/name values fail even on duplicate rows. |
| Delivery | Three lifetime attempts, 10-minute retry cooldown, explicit provider-log review, unknown-outcome state and obsolete-claim rejection. Separate sender-runtime enable flag defaults off. No automatic retries. |
| Password/session handling | Returned and thrown revocation errors are reported after a successful password change. A separate retry preserves the successful change. Reauthentication errors direct the user to fresh sign-in. Existing JWT lifetime is documented accurately. |
| Privacy/history | Correct 39-character erasure references. Owner-only scoped cleanup handles all currently linked roles, guardian grants, correction snapshots, recipient/issuer invitations and school membership; academic IDs and other-school membership survive. The runbook covers unlinked/former identities, global Auth deletion and external stores separately. Corrections share the school lock with cleanup. |
| Configuration/validation | Exact invitation redirect documented alongside recovery redirect. CI audits all dependencies and runs production browser checks, including CSP nonce/inline-script enforcement. |

The necessary additions are the guardian access flag/version and its narrow admin RPC, a restricted account-identifier listing for link selection, persistent delivery attempt metadata, and an owner-only maintenance helper. These fill missing controls within existing entities and privilege boundaries; they introduce no replacement account, tenant or invitation system.

## Changed files

- SQL: `supabase/migrations/202610020010_register_membership_links.sql`, `202610020011_invitation_bulk_and_reset.sql`, `202610020012_audit_history_and_cleanup.sql`.
- Actions/routing: `src/app/account/actions.ts`, `src/app/dashboard/page.tsx`, `src/app/dashboard/people/actions.ts`, `src/app/dashboard/registers/link-actions.ts`.
- Existing UI: `src/components/access-management.tsx`, `account-forms.tsx`, `login-link.tsx`, `people-panel.tsx`, `registers-panel.tsx`. New small control: `guardian-access.tsx`.
- Validation/display helpers: `src/lib/link-validation.ts`, `invitation-pagination.ts`, `member-label.ts`.
- Sender/configuration: `supabase/functions/invite-school-user/handler.ts`, `index.ts`, `supabase/config.toml`, `.env.example`.
- Tests: `tests/account-actions.test.ts`, `hardening-database.test.ts`, `invitation-handler.test.ts`, `membership-links-database.test.ts`, `new-actions.test.ts`, `register-database.test.ts`; new `final-upgrade-database.test.ts` and `invitation-pagination.test.ts`.
- Browser/CI: `e2e/foundation.spec.ts`, `playwright.config.ts`, `scripts/production-e2e-server.mjs`, `.github/workflows/check.yml`.
- Documentation: this report, `REPAIR_PLAN.md`, `RESUME.md`, `VERIFICATION.md`, `ACCOUNT_MANAGEMENT.md`, `AUTH_AND_PRIVACY.md`, `LOGIN_LINKS.md`, `SCHOOL_REGISTERS.md`, `SUPABASE_SETUP.md`.

## Validation evidence

- `npm run check`: lint, TypeScript, 144 tests in 24 files and the production build passed in the final run.
- Embedded PostgreSQL executes the final chain. A separate fixture seeds representative register, membership, relationship, enrollment and invitation data under 001–009 before applying corrected 010 → 011 → 012.
- Regressions cover inclusive enrollment boundaries, expired/future enrollments, future transfer before/on its effective date, current-placement timetables, stale linking, duplicate names, suspension, guardian revocation, older invitation pages, bounded retries, unknown outcomes, stale completion claims, malformed bulk input, revocation failures and multi-role/multi-school privacy cleanup with rollback rehearsal.
- Six production Playwright tests passed, without retries: navigation, disconnected access/recovery gates, 1440/390/320 layouts, unique nonces, matching script nonces, no production unsafe-eval, and parser-inserted untrusted inline-script denial with a trusted-nonce positive control. Browser tests use blank backend settings and no real school data.
- The initial CSP probe used privileged DevTools script execution and was unsuitable for testing injected HTML. It was replaced with the parser-level probe above; the application policy did not need weakening.
- Windows Playwright teardown hung after the tests; only the identified test Next.js process was stopped, after which the runner exited successfully with six passed tests. Port 3001 was confirmed closed. The user's development server was not stopped.
- `npm audit --audit-level=high`: zero vulnerabilities, including development dependencies.
- Secret scan: heuristic scan of 142 tracked/non-ignored text files found no matching private keys, secret Supabase tokens, GitHub/AWS keys or JWT literals. `.env.local` remains ignored and was not printed. This does not prove absence of every possible secret format or scan Git history.
- `git diff --check` passed; migrations 001–009 have no diff.

## Exclusions and remaining risks

No new phase, MFA enforcement, general register pagination/imports, notifications, finance, marks, learner submissions, hosting, cloud provisioning or deployment was implemented. The existing 500-record register limit remains. No hosted Auth/email, actual PostgREST integration, live multi-session concurrency or production readiness is claimed by embedded database tests.

Access JWTs can remain valid until their configured expiry despite successful refresh-session revocation. Erasure remains a reviewed operator procedure: historical/unlinked identities, exports, backups and provider logs require separate handling. IDs retained for audit/history are pseudonymous. Database-owner access can disable audit triggers. Offset invitation pages can shift when another admin creates invitations; reload before acting and SQL revalidates the selected ID/status.

## Staging decision and manual checks

**Ready for a controlled staging rehearsal using fictional records; not approval to apply to production.** No staging project was created or modified.

1. Confirm the approved staging project, recovery/backup approach and actual migration history. Apply only missing migrations in order. Use matching app, sender and SQL revisions, with all email gates off.
2. Seed fictional Schools A and B. Check denied reads **and writes** through real authenticated Supabase sessions for each role, suspension, inactive school, foreign IDs, direct RPCs and anonymous callers.
3. Use two admin browsers to verify stale link/correction/grant rejection and simultaneous enrollment/transfer handling. Check today, end-date, next-day and future-transfer behavior in the school timezone.
4. Review each existing guardian relationship before explicitly granting child access. Confirm that linking a login alone exposes no child records; verify revocation and role removal.
5. Browse more than 100 invitations. Check SQL retry limits, ambiguous delivery review, expired/revoked/sent cases and late completions. Do not actually send until domain/SMTP, runtime gate, templates and redirects are approved and tested.
6. Validate supported Supabase CLI Auth settings, disabled public signup, exact recovery/invite redirects, secure password change and the hosted JWT lifetime. Test password change/revocation with two browser sessions; mocks do not prove hosted Auth behavior.
7. Rehearse owner-only cleanup with `ROLLBACK`, including a multi-role member also belonging to School B. Inspect history, invitations, counts and unchanged academic IDs. Approve retention and any external deletion separately.
8. Only after staging passes should the user authorize hosted migration/deployment. Keep email off until delivery is independently verified.
