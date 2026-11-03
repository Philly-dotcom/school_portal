# Delivery roadmap

Updated 27 October 2026. Older dated reports describe earlier work; they are not instructions to repeat setup.

## Current position

**Phase 3 is complete and signed off on 27 October. Phase 4.1 assessment planning is now implemented locally; migration 022 and hosted checks are pending.** Migrations through 021 remain user-confirmed applied. All remaining Phase 3 hosted/browser checks, including School B isolation and REVIEW-01/02, are user-reported complete. The latest full local check passed lint, TypeScript, 553 tests in 59 files and production build on 30 October.

Use [PHASE_4_PLAN.md](PHASE_4_PLAN.md) for the next steps and open grading decisions. Do not repeat completed setup or migrations. Production readiness, including live email/recovery, backup/restore and deployment, is a separate gate.

## Phase 1: foundation

Implemented locally: application shell/public preview, Supabase authentication, active memberships and roles, protected admin settings, account management, explicit invitation acceptance/recovery, RLS, audit and synthetic two-school tests. Password/session error handling and invitation delivery controls were hardened during the repair pass.

Evidence already recorded: dedicated hosted project and admin login/settings success; the user reported applying account management and seeing their admin. Connectivity and disabled public signup were independently checked in September. This does not establish current hosted configuration or completion of every account workflow.

Still open before live use:
- Hosted sign-out, session refresh, role/status changes and audit verification; denied reads AND writes through real sessions for both fictional schools.
- Invitation/recovery delivery and acceptance testing after domain, SMTP, redirects and templates are ready. Keep delivery disabled meanwhile.
- Administrator recovery/security policy, including the previously recommended MFA enforcement; no MFA expansion in this cleanup.
- Deployment settings, monitoring, backup/restore rehearsal and school acceptance before real learner data.

## Phase 2: academic setup

| Area | Local implementation | Remaining work / evidence |
| --- | --- | --- |
| Academic structure | Years, terms, grades, subjects, classes; versioned name corrections | Retain recorded correction tests; decide how required date/relationship mistakes should be handled; name editing does not change those fields. |
| School registers | Students, teachers, guardians; name/reference corrections | Verify corrections and capacity behavior in the intended school dataset. |
| Relationships and access | Guardian relationships, explicit child grants, versioned login links, dated role-scoped reads | Relevant role/grant checks have user-reported passes in P3-01–P3-06; cross-school and latest navigation checks are now user-reported passed in Phase 3. |
| Enrollment | Dated placement, history-preserving transfers/withdrawals and overlap protection | Retain recorded lifecycle and future-transfer passes. Any standalone enrolment concurrency case without its own evidence remains unverified; do not infer it from attendance conflict tests. |
| Teaching assignments | Dated creation/listing and versioned end/replacement with retained history; 014 application and testing user-confirmed | Subject/class/start-date corrections remain outside this editor; timetable changes must be reviewed separately. |
| Timetable foundations | Admin creation/listing/filtering/removal with clash checks | P3-07–P3-10 are user-reported passed; keep those results. Role-facing timetable views are implemented in Phase 3. |
| Capacity | All Phase 2 display lists have pagination; academic, teaching, guardian-link, enrollment, account-link and timetable choices are searchable | 015 and 016 application is user-confirmed. Use recorded case results; do not infer a fresh outstanding test from an older guide. |

Existing hosted evidence: the user tested academic setup, school registers and teaching assignments. Later synthetic admin creation workflows, including timetable lessons, were exercised in the connected app. Those checks do not prove all hosted policies, edits or concurrent operations.

Migration status (user update 2026-10-03): the user reports 010–012 ran successfully and confirms the preceding enrollment migration ("090", interpreted as 009). The project contains only prior fictional test data. Do not reapply these migrations. Exact schema, grants, RLS and hosted workflows still require independent verification; success in the SQL editor alone does not close those checks.

### Phase 2 completion criteria

These are proposed acceptance criteria for the existing scope, not approval to build additional features:
1. Admins can set up the academic structure and registers, correct agreed fields, link logins and deliberately grant guardian access.
2. Enrollment and teaching responsibility changes have an agreed, tested history-preserving workflow; no silent overwriting of past ownership.
3. Timetable foundations enforce class/teacher conflicts and preserve related records.
4. Representative fictional data stays manageable within the agreed pilot size; limits cannot hide required choices or block normal work unexpectedly.
5. The final migration chain, real-session school isolation, stale updates and concurrent saves pass staging verification; the user reviews the workflows.
6. Remaining Phase 1 live-readiness gates are explicitly recorded. Email may remain off during development, but live account delivery/recovery cannot be declared complete.

Academic CSV imports are **optional and undecided**. They appeared in an expanded written roadmap, not the original Phase 2 list. Do not implement them or make them a completion blocker without user agreement. Bulk account invitations are a separate existing feature, not academic imports.

### Next sequence

The planned Phase 2 search conversions are implemented and migrations 015–016 are confirmed applied. Correction scope and acceptance checks remain recorded above as historical scope boundaries. Phase 3 is now signed off; the latest full code check passed all 524 tests and production build.

## Phase 3: daily operations

Built: role workspaces and child selection, current-week personal timetables (017), daily attendance and permitted history (018), and view-only homework with draft/publication/withdrawal (019). Migrations 017–019 are user-confirmed applied, and the user reports homework working. P3-01–P3-30 are user-reported passed; latest navigation regressions and cross-school isolation were subsequently user-reported passed. Homework uses the original-publication enrollment audience, not current-class access. No learner submissions were added.

Announcements and Documents are implemented, with migrations 020 and 021 user-confirmed applied. Both modules are linked from the dashboard sidebar and role overview. The user's completed document checks are recorded in DOCUMENTS.md; the recorded module passes should not be reset by older guide wording. Shared top-right profiles and a multi-role workspace chooser now exist for all four roles.

Signed off by the user on 27 October, including the final REVIEW-01/02 browser checks. Keep DOCUMENTS.md as the acceptance record; do not reset passed cases.

## Phase 4: academic performance

Assessment setup is implemented locally; see [ASSESSMENTS.md](ASSESSMENTS.md) for the unapplied migration 022 and hosted checks. Continue in order: assessment setup, mark entry, review/Admin publication, learner/Guardian results, versioned report cards, then focused summaries. See [PHASE_4_PLAN.md](PHASE_4_PLAN.md). Specifically authorised teachers or Admins may review, and self-review is allowed. Only Admin publishes. Editing approved results requires fresh review and hides affected published results until reviewed and explicitly republished by Admin. Reviewer scope, roster publication, eligibility and correction rules are settled in [PHASE_4_ACADEMIC_DECISIONS.md](PHASE_4_ACADEMIC_DECISIONS.md), including its permission matrix. Actual school grading formulas/values and final report-layout details remain outstanding. Marks and later slices have not begun.

## Phase 5: finance and communication

Charges, manually recorded payments/allocations and balances. Choose notification channels and implement delivery tracking/preferences. Online payment collection is a separate scope decision.

## Phase 6: optional smart features

Useful n8n automation and AI only after stable core workflows and evidence of need. No AI API usage is required by the foundation.

**Deferred session controls:** the user moved inactivity warnings/logout and maximum-session lifetime planning here on 27 October. Proposed 30-minute inactivity, two-minute warning and 12-hour maximum durations are not approved settings. Revisit server enforcement, hosted plan support, multi-tab behavior and unsaved work before implementation. Existing session handling stays unchanged.

## Multi-school expansion

After the first school is stable: platform operator permissions, controlled school onboarding, school context selection where needed, tenant-specific settings, exports, quotas, support and commercial features. Re-test every data, file, notification, cache and analytics boundary before onboarding another real school.
