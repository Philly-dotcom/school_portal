# Where we left off

Updated 25 October 2026.

## Current position

We are in **Phase 3: Daily Operations**. The core modules and daily dashboards are implemented; Phase 3 has not been accepted and Phase 4 has not started. Migrations through **021 are user-confirmed applied**. Do not rerun them. Use fictional records in the dedicated School Portal project.

All roles now use a top-right profile dropdown. It contains identity details, the active role and Sign Out. Multi-role accounts get a workspace chooser at the normal dashboard entry and Switch Workspace in the dropdown. Single-role accounts open their workspace directly. Switching opens the chosen overview in the same session and clears learner/edit context. Guardian users must explicitly select a permitted learner again. The old sidebar role switcher has been removed.

Student current grade/class/year tiles remain on the overview; identity and enrolment history are in the dropdown. Teacher subjects are in the dropdown. Guardian learner selection stays on the overview. Admin management links are grouped under School management; their reference is the active school membership ID, not a separate staff reference.

## Latest verification

On 25 October, after the shared profile/workspace change and UTF-8 repair, **npm run check passed ESLint, TypeScript, 510 tests in 56 files and production build**. No test relaxation or application fix was needed during that run. The earlier 509-test result is superseded. This run did not include Playwright, hosted RLS/Storage checks or new role-browser acceptance.

The user marked P3-01 through P3-30, the original 13 document checks and DOC-ANON complete. Preserve those results as evidence for the versions tested. Earlier agent browser checks covered Teacher/Guardian navigation, Admin rendering/sidebar/profile and Student current 2026 versus upcoming 2027 placement. They do not validate the latest all-role dropdown and chooser.

## What comes next

Use [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist) as the acceptance tracker. Do not repeat already passed cases without a relevant regression reason.

1. Review the two open code concerns: detailed Teacher/Student profile history now loads on every module page, even with the dropdown closed; legacy Admin management links can select Admin implicitly without an explicit mode. These were identified, not fixed.
2. Complete browser acceptance of the new chooser, all four profile menus, switching, Guardian reselection, sign-out, denied roles and responsive/keyboard behavior.
3. Complete populated dashboard, error/retry, pagination and warm production timing checks.
4. The user handles all School B setup and hosted cross-school reads/writes/Storage checks: DOC-B, P3-31 and P3-32 remain open.
5. Resolve reproduced failures, rerun checks after code changes, then review results together before signing off Phase 3.

Before Phase 4 implementation, confirm whether Admin may both review and publish, whether changed approved marks require re-review, grading rules and report layout. Marks, reports, finance, external notifications and AI have not been added.

## Existing fictional records

Reuse existing accounts, people and grants. Do not create duplicate schools, learners or logins. The user signs in without sharing credentials.

The authorised 2026 fixture was created as **Acceptance 12A**, class `11de7dc9-4a5e-477c-acec-370bcf311e48`, using existing ST-003, ST-002 and DEMO-ST-002 learners and Mrs Leruo (TE-003), dated 1 October to 26 November 2026. Later browser evidence showed the current Student class label as **12A - 2026**. Inspect current records before testing; labels, placements and grants may have changed during acceptance.

Keep the 2027 planning records intact. The approved 9 October repair corrected the original year to 18 January–26 November 2027, retained its ID/history, corrected ST-002's end date and reversed ST-003's accidental withdrawal. The existing 2026 year spans 18 January–26 November 2026. Archived repair SQL is not a setup script.

## Boundaries

No cross-request authorization cache, elevated application credential or new authentication system was introduced. Mutations and RLS still enforce access. The measured 17-to-6 read reduction concerns the earlier context/actor/profile loader path, not the complete current dashboard or hosted latency.

Email remains off; live recovery, admin security policy, backups, monitoring, deployment and real-school approval are separate launch gates. Preserve migrations, local configuration and user work. Leave the user's dev server running unless asked otherwise.

## References

- [Verification evidence](VERIFICATION.md)
- [Phase 3 checklist](DOCUMENTS.md#remaining-phase-3-checklist)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [File guide](FILE_GUIDE.md)
- [Earlier notes](../archive/2026-10/docs-before-20261025-reconciliation/docs/RESUME.md)
