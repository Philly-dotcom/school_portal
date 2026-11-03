# School Portal

School Portal is a portal for one school, built so we can add more schools later without mixing their records. We are using Next.js, TypeScript, Tailwind and Supabase.

This project lives at `C:\Users\moses\Documents\School_portal`. Its database, accounts and decisions belong to this project only.

## Where we are - 3 November 2026

**Phase 3 is complete and signed off. Phase 4: Academic Performance has begun with local assessment planning.** Attendance, view-only homework, announcements, private PDFs, daily dashboards and role-aware profiles/navigation are implemented. The user completed the remaining hosted/browser checks, including School B isolation and REVIEW-01/02.

Migrations through **022 are user-confirmed applied**. Do not rerun them. The last full local check passed **lint, TypeScript, 573 tests in 60 files and production build** on 3 November. Hosted results and local checks are separate evidence.

Read [the Phase 4 plan](docs/PHASE_4_PLAN.md) for assessment setup, marks, review/Admin publication, learner results and report cards. The [academic decision record](docs/PHASE_4_ACADEMIC_DECISIONS.md) now settles workflow and permissions; actual school grading formulas and final report presentation are still required; [assessment setup](docs/ASSESSMENTS.md) is implemented locally and the tester has verified the initial staff planning and authorisation flow. Frozen rosters and private raw marks are implemented locally in migration 023. Its hosted checks are pending. Session inactivity/logout work is deferred to Phase 6. Email/recovery, backups and deployment remain separate live-readiness work.

Start with [the current checkpoint](docs/RESUME.md), [Phase 3 acceptance](docs/DOCUMENTS.md#remaining-phase-3-checklist) or [verification status](docs/VERIFICATION.md).

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

Email stays off until we have a registered sending domain and have tested delivery. PDF Storage is configured and the user has completed the recorded document tests; hosted cross-school isolation remains open. Notification channels and automations remain later work. See [the agreed product decisions](docs/PROJECT_CONTEXT.md) before adding scope.
