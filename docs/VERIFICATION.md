# Verification status

Updated 25 October 2026. Local checks, user-reported hosted results and agent browser observations are separate evidence.

## Latest local result

**npm run check passed ESLint, TypeScript, 510 tests in 56 files and production build on 25 October 2026.** This covers the shared profile/workspace-choice implementation and the repaired UTF-8 character in role-overview.tsx. No fixes or relaxed assertions were needed during this run.

Earlier passes of 490, 504, 507 and 509 tests belong to earlier revisions. They are retained in the [previous verification notes](../archive/2026-10/docs-before-20261025-reconciliation/docs/VERIFICATION.md). The initial decision not to run checks was superseded when the user requested and authorised the full run.

This command does not run Playwright or hosted acceptance. PGlite tests execute SQL with fictional identities; they do not establish real gateway tokens, Storage HTTP access or independent hosted sessions. A successful build does not prove browser usability or production speed.

## Hosted and browser evidence

| Area | Recorded result | Boundary |
| --- | --- | --- |
| Migrations | Through 021 user-confirmed applied | Do not reapply; application alone does not prove permission behavior. |
| P3-01 through P3-30 | User marked complete | Preserve passes for the versions tested; new navigation needs targeted regression checks. |
| Documents | Original 13 checks and DOC-ANON user-reported passed | DOC-B remains open. |
| Teacher/Guardian navigation | Agent observed role isolation, explicit learner selection and preserved links on 24 October | Predates the new profile-menu switching flow. |
| Admin/Student dashboards | Agent observed Admin counts and links; Student current 2026 placement, upcoming 2027 history and permitted timetable | Rendering checks, not an independent audit of all totals or populated cards. |
| Admin sidebar/header | Agent observed grouping, profile fields and Academic setup navigation on 25 October | Predates standardising the menu across all roles. |
| Academic date repair | Approved repair applied and checked on 9 October | Retained IDs/history; archived SQL must not be rerun as setup. |
| School B isolation | Not completed; School B unavailable | Setup and all hosted cross-school testing belong to the user. |

## Outstanding acceptance and review

- Latest chooser and profile dropdown in all four independent role sessions, including combined roles, learner reselection, revocation and sign-out.
- Populated daily cards, PDF links, count comparisons, pagination warnings and future/current date boundaries.
- Phone/wide desktop layouts, keyboard access, long names, loading feedback and error/retry context.
- Warm production-mode timing; no end-to-end baseline has been established.
- DOC-B/P3-31/P3-32 and P3-33–P3-35 closure; explicit Phase 3 sign-off.
- Review/fix or explicitly resolve eager full profile-history reads on module pages and the implicit Admin mode fallback. Neither was changed during the lightweight review.

The earlier mocked loader measurement reduced context/actor/profile operations from 17 to 6, excluding the proxy. The current dashboard adds feed reads, and the shared profile menu loads history on module pages. Do not quote that measurement as the current whole-page request count or a hosted speed improvement.

The old attendance stale-save and selection failures have user-reported passing regressions. Reopen them only if reproduced. The reported data-mbtss-nonce hydration warning was not found in app source; browser injection was suspected, but a clean-browser reproduction result has not been recorded.

## Current tracker and history

Record new results in [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist). The detailed [pre-20 October history](../archive/2026-10/docs/VERIFICATION_THROUGH_20261020.md) and [pre-refresh notes](../archive/2026-10/docs-before-20261025-reconciliation/docs/VERIFICATION.md) remain available.

The 25 October documentation reconciliation changed documentation only. It does not add browser evidence or close hosted tests. Phase 3 remains open; email, recovery, backups, monitoring, deployment and real-school readiness remain separate gates.
