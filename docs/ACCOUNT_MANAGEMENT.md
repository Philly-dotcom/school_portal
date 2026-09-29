# Activate account management

This is the next Phase 1 increment. Its code and migration are local. The new migration and invitation sender have **not** been applied/deployed to your hosted project by this work. No emails have been sent.

Public sign-ups were independently verified disabled on 2026-09-30. Keep them disabled. The user has not configured custom SMTP, so invitation and recovery email flags remain off by default.

## 1. Enable member management first (no email required)

1. Open the SQL editor for the dedicated **School Portal** Supabase project.
2. Review and run `supabase/migrations/202609300002_account_management.sql` once. It requires the first migration already applied. Do not rerun the original migration.
3. Restart the local development server (`npm run dev`), or rebuild and restart if using `npm run start`.
4. Sign in as School Admin and open **People & access**.
5. The page should list your existing admin. You can update roles, suspend/reactivate members, prepare/revoke invitations and see recent audit activity.

The last active administrator cannot be suspended or demoted. Edits use a version check to prevent a stale form overwriting another admin's change. Direct table writes remain denied: only the scoped database RPC can change access. Suspension affects that school's access, not the entire login identity or other schools.

Do not test suspension on your only administrator. Use synthetic test members. Preparing an invitation neither sends mail nor creates school access.

## 2. Configure transactional email

Choose a transactional SMTP provider supported by Supabase. You will need an account, a verified sender/domain, and its SMTP host, port, username and password. Verify the DNS records the provider specifies (typically SPF and DKIM; set an appropriate DMARC policy).

Enter SMTP credentials only in the dedicated Supabase project's Authentication email/SMTP settings. Do not add them to this repository or paste them into chat. Configure sender name/address and review Auth email rate limits and abuse protection. School Portal adds an invitation preparation limit of one per school per minute and 50 per day; Auth/provider limits also apply.

Use a controlled test recipient before sending to school users. Provider acceptance is not proof of inbox delivery. Test spam-folder placement and error handling. Supabase's default sender is not the live delivery plan.

Reference: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 3. Set the application URL and email templates

For this laptop use exactly `http://127.0.0.1:3000` as the Supabase Auth Site URL and the app's `SCHOOL_PORTAL_SITE_URL`. Avoid switching between localhost and 127.0.0.1 during a test. For a deployed app use its approved HTTPS origin. A localhost link only works on the same computer; do not send it to real remote users.

Add the intended URLs to Supabase's redirect allowlist:

- `http://127.0.0.1:3000/auth/confirm`
- `http://127.0.0.1:3000/account/password`
- `http://127.0.0.1:3000/account/password?flow=invite`

Use explicit production equivalents when deploying. Do not use arbitrary wildcard domains.

In the Supabase **Invite user** email template, use this link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept your School Portal invitation</a>
```

In the **Reset password** email template, use:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your School Portal password</a>
```

These token-hash templates are required. The default implicit-flow invitation URL is not the implemented flow. The confirmation page waits for a deliberate button press before consuming the token, reducing accidental consumption by email scanners. It supports only invite/recovery and redirects to fixed internal destinations. Configure hosting/proxy logs to redact token query strings; the local Next.js request logger suppresses the confirmation path. Do not screenshot or share real confirmation links.

## 4. Deploy the isolated invitation sender

The Next.js application continues to use only the publishable key and the user's session. Do not add a service-role key to `.env.local`.

The isolated Supabase Edge Function at `supabase/functions/invite-school-user` is the only component that uses Supabase's built-in privileged runtime credential to call Auth's invite API. It first verifies the caller against Auth, then claims one invitation using an active School Admin database check. Its recipient comes from that saved invitation, not a supplied arbitrary email address. It cannot send for an ordinary teacher, student, guardian or anonymous caller.

Deploy using the Supabase CLI from this project after authenticating with your own account (or the dashboard's Edge Function deployment workflow). Example commands, with your project's reference substituted:

```powershell
npx supabase login
npx supabase functions deploy invite-school-user --project-ref YOUR_SCHOOL_PORTAL_PROJECT_REF --no-verify-jwt
npx supabase secrets set SCHOOL_PORTAL_SITE_URL=http://127.0.0.1:3000 --project-ref YOUR_SCHOOL_PORTAL_PROJECT_REF
```

The legacy gateway JWT check is disabled because the handler explicitly validates the user's token using `getUser`, then the database checks school membership and role. Do not remove those checks. The built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain inside Supabase's function runtime. `deno.json` pins the function dependency.

This function has not been deployed or Deno-runtime-tested in this session. Its TypeScript and mocked handler logic are checked locally. Verify runtime/deployment behaviour before enabling the application flag.

## 5. Enable the two email features deliberately

Add to your existing `.env.local` without replacing its project values:

```dotenv
SCHOOL_PORTAL_SITE_URL=http://127.0.0.1:3000
SCHOOL_PORTAL_EMAIL_ENABLED=true
SCHOOL_PORTAL_INVITATIONS_ENABLED=true
```

Keep both flags false until SMTP/templates are configured. You may enable recovery first and keep invitations false until the sender function is deployed. Restart/rebuild the running app after configuration changes.

## 6. Verify with synthetic accounts and a controlled inbox

1. Prepare a teacher invitation. Confirm its address and roles. No email should be sent at this step.
2. Click **Send invitation email** once. Check provider status, then the actual inbox.
3. Open the email, press **Continue securely**, choose a password and accept the school invitation.
4. Verify the recipient receives exactly the approved role and cannot manage members.
5. Invite a second controlled account, revoke it, and verify it cannot gain school membership even if its email link still establishes an Auth session.
6. Check expiry, wrong-email acceptance, and replay rejection.
7. Suspend a test member and confirm their existing session loses school access on the next request. Reactivate and verify access returns.
8. Request password recovery; test a valid link, expired/reused link, invalid token and matching-password validation. Confirm the new password works and the old password fails. Test Auth's session-revocation behaviour separately; do not assume all issued access tokens disappear immediately.
9. Check direct requests from a teacher, a user without membership and a second fictional school's admin. UI visibility is not the security boundary.

## Existing accounts and delivery failures

Supabase's invite API may reject an email that already has an Auth account. Do not create a duplicate identity or reveal another school's account details. An existing confirmed user can sign in and visit `/account/accept` to accept a matching prepared invitation. Direct them there through an agreed communication channel; the app does not send that alternate message automatically.

Invitations expire after seven days and can be revoked. Existing memberships, especially suspended ones, are never reactivated or overwritten by accepting another invitation. An invitation also stops granting access if its original issuer is no longer an active admin.

`sent` means the provider accepted the request, not that an inbox received it. A `sending` state after a crash or a `failed` state needs operator review; there is deliberately no blind resend. Check provider/Auth state first. If necessary revoke and replace the invitation. Creating an Auth user but failing the later flow never grants school membership by itself.

## Remaining before live use

Hosted integration tests, admin MFA, account recovery procedures, email abuse controls/CAPTCHA where appropriate, monitoring and backup/restore remain part of Phase 1. Do not treat this local increment as production approval.
