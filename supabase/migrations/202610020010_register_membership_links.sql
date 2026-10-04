-- Links register records to portal logins and adds least-privilege READ access for
-- teachers, guardians and students. Writes stay administrator-only.
-- Apply AFTER 202610010009_enrollment_lifecycle.sql. No Auth users are created here.
begin;

-- 1. Link column: one login (membership) per register record, same school enforced by FK.
do $$
declare t text;
begin
  foreach t in array array['students','teachers','guardians'] loop
    execute format('alter table public.%I add column membership_id uuid', t);
    execute format('alter table public.%I add constraint %I foreign key (membership_id, school_id)
      references public.school_memberships(id, school_id)', t, t || '_membership_fk');
    execute format('create unique index %I on public.%I(membership_id) where membership_id is not null',
      t || '_membership_unique', t);
  end loop;
end;
$$;
-- INSERT grants list columns explicitly, so membership_id can only be set by the RPC below.

-- 2. Admin-only link/unlink. Pass null as target_membership to unlink.
create function public.link_register_to_member(target_school uuid, record_kind text,
  target_record uuid, target_membership uuid, expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  needed_role public.school_role;
  previous_membership uuid;
  found_record boolean;
  current_version integer;
begin
  if not private.is_school_admin(target_school) then
    raise exception 'School administrator access required' using errcode = '42501';
  end if;
  perform 1 from public.schools where id = target_school for update;
  if not private.is_school_admin(target_school) then
    raise exception 'School administrator access required' using errcode = '42501';
  end if;
  if record_kind is null or record_kind not in ('students','teachers','guardians') or target_record is null then
    raise exception 'Unsupported record type' using errcode = '22023';
  end if;
  needed_role := case record_kind when 'students' then 'student' when 'teachers' then 'teacher' else 'guardian' end;
  if target_membership is not null and not exists (
    select 1 from public.school_memberships m
    join public.membership_roles r on r.membership_id = m.id and r.school_id = m.school_id
    where m.id = target_membership and m.school_id = target_school and m.status = 'active' and r.role = needed_role) then
    raise exception 'Member must be active in this school and hold the matching role' using errcode = '22023';
  end if;
  -- Identifiers come only from the allowlist above; values are parameters.
  execute format('select true, membership_id, record_version from public.%I where id = $1 and school_id = $2 for update', record_kind)
    into found_record, previous_membership, current_version using target_record, target_school;
  if found_record is not true then
    raise exception 'Record unavailable' using errcode = '22023';
  end if;
  if expected_version is null or expected_version <> current_version then
    raise exception 'Record changed; reload before linking' using errcode = '40001';
  end if;
  execute format('update public.%I set membership_id = $1, record_version = record_version + 1
    where id = $2 and school_id = $3', record_kind) using target_membership, target_record, target_school;
  insert into public.audit_events(school_id, actor_user_id, action, record_id, details)
    values (target_school, auth.uid(), record_kind || case when target_membership is null then '.unlink' else '.link' end,
      target_record, jsonb_build_object('previous_membership', previous_membership, 'membership', target_membership));
end;
$$;
revoke all on function public.link_register_to_member(uuid,text,uuid,uuid,integer) from public, anon;
grant execute on function public.link_register_to_member(uuid,text,uuid,uuid,integer) to authenticated;

-- Register relationships predate portal access. Keep them, but grant child access explicitly.
alter table public.student_guardians
  add column access_enabled boolean not null default false,
  add column record_version integer not null default 1 check(record_version > 0);
create function public.set_guardian_access(target_school uuid,target_link uuid,
  expected_version integer,enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare previous public.student_guardians%rowtype;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  select * into previous from public.student_guardians where id=target_link and school_id=target_school for update;
  if not found then raise exception 'Relationship unavailable' using errcode='22023'; end if;
  if expected_version is distinct from previous.record_version then raise exception 'Relationship changed; reload' using errcode='40001'; end if;
  if enabled is null then raise exception 'Choose access state' using errcode='22023'; end if;
  update public.student_guardians set access_enabled=enabled,record_version=record_version+1 where id=previous.id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'student_guardians.access_changed',previous.id,
      jsonb_build_object('previous_access',previous.access_enabled,'access',enabled,'record_version',previous.record_version+1));
end;
$$;
revoke all on function public.set_guardian_access(uuid,uuid,integer,boolean) from public,anon;
grant execute on function public.set_guardian_access(uuid,uuid,integer,boolean) to authenticated;

-- Same membership source as list_school_members; verified account identifiers are admin-only.
create function public.list_linkable_members(target_school uuid)
returns table(id uuid,display_name text,status public.membership_status,roles public.school_role[],verified_email text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  return query select m.id,p.display_name,m.status,
    coalesce(array_agg(r.role order by r.role) filter(where r.role is not null),'{}'::public.school_role[]),
    case when u.email_confirmed_at is not null then u.email else null end
    from public.school_memberships m join public.profiles p on p.user_id=m.user_id
    join auth.users u on u.id=m.user_id
    left join public.membership_roles r on r.membership_id=m.id and r.school_id=m.school_id
    where m.school_id=target_school group by m.id,p.display_name,u.email,u.email_confirmed_at
    order by p.display_name,m.id;
end;
$$;
revoke all on function public.list_linkable_members(uuid) from public,anon;
grant execute on function public.list_linkable_members(uuid) to authenticated;

-- 3. Identity helpers. SECURITY DEFINER so policies do not recurse; each derives the
--    caller from auth.uid() and re-checks active membership, active school AND the role.
create function private.school_today(target_school uuid) returns date
language plpgsql stable security definer set search_path = '' as $$
begin
  return (select (now() at time zone s.timezone)::date from public.schools s where s.id = target_school);
exception when others then
  return (now() at time zone 'UTC')::date;  -- an invalid stored timezone must not break reads
end;
$$;

create function private.my_member_with_role(target_school uuid, needed public.school_role) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.school_memberships m
  join public.schools s on s.id = m.school_id
  join public.membership_roles r on r.membership_id = m.id and r.school_id = m.school_id
  where m.user_id = (select auth.uid()) and m.school_id = target_school
    and m.status = 'active' and s.active and r.role = needed;
$$;

create function private.my_teacher_id(target_school uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select t.id from public.teachers t
  where t.school_id = target_school and t.membership_id = private.my_member_with_role(target_school, 'teacher');
$$;

create function private.my_guardian_id(target_school uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.id from public.guardians g
  where g.school_id = target_school and g.membership_id = private.my_member_with_role(target_school, 'guardian');
$$;

-- Students the caller may see: themselves (student role) and their linked children (guardian role).
create function private.my_student_ids(target_school uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.students s
  where s.school_id = target_school and s.membership_id = private.my_member_with_role(target_school, 'student')
  union
  select sg.student_id from public.student_guardians sg
  where sg.school_id = target_school and sg.access_enabled and sg.guardian_id = private.my_guardian_id(target_school);
$$;

-- Classes the caller teaches TODAY (school timezone). Expired assignments grant nothing.
create function private.my_taught_class_ids(target_school uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select ta.class_id from public.teaching_assignments ta
  where ta.school_id = target_school and ta.teacher_id = private.my_teacher_id(target_school)
    and private.school_today(target_school) between ta.starts_on and ta.ends_on;
$$;

create function private.my_enrolled_class_ids(target_school uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.class_id from public.enrollments e
  where e.school_id = target_school and e.student_id in (select private.my_student_ids(target_school));
$$;

-- Students currently on the rosters of classes the caller teaches.
create function private.my_roster_student_ids(target_school uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.student_id from public.enrollments e
  where e.school_id = target_school and private.school_today(target_school) between e.starts_on and e.ends_on
    and e.class_id in (select private.my_taught_class_ids(target_school));
$$;

-- Own history remains readable, but timetable access follows the current dated placement.
create function private.my_current_lesson_ids(target_school uuid) returns setof uuid
language sql stable security definer set search_path='' as $$
  select l.id from public.timetable_lessons l
  join public.enrollments e on e.school_id=l.school_id and e.class_id=l.class_id
  where e.school_id=target_school and e.student_id in (select private.my_student_ids(target_school))
    and private.school_today(target_school) between e.starts_on and e.ends_on
    and greatest(e.starts_on,l.starts_on)<=least(e.ends_on,l.ends_on)
    and greatest(e.starts_on,l.starts_on)+((l.weekday-extract(isodow from greatest(e.starts_on,l.starts_on))::integer+7)%7)
      <=least(e.ends_on,l.ends_on);
$$;
revoke all on function private.my_current_lesson_ids(uuid) from public,anon;
grant execute on function private.my_current_lesson_ids(uuid) to authenticated;

revoke all on function private.school_today(uuid), private.my_member_with_role(uuid, public.school_role),
  private.my_teacher_id(uuid), private.my_guardian_id(uuid), private.my_student_ids(uuid),
  private.my_taught_class_ids(uuid), private.my_enrolled_class_ids(uuid), private.my_roster_student_ids(uuid)
  from public, anon;
grant execute on function private.school_today(uuid), private.my_member_with_role(uuid, public.school_role),
  private.my_teacher_id(uuid), private.my_guardian_id(uuid), private.my_student_ids(uuid),
  private.my_taught_class_ids(uuid), private.my_enrolled_class_ids(uuid), private.my_roster_student_ids(uuid)
  to authenticated;

-- 4. Read policies (permissive, OR-ed with the existing admin_read policies).
-- Non-sensitive reference data: any active member of the school.
do $$
declare t text;
begin
  foreach t in array array['academic_years','academic_terms','grades','subjects'] loop
    execute format('create policy member_read on public.%I for select to authenticated using (private.is_school_member(school_id))', t);
  end loop;
end;
$$;

create policy self_read on public.teachers for select to authenticated
  using (id = private.my_teacher_id(school_id));
create policy self_read on public.guardians for select to authenticated
  using (id = private.my_guardian_id(school_id));
create policy scoped_read on public.students for select to authenticated
  using (id in (select private.my_student_ids(school_id)) or id in (select private.my_roster_student_ids(school_id)));
create policy own_links_read on public.student_guardians for select to authenticated
  using (access_enabled and guardian_id = private.my_guardian_id(school_id));
create policy scoped_read on public.enrollments for select to authenticated
  using (student_id in (select private.my_student_ids(school_id)) or
    (class_id in (select private.my_taught_class_ids(school_id)) and private.school_today(school_id) between starts_on and ends_on));
create policy scoped_read on public.classes for select to authenticated
  using (id in (select private.my_taught_class_ids(school_id)) or id in (select private.my_enrolled_class_ids(school_id)));
create policy own_read on public.teaching_assignments for select to authenticated
  using (teacher_id = private.my_teacher_id(school_id));
create policy scoped_read on public.timetable_lessons for select to authenticated
  using (teacher_id = private.my_teacher_id(school_id) or id in (select private.my_current_lesson_ids(school_id)));

commit;
