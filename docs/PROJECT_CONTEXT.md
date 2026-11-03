# School Portal: agreed context

Authoritative location: `C:\Users\moses\Documents\School_portal`.

School Portal is completely isolated from the user's other projects. No architecture, files, credentials, schema, features or decisions may be copied from those projects by assumption.

## Authorization and current stage

Phase 3 was signed off on 27 October 2026, including the remaining School B and REVIEW-01/02 browser checks reported by the user. Migrations through 021 are user-confirmed applied. The last full local check passed lint, TypeScript, 553 tests in 59 files and production build on 30 October.

Phase 4.1 assessment planning is implemented locally; migration 022 and hosted acceptance are pending. Marks, review/publication and report cards remain unimplemented. See [ASSESSMENTS.md](ASSESSMENTS.md). Use [PHASE_4_PLAN.md](PHASE_4_PLAN.md) and the reconciled [academic decisions](PHASE_4_ACADEMIC_DECISIONS.md), including the permission matrix in Section 10. Session inactivity/logout proposals are on hold until Phase 6. Email delivery remains off; public deployment and additional cloud resources are not authorised by this update.

At the user's request, superseded guides are now archived, including the temporary Phase 3 implementation guide. Use RESUME.md, VERIFICATION.md and the current checklist for progress; archived instructions are historical reference.

## Product strategy

Build a good portal for one school, then consider additional schools after the first school is stable. Use school-aware data ownership and relationships now, without building the SaaS business platform.

Roles: School Admin, Teacher, Student, Parent/Guardian. Platform Super Admin is future scope. Login identities are separate from memberships and learner records. Memberships may hold multiple roles.

## Confirmed decisions

- Profiles live at the top right for every role, with identity, active role and Sign Out. Only multi-role accounts get Switch Workspace.
- At the normal post-login entry, multi-role accounts choose an authorised workspace; single-role accounts open directly. Switching retains the session, starts at the selected overview and requires a new explicit Guardian learner selection.


- School Admin publishes results after review by a specifically authorised teacher or Admin. Self-review is allowed (confirmed 27 October).
- Editing an approved result requires another review and immediately hides affected published results. Only School Admin republishes after approval; review approval itself does not publish.
- Session inactivity/logout and maximum-session proposals are deferred to Phase 6; proposed durations are not approved settings.
- Homework is posted for learners to view. There are no learner submissions.
- Admin and teachers with current assignment access can publish homework directly, without an extra approval step. Authorship does not preserve editing rights after an assignment ends.
- Homework is visible only to learners whose dated enrollment covers its original publication date, plus guardians with current explicit access to those learners. Later joiners do not inherit older work. Editing and republishing do not reset the audience date. Eligibility follows the recorded enrollment history; correcting that history can change eligibility.
- Attendance uses one daily class register. Assigned teachers mark today only; School Admin can enter or correct older dates with a reason. Teachers read past registers only where their current assignment also covered the requested date.
- Documents are PDF only initially.
- The standalone Documents library allows Admin to upload school-wide or class PDFs and current teachers to upload class PDFs. Students and explicitly authorized guardians download only. Class documents follow current enrollment, like announcements. Homework attachments are postponed because their audience rules differ. The initial implementation uses a 2 MiB file limit and staff-only drafts before publication.
- Announcements: Admin publishes school-wide or class notices; currently assigned teachers publish directly to their classes. Published class notices follow current enrollment, so newcomers see earlier notices and leavers lose access. Guardians always need an explicit learner grant. These rules were confirmed on 8 October before implementation.
- External notification channels will be chosen later. Authentication delivery must be agreed before invitations/recovery are released.
- The user is open to testing isolation using fictional School A and School B.

## Recommendations awaiting decisions before their module is built

- Actual school-approved weights/formulas, rounding, bands and absent/exempt calculation treatment remain required. Reviewer scope, review/publication unit, dated eligibility and distinct score states are settled in the academic decision record.
- File scanning and retention/physical cleanup procedures before live school use; homework attachments remain outside the current library.
- Exact grading, report layout, fee policy, school identity and account provisioning conventions.

No real school name, logo, person, student record or statistic is invented by the preview.
