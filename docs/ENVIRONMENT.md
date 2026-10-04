# Environment settings

Reviewed 4 October 2026. The current `.env.local` has the six web-app settings below, no duplicate variable names, and both email flags set to false. Its values were left unchanged. The example now lists the same six names, with placeholders instead of connection details.

## Two files, two jobs

`.env.example` is the tracked starting template for a new checkout. `.env.local` is the ignored local configuration that Next.js reads. Matching names are intentional; the example is not a second live configuration file. Do not overwrite your configured local file just because the template changes.

| Web-app variable | Purpose | Needed now? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Identifies the dedicated Supabase backend. | Yes, for the connected portal. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Lets the app make user-scoped requests. RLS and the user's session enforce access. | Yes. Never substitute an elevated secret/service-role key. |
| `SCHOOL_PORTAL_SCHOOL_ID` | Selects the first school's workspace on the server. It does not grant access. | Yes. |
| `SCHOOL_PORTAL_SITE_URL` | Trusted origin used to construct invitation/recovery destinations. | Keep configured; used when email flows are enabled. Local example: `http://127.0.0.1:3000`. |
| `SCHOOL_PORTAL_EMAIL_ENABLED` | Enables the web app's email account flows. | Keep explicitly `false` for now. |
| `SCHOOL_PORTAL_INVITATIONS_ENABLED` | Separately allows invitation dispatch from the web app. | Keep explicitly `false` for now. |

The three optional email settings are retained because existing account code reads them. They are not obsolete just because email is temporarily off. Public Supabase URL/key variables are designed for public-client use; that does not make `.env.local` suitable to publish.

## Supabase CLI settings are separate

`supabase/config.toml` references `SCHOOL_PORTAL_SITE_URL`, `SCHOOL_PORTAL_PASSWORD_REDIRECT_URL` and `SCHOOL_PORTAL_INVITATION_REDIRECT_URL`. The last two are not read by Next.js and have been removed from the web-app template. They are still required when deliberately reviewing/applying that Auth configuration through the CLI.

For a local development configuration, the corresponding values would be:

```powershell
$env:SCHOOL_PORTAL_SITE_URL = 'http://127.0.0.1:3000'
$env:SCHOOL_PORTAL_PASSWORD_REDIRECT_URL = 'http://127.0.0.1:3000/account/password'
$env:SCHOOL_PORTAL_INVITATION_REDIRECT_URL = 'http://127.0.0.1:3000/account/password?flow=invite'
```

These lines only set shell variables. They do not update hosted Supabase, and are not a request to push configuration. Use the intended deployment origin when preparing a deployment, and review [Auth and privacy](AUTH_AND_PRIVACY.md) first. Do not assume Next.js's `.env.local` automatically configures a separate CLI process.

## Invitation function settings are separate too

The Supabase-hosted function reads these in its own runtime:

| Variable | Purpose |
| --- | --- |
| `SCHOOL_PORTAL_INVITATION_DELIVERY_ENABLED` | Function-side delivery switch. Keep off until delivery is ready. Missing also leaves delivery disabled. |
| `SCHOOL_PORTAL_SITE_URL` | The trusted callback origin, configured for that runtime. |
| `SUPABASE_URL` | Supabase backend URL supplied to the function. |
| `SUPABASE_ANON_KEY` | Used for the caller's user-scoped authorization checks. |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Auth invitation operation, isolated in the function runtime. Never copy it into `.env.local` or the app template. |

The sender remains unverified and email is disabled. SMTP credentials belong in Supabase's email configuration, not in the Next.js app. No Resend API key is used directly by the current application.

## Tooling variables

`SCHOOL_PORTAL_E2E_PRODUCTION` is a temporary shell/CI switch for production browser tests, not a persistent app setting. `NODE_ENV` is managed by the runtime/build commands. Neither belongs in `.env.local` here. See [the test guide](../tests/README.md).

The browser-test configuration intentionally replaces the app settings with disconnected values and false email flags. That duplication is a testing boundary, not redundant configuration to remove.

After a deliberate local setting change, restart the dev server when ready to use it. This cleanup did not change `.env.local`, push hosted settings or restart the running portal.
