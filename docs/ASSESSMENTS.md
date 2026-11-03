# Assessment setup

Phase 4.1, implemented locally on 29 October 2026. Migration 022 and the first Admin and Teacher checks are marked complete by the tester. The remaining hosted checks are listed below. Phase 4.2 now adds local roster freezing and raw draft marks. Review, publication and grade calculations are still ahead.

## Before opening the screen

The checklist records migration 022 as already applied in the dedicated School Portal project. Migrations 001–021 stay intact. No new environment variables, packages or accounts are needed. The migration creates assessment/version tables and checked planning RPCs only; it does not create fixtures or alter existing school records.

Use the existing School Admin or linked Teacher account. Assessments appears in those workspaces' sidebars, and its links retain the active mode. Student and Guardian modes have no assessment planning access, even when the same account also has a Teacher role.

## Plan an assessment

1. Open Assessments and choose Plan assessment.
2. Search for the teaching assignment. Admin can plan against school assignments; teachers see their own current or future assignments, not expired assignments.
3. Select a term from that assignment's academic year.
4. Enter the title, instructions and effective eligibility date. The date must fit the selected term, academic year and assignment.
5. Enter the proposed minimum, maximum and decimal places. No school grading formula or default weight is supplied. This slice supports nonnegative bounds up to 1,000,000,000 and 0–6 decimal places as technical input limits, not school assessment policy.
6. Admin may explicitly tick scale authorisation. Teachers can save a proposed scale but cannot authorise it.
7. Save and return to the list. The list shows the term/date, scale, authorisation state and definition version.

Future planning is supported. Changing an existing definition retains the previous version and creates another. Scale authorisation is specific to a version: Admin must explicitly authorise the new version, even if the edit only changes the title. Assignment stays fixed; create a separate assessment for another assignment. There is no delete or result-publication action in this slice.

If another person saves first, the stale save is rejected. Reload to inspect the latest version before entering changes again. If a network error makes the result uncertain, check the list before retrying creation so you do not accidentally create a duplicate assessment.

## Authorise a teacher’s saved scale

In the School Admin workspace, open **Assessments** and find the teacher’s proposal. Check the title, class, term, date, scale and version shown in the list, then choose **Authorise scale** beside **Awaiting Admin authorisation**. The list should show **Admin-authorised** with the version increased by one. If the teacher edited the proposal before you clicked, refresh and review the new scale before trying again.

## Files and responsibilities

| File | Purpose |
| --- | --- |
| `supabase/migrations/202610290022_assessment_setup.sql` | School-owned identities, retained definitions, Admin scale authorisation, assignment/term/date validation, RLS, bounded searches/list and audited save RPC. |
| `src/lib/assessment-validation.ts` | Validates form and reader values; builds explicit staff-mode links. |
| `src/lib/assessment-data.ts` | Server-only bounded reader using the signed-in database client. |
| `src/app/dashboard/assessments/actions.ts` | Verifies context and inputs for save/search; uses trusted school ID and handles failures without exposing database messages. |
| `src/components/assessment-form.tsx` | Searchable assignment/term form, Admin authorisation checkbox, pending/error/success feedback. Reuses RecordSearchSelect with scoped custom searches. |
| `src/components/assessment-panel.tsx` | Staff guard, bounded list, edit/new views and empty/error states. |
| `src/app/dashboard/page.tsx`, `src/components/portal-shell.tsx` | Existing dashboard integration and staff-only sidebar links. |
| `tests/assessment-database.test.ts` | Runs actual migration SQL in a disposable two-school database; checks retained versions, authorisation, date/term/scale errors, cross-school reads/writes and direct-write denial. |
| `tests/assessment-actions.test.ts` | Checks trusted school context, forged roles, invalid inputs, stale-save feedback and authentication redirects. |
| `tests/workspace-navigation.test.ts` | Checks explicit Teacher/Admin assessment links and no Guardian assessment link. |

No existing authorization policy was weakened. Direct writes to the new tables are denied for normal accounts. Definitions are readable only within permitted staff scope. Migration 023 locks ordinary definition edits once staff freeze the roster.

## Local verification - 30 October 2026

`npm.cmd run check` passed ESLint, TypeScript, all 553 tests in 59 files and production build. The full run included the new SQL/action tests and staff navigation regression. This does not establish hosted migration status or browser acceptance.

## Pending hosted checks

Use existing fictional accounts and structures. Do not create another school or person. Confirm usable assignments/terms first; do not move existing 2027 records simply to test today.

- [x] Apply migration 022 once; record the result.
- [x] Admin: create a fictional definition against an existing assignment/term with a valid effective date; authorise its explicitly fictional scale.
- [x] Teacher: see only permitted definitions and current/future assignment choices; save a proposal without authorisation.
- [x] Admin: authorise the teacher's saved version (tester reported completion on 3 November).
- [ ] Edit: confirm the definition version increases and fresh authorisation is required.
- [ ] Two tabs: save from one, then reject the stale save in the other without losing the first change.
- [ ] Future planning: a valid future assignment/date succeeds; invalid date/term combinations fail without changing data.
- [ ] Teacher/Guardian account: switching roles retains correct navigation; Guardian cannot open the staff feature or read its tables/RPCs directly.
- [ ] Student, Guardian, anonymous and School B: verify denied direct reads/writes using ordinary sessions, not SQL Editor owner access.
- [ ] Check assignment and term search, pagination, empty state, error feedback and mobile layout.

Keep hosted evidence separate from local tests. Remaining hosted checks are deferred. Review, publication, grading policies and report cards still need development.


## Academic term search returns no choices

Term search is scoped to the selected teaching assignment's academic year, not its displayed date range alone. An assignment does not create terms. Leave the search blank and click Search choices to list that year's existing terms. If none appear, inspect Academic setup for terms linked to that exact year before adding anything. Do not reuse terms from another year or change assignment dates to force a match.

On 30 October, the user reported an empty search for Geography / 12A - 2026 / 2026, dated 1 October–26 November. A targeted local regression confirmed blank and matching searches return the linked term, and an empty year returns no choices without inheriting another school's terms. All 19 assessment database tests passed. The hosted records were not inspected because both browser tools failed to initialise; missing 2026 terms remains a hypothesis until the live year/term links are checked. No application code or hosted data was changed for this investigation.

## Freeze a roster and enter raw marks

Migration 023 adds this workflow. The tester confirmed it has been applied to the dedicated Supabase project. It creates no school records on installation.

1. In the Admin or assigned Teacher workspace, open **Assessments → Roster and draft marks**. Preview shows the placements covering the assessment date. Opening the page saves nothing.
2. Once the school-local date reaches the assessment date and Admin has authorised the scale, choose **Freeze eligible roster**. This captures every page and locks the definition. Resolve conflicting placements before freezing.
3. Choose Scored and enter the raw mark (zero is valid if the scale allows it), Absent, Exempt with a reason, or Missing. Save before changing pages. Untouched learners remain as they were. If a colleague saves first, reload and re-enter your changes against the newer draft.
4. Staff can revisit saved drafts. Learners and guardians have no access. Admin placement amendments are covered below. Historical teacher grants, submission and publication are still ahead.

### Hosted checks to return to

- [x] Apply migration 023 (tester confirmed).
- [ ] Preview an existing fictional assessment and check the learner placements before deliberately freezing it.
- [ ] Check future-date and scale restrictions, freeze across pages, retained placement evidence and the locked definition.
- [ ] Save a partial page, reload, check zero and non-score states, and reject a stale save from another staff session.
- [ ] Verify direct API and table denials using anonymous, Student, Guardian and School B sessions. Recheck teacher access after an assignment ends.

## Correct a frozen draft roster

Migration 024 adds **Review roster changes** to a frozen assessment in the School Admin workspace. Use this when an enrolment correction changes who belonged in the class on the assessment date, or when its retained placement evidence needs updating.

Open the comparison, check the learner and the before/after dates, and enter a reason for that learner. Adding a learner starts their mark at Missing. Removing a learner takes them off the working register and retains their mark history. Updating placement evidence for an existing learner keeps their current mark. If another staff member saves marks or the placement changes after preview, reload before deciding again.

This screen uses the original assessment date and authorised scale. Changes to either need their own impact review. Before adding submission or publication, extend the amendment transaction to handle review and release invalidation.

- [x] Apply migration 024 once in the dedicated project.
- [ ] As School Admin, preview and apply a difference using fictional data. Check the affected learner, an unaffected learner and the reason in the amendment record.
- [ ] Verify a stale preview and an old mark-entry tab are rejected. Verify Teacher, Student, Guardian and School B sessions cannot apply the change.
