begin;

alter table public.enrollments add constraint enrollment_attendance_identity
  unique(id,school_id,student_id);
create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  class_id uuid not null,
  attendance_date date not null check(isfinite(attendance_date)),
  record_version integer not null default 1 check(record_version>0),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(class_id,school_id) references public.classes(id,school_id),
  unique(school_id,class_id,attendance_date), unique(id,school_id)
);
create table public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  session_id uuid not null,
  student_id uuid not null,
  enrollment_id uuid not null,
  status text not null check(status in ('present','absent','late','excused')),
  recorded_by uuid not null,
  updated_at timestamptz not null default now(),
  foreign key(session_id,school_id) references public.attendance_sessions(id,school_id),
  foreign key(student_id,school_id) references public.students(id,school_id),
  foreign key(enrollment_id,school_id,student_id) references public.enrollments(id,school_id,student_id),
  unique(session_id,student_id)
);
create index attendance_school_date on public.attendance_sessions(school_id,attendance_date,class_id);
create index attendance_student on public.attendance_entries(school_id,student_id,session_id);
create index attendance_enrollment on public.attendance_entries(enrollment_id);
alter table public.attendance_sessions enable row level security;
alter table public.attendance_entries enable row level security;
revoke all on public.attendance_sessions,public.attendance_entries from public,anon,authenticated;
grant select on public.attendance_sessions,public.attendance_entries to authenticated;

-- Read authority includes current responsibility AND responsibility on the
-- requested date. Save authority below further limits teachers to today.
create function private.attendance_staff_access(target_school uuid,target_class uuid,
  target_date date,staff_mode text) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(isfinite(target_date) and target_date<=private.school_today(target_school)
    and exists(select 1 from public.classes c join public.academic_years y
      on y.id=c.academic_year_id and y.school_id=c.school_id
      where c.school_id=target_school and c.id=target_class
        and target_date between y.starts_on and y.ends_on)
    and (case when staff_mode='school_admin' then private.is_school_admin(target_school)
      when staff_mode='teacher' then exists(select 1 from public.teaching_assignments ta
        where ta.school_id=target_school and ta.class_id=target_class
          and ta.teacher_id=private.my_teacher_id(target_school)
          and private.school_today(target_school) between ta.starts_on and ta.ends_on
          and target_date between ta.starts_on and ta.ends_on)
      else false end),false);
$$;
revoke all on function private.attendance_staff_access(uuid,uuid,date,text) from public,anon;
grant execute on function private.attendance_staff_access(uuid,uuid,date,text) to authenticated;
create policy staff_read on public.attendance_sessions for select to authenticated using (
  private.attendance_staff_access(school_id,class_id,attendance_date,'school_admin')
  or private.attendance_staff_access(school_id,class_id,attendance_date,'teacher')
);
create policy permitted_read on public.attendance_entries for select to authenticated using (
  student_id in (select private.my_student_ids(school_id))
  or exists(select 1 from public.attendance_sessions s where s.id=session_id and s.school_id=attendance_entries.school_id)
);

-- Preserve recorded history when an admin transfers or withdraws a learner.
-- A retroactive move must not silently leave a mark in the wrong class.
create function private.guard_attendance_enrollment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.attendance_entries a
    join public.attendance_sessions s on s.id=a.session_id and s.school_id=a.school_id
    where a.enrollment_id=old.id and (new.school_id<>a.school_id or new.student_id<>a.student_id
      or new.class_id<>s.class_id or s.attendance_date not between new.starts_on and new.ends_on)) then
    raise exception 'Enrollment change conflicts with recorded attendance' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_attendance_enrollment() from public,anon,authenticated;
create trigger attendance_enrollment_history before update on public.enrollments
  for each row execute function private.guard_attendance_enrollment();

create function public.list_attendance_classes(target_school uuid,staff_mode text,
  search_text text default '',page_number integer default 1)
returns table(id uuid,label text) language plpgsql stable security definer set search_path='' as $$
begin
  if staff_mode is null or staff_mode not in ('school_admin','teacher') or
    private.my_member_with_role(target_school,staff_mode::public.school_role) is null then
    raise exception 'Attendance access required' using errcode='42501';
  end if;
  if page_number is null or page_number not between 1 and 100000 or
    search_text is null or length(search_text)>80 then
    raise exception 'Invalid search' using errcode='22023';
  end if;
  return query select c.id,g.name||' · '||c.name||' · '||y.name
    from public.classes c join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
    join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
    where c.school_id=target_school and (staff_mode='school_admin' or exists(
      select 1 from public.teaching_assignments ta where ta.school_id=target_school and ta.class_id=c.id
        and ta.teacher_id=private.my_teacher_id(target_school)
        and private.school_today(target_school) between ta.starts_on and ta.ends_on))
      and position(lower(btrim(search_text)) in lower(g.name||' '||c.name||' '||y.name))>0
    order by y.starts_on desc,g.name,c.name,c.id limit 26 offset ((page_number-1)*25);
end;
$$;

create function public.get_attendance_register(target_school uuid,target_class uuid,
  target_date date,staff_mode text,page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare session public.attendance_sessions%rowtype; roster jsonb; class_label text;
begin
  if not private.attendance_staff_access(target_school,target_class,target_date,staff_mode) then
    raise exception 'Register unavailable' using errcode='42501';
  end if;
  if page_number is null or page_number not between 1 and 100000 then
    raise exception 'Invalid page' using errcode='22023';
  end if;
  select * into session from public.attendance_sessions s
    where s.school_id=target_school and s.class_id=target_class and s.attendance_date=target_date;
  select g.name||' · '||c.name||' · '||y.name into class_label from public.classes c
    join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
    join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
    where c.id=target_class and c.school_id=target_school;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.full_name,r.student_id),'[]'::jsonb) into roster from (
    select st.id student_id,st.full_name,st.reference,a.status
    from public.enrollments e join public.students st on st.id=e.student_id and st.school_id=e.school_id
    left join public.attendance_entries a on a.session_id=session.id and a.student_id=st.id and a.school_id=target_school
    where e.school_id=target_school and e.class_id=target_class and target_date between e.starts_on and e.ends_on
    order by st.full_name,st.id limit 51 offset ((page_number-1)*50)
  ) r;
  return jsonb_build_object('class_id',target_class,'class_label',class_label,'date',target_date,
    'today',private.school_today(target_school),'version',coalesce(session.record_version,0),
    'can_edit',staff_mode='school_admin' or target_date=private.school_today(target_school),
    'page',page_number,'has_next',jsonb_array_length(roster)>50,
    'rows',(select coalesce(jsonb_agg(v order by n),'[]'::jsonb) from jsonb_array_elements(roster) with ordinality t(v,n) where n<=50));
end;
$$;

create function public.save_attendance(target_school uuid,target_class uuid,target_date date,
  staff_mode text,expected_version integer,entries jsonb,correction_reason text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare session public.attendance_sessions%rowtype; item jsonb; learner uuid; enrollment uuid;
  old_status text; changes jsonb := '[]'::jsonb; today date;
begin
  if not private.attendance_staff_access(target_school,target_class,target_date,staff_mode) then
    raise exception 'Attendance access required' using errcode='42501';
  end if;
  -- Enrollment lifecycle and staff access mutations use this same lock.
  perform 1 from public.schools where id=target_school for update;
  today := private.school_today(target_school);
  if not private.attendance_staff_access(target_school,target_class,target_date,staff_mode)
    or (staff_mode='teacher' and target_date<>today) then
    raise exception 'Attendance access required' using errcode='42501';
  end if;
  if expected_version is null or expected_version not between 0 and 2147483646
    or correction_reason is null or length(btrim(correction_reason))>500
    or (target_date<today and correction_reason !~ '[^[:space:]]') then
    raise exception 'Check version and correction reason' using errcode='22023';
  end if;
  if entries is null or jsonb_typeof(entries)<>'array' then
    raise exception 'Invalid entries' using errcode='22023';
  end if;
  if jsonb_array_length(entries) not between 1 and 100 then
    raise exception 'Invalid entry count' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(entries) loop
    if jsonb_typeof(item)<>'object' then raise exception 'Invalid entry' using errcode='22023'; end if;
    if not (item ? 'studentId' and item ? 'status') or
      (select count(*) from jsonb_object_keys(item))<>2 or
      jsonb_typeof(item->'studentId')<>'string' or
      (item->>'studentId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
      not (item->'status'='null'::jsonb or (jsonb_typeof(item->'status')='string' and
        item->>'status' in ('present','absent','late','excused'))) then
      raise exception 'Invalid entry' using errcode='22023';
    end if;
  end loop;
  if (select count(distinct (v->>'studentId')::uuid) from jsonb_array_elements(entries) v)<>jsonb_array_length(entries) then
    raise exception 'Duplicate learner' using errcode='22023';
  end if;
  select * into session from public.attendance_sessions s
    where s.school_id=target_school and s.class_id=target_class and s.attendance_date=target_date;
  if coalesce(session.record_version,0)<>expected_version then
    raise exception 'Register changed; reload' using errcode='40001';
  end if;
  if session.id is null then
    insert into public.attendance_sessions(school_id,class_id,attendance_date,created_by)
      values(target_school,target_class,target_date,auth.uid()) returning * into session;
  else
    update public.attendance_sessions set record_version=record_version+1,updated_at=now()
      where id=session.id returning * into session;
  end if;
  for item in select value from jsonb_array_elements(entries) loop
    learner := (item->>'studentId')::uuid;
    select e.id into enrollment from public.enrollments e where e.school_id=target_school
      and e.student_id=learner and e.class_id=target_class and target_date between e.starts_on and e.ends_on;
    if enrollment is null then raise exception 'Learner is not enrolled for this register' using errcode='22023'; end if;
    select a.status into old_status from public.attendance_entries a where a.session_id=session.id and a.student_id=learner;
    if item->'status'='null'::jsonb then
      delete from public.attendance_entries where session_id=session.id and student_id=learner;
    else
      insert into public.attendance_entries(school_id,session_id,student_id,enrollment_id,status,recorded_by)
        values(target_school,session.id,learner,enrollment,item->>'status',auth.uid())
      on conflict(session_id,student_id) do update set status=excluded.status,
        enrollment_id=excluded.enrollment_id,recorded_by=excluded.recorded_by,updated_at=now();
    end if;
    if old_status is distinct from item->>'status' then
      changes := changes || jsonb_build_array(jsonb_build_object('student_id',learner,'before',old_status,'after',item->>'status'));
    end if;
  end loop;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'attendance.save',session.id,jsonb_build_object(
      'date',target_date,'version',session.record_version,'reason',btrim(correction_reason),'changes',changes));
  return jsonb_build_object('id',session.id,'version',session.record_version);
end;
$$;

create function public.list_my_attendance(target_school uuid,portal_mode text,
  selected_student uuid default null,page_number integer default 1)
returns table(id uuid,attendance_date date,class_name text,status text)
language plpgsql stable security definer set search_path='' as $$
declare learner uuid; member uuid;
begin
  if portal_mode is null or portal_mode not in ('student','guardian') then
    raise exception 'Learner access required' using errcode='42501';
  end if;
  member := private.my_member_with_role(target_school,portal_mode::public.school_role);
  if member is null then raise exception 'Learner access required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  if portal_mode='student' then
    if selected_student is not null then raise exception 'Invalid learner selection' using errcode='22023'; end if;
    select st.id into learner from public.students st where st.school_id=target_school and st.membership_id=member;
  else
    select sg.student_id into learner from public.student_guardians sg where sg.school_id=target_school
      and sg.guardian_id=private.my_guardian_id(target_school) and sg.access_enabled and sg.student_id=selected_student;
  end if;
  if learner is null then raise exception 'Learner unavailable' using errcode='42501'; end if;
  return query select a.id,s.attendance_date,c.name,a.status from public.attendance_entries a
    join public.attendance_sessions s on s.id=a.session_id and s.school_id=a.school_id
    join public.classes c on c.id=s.class_id and c.school_id=s.school_id
    where a.school_id=target_school and a.student_id=learner and s.attendance_date<=private.school_today(target_school)
    order by s.attendance_date desc,a.id limit 51 offset ((page_number-1)*50);
end;
$$;

revoke all on function public.list_attendance_classes(uuid,text,text,integer),
  public.get_attendance_register(uuid,uuid,date,text,integer),
  public.save_attendance(uuid,uuid,date,text,integer,jsonb,text),
  public.list_my_attendance(uuid,text,uuid,integer) from public,anon;
grant execute on function public.list_attendance_classes(uuid,text,text,integer),
  public.get_attendance_register(uuid,uuid,date,text,integer),
  public.save_attendance(uuid,uuid,date,text,integer,jsonb,text),
  public.list_my_attendance(uuid,text,uuid,integer) to authenticated;
commit;
