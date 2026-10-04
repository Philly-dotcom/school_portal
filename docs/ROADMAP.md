# Delivery roadmap

Updated 2026-10-03 after the architecture audit. This is the current status map; dated verification and resume entries are historical evidence, not instructions to reapply migrations.

## Current position

**Phase 2: Academic Setup**, with Phase 1 operational readiness still open. The user authorized development without email. No Phase 3 transition is approved by a local test result alone. Preserve the original six-phase product plan, one-school-first experience and school-aware ownership.

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
| Relationships and access | Guardian relationships, explicit child grants, versioned login links, dated role-scoped reads | Hosted verification of new grants/linking, suspension and cross-school denial. No teacher/student/guardian record screens yet. |
| Enrollment | Dated placement, history-preserving transfers/withdrawals and overlap protection | Hosted lifecycle and simultaneous-save tests, including future transfers. |
| Teaching assignments | Dated creation/listing | Safe correction and ending/replacement workflow is still missing; changing responsibilities must preserve history. |
| Timetable foundations | Admin creation/listing/filtering/removal with clash checks | Hosted removal/conflict/concurrency checks. Role-facing daily use belongs to Phase 3. |
| Capacity | Invitation pagination only; academic/register/teaching/timetable limits remain | Paginate required lists or explicitly accept a measured pilot capacity before declaring readiness. Related history lists also count toward limits. |

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

Finish this targeted consistency cleanup and local checks → agree the remaining acceptance/scope decisions → confirm a staging target and migration baseline → rehearse/test the current schema → complete the agreed Phase 2 gaps. Do not add attendance, homework, announcements or documents merely because foundation tests pass.

## Phase 3: daily operations

Attendance, usable timetable, homework viewing, announcements and private PDF documents. Basic learner and guardian dashboards. No homework submission feature.

## Phase 4: academic performance

Assessments, marks, designated review, School Admin publication, versioned reports and focused performance summaries. Confirm grading and reviewer policies before implementation.

## Phase 5: finance and communication

Charges, manually recorded payments/allocations and balances. Choose notification channels and implement delivery tracking/preferences. Online payment collection is a separate scope decision.

## Phase 6: optional smart features

Useful n8n automation and AI only after stable core workflows and evidence of need. No AI API usage is required by the foundation.

## Multi-school expansion

After the first school is stable: platform operator permissions, controlled school onboarding, school context selection where needed, tenant-specific settings, exports, quotas, support and commercial features. Re-test every data, file, notification, cache and analytics boundary before onboarding another real school.
