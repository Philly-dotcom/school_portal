# Dedicated Supabase setup

The user reported completing setup on 2026-09-30. Local configuration and Supabase connectivity were checked, and the user confirmed School Admin dashboard/settings access. A subsequent check confirmed public sign-ups are disabled; keep them disabled. The steps below remain the setup reference. Full hosted verification is still required; see VERIFICATION.md. Do not use any other project's resources.

## 1. Create the project

Create a dedicated School Portal project in your own Supabase account. Review region, pricing and account ownership before provisioning. Keep its database password in your password manager, not this repository or chat. Use synthetic data initially.

Keep public sign-ups disabled. Do not enable unrestricted registration to test login. Password sign-in works with provisioned test accounts. Invitation acceptance and recovery screens also exist, but email delivery remains disabled and unverified.

## 2. Apply the migration

> **Existing project, 4 October:** migrations 009–013 are user-confirmed applied. Do not rerun them or recreate the administrator. The following provisioning example is for a fresh project only. A fresh approved setup needs the complete ordered migration chain, 001–013; the foundation example below is only the first step. Applying SQL does not push Auth configuration or prove hosted workflows work. See RESUME.md and VERIFICATION.md for current progress.






Review and run `supabase/migrations/202609290001_foundation.sql` in that project's SQL editor as its database owner, or through your migration workflow. It is a one-time migration, not an idempotent seed. Do not run it repeatedly or against another application database.

Keep `private` out of exposed API schemas. The normal `public` schema contains the RLS-protected application tables. The local test suite does not confirm these hosted settings.

## 3. Provision a confirmed test administrator

In Supabase Auth, create a confirmed synthetic/test user with a password using your controlled admin account. Keep the password out of SQL and source control. Copy only that user's UUID for provisioning.

Run this template after replacing the UUID with the created Auth user's UUID. Use a fictional school until real-school setup is approved. It returns the newly created school's UUID. This creates an account profile, not a learner record.

```sql
do $$
declare
  first_user uuid := 'REPLACE_WITH_AUTH_USER_UUID';
  first_school uuid;
  first_membership uuid;
begin
  insert into public.schools(name, timezone)
  values ('School Portal Test School', 'Africa/Johannesburg') returning id into first_school;
  insert into public.profiles(user_id, display_name)
  values (first_user, 'Test Administrator');
  insert into public.school_memberships(school_id, user_id)
  values (first_school, first_user) returning id into first_membership;
  insert into public.membership_roles(membership_id, school_id, role)
  values (first_membership, first_school, 'school_admin');
  raise notice 'School ID: %', first_school;
end $$;
```

Do not run this template twice for the same account. The first administrator is provisioned by the database owner. After setup, People & access provides controlled member role/status changes; it is not a public school-registration screen.

## 4. Configure locally

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`: the dedicated project's URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its publishable key, not an `sb_secret_` or service-role credential.
- `SCHOOL_PORTAL_SCHOOL_ID`: the provisioned school's UUID.

The publishable key is intended for user-scoped requests; database policies enforce security. Never add elevated credentials. `.env.local` is ignored by Git. Do not paste secret credentials into chat.

Restart `npm run dev`. Visit `/login`. Merely supplying environment variables does not prove the backend works.

## 5. Verify before proceeding

1. Wrong passwords fail without exposing account details.
2. The confirmed admin can sign in, reach their school and sign out.
3. Reloading the protected page preserves the valid session; signing out removes access.
4. The admin can update the school name/timezone; an audit event records the change.
5. A teacher cannot alter settings, including through direct requests.
6. A user without membership cannot enter the workspace.
7. Suspending a membership or deactivating a school removes access on the next request, even with an existing session.
8. In a disposable test project, create a second fictional school and verify cross-school reads, edits, membership and role queries are denied through the real Supabase API.
9. Confirm the public preview remains static and does not show backend data.

Do not use real learner data until invitations/recovery, privileged-account protections, backup/restore procedures and these hosted tests have been completed.

## Remaining authentication work

Member management, recovery and invitation acceptance are implemented. Account-management migrations are already in the current project. Follow [account management](ACCOUNT_MANAGEMENT.md) for the remaining email setup and verification, not to reapply its migration. Hosted integration checks and required admin MFA remain outstanding.

Before live use, finish the registered-domain/SMTP setup, test the existing invitation and recovery callbacks, confirm redirect URL allowlists, settle admin MFA enforcement and complete abuse/rate-limit checks. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).
