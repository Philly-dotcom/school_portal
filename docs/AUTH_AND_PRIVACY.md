# Auth configuration, security headers and personal-data handling

As of 4 October, migrations 009–013 are user-confirmed applied. Hosted Auth configuration, MFA enforcement and the privacy-cleanup procedure have not been fully verified. The commands below are controlled setup/operational steps, not a checklist to run automatically while reading this guide.

## 1. Auth settings are version-controlled (`supabase/config.toml`)
The file now documents the intended hosted Auth settings: sign-ups off, 12-character minimum enforced by Supabase Auth itself (the form check alone can be bypassed with the public key), refresh-token rotation, confirmed email changes, rate limits, TOTP MFA enabled, and a 24-hour email-link lifetime.

Nothing changes on the hosted project until you apply it:

1. Create a **staging** Supabase project and `supabase link` to it.
2. Export the CLI variables described in [Environment settings](ENVIRONMENT.md): `SCHOOL_PORTAL_SITE_URL`, `SCHOOL_PORTAL_PASSWORD_REDIRECT_URL` and `SCHOOL_PORTAL_INVITATION_REDIRECT_URL`; the latter must include `/account/password?flow=invite`. These redirect variables are intentionally absent from the web-app env files.
3. Run `supabase config push`, read the diff it prints, and check sign-in, recovery and invitation links.
4. After staging validation and separate deployment authorization, repeat for production. If the CLI reports a key it does not recognise, fix it rather than ignoring the warning.

Invitation *records* last 7 days but email links last at most 24 hours. An invitee with an expired link uses **Forgot password**, then **Accept a school invitation** on the dashboard.

## 2. Requiring MFA for administrators (not yet enforced)
Enabling TOTP lets users enrol, it does not require it. Before real data: add an enrol screen, then require `aal2` for administrator actions. The cheapest robust approach is a database check inside `private.is_school_admin` (read `auth.jwt()->>'aal'`), so every policy and RPC enforces it at once. Test it in `tests/database.test.ts` style before enabling.

## 3. Security headers
`src/proxy.ts` issues a per-request-nonce Content-Security-Policy (`src/lib/csp.ts`); pages render per request so Next.js can attach the nonce. `next.config.ts` adds HSTS, `nosniff`, `X-Frame-Options` and a strict referrer policy. If you add an external script, image host or font, extend `buildCsp` deliberately and update `tests/csp.test.ts`. Browser-check the policy after any dependency upgrade: open the console and look for "Refused to execute" messages.

## 4. Running the app on a server or in a container
`npm start` binds to `127.0.0.1` on purpose. A VPS or container that must accept outside connections should use `npm run start:public` (binds `0.0.0.0`) behind a TLS-terminating reverse proxy. Hosted platforms that manage this for you need neither.

## 5. Password and session changes

Password changes remain Supabase Auth operations. The app checks both thrown errors and returned errors when revoking other sessions. If revocation fails after the password succeeds, it says so and offers a separate revocation retry; users do not need to change the password again. If Supabase requires reauthentication, sign out and sign in afresh, then retry. A recovery link is an option only after email is configured.

Revocation invalidates refresh sessions, not already-issued access JWTs. `jwt_expiry = 3600` is the intended configuration; verify the actual hosted value. Do not promise immediate global logout. School suspension/removal still blocks that school's RLS access independently of JWT expiry. Test with two browsers in staging: successful password change, failed revocation, retry, old refresh token denial and access-token expiry.

## 6. Personal data: retention, history and erasure

The school must approve retention and the scope of each request before execution. IDs and audit entries are pseudonymous, not guaranteed anonymous. Academic history and restricted accountability records may need to remain. No automatic purge or erasure runs.

- `audit_events` keeps IDs/action metadata, with application UPDATE/DELETE/TRUNCATE denied. The owner can disable triggers; this is not an externally tamper-proof log.
- `record_history` holds previous names/references and sometimes link IDs, administrator-readable only. `purge_record_history(school, interval '2 years')` is an explicit school-scoped retention operation (minimum 30 days).
- Suspension is the normal reversible access removal. Erasure is a separate operator procedure.

### Approved school-scoped member erasure

1. Identify the exact school and membership UUIDs. Inspect every linked student, teacher and guardian record; a multi-role membership can link all three. Review enrollment/teaching/timetable and guardian relationships, previous correction snapshots, invitation recipient and issuer records, and audit IDs. Record the approved scope in a restricted ticket, not public logs.
2. Inventory unlinked or formerly linked register records and former email addresses separately. The helper below intentionally does **not** guess identity from matching names. If such records are in scope, include their verified UUIDs and addresses in a reviewed operator transaction: pseudonymize name/reference, clear membership, increment version, revoke associated guardian grants, purge their school-scoped correction history, and scrub recipient invitation PII. Use `reference = 'ERASED-' || replace(id::text, '-', '')` (39 characters, within the 40-character bound). Use both school ID and record ID on every operation; preserve enrollment, assignments, timetable and relationship IDs. Clear relationship free text where approved. Do not link an account merely to run erasure.
3. Quiesce administrative writes and invitation sending during cleanup. A provider request already in flight cannot be recalled. Inventory exports, support records, logs, document storage (once implemented), backups and external provider data. Decide retention/removal separately, including what must happen if a backup is restored.
4. Rehearse as the database owner in a transaction. The helper is in the private schema, SECURITY INVOKER, with no application/anon/service-role execution grants. It removes all current register links for this membership in this school, pseudonymizes those records, revokes their guardian grants, removes their correction snapshots, scrubs recipient invitations matching current email or accepted identity, voids invitations issued by this member, removes only this school membership/roles, and records ID-only audit events. It refuses removal of the last administrator.

```sql
begin;
select private.erase_school_member('<approved-school-uuid>', '<approved-membership-uuid>');
-- Inspect the scoped register records, relationships, invitation/history rows,
-- membership absence, academic reference counts and untouched other-school membership.
rollback;
```

5. After reviewing the preview, repeat the exact approved transaction with `COMMIT` instead of `ROLLBACK`. Verify the affected row counts and denied access. The helper does not delete the global profile or Auth identity. Other schools and their memberships remain intact.
6. Global account deletion is separate. Obtain approval covering **every** remaining school; do not remove other memberships to bypass a foreign-key error. Once there are no remaining memberships and all scoped cleanup is complete, delete the user through Supabase Auth administration. Profile deletion follows its Auth foreign key. Verify Auth sessions/refresh tokens, remaining invitation issuer/acceptor nulls, and old JWT expiry. Never add privileged Auth credentials to the application for this operation.
7. Close the request only after handling former emails/unlinked records and approved external stores/exports/backups. The helper alone is not a complete cross-system erasure guarantee. Retained history identifiers, provider logs and backup retention must be disclosed in the completion record.
