# School Portal: agreed context

Authoritative location: `C:\Users\moses\Documents\School_portal`.

School Portal is completely isolated from the user's other projects. No architecture, files, credentials, schema, features or decisions may be copied from those projects by assumption.

## Authorization and current stage

On 2026-09-29 the user authorized starting Phase 1 after reviewing the architecture. The user confirmed there is no dedicated Supabase project yet and requested the local app and setup instructions. Local implementation is authorized; public deployment and external provisioning have not been requested.

## Product strategy

Build a good portal for one school, then consider additional schools after the first school is stable. Use school-aware data ownership and relationships now, without building the SaaS business platform.

Roles: School Admin, Teacher, Student, Parent/Guardian. Platform Super Admin is future scope. Login identities are separate from memberships and learner records. Memberships may hold multiple roles.

## Confirmed decisions

- School Admin publishes results after review by an authorized person.
- Homework is posted for learners to view. There are no learner submissions.
- Documents are PDF only initially.
- External notification channels will be chosen later. Authentication delivery must be agreed before invitations/recovery are released.
- The user is open to testing isolation using fictional School A and School B.

## Recommendations awaiting decisions before their module is built

- Whether a School Admin can both review and publish results.
- Re-review when approved marks change.
- Teachers upload homework/material PDFs, admins upload school PDFs, students/guardians download only.
- Daily class attendance versus lesson attendance.
- Exact grading, report layout, fee policy, school identity and account provisioning conventions.

No real school name, logo, person, student record or statistic is invented by the preview.
