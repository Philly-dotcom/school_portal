# School Portal: agreed context

Authoritative location: `C:\Users\moses\Documents\School_portal`.

School Portal is completely isolated from the user's other projects. No architecture, files, credentials, schema, features or decisions may be copied from those projects by assumption.

## Authorization and current stage

The user authorized Phase 1 on 29 September and later Phase 2 development without email. A dedicated Supabase project now exists, with fictional records and a working test administrator. Migrations 009–013 are user-confirmed applied as of 4 October. Current work is documentation and hosted verification of existing features; see RESUME.md. Public deployment and additional cloud resources are not part of that authorization.

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
