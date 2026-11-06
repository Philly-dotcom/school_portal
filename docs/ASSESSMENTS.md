# Assessment setup

Phase 4.1 covers assessment definitions and scale authorisation. Phase 4.2 covers private draft marks, frozen roster amendments and historical teacher access. Phase 4.3 includes complete submissions and reviewer decisions. Migrations 022–030 are applied. Migration 029 is user-confirmed applied. The checklists below distinguish completed observations from outstanding hosted cases.

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
| `src/components/marks-panel.tsx`, `marks-form.tsx`, `src/lib/marks-validation.ts`, `src/app/dashboard/marks/actions.ts` | Read a roster, freeze eligible placements and save only changed draft marks. |
| `src/components/roster-amendment-panel.tsx`, `roster-amendment-form.tsx` | Show the Admin placement comparison and apply a reasoned amendment. |
| `src/components/correction-grant-panel.tsx`, `correction-grant-form.tsx`, `src/app/dashboard/marks/grant-actions.ts` | List, issue and revoke scoped historical draft access. |
| `src/components/frozen-definition-form.tsx`, `src/app/dashboard/marks/definition-actions.ts` | Preview a frozen date or scale change as School Admin and apply the reviewed proposal with a reason. |
| `tests/assessment-database.test.ts` | Runs actual migration SQL in a disposable two-school database; checks retained versions, authorisation, date/term/scale errors, cross-school reads/writes and direct-write denial. |
| `tests/assessment-actions.test.ts` | Checks trusted school context, forged roles, invalid inputs, stale-save feedback and authentication redirects. |
| `tests/workspace-navigation.test.ts` | Checks explicit Teacher/Admin assessment links and no Guardian assessment link. |

No existing authorization policy was weakened. Direct writes to the new tables are denied for normal accounts. Definitions are readable only within permitted staff scope. Migration 023 locks ordinary definition edits once staff freeze the roster.

## Local verification

See [VERIFICATION.md](VERIFICATION.md) for the evidence by slice.

## Pending hosted checks

Use existing fictional accounts and structures. Do not create another school or person. Confirm usable assignments/terms first; do not move existing 2027 records simply to test today.

- [x] Apply migration 022 once; record the result.
- [x] Admin: create a fictional definition against an existing assignment/term with a valid effective date; authorise its explicitly fictional scale.
- [x] Teacher: see only permitted definitions and current/future assignment choices; save a proposal without authorisation.
- [x] Admin: authorise the teacher's saved version (tester reported completion on 3 November).
- [x] Edit: confirm the definition version increases and fresh authorisation is required.
- [x] Two tabs: save from one, then reject the stale save in the other without losing the first change.
- [x] An effective date outside the selected assignment and term was rejected without changing the saved date.
- [x] Verify creation against an eligible future-year assignment and term.
- [ ] Teacher/Guardian account: switching roles retains correct navigation; Guardian cannot open the staff feature or read its tables/RPCs directly.
- [ ] Student, Guardian, anonymous and School B: verify denied direct reads/writes using ordinary sessions, not SQL Editor owner access.
- [ ] Check remaining assignment/term search cases, pagination, empty state, error feedback and mobile layout.

Keep hosted evidence separate from local tests. Remaining hosted checks are deferred. Review, publication, grading policies and report cards still need development.


## Academic term search returns no choices

Term search is scoped to the selected teaching assignment's academic year, not its displayed date range alone. An assignment does not create terms. Leave the search blank and click Search choices to list that year's existing terms. If none appear, inspect Academic setup for terms linked to that exact year before adding anything. Do not reuse terms from another year or change assignment dates to force a match.

The blank search for Geography / 12A – 2026 returned Term 4, linked to that assignment’s academic year.

## Freeze a roster and enter raw marks

Migration 023 adds this workflow. The tester confirmed it has been applied to the dedicated Supabase project. It creates no school records on installation.

1. In the Admin or assigned Teacher workspace, open **Assessments → Roster and draft marks**. Preview shows the placements covering the assessment date. Opening the page saves nothing.
2. Once the school-local date reaches the assessment date and Admin has authorised the scale, choose **Freeze eligible roster**. This captures every page and locks the definition. Resolve conflicting placements before freezing.
3. Choose Scored and enter the raw mark (zero is valid if the scale allows it), Absent, Exempt with a reason, or Missing. Save before changing pages. Untouched learners remain as they were. If a colleague saves first, reload and re-enter your changes against the newer draft.
4. Staff can revisit saved drafts. Learners and guardians have no access. Admin placement amendments are covered below. Historical teacher grants are covered below. Submission and publication are still ahead.

### Hosted checks to return to

- [x] Apply migration 023 (tester confirmed).
- [x] Preview an existing fictional assessment and check the learner placements before deliberately freezing it.
- [x] A future-dated roster could be previewed with freezing disabled. An eligible four-learner roster froze successfully.
- [ ] Verify the unauthorised-scale restriction, multi-page freeze, retained placement evidence and locked definition.
- [x] A partial save showed scored zero, Absent, Exempt with a reason and an untouched Missing learner in the saved revision.
- [ ] Verify the saved states after an independent reload and check that saving one page preserves another.
- [ ] Verify direct API and table denials using anonymous, Student, Guardian and School B sessions. Recheck teacher access after an assignment ends.

## Correct a frozen draft roster

Migration 024 adds **Review roster changes** to a frozen assessment in the School Admin workspace. Use this when an enrolment correction changes who belonged in the class on the assessment date, or when its retained placement evidence needs updating.

Open the comparison, check the learner and the before/after dates, and enter a reason for that learner. Adding a learner starts their mark at Missing. Removing a learner takes them off the working register and retains their mark history. Updating placement evidence for an existing learner keeps their current mark. If another staff member saves marks or the placement changes after preview, reload before deciding again.

This screen compares placements using the saved assessment date and authorised scale. For date or scale changes, use the separate amendment form below. Migration 028 supersedes pending or approved submissions within the amendment transaction. Release invalidation belongs to the publication step.

- [x] Apply migration 024 once in the dedicated project.
- [ ] As School Admin, preview and apply a difference using fictional data. Check the affected learner, an unaffected learner and the reason in the amendment record.
- [ ] Verify a stale preview and an old mark-entry tab are rejected. Verify Teacher, Student, Guardian and School B sessions cannot apply the change.

## Historical teacher access to draft marks

On a frozen assessment, School Admin opens **Manage historical correction access**. Choose a linked teacher, select one learner or explicitly select the whole assessment, then enter the first and last school-local dates and the reason. A learner-specific grant must name an active member of that frozen roster. Overlapping grants for the same scope are rejected. Use Revoke access to end a grant early.

The teacher opens **Assessments → My historical correction access**. A learner-specific grant exposes only that learner when the teacher has no ordinary entry rights. Existing assignment rights continue to apply. An expired or revoked grant cannot authorise another save from an open tab. Submission, review and publication are separate workflows.

If a tab reports a version conflict, reload the saved record before re-entering changes. A slow mark save offers a reload option after eight seconds. If the database request times out, check the saved revision and values before retrying.

- [x] Migration 025 applied in the dedicated Supabase project.
- [x] Verify single-learner and whole-assessment grants with an existing teacher outside ordinary entry scope. Revoke a grant while the teacher has the draft open and verify the next save is denied.
- [x] Verify the updated conflict feedback in independent sessions and confirm an older mark form leaves the newer saved revision intact.

## Amend a frozen assessment date or scale

Migration 026 adds this Admin workflow to **Assessments → Roster and draft marks → Amend frozen date or scale**. Enter the proposed date, minimum, maximum and decimal places. The date must fit the retained assignment, academic year and term, and cannot be later than today at the school.

Choose **Preview impact**. The comparison covers every affected learner, in pages of 25. Changing only the scale keeps the frozen roster. Changing the date uses the placements valid on that date. A newly eligible learner starts at Missing. Removing a learner retains their earlier mark history. If any retained score falls outside the proposed scale or would require rounding, or if no learner would remain eligible, the database blocks the amendment.

After reviewing the proposal, enter the reason and choose **Authorise scale and apply amendment**. The database checks the preview again and saves the related definition, roster, marks history and audit changes in one transaction. If a placement or draft changed after preview, open a fresh comparison. Results remain private drafts.

- [x] Migration 026 applied in the dedicated project (confirmed 4 November).
- [x] As Admin, compare a date change and a scale-only change against the existing fictional roster. Verify incompatible scores block the change and compare the saved revision and history after an authorised amendment.
- [ ] Verify a stale preview is rejected in a separate session, and check denied reads and writes for non-Admin and other-school accounts.

## Assign an assessment reviewer

In the School Admin workspace, open **Assessments**, choose an assessment title, then open **Reviewer access for this scope**. The assessment supplies the school, academic year, term, class and subject. The grant applies to other assessments in that same scope too. Choose an active Teacher or School Admin account. An Admin who will review their own work needs an explicit grant. Dates are inclusive in the school timezone. If both fields are blank, the grant has no date limit.

Choose **Manage assessment reviewer grants** on the assessment list to see current and upcoming grants or revoke one. The database retains the issuer, revoker and timestamps. A grant alone does not open draft marks or publish results. With migration 028, the reviewer opens submitted work through **Assessment reviews**.

- [x] Migration 027 applied in the dedicated project (confirmed 4 November).
- [ ] Using fictional staff, check scope, an overlapping grant, self-grant, revocation and denial to non-Admin and other-school sessions. Keep existing Phase 4.2 cases open until verified.

## Submit and review a complete roster

Migration 028 adds submission and review. Save the marks, then choose **Submit for review** beneath the roster pages. Every active learner must have a score, Absent or Exempt state. Missing on any page blocks submission. A valid historical correction grant also permits submission. It still grants access only to the permitted draft learners.

Each submission retains the complete roster, placement evidence, assessment definition, scale and exact mark versions. The wider reporting policy is still awaiting implementation and school input. Official publication will require that approved policy.

An authorised reviewer opens **Assessments → Assessment reviews**, chooses a submission and checks every roster page. The screen shows changes from the previous submission. Choose Approve or Return for correction. Returning requires a reason. Reviewers need a matching current grant, including when reviewing their own work. Access is checked again when the decision is saved.

The author sees the latest review status and return reason below the saved marks. Changing marks, placements, dates or scales supersedes any pending or approved package in the same transaction. The old submission and review decision stay in history. Submit the new complete roster for another review. A stale submission or decision is rejected. Later reviewer-grant expiry or revocation blocks further review access but retains a completed approval as evidence.

Publication, learner results and report cards remain outstanding. Approval alone does not make marks visible to learners or guardians.

### Files added for submission and review

| File | Responsibility |
| --- | --- |
| `supabase/migrations/202611040028_assessment_review.sql` | Private submission snapshots, review decisions, scoped RPCs and atomic review invalidation on roster updates. |
| `src/app/dashboard/marks/review-actions.ts` | Validates forms and active staff mode, uses the server school context, invokes the RPC and returns save feedback. |
| `src/components/assessment-review-form.tsx` | Submission and decision forms with pending feedback. |
| `src/components/assessment-review-panel.tsx` | Paged reviewer list and retained submission details. |

The existing assessment panel routes review links within the staff workspace. The marks panel shows submission status alongside the saved roster. Database, action and panel regression cases remain in the existing assessment test files.

### Hosted acceptance for migration 028

- [x] Migration 028 applied in the dedicated project (user-confirmed).
- [ ] Use the existing fictional assessment. Verify Missing on a later page blocks submission, then save valid dispositions and confirm the full saved roster is submitted.
- [ ] Open the review list in an independently authenticated reviewer session. Verify exact scores, exemption reasons, version details and pagination. Check staff without a reviewer grant cannot open or decide the submission, including School Admin without an explicit grant.
- [ ] Return with a reason and verify the author sees it. Correct and resubmit. Approve that submission and confirm learners and guardians still cannot see it.
- [ ] Keep a review open in one session while another saves marks or amends the roster/date/scale. The old review must become superseded and its decision must be rejected. Check retained snapshots and audit history.
- [x] Revoke or expire the review grant while its screen is open. Reads and new decisions must fail. Verify a completed approval is retained after later revocation.
- [ ] Test double-submit, return/resubmit with an old form, and two concurrent reviewer decisions through independent PostgreSQL/browser sessions. Only one valid transition should succeed.
- [ ] Verify anonymous, Student, Guardian mode and School B direct table/RPC reads and writes are denied. Reuse existing people and schools.

## Prepare the school's reporting policy

The school rules are still being gathered. The user asked for policy setup to be prepared while they complete testing. Migration 029 adds draft records only. It leaves policy approval, supported calculation configuration and result publication pending.

As School Admin, open **Assessments → Reporting policy drafts → New policy draft**. Choose the existing academic year, grade and subject. Enter a title and effective dates within that academic year. Future-year preparation is supported.

Record the source document's title, version/date and location when available. The school-rules field can hold supplied rules and outstanding questions. Source and rules can be blank while drafting. Collect the score scales, required components, weights, rounding stages, bands, absence/exemption treatment and replacement/exclusion rules. The text is retained as reference material; it is not interpreted as a formula.

Save, then open the saved policy and history. The year, grade and subject stay fixed on that record. Use a separate draft for another scope. Editing the title, dates, source or rules creates a retained version. An unchanged save does not create a redundant version. A repeated create request from the same form does not duplicate the draft. If a save is interrupted, check the policy list before opening a new form.

Drafts can coexist for the same scope while the school compares proposals. Supported configuration and approval must later enforce unambiguous applicability. Saving this draft grants no approval to assessment submissions and changes no result visibility. Policy adoption will require a fresh review package before official publication.

### Policy setup files

| File | Responsibility |
| --- | --- |
| `supabase/migrations/202611040029_grading_policy_drafts.sql` | Scoped policy identities, retained draft versions, Admin-only RPCs, school/year validation and audit records. |
| `src/lib/grading-policy-validation.ts` | Input and response validation, shared record type and Admin navigation links. |
| `src/app/dashboard/assessments/policy-actions.ts` | Checks the server's Admin context and sends validated saves using the user's database session. |
| `src/components/grading-policy-form.tsx` | Existing record-search controls, policy fields, stable create identity and save feedback. |
| `src/components/grading-policy-panel.tsx` | Paged draft list and history within the existing Assessments workspace. |

### Hosted acceptance for migration 029

- [x] Migration 029 applied in the dedicated project (user-confirmed).
- [x] As School Admin, create a fictional draft using an existing year, grade and subject. Confirm the saved scope and dates. Leave source/rules blank initially, then add them and verify both retained versions.
- [ ] Check future-year planning and rejection of dates outside the selected year. Verify another school's IDs cannot be used in the draft through direct RPC calls.
- [ ] Open the same version in two tabs. Save the first, then confirm the second gets a conflict and cannot overwrite the first. Confirm an unchanged save and retry of the same create request do not add duplicate versions or drafts.
- [ ] Confirm Teacher, Student, Guardian and School B sessions cannot read or change School A policy drafts through routes, RPCs or direct table requests. Check anonymous denial too.
- [ ] Confirm history and list pagination retain Admin mode. Check multi-role accounts cannot enter policy setup through Teacher/Guardian mode or a selected-learner URL.
- [ ] Confirm saving a policy draft leaves assessment approvals, learner results and publication availability unchanged.

## Invalidate a disputed approval

Migration 030 adds the Admin action agreed in the academic decisions. Open **Assessments → Roster and draft marks → Review status** for the current approved submission, then expand **Dispute this approval**. Enter a reason and choose **Invalidate approval and require review**. Opening the form alone changes nothing.

This action is for a dispute about the approval itself. An Admin can invalidate the approval without having a reviewer grant. The original decision, reviewer and submitted snapshot remain in history. A separate invalidation record retains the Admin, time and reason. Staff see the invalidated status and reason, and can submit the complete saved roster for a fresh review. Another approval still requires an explicit reviewer grant.

Only the current approved package can be invalidated. Duplicate actions, older tabs and packages already superseded by mark or roster changes are rejected. The status, invalidation record and audit entry commit together. A failed audit leaves the approval intact.

On the review page, expand the submitted details for a learner to see the retained mark version, enrolment version and enrolment dates. The first submission shows the starting roster. Later submissions show the changes since the previous one.

The action reuses the existing review server action and forms. `src/components/marks-panel.tsx` shows the Admin control and permits resubmission after invalidation. `src/components/assessment-review-panel.tsx` shows the retained original review reason and the separate invalidation reason to authorised reviewers. The new table and RPC are in `supabase/migrations/202611040030_assessment_approval_invalidation.sql`.

Publication is still pending. When publication and reports are introduced, their dependent visibility must be invalidated in this same transaction before the feature is enabled for published work.

### Hosted acceptance for migration 030

- [x] Migration 030 applied in the dedicated project (confirmed 6 November).
- [x] Use an existing fictional approved submission. As School Admin, open and close the dispute form without saving, then confirm approval remains intact.
- [x] Invalidate with a reason and confirm the status and reason survive reload. Check that the original approval and its reviewer remain in history, alongside the separate invalidation record and audit entry.
- [ ] Confirm blank reasons are rejected. Verify Teacher, Student, Guardian, anonymous and School B requests cannot invalidate School A approvals or directly mutate invalidation records.
- [x] Submit the unchanged or corrected complete roster again and obtain a fresh review. Confirm the old invalidation form cannot affect this newer submission.
- [ ] Using separate sessions, check simultaneous invalidation attempts and a mark save racing with invalidation. A stale operation must be rejected without changing the newer state.
- [ ] Confirm an Admin without a reviewer grant can invalidate, while approval of the replacement submission still requires an explicit grant.

### School A browser run — 6 November 2026

The TEST ONLY draft-marks roster has four learners on one page. A Missing mark blocked submission. After saving and reloading, the roster showed scored zero, absent, exempt with the original reason, and the new fictional score of 72. Submission 1 was returned with a reason visible to the author. Changing 72 to 73 produced submission 2 with exactly one changed learner. The reviewer could expand the saved mark version, enrolment version and dates.

The Admin used a reviewer grant for 6 November only, scoped to Geography / 12A / Term 4 / 2026. Opening and closing the dispute form kept submission 2 approved after reload. The browser required a reason. Invalidation survived reload, and the review detail retained the original decision reason and the separate invalidation reason. After fresh approval of submission 3, an old submission 2 dispute form was rejected. Revoking the grant removed it from the grant list and left submission 3 approved. Admin then invalidated it without a reviewer grant and resubmitted. Submission 4 is pending; the Admin review queue is empty. Direct API denial, audit-row inspection and independent-session races remain separate checks.

Policy fixture: TEST ONLY — School A browser check, Grade 12 Geography, 1–15 February 2027. An out-of-year date was rejected. A valid draft saved with empty source/rules and retained versions 1 and 2 after adding fictional text. A stale second tab was denied. After the rejected create, input fields cleared while the search widgets still displayed their earlier “Selected” labels. Re-select choices before retrying. No school reporting rules were approved.
In the School A Teacher/Guardian session, Teacher mode showed an empty reviewer queue, rejected the Admin policy link and withheld the Geography roster from the English teacher. Switching to Guardian required an explicit learner choice. With the linked learner selected, both staff marks and policy URLs showed a staff-only message. After sign-out, both protected URLs redirected to login. These are route checks only.
The independently signed-in School A Student had no Assessments navigation link. Opening the policy, marks and review-detail routes in Student mode showed the staff-only message each time. No scores, drafts or reviewer notes appeared.

### School A follow-up — independent Admin and Teacher sessions, 6 November

- Admin used the in-app browser and Olereko used Teacher mode in Brave. A grant limited to Geography / 12A / Term 4 today let the Teacher open submission 4. An Admin mark edit superseded it. The stale approval failed, and the retained package still showed 73. Admin revoked the reviewer grant while submission 5 was open. The Teacher could neither decide from that form nor reload the review. Earlier completed approvals still had retained reviewer records after revocation.
- Historical correction access showed only ST-002 with a single-learner grant, then all four learners with the whole-roster grant. A Teacher save raced ahead of confirmed revocation in the first attempt and persisted 75. In the independent stale-save test, Admin saved 76 and the older Teacher form attempting 77 got the reload warning. With the whole-roster form open, Admin revoked access and confirmed the grant list was empty before the Teacher tried 78. The save failed, 76 remained and a new Teacher read was blocked. All temporary grants from this run were revoked.
- Admin saved a fictional Geography / 12A / term 1 definition for 1 February 2027. Its scale is awaiting authorisation. For the existing 2026 fixture, a proposed maximum of 50 flagged the retained 76 and blocked application. The approved date-only amendment moved the assessment from 3 to 4 November with all four placements retained. A stale preview in a second Admin tab was rejected. The amendment history showed definition 2, draft 8, the supplied reason and matching audit event. Submission 7 is pending. The placement-difference screen showed no differences before this amendment. No enrolments were changed.
- A read-only SQL lookup scoped to this School A fixture confirmed original approvals, populated reviewer identities, separate invalidations and matching actor audit events for packages 2 and 3. This lookup verifies history only.
- Direct hosted anonymous probes with the public project key and no login returned HTTP 401 / PostgreSQL 42501 for reads and insert attempts on assessments, rosters, mark versions, submissions, submission entries, review decisions, review invalidations, grading policies and policy versions. The same denial came from the review-list, policy-list and approval-invalidation RPCs. Authenticated direct API checks remain separate.
- An unchanged policy save left versions 1 and 2 after reload. Identical create-request replay remains open. The school dashboard showed five registered learners, below the 26 needed for multi-page roster checks. School B was skipped.
