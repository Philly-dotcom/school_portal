> Historical snapshot taken before the 25 October 2026 documentation reconciliation. Pending work and test totals below describe an earlier revision. Use the current project documentation for status.

# Delivery roadmap

Updated 24 October 2026. Older dated reports describe earlier work; they are not instructions to repeat setup.

## Current position

You have confirmed applying migrations through 021 and completing 13 hosted document checks. The document School B isolation check remains deferred because that school is not registered. We are in Phase 3; the remaining module tests, known defects and daily dashboard completion/redesign are tracked in [DOCUMENTS.md](../../../../docs/DOCUMENTS.md#remaining-phase-3-checklist). Do not repeat applied migrations or completed document checks.

**Phase 3: Daily Operations**, with Phase 1 live readiness and parts of Phase 2 acceptance still open. The move into Phase 3 was explicitly authorized by the user; it did not close those earlier checks. Preserve the original six-phase plan, one-school-first experience and school-aware ownership.

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
| Academic structure | Years, terms, grades, subjects, classes; versioned name corrections | Verify correction workflows and decide how required date/relationship mistakes should be handled; name editing does not change those fields. |
| School registers | Students, teachers, guardians; name/reference corrections | Verify corrections and capacity behavior in the intended school dataset. |
| Relationships and access | Guardian relationships, explicit child grants, versioned login links, dated role-scoped reads | Hosted verification of grants/linking, suspension and cross-school denial. Role workspaces now exist in Phase 3. |
| Enrollment | Dated placement, history-preserving transfers/withdrawals and overlap protection | Hosted lifecycle and simultaneous-save tests, including future transfers. |
| Teaching assignments | Dated creation/listing and versioned end/replacement with retained history; 014 application and testing user-confirmed | Subject/class/start-date corrections remain outside this editor; timetable changes must be reviewed separately. |
| Timetable foundations | Admin creation/listing/filtering/removal with clash checks | Hosted removal/conflict/concurrency checks. Role-facing daily use belongs to Phase 3. |
| Capacity | All Phase 2 display lists have pagination; academic, teaching, guardian-link, enrollment, account-link and timetable choices are searchable | 015 and 016 application is user-confirmed. Newer browser checks remain outstanding. |

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

The planned Phase 2 search conversions are implemented and migrations 015–016 are confirmed applied. Correction scope and acceptance checks remain recorded above while user-authorized Phase 3 development continues. The user is now working through the remaining browser checks.

## Phase 3: daily operations

Built: role workspaces and child selection, current-week personal timetables (017), daily attendance and permitted history (018), and view-only homework with draft/publication/withdrawal (019). Migrations 017–019 are user-confirmed applied, and the user reports homework working. Remaining tests are in progress. Homework uses the original-publication enrollment audience, not current-class access. No learner submissions were added.

Announcements and Documents are implemented, with migrations 020 and 021 user-confirmed applied. Both modules are linked from the dashboard sidebar and role overview. The user's completed document checks are recorded in DOCUMENTS.md; remaining announcement and other module checks stay separate. Read-only profiles now exist for all four roles.

Remaining: complete the combined Phase 3 checklist, resolve reproduced defects, verify hosted cross-school isolation once the test setup is agreed, then accept the implemented daily-dashboard UI against its new role/browser checklist. No Phase 4 work starts merely because the local modules are present. See RESUME.md for the checkpoint and DOCUMENTS.md for the working checklist.

## Phase 4: academic performance

Assessments, marks, designated review, School Admin publication, versioned reports and focused performance summaries. Confirm grading and reviewer policies before implementation.

## Phase 5: finance and communication

Charges, manually recorded payments/allocations and balances. Choose notification channels and implement delivery tracking/preferences. Online payment collection is a separate scope decision.

## Phase 6: optional smart features

Useful n8n automation and AI only after stable core workflows and evidence of need. No AI API usage is required by the foundation.

## Multi-school expansion

After the first school is stable: platform operator permissions, controlled school onboarding, school context selection where needed, tenant-specific settings, exports, quotas, support and commercial features. Re-test every data, file, notification, cache and analytics boundary before onboarding another real school.
