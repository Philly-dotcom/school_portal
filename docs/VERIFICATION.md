# Verification status

Updated 20 October 2026. This page separates local checks, user-reported hosted results and still-open acceptance. The full earlier log is preserved in [verification history](../archive/2026-10/docs/VERIFICATION_THROUGH_20261020.md), including screenshots and the scope of each run.

## Local checks

The latest full `npm run check` passed lint, TypeScript, **482 tests in 53 files**, and the production build on 20 October after the profile work. The user also confirmed a passing run. Profile tests cover identity/school scoping, guardian selection, subject deduplication, enrolment dates and error states. Routing tests separately cover role selection.

Local PGlite tests exercise SQL policies with fictional identities, but they do not prove issued-token behaviour, real Storage HTTP boundaries or independent-session concurrency. Disconnected browser tests are also separate from hosted role checks.

## Hosted results

| Area | Recorded result | Evidence boundary |
| --- | --- | --- |
| Migrations | Through 021 user-confirmed applied | Do not rerun them; migration application alone is not permission testing. |
| Documents | 13 hosted checklist items marked complete by the user | Includes bucket setup, uploads/downloads, invalid files, role/grant restrictions, transfers, ending assignments, withdrawal, interrupted-upload recovery and stale visibility saves. |
| Document school isolation | Deferred: School B is not registered | Anonymous/public requests now have a separate unchecked item; their result is not separately recorded. |
| Teacher/student/guardian sessions | Basic permitted attendance/homework and several denied routes passed on 19 October | Does not close direct API, lifecycle, combined-role or concurrency cases for all modules. |
| Admin announcement lifecycle | Draft/publish/withdraw/republish passed on 19 October | Reader transitions and other announcement cases remain open. |
| Academic date repair | Approved repair committed and checked on 9 October | Retained IDs/history; archived SQL is not a setup script. |
| New profiles | Local tests passed | Signed-in profile browser acceptance remains pending. |

The completed document results are the user's reported checks, not a new independent browser run by the agent. The original PDF validation error has been restored; no document action diff remained when inspected.

## Known failures and pending work

- Attendance stale-save feedback: the older tab remained pending for minutes; the first save survived. Trace the request before changing security or conflict logic.
- Enrolment selection/hint reset mismatch.
- Guardian sidebar learner/context loss.
- Remaining profile, timetable, attendance, homework, announcement, API and independent-session checks.
- Hosted cross-school isolation, including documents and Storage.
- Daily dashboard completion/redesign and its acceptance tests.

Use [the combined Phase 3 checklist](DOCUMENTS.md#remaining-phase-3-checklist) for case IDs, steps and expected results. Keep user-reported passes, agent-observed results and local automated results distinguishable when recording new evidence.

## Documentation refresh

On 20 October, superseded guides and full progress snapshots were archived and current status pages were refreshed. The 21 migration files retained their paths and SHA-256 hashes during archiving. No application code, hosted data, credentials or configuration was changed by this documentation task. Markdown links and documentation diffs are checked separately; the full application suite is not rerun for prose-only changes.

Phase 3 is still open. Live email/recovery, deployment, monitoring, backups and real-school readiness remain separate work.
