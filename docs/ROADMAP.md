# Delivery roadmap

## Phase 1: foundation

Local increment:
- [x] Project isolation and documented decisions.
- [x] Responsive application shell and explicitly labeled public preview.
- [x] Supabase session and password sign-in code, disconnected by default.
- [x] Active-membership protected workspace and admin settings code.
- [x] Foundation migration with RLS, restricted grants and audit events.
- [x] Two-school database boundary tests.
- [x] Local account management, invitation acceptance and recovery code, with security tests.

Still required before Phase 1 can be called complete:
- [x] Dedicated hosted project configured and migration applied (user-reported setup; connectivity independently checked on 2026-09-30).
- [x] Public sign-ups disabled; independently rechecked on 2026-09-30.
- [ ] Hosted sign-in, sign-out, session refresh and RLS integration checks.
- [ ] Apply the account-management migration and verify its member-management UI and audited role changes against hosted Supabase.
- [ ] Deploy the isolated invitation sender; configure SMTP/templates and verify invitation/recovery/acceptance flows end to end.
- [ ] Administrator MFA and account recovery procedures.
- [ ] Production settings, monitoring, backup/restore and access checks.
- [ ] School acceptance of the first workflow; no real learner data before readiness checks.

## Phase 2: academic setup

Authorized to proceed without email. Invitations/recovery stay disabled; Phase 1 delivery and readiness items remain open.

- [x] Local admin creation/listing of academic years, terms, grades, subjects and year-specific classes; migration, audit and boundary tests.
- [ ] Apply migration 003 and validate the signed-in hosted workflow. See `docs/ACADEMIC_SETUP.md`.
- [ ] Registers, guardian links, enrollment, teaching assignments, lifecycle edits and timetable structure.
- [x] Local student, teacher and guardian register creation/listing, guardian links and initial dated class enrollment, with administrator-only RLS and audit.
- [ ] Apply migration 004 and verify School registers in the hosted signed-in workflow. See `docs/SCHOOL_REGISTERS.md`.
- Migration 004 is now user-reported applied; register workflow testing is still pending.
- [x] Local teaching assignment creation/listing with dates, composite school/year relationships, RLS and audit.
- [ ] Apply migration 005 and verify Teaching assignments. See `docs/TEACHING_ASSIGNMENTS.md`.
- [ ] Record corrections, transfers/withdrawals, teaching assignments, pagination/imports and timetable foundations.

Students, teachers, guardians, grades, classes, subjects, academic years/terms, dated enrollment, teaching assignments and timetable foundations. CSV imports with validation. Each relationship requires school ownership and appropriate database constraints.

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
