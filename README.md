# School Portal

School Portal is a portal for one school, built so we can add more schools later without mixing their records. We are using Next.js, TypeScript, Tailwind and Supabase.

This project lives at `C:\Users\moses\Documents\School_portal`. Its database, accounts and decisions belong to this project only.

## Where we are — 4 October 2026

We are in **Phase 2: Academic Setup**. Much of the admin side is built, but we still have testing and a few missing workflows to finish. Some Phase 1 checks, especially account recovery and email delivery, are also open.

You have confirmed that migrations **009–013** have run in the dedicated Supabase project. Migration 013 fixes the email-type mismatch that stopped School registers from loading. The register now loads and still works after refresh. All seven admin views loaded in the connected browser check on 4 October. That checks page loading, not every save or permission rule; see [the verification log](docs/VERIFICATION.md). Do not rerun migrations that have already been applied.

The latest full local check passed after the assignment-lifecycle work on 4 October: **154 tests in 25 files**, lint, TypeScript and the production build. Migration **014 is local and pending application**; see [Teaching assignments](docs/TEACHING_ASSIGNMENTS.md). These checks do not prove hosted workflow or email readiness. Earlier cleanup results remain in [the cleanup notes](docs/CLEANUP.md).

| Area | What is available | What still needs attention |
| --- | --- | --- |
| Sign-in and school access | Password login, verified school membership and role checks | Full session and hosted permission tests; administrator recovery |
| People & access | Member roles/status, prepared invitations, invitation history and bulk preparation | Email delivery is off; invitation and recovery delivery remain untested |
| Academic setup | Years, terms, grades, subjects, classes and name corrections | Review test-data dates; date/relationship corrections and year rollover are not built |
| School registers | Students, teachers, guardians, family links and enrollment | Hosted tests of corrections, login links and guardian access |
| Enrollment | Transfers and withdrawals that keep placement history | Hosted workflow and simultaneous-save tests |
| Teaching assignments | Dated creation/listing; local migration 014 adds ending/replacing with history | Apply and verify 014; broader corrections and timetable handover remain separate |
| Timetable | Admin weekly lesson planning and clash checks | Hosted conflict/removal tests and later role-facing views |

Teacher, student and guardian access rules exist in the database. Their dedicated record screens are not built yet. Adding a student record does not create a login, and recording a family relationship does not automatically give a guardian access.

Attendance, homework, announcements, PDF uploads, marks, report cards, fees, notifications and AI are still ahead. The public `/preview` page is a design preview, not a working version of those modules. We are still using fictional records.

## Catching up

Read these in this order:

1. [Current checkpoint](docs/RESUME.md) — what we just did and what comes next.
2. [Architecture](docs/ARCHITECTURE.md) — how a browser request reaches Supabase and gets checked.
3. [File guide](docs/FILE_GUIDE.md) — what every maintained project file is for.
4. [Test guide](tests/README.md) — what each test file checks and how to run it.
5. [Roadmap](docs/ROADMAP.md) — what remains in each phase.

The [documentation index](docs/README.md) points to the more detailed setup and feature guides. You do not need to read all the SQL before using the app.

## Run the app

Use Node.js 22 or later; our checks have used Node 24. From the project folder:

```powershell
npm run dev
```

Open http://127.0.0.1:3000. If dependencies have not been installed, run `npm ci` first. You do not need to reinstall them every time you start the app.

The existing `.env.local` connects this checkout to the dedicated Supabase project. Keep it private. Do not replace it while following a fresh-install guide. For a new checkout, use [.env.example](.env.example) and [Supabase setup](docs/SUPABASE_SETUP.md). Both environment files use the same six web-app variable names; the example contains placeholders. [Environment settings](docs/ENVIRONMENT.md) separates these from CLI and invitation-function settings. The Next.js app uses a publishable key and the signed-in user's permissions; it must not contain a service-role key.

## Run checks

```powershell
npm run check
```

This runs lint, TypeScript, the local unit/database tests and a production build. It does not run browser tests or apply migrations to Supabase.

For browser checks:

```powershell
npm run test:e2e
```

Those tests start their own disconnected app on port 3001. They do not use your signed-in session or write to your hosted school. On Windows they use Microsoft Edge. One production-only security check is skipped in this default run; [the test guide](tests/README.md) explains how to include it.

## How the files fit together

```text
Browser page or form
  → Next.js server page / server action
  → verified user, school membership and permission checks
  → Supabase query or database function
  → PostgreSQL permissions and row-level security
  → result shown in the portal
```

`src/app` contains routes and form handlers. `src/components` contains the screens and forms. Some server-rendered panels also load their own data. `src/lib` holds shared validation, configuration and access helpers. `supabase/migrations` holds the database changes, in order. There is no separate Express backend or generic repository/service layer in the current app.

## What we are deliberately leaving for later

We are not building SaaS billing, self-service school registration, custom domains or a platform-owner dashboard yet. The database already carries school ownership so those decisions can be made later.

Email stays off until we have a registered sending domain and have tested delivery. PDF storage, notification channels and automations have not been connected. See [the agreed product decisions](docs/PROJECT_CONTEXT.md) before adding scope.
