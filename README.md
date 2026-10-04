# School Portal

**Resuming work?** Start with [the saved progress checkpoint](docs/RESUME.md).

A single-school portal with school-aware ownership and access boundaries, built with Next.js, TypeScript, Tailwind and Supabase. This repository and all future cloud resources belong only to School Portal.

## Current milestone

The foundation increments include:
- A responsive public foundation preview: overview, module roadmap, roles, settings preview and setup guide.
- Password sign-in and sign-out wiring, cookie refresh, and a protected school workspace.
- A school-settings form restricted to active school administrators.
- A versioned database migration for schools, profiles, school memberships, multiple roles and audit events.
- Automated tests executing the migration and access policies against two fictional schools in embedded PostgreSQL.
- Administrator member management, versioned role/status edits, last-admin protection and access audit details.
- Prepared/revocable invitations, recipient acceptance, password recovery and password-setting screens.
- An isolated Supabase invitation-email function (not yet deployed); email flags are off until SMTP setup.

**The dedicated backend is now configured locally.** On 2026-09-30, read-only checks confirmed Supabase connectivity, denied anonymous database reads, and a signed-out dashboard redirect to login. The user confirmed that School Admin sign-in, dashboard and settings work. A subsequent check confirmed public sign-ups are disabled. Preview pages contain no school data and do not bypass authentication. Full hosted permission, session lifecycle, email and deployment testing remains outstanding; see [verification](docs/VERIFICATION.md).

Current work is **Phase 2: Academic Setup**, with Phase 1 readiness still open. Public sign-ups were independently verified disabled in September; the user reported that **People & access** lists their admin. SMTP settings were reportedly saved, but a registered/verified sending domain and end-to-end delivery are not ready, so recovery and invitation emails remain disabled. Confirm current hosted settings rather than treating historical checks as fresh verification. Follow [account-management activation](docs/ACCOUNT_MANAGEMENT.md). Academic setup, school registers, teaching assignments, the weekly timetable, enrollment lifecycle and record corrections now exist (migrations 003–009) for administrators. The user reports migrations 009–012 applied successfully on 2026-10-03 in the fictional-data Supabase project; hosted workflow/security verification remains pending. Migrations 010–012 add **sign-in links** with scoped read access for teachers, guardians and students ([LOGIN_LINKS](docs/LOGIN_LINKS.md)), **bulk invitations** and delivery reset, an append-only audit trail, recoverable correction history and safer account deletion. MFA is enabled in configuration but not yet required for administrators ([AUTH_AND_PRIVACY](docs/AUTH_AND_PRIVACY.md)). Attendance, marks and finance are not implemented. Phase 1 is not complete and this is not ready for real learner data.

## Run locally

Use Node.js 22 or later (Node 24 was used for this milestone).

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:3000. With no backend configuration, the root opens `/preview`. The app binds to localhost by default (`npm run start:public` binds all interfaces; see [AUTH_AND_PRIVACY](docs/AUTH_AND_PRIVACY.md)). Copy `.env.example` to `.env.local` to connect a backend.

```powershell
npm run check
npm run test:e2e
```

`check` runs ESLint, TypeScript, unit/database tests and a production build. Browser tests use installed Microsoft Edge on Windows, or Playwright Chromium on other platforms. They run one worker to limit memory usage. They start a local development server on port 3001 and explicitly clear backend configuration so tests never access a real school.

## Connect a dedicated backend

Follow [Supabase setup](docs/SUPABASE_SETUP.md). Do not reuse another project's database, storage, keys or business rules. Configure only the dedicated project URL, publishable key and school UUID in `.env.local`. No service-role key is needed by this app.

## Project map

| Location | Purpose |
| --- | --- |
| `src/app/preview` | Public, static design preview with no backend reads |
| `src/app/login` | Server-side sign-in and sign-out |
| `src/app/dashboard` | Protected workspace and school-settings action |
| `src/lib/auth-context.ts` | Server-verified identity and active school context |
| `src/proxy.ts` | Per-request CSP nonce, plus session-cookie refresh for authenticated routes |
| `src/lib/permissions.ts` | `isSchoolAdminContext`, the one admin check used by every administrator action |
| `supabase/migrations` | Versioned schema, policies and audit triggers |
| `tests` | Foundation permission and database tests |
| `e2e` | Browser checks for local preview and unconfigured access |
| `docs` | Decisions, architecture, setup and remaining work |

## Planning documents

- [Project decisions](docs/PROJECT_CONTEXT.md)
- [Architecture and access model](docs/ARCHITECTURE.md)
- [Supabase setup and live verification](docs/SUPABASE_SETUP.md)
- [Account management, SMTP and invitation setup](docs/ACCOUNT_MANAGEMENT.md)
- [Sign-in links and role-scoped access](docs/LOGIN_LINKS.md)
- [Auth configuration, security headers and personal-data handling](docs/AUTH_AND_PRIVACY.md)
- [Current roadmap and remaining phase requirements](docs/ROADMAP.md)

## Scope

One school first; school-aware data ownership from the beginning. No SaaS subscription billing, self-service school registration, custom domains, platform dashboard, AI or n8n in this milestone. Future academic features will receive their own relationship checks, policies and tests; the foundation tests do not establish that those unbuilt modules are secure.
