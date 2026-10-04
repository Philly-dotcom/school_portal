# Where we left off

Updated 4 October 2026.

## Current position

Latest development: teaching-assignment lifecycle is implemented locally in migration **014**, with an admin end/replace form, confirmed/versioned actions and dated non-overlap checks. Earlier assignments remain in history. A change that would leave existing lessons outside the shortened assignment is rejected; lessons are not moved automatically. **014 is not applied to hosted Supabase.** See TEACHING_ASSIGNMENTS.md before applying it. No hosted records were changed during development.

We are in Phase 2, Academic Setup. The admin foundation is working locally, but Phase 1 account/security readiness and parts of Phase 2 still need hosted testing. We are using the dedicated School Portal Supabase project with fictional records only.

You confirmed migrations 010–012 and the earlier enrollment migration 009 were applied, then confirmed migration 013 on 4 October. Do not rerun them. Migration 013 is the small follow-up fix for the register-login query; it changes an email result to the type the function promises, without changing school records or granting new access.

## What was last checked

Before 013, the connected admin dashboard, People & access and Academic setup loaded. School registers showed an unavailable message. The query defect was reproduced locally, and the test now proves both the failure before 013 and the corrected result after it.

The latest full `npm run check` passed after teaching-assignment lifecycle 014 on 4 October: lint, TypeScript, 154 tests across 25 files and production build. Hosted 014 application and workflow verification remain pending. Older counts in dated reports describe earlier runs.

The environment/file review is complete; see [CLEANUP.md](CLEANUP.md) and [ENVIRONMENT.md](ENVIRONMENT.md). The local env file stayed unchanged, its template now lists only the six app settings, and CLI/Edge settings are documented separately. The old patch and record-specific repair are archived with their contents preserved. All 13 migration hashes match the pre-cleanup snapshot. The user requested and received a memory checkpoint.

After 013, School registers loaded with the existing records and remained available after refresh. All seven admin views loaded: Overview, Academic setup, School registers, Teaching assignments, Timetable, People & access and School settings. The timetable showed four existing lessons; People & access still showed one active admin, zero invitations and email delivery disabled. These were read-only checks. No records, roles or permissions were changed. See [VERIFICATION.md](VERIFICATION.md).

## What to do next

1. The post-013 admin page-loading check is complete; review the screens and documentation at your own pace.
2. Test corrections, enrollment changes and timetable conflicts with clearly fictional records, recording the outcome.
3. Complete hosted denied-read and denied-write checks with separate fictional roles and two schools. The last People & access check showed only one active School Admin, so these sessions are not available yet.
4. Apply and verify assignment lifecycle 014, then continue list capacity/pagination. Broader assignment corrections remain outside the end/replace editor; agree their scope separately.

The original test dataset still needs your review. The year called 2027 runs through 2030, and a grade called Thapelo remained in the last observed list. Do not silently delete or rename these while testing.

## Keep these decisions

- One school first. Keep school ownership and permission boundaries throughout.
- Student, teacher and guardian records are separate from login accounts.
- A linked guardian needs an explicit child-access grant.
- Homework will be view-only. Documents will be PDF-only; upload permissions still need agreement.
- An authorized reviewer reviews results, and only School Admin publishes. The detailed review rules are a Phase 4 decision.
- Email is disabled. Saved SMTP settings do not make delivery ready without a registered, verified sending domain.
- No real learner data, public deployment, new cloud resources or work in other projects.

The server belongs to your current testing session. Do not restart or stop it unnecessarily. Never print `.env.local`.

## Useful references

- [File-by-file guide](FILE_GUIDE.md)
- [Tests and commands](../tests/README.md)
- [Remaining work by phase](ROADMAP.md)
- [Current architecture](ARCHITECTURE.md)
- [Dated repair report](REPAIR_REPORT.md)
- [Synthetic data already entered](SYNTHETIC_DATA.md)
- [Verification evidence and limits](VERIFICATION.md)

The October 2 repair report describes changes made before you applied 010–012. Its old migration status is historical. The supplied patch and one-off Grade 10 repair are now in [archive](../archive/README.md). Keep them as history, not instructions to reapply work.
