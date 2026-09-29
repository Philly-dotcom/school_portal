-- School Portal foundation. Apply only to its dedicated Supabase project.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.school_role as enum ('school_admin', 'teacher', 'student', 'guardian');
create type public.membership_status as enum ('active', 'suspended');

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  timezone text not null default 'Africa/Johannesburg',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  created_at timestamptz not null default now()
);

create table public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  user_id uuid not null references public.profiles(user_id),
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (school_id, user_id),
  unique (id, school_id)
);
create index membership_user_lookup on public.school_memberships(user_id, school_id);

create table public.membership_roles (
  membership_id uuid not null,
  school_id uuid not null,
  role public.school_role not null,
  primary key (membership_id, role),
  foreign key (membership_id, school_id)
    references public.school_memberships(id, school_id) on delete cascade
);
create index membership_roles_school_lookup on public.membership_roles(school_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  school_id uuid not null references public.schools(id),
  actor_user_id uuid,
  action text not null,
  record_id uuid not null,
  occurred_at timestamptz not null default now()
);
create index audit_school_time on public.audit_events(school_id, occurred_at desc);

-- These narrow helpers avoid recursive membership policies. They derive identity
-- from auth.uid(); callers cannot supply a different user. No dynamic SQL.
create function private.is_school_member(target_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.school_memberships m
    join public.schools s on s.id = m.school_id
    where m.user_id = (select auth.uid()) and m.school_id = target_school
      and m.status = 'active' and s.active
  );
$$;

create function private.is_school_admin(target_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.school_memberships m
    join public.schools s on s.id = m.school_id
    join public.membership_roles r on r.membership_id = m.id and r.school_id = m.school_id
    where m.user_id = (select auth.uid()) and m.school_id = target_school
      and m.status = 'active' and s.active and r.role = 'school_admin'
  );
$$;
revoke all on function private.is_school_member(uuid) from public;
revoke all on function private.is_school_admin(uuid) from public;
grant execute on function private.is_school_member(uuid), private.is_school_admin(uuid) to authenticated;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.membership_roles enable row level security;
alter table public.audit_events enable row level security;

create policy schools_read on public.schools for select to authenticated
  using (private.is_school_member(id));
create policy schools_update on public.schools for update to authenticated
  using (private.is_school_admin(id)) with check (private.is_school_admin(id));
create policy profiles_read_self on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy memberships_read on public.school_memberships for select to authenticated
  using (private.is_school_member(school_id)
    and (user_id = (select auth.uid()) or private.is_school_admin(school_id)));
create policy roles_read on public.membership_roles for select to authenticated
  using (private.is_school_member(school_id) and exists (
    select 1 from public.school_memberships m where m.id = membership_id
      and m.school_id = membership_roles.school_id
      and (m.user_id = (select auth.uid()) or private.is_school_admin(m.school_id))
  ));
create policy audit_read_admin on public.audit_events for select to authenticated
  using (private.is_school_admin(school_id));

-- Provisioning is operator-only in this milestone. No client policies permit
-- creating schools, granting roles or changing memberships (including by admins).
revoke all on public.schools, public.profiles, public.school_memberships,
  public.membership_roles, public.audit_events from anon, authenticated;
grant select on public.schools, public.profiles, public.school_memberships,
  public.membership_roles, public.audit_events to authenticated;
grant update (name, timezone) on public.schools to authenticated;
grant update (display_name) on public.profiles to authenticated;

create function private.audit_foundation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  school uuid;
  record uuid;
begin
  if TG_TABLE_NAME = 'schools' then
    school := NEW.id;
    record := NEW.id;
  elsif TG_TABLE_NAME = 'school_memberships' then
    school := coalesce(NEW.school_id, OLD.school_id);
    record := coalesce(NEW.id, OLD.id);
  else
    school := coalesce(NEW.school_id, OLD.school_id);
    record := coalesce(NEW.membership_id, OLD.membership_id);
  end if;
  insert into public.audit_events(school_id, actor_user_id, action, record_id)
  values (school, auth.uid(), TG_TABLE_NAME || '.' || lower(TG_OP), record);
  return null;
end;
$$;
revoke all on function private.audit_foundation_change() from public;
create trigger schools_audit after insert or update on public.schools
  for each row execute function private.audit_foundation_change();
create trigger memberships_audit after insert or update or delete on public.school_memberships
  for each row execute function private.audit_foundation_change();
create trigger roles_audit after insert or update or delete on public.membership_roles
  for each row execute function private.audit_foundation_change();

commit;
