# Dedicated Supabase setup

> Status reconciled 25 October 2026. This is a feature/setup reference. Use [RESUME.md](RESUME.md) for current progress, [VERIFICATION.md](VERIFICATION.md) for evidence and [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist) for acceptance. Existing migrations through 021 are applied; do not repeat setup on the current project.

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

## School B: fictional isolation-test setup

Added 26 October 2026. These are instructions for you to run, not a record that School B has been created or tested. Keep this fixture for the remaining acceptance checks; agree its cleanup separately. Do not remove School A records or rerun migrations.

Use the **same dedicated Supabase project as School A**. A separate database would not test isolation between schools sharing our tables. The portal has no school-registration screen yet.

### Understand the two UUIDs

- **User UUID:** copied from Authentication → Users. It identifies a login account.
- **School UUID:** generated when a row is inserted into `public.schools`. It identifies the school and belongs in `SCHOOL_PORTAL_SCHOOL_ID`.
- **Membership:** connects the user to the school; `membership_roles` assigns their role.

Create a confirmed fictional School B administrator in Supabase Authentication, with a different email from School A's accounts. Keep public sign-ups disabled. If you already created this user, reuse it. Copy its UUID, not School A's UUID. Keep passwords out of SQL and documentation.

### Create School B and link its administrator

If you already ran this provisioning block, skip it and use the SELECT query below. Otherwise replace `REPLACE_WITH_NEW_AUTH_USER_UUID` and run this block once in the dedicated project's SQL Editor as the database owner. It creates the records together and stops if the school name exists or the user already has a school membership. If it stops, inspect the existing records rather than removing the safeguards.

```sql
do $$
declare
  admin_user uuid := 'REPLACE_WITH_NEW_AUTH_USER_UUID';
  school_b uuid;
  admin_membership uuid;
begin
  if not exists (
    select 1 from auth.users where id = admin_user
  ) then
    raise exception 'Auth user does not exist.';
  end if;

  if exists (
    select 1 from public.schools
    where name = 'School B Test School'
  ) then
    raise exception 'School B already exists. Inspect it before continuing.';
  end if;

  if exists (
    select 1 from public.school_memberships
    where user_id = admin_user
  ) then
    raise exception 'Use a separate test account with no existing school membership.';
  end if;

  insert into public.schools(name, timezone)
  values ('School B Test School', 'Africa/Johannesburg')
  returning id into school_b;

  insert into public.profiles(user_id, display_name)
  values (admin_user, 'School B Test Administrator')
  on conflict (user_id) do nothing;

  insert into public.school_memberships(school_id, user_id)
  values (school_b, admin_user)
  returning id into admin_membership;

  insert into public.membership_roles(membership_id, school_id, role)
  values (admin_membership, school_b, 'school_admin');

  raise notice 'School B ID: %', school_b;
end $$;
```

### Find School B's school UUID

This query is read-only and can be repeated:

```sql
select id, name, active
from public.schools
where name = 'School B Test School';
```

The returned `id` is School B's UUID. To compare both schools, use:

```sql
select id, name, active
from public.schools
order by created_at;
```

### Open the existing app for School B

1. Sign out and stop the development server.
2. Save the current School A value of `SCHOOL_PORTAL_SCHOOL_ID` so you can restore it.
3. In `.env.local`, change only `SCHOOL_PORTAL_SCHOOL_ID` to School B's school UUID. Keep the same Supabase URL and publishable key; do not overwrite the file from `.env.example`.
4. Run `npm run dev` and sign in with School B's administrator.
5. Confirm the school name is School B Test School and School A records are not shown.

To return to School A, sign out, stop the server, restore its school UUID and restart. Each running app is configured for one school. Switch Workspace changes roles, not schools.

Build the small fictional School B fixture through its portal, including the academic structure, people and linked records needed for the tests. Provisioning alone does not pass DOC-B or P3-32. Cross-school checks must use ordinary authenticated School A and School B sessions and test denied reads and writes in both directions, including documents and Storage. SQL Editor owner access is not evidence that RLS protects normal users. Record results in [DOCUMENTS.md](DOCUMENTS.md#remaining-phase-3-checklist); School B setup and testing remain user-owned.

## Remaining authentication work

Member management, recovery and invitation acceptance are implemented. Account-management migrations are already in the current project. Follow [account management](ACCOUNT_MANAGEMENT.md) for the remaining email setup and verification, not to reapply its migration. Hosted integration checks and required admin MFA remain outstanding.

Before live use, finish the registered-domain/SMTP setup, test the existing invitation and recovery callbacks, confirm redirect URL allowlists, settle admin MFA enforcement and complete abuse/rate-limit checks. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).
