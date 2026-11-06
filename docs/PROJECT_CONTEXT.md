# School Portal: agreed context

Authoritative location: `C:\Users\moses\Documents\School_portal`.

School Portal is completely isolated from the user's other projects. No architecture, files, credentials, schema, features or decisions may be copied from those projects by assumption.

## Authorization and current stage

Phase 3 was signed off on 27 October, including the reported School B and REVIEW-01/02 checks. The dedicated project has migrations 001–030. Use [VERIFICATION.md](VERIFICATION.md) for test evidence.

Phase 4.3 submission and review are implemented locally in migration 028, now user-confirmed applied. Staff can plan assessments, enter private marks on frozen rosters, amend placements, submit complete saved rosters and review them with explicit permission. Phase 4 hosted checks remain open. See [ASSESSMENTS.md](ASSESSMENTS.md), [PHASE_4_PLAN.md](PHASE_4_PLAN.md) and the [academic decisions](PHASE_4_ACADEMIC_DECISIONS.md). Publication and report cards remain planned. Session controls stay in Phase 6 and email delivery remains off.

At the user's request, superseded guides are now archived, including the temporary Phase 3 implementation guide. Use RESUME.md, VERIFICATION.md and the current checklist for progress; archived instructions are historical reference.

The user confirmed on 4 November that the first school reporting policy is not ready and requested setup meanwhile. Migration 029 is now user-confirmed applied. Numerical rules, supported configuration and policy approval remain open. The Subject Workspace idea is on hold. Migration 030 implements reasoned Admin invalidation of a disputed current approval and is user-confirmed applied. The user is handling hosted/browser tests.

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
