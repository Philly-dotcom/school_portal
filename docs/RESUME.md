# Where we left off

Updated 5 October 2026.

## Current position

Latest development: timetable filtering and lesson creation now search assignments in pages of 25. Search covers teacher name/reference, subject, class, grade and year, with assignment dates in each label. Timetable reads load only the assignments and related labels needed by the visible lesson page and active filter. The 500-choice guard and catalog preload are removed.

You confirmed applying **015** on 5 October. Do not reapply it. **Migration 016 is prepared locally and has not been applied to hosted Supabase.** It adds an admin-only read-only timetable search using the caller's RLS context. Existing lesson creation/removal and conflict rules are unchanged. Until 016 is applied, searches report unavailable; existing lesson browsing and removal remain available.

Browser checks remain on hold at your request. The planned Phase 2 search conversions are now implemented locally; this does not close hosted verification, correction-scope decisions or Phase 2 acceptance.

You confirmed applying **014**, then completing all pending fictional-data tests and authorizing further Phase 2 work. Teaching assignments now support ending/replacing while retaining history. This is user-reported hosted testing, not a new independently observed browser or security verification pass. Email remains off.

We are in Phase 2, Academic Setup. The admin foundation is working locally, but Phase 1 account/security readiness and parts of Phase 2 still need hosted testing. We are using the dedicated School Portal Supabase project with fictional records only.

You confirmed migrations 010–012 and the earlier enrollment migration 009 were applied, then confirmed migration 013 on 4 October. Do not rerun them. Migration 013 is the small follow-up fix for the register-login query; it changes an email result to the type the function promises, without changing school records or granting new access.

## What was last checked

Before 013, the connected admin dashboard, People & access and Academic setup loaded. School registers showed an unavailable message. The query defect was reproduced locally, and the test now proves both the failure before 013 and the corrected result after it.

The latest full `npm run check` passed after timetable assignment search on 5 October: lint, TypeScript, **218 tests across 32 files** and production build. Hosted application of 014 and earlier fictional-data tests are user-confirmed. Browser checks are on hold at the user's request. Migration 015 application is now user-confirmed; 016 is pending. Older counts in dated reports describe earlier runs.

The environment/file review is complete; see [CLEANUP.md](CLEANUP.md) and [ENVIRONMENT.md](ENVIRONMENT.md). The local env file stayed unchanged, its template now lists only the six app settings, and CLI/Edge settings are documented separately. The old patch and record-specific repair are archived with their contents preserved. All 13 migration hashes match the pre-cleanup snapshot. The user requested and received a memory checkpoint.

After 013, School registers loaded with the existing records and remained available after refresh. All seven admin views loaded: Overview, Academic setup, School registers, Teaching assignments, Timetable, People & access and School settings. The timetable showed four existing lessons; People & access still showed one active admin, zero invitations and email delivery disabled. These were read-only checks. No records, roles or permissions were changed. See [VERIFICATION.md](VERIFICATION.md).

## What to do next

1. Apply migration 016 when ready; do not reapply earlier migrations. Review the remaining correction-scope decisions and acceptance criteria in ROADMAP.md before moving to Phase 3.
2. Browser checks are on hold at the user's request. When resumed, include search → select → change search/page → confirm the selection remains, class selection → year/date bounds, and replacement teacher selection. Browser completion has not been reported for these new controls.
3. Before live use, retain scenario-level evidence of denied reads/writes, stale saves and concurrent changes through separate sessions. The broad test confirmation does not identify which sessions or scenarios were used.
4. Broader assignment corrections remain outside the end/replace editor; agree their scope separately. Do not reapply 014.

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
