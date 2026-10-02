# Auth configuration, security headers and personal-data handling

## 1. Auth settings are version-controlled (`supabase/config.toml`)
The file now documents the intended hosted Auth settings: sign-ups off, 12-character minimum enforced by Supabase Auth itself (the form check alone can be bypassed with the public key), refresh-token rotation, confirmed email changes, rate limits, TOTP MFA enabled, and a 24-hour email-link lifetime.

Nothing changes on the hosted project until you apply it:

1. Create a **staging** Supabase project and `supabase link` to it.
2. Export the variables the file references (`SCHOOL_PORTAL_SITE_URL`, `SCHOOL_PORTAL_PASSWORD_REDIRECT_URL`, e.g. `https://school.example/account/password`).
3. Run `supabase config push`, read the diff it prints, and check sign-in, recovery and invitation links.
4. Repeat for production. If the CLI reports a key it does not recognise, fix it rather than ignoring the warning.

Invitation *records* last 7 days but email links last at most 24 hours. An invitee with an expired link uses **Forgot password**, then **Accept a school invitation** on the dashboard.

## 2. Requiring MFA for administrators (not yet enforced)
Enabling TOTP lets users enrol, it does not require it. Before real data: add an enrol screen, then require `aal2` for administrator actions. The cheapest robust approach is a database check inside `private.is_school_admin` (read `auth.jwt()->>'aal'`), so every policy and RPC enforces it at once. Test it in `tests/database.test.ts` style before enabling.

## 3. Security headers
`src/proxy.ts` issues a per-request-nonce Content-Security-Policy (`src/lib/csp.ts`); pages render per request so Next.js can attach the nonce. `next.config.ts` adds HSTS, `nosniff`, `X-Frame-Options` and a strict referrer policy. If you add an external script, image host or font, extend `buildCsp` deliberately and update `tests/csp.test.ts`. Browser-check the policy after any dependency upgrade: open the console and look for "Refused to execute" messages.

## 4. Running the app on a server or in a container
`npm start` binds to `127.0.0.1` on purpose. A VPS or container that must accept outside connections should use `npm run start:public` (binds `0.0.0.0`) behind a TLS-terminating reverse proxy. Hosted platforms that manage this for you need neither.

## 5. Personal data: retention, history and erasure
This is an engineering template, not legal advice. Have a privacy officer or lawyer confirm retention periods and lawful bases for your jurisdiction (for example POPIA in South Africa).

* **Audit trail** (`audit_events`) is append-only and holds IDs and action names, not names. It is kept for accountability.
* **Correction history** (`record_history`) holds the *previous* name/reference after a correction, readable by administrators only. Nothing purges it automatically. Run `select purge_record_history('<school-id>', interval '2 years')` as an administrator on a schedule the school has agreed (minimum 30 days).
* **Deactivate, don't delete, by default.** Suspending a member removes all access and keeps history intact.
* **Deleting an Auth account** no longer fails because of invitation history (`invited_by` / `accepted_by` become null, which also voids that person's unsent invitations). A member who still has a membership cannot be deleted, deliberately.
* **Full erasure** (when required) is an operator task. Template, run in the SQL editor as the project owner and reviewed first (replace the placeholders):

```sql
begin;
-- 1. Anonymise and detach the register record(s); enrollments stay for referential history.
update public.students set full_name = '[erased]', reference = 'ERASED-' || id, membership_id = null,
  record_version = record_version + 1 where id = '<student-id>';
-- 2. Remove retained previous values.
delete from public.record_history where record_kind = 'students' and record_id = '<student-id>';
-- 3. Remove the sign-in membership and profile.
delete from public.membership_roles where membership_id = '<membership-id>';
delete from public.school_memberships where id = '<membership-id>';
delete from public.profiles where user_id = '<auth-user-id>';
commit;
-- 4. Finally delete the user under Authentication > Users in the Supabase dashboard.
```
Repeat step 1 for `teachers` / `guardians` as needed. `audit_events` keeps only record IDs and cannot be edited, so no personal text remains there.
