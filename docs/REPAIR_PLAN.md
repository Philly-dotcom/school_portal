# Pre-migration repair scope

2026-10-02. Architecture checked against PROJECT_CONTEXT.md, ARCHITECTURE.md, migrations 001–012, their RPC callers, forms, grants and tests. Hosted migrations 010–012 remain unapplied. This work changes those files in place; migrations 001–009 and their order remain intact.

## Preserved lifecycle

Supabase Auth identity → school membership and roles → explicit optional register/login link. Preparing an invitation creates no membership; confirmed-email acceptance creates the membership; an administrator links the register afterward. Suspension removes access without deleting records. Academic years/grades/classes/subjects remain school-owned. A transfer closes one dated placement and creates another atomically, preserving history. Corrections retain previous values separately from append-only audit metadata.

## Repair decisions and impact

| Finding | Smallest repair and downstream checks |
| --- | --- |
| Current roster dates | Change 010 read helpers/policies, not enrollment storage. Check future transfers, inclusive dates, teacher rosters and learner/guardian timetables; retain own enrollment history. |
| Login linking | Add expected version and explicit confirmation; enforce active matching-role targets; show verified email plus stable membership ID. Update RPC grants, action, form, tests and documentation together. |
| Guardian relationship versus permission | Existing relationship forms explicitly promised no access grant. Add a default-false access flag and version to the existing relationship, with an audited admin RPC to grant/revoke child access. Keep the family relationship itself. No automatic historical grants. |
| Bulk management | Paginate the existing invitation list with stable ordering; retain the same create/accept/send system. |
| Delivery retries | Bound attempts and cooldown in 011 claim/reset; distinguish unknown outcomes and fence late completions using the existing claim ID. Add a sender-side enable flag. |
| Password/session handling | Use fresh Supabase sign-in when reauthentication is required and Supabase signOut; report failed revocation and offer a retry. Document the remaining JWT lifetime rather than inventing a session system. |
| Erasure | Operator-only, explicit school-scoped anonymization that preserves academic records; test the reference bound, invitation PII, family grants and correction-history cleanup. Document separate global Auth deletion and external retention steps. |
| Testing | Regression and seeded pre-010 upgrade fixtures run the complete final schema. Keep useful historical-migration tests. Production CSP checks and disconnected browser tests remain isolated from hosted data. |

No new feature phase, UI redesign, Auth provider, tenant model, migration renumbering, automatic emails or hosted writes. MFA, broad role dashboards, general register pagination/imports and new academic modules remain out of scope.
