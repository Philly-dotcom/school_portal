# School Portal: agreed context

Authoritative location: `C:\Users\moses\Documents\School_portal`.

School Portal is completely isolated from the user's other projects. No architecture, files, credentials, schema, features or decisions may be copied from those projects by assumption.

## Authorization and current stage

The user authorized Phase 1, Phase 2 without email, and assistant-led Phase 3 development. As of 20 October, migrations through 021 are user-confirmed applied. Role accounts are established and basic separate-session checks have passed. The user completed 13 hosted document checks; School B isolation and the other cases in [the current checklist](DOCUMENTS.md#remaining-phase-3-checklist) remain open.

All four roles have read-only overview profiles. The user wants the daily dashboard completed and redesigned after pending testing. Phase 3 is not yet accepted and Phase 4 has not started. Email delivery remains off. Public deployment and additional cloud resources are not authorized by this status update.

At the user's request, superseded guides are now archived, including the temporary Phase 3 implementation guide. Use RESUME.md, VERIFICATION.md and the current checklist for progress; archived instructions are historical reference.

## Product strategy

Build a good portal for one school, then consider additional schools after the first school is stable. Use school-aware data ownership and relationships now, without building the SaaS business platform.

Roles: School Admin, Teacher, Student, Parent/Guardian. Platform Super Admin is future scope. Login identities are separate from memberships and learner records. Memberships may hold multiple roles.

## Confirmed decisions

- School Admin publishes results after review by an authorized person.
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

- Whether a School Admin can both review and publish results.
- Re-review when approved marks change.
- File scanning and retention/physical cleanup procedures before live school use; homework attachments remain outside the current library.
- Exact grading, report layout, fee policy, school identity and account provisioning conventions.

No real school name, logo, person, student record or statistic is invented by the preview.
