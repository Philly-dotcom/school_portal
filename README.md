# School Portal

School Portal is a portal for one school, built so we can add more schools later without mixing their records. We are using Next.js, TypeScript, Tailwind and Supabase.

This project lives at `C:\Users\moses\Documents\School_portal`. Its database, accounts and decisions belong to this project only.

## Where we are — 8 October 2026

We are developing **Phase 3: Daily Operations**. Role workspaces, personal timetables, attendance, view-only homework, announcements and private PDF documents are implemented locally. Your browser checks are about halfway through and working so far; the remaining checks and live account readiness are still open.

You confirmed that **migration 020 is applied**, following 019 and working homework. Migrations through 020 are now applied in the dedicated Supabase project; do not rerun them. You are working through the remaining tests. Role access, transfers, revoked access and simultaneous saves still need their individual results recorded. See the [verification log](docs/VERIFICATION.md).

Phase 2 lists use 50-record pages and searchable choices. Phase 3 follows the same bounded approach. Attendance and homework use user-scoped server actions and database functions; no new packages, environment settings or elevated app credentials were added. See [the current checkpoint](docs/RESUME.md) for the latest test result.

**Migration 021 adds the private Documents library and is pending application.** Admin uploads school-wide or class PDFs; teachers upload to classes they currently teach. Files start as drafts, with a 2 MiB limit and authenticated downloads. See [documents](docs/DOCUMENTS.md) for setup and checks, and [announcements](docs/ANNOUNCEMENTS.md) for the noticeboard workflow.

| Area | What is available | What still needs attention |
| --- | --- | --- |
| Sign-in and school access | Password login, verified school membership and role checks | Full session and hosted permission tests; administrator recovery |
| People & access | Member roles/status, prepared invitations, invitation history and bulk preparation | Email delivery is off; invitation and recovery delivery remain untested |
| Academic setup | Years, terms, grades, subjects, classes and name corrections | Review test-data dates; date/relationship corrections and year rollover are not built |
| School registers | Students, teachers, guardians, family links and enrollment | Hosted tests of corrections, login links and guardian access |
| Enrollment | Transfers and withdrawals that keep placement history | Hosted workflow and simultaneous-save tests |
| Teaching assignments | Dated creation/listing, ending/replacing with history; 014 applied and testing confirmed by you | Broader corrections and timetable handover remain separate |
| Timetable | Admin planning and read-only current-week views for linked teachers, students and guardians | Hosted role, date and conflict checks |
| Attendance | Daily registers, teacher history, admin corrections with a reason, learner/guardian history | Hosted stale saves, transfers and permission checks; 018 applied by you |
| Homework | Draft, publish, edit and withdraw; original-publication audience; no learner submissions; 019 applied and homework working, as confirmed by you | Finish publication, role access, transfer and revoked-access checks |
| Announcements | School-wide and class notices, drafts, publication and withdrawal; 020 applied | Finish announcement browser/security checks |
| Documents | Private PDF drafts, publication, withdrawal and authenticated downloads; current-class readers | Apply 021, check the bucket and verify real uploads/downloads and permissions |

Teacher, student and guardian workspaces now use linked school records. Adding a student record does not create a login, and recording a family relationship does not automatically give a guardian access.

Marks, report cards, fees, external notifications and AI are still ahead. Homework attachments are not part of the Documents library. The public `/preview` remains a static design preview. We are still using fictional records.

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

Email stays off until we have a registered sending domain and have tested delivery. PDF Storage integration is built locally but needs migration 021 and hosted verification. Notification channels and automations remain later work. See [the agreed product decisions](docs/PROJECT_CONTEXT.md) before adding scope.
