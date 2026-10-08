begin;
alter table public.teaching_assignments add constraint homework_assignment_identity
  unique(id,school_id,class_id,academic_year_id);
create table public.homework_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  assignment_id uuid not null,
  class_id uuid not null,
  academic_year_id uuid not null,
  title text not null check(length(btrim(title)) between 1 and 160),
  instructions text not null check(length(btrim(instructions)) between 1 and 10000),
  due_date date not null check(isfinite(due_date)),
  status text not null check(status in ('draft','published','withdrawn')),
  audience_date date check(isfinite(audience_date)),
  published_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  record_version integer not null default 1 check(record_version>0),
  unique(id,school_id),
  foreign key(assignment_id,school_id,class_id,academic_year_id)
    references public.teaching_assignments(id,school_id,class_id,academic_year_id),
  check((audience_date is null) = (published_at is null)),
  check(status<>'published' or audience_date is not null),
  check(status<>'draft' or audience_date is null),
  check(audience_date is null or due_date>=audience_date)
);
create index homework_school_order on public.homework_items(school_id,created_at desc,id);
create index homework_assignment on public.homework_items(school_id,assignment_id);
create index homework_class_audience on public.homework_items(school_id,class_id,audience_date) where status='published';
alter table public.homework_items enable row level security;
revoke all on public.homework_items from public,anon,authenticated;
grant select on public.homework_items to authenticated;

create function private.homework_staff_access(target_school uuid,target_assignment uuid,staff_mode text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.teaching_assignments ta
    where ta.id=target_assignment and ta.school_id=target_school and (
      (staff_mode='school_admin' and private.is_school_admin(target_school)) or
      (staff_mode='teacher' and ta.teacher_id=private.my_teacher_id(target_school)
        and private.school_today(target_school) between ta.starts_on and ta.ends_on)));
$$;
-- Called by RLS and the narrow read RPC. An arbitrary learner ID cannot probe
-- other families' enrollment: the caller must already have that learner grant.
create function private.homework_learner_access(target_school uuid,target_class uuid,
  publication_date date,target_student uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select target_student in (select private.my_student_ids(target_school)) and exists(
    select 1 from public.enrollments e where e.school_id=target_school and e.class_id=target_class
      and e.student_id=target_student and publication_date between e.starts_on and e.ends_on);
$$;
revoke all on function private.homework_staff_access(uuid,uuid,text),
  private.homework_learner_access(uuid,uuid,date,uuid) from public,anon;
grant execute on function private.homework_staff_access(uuid,uuid,text),
  private.homework_learner_access(uuid,uuid,date,uuid) to authenticated;
create policy permitted_read on public.homework_items for select to authenticated using (
  private.homework_staff_access(school_id,assignment_id,'school_admin') or
  private.homework_staff_access(school_id,assignment_id,'teacher') or
  (status='published' and exists(select 1 from private.my_student_ids(school_id) learner
    where private.homework_learner_access(school_id,class_id,audience_date,learner)))
);

create function public.search_homework_assignments(target_school uuid,staff_mode text,
  search_text text default '',page_number integer default 1)
returns table(id uuid,label text) language plpgsql stable security definer set search_path='' as $$
begin
  if staff_mode is null or staff_mode not in ('school_admin','teacher') or
    private.my_member_with_role(target_school,staff_mode::public.school_role) is null then
    raise exception 'Homework staff access required' using errcode='42501';
  end if;
  if page_number is null or page_number not between 1 and 100000 or search_text is null or length(search_text)>80 then
    raise exception 'Invalid search' using errcode='22023';
  end if;
  return query select ta.id,sub.name||' · '||g.name||' · '||c.name||' · '||y.name||' · '||t.full_name||
      ' · '||ta.starts_on::text||'–'||ta.ends_on::text
    from public.teaching_assignments ta
    join public.subjects sub on sub.id=ta.subject_id and sub.school_id=ta.school_id
    join public.classes c on c.id=ta.class_id and c.school_id=ta.school_id
    join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
    join public.academic_years y on y.id=ta.academic_year_id and y.school_id=ta.school_id
    join public.teachers t on t.id=ta.teacher_id and t.school_id=ta.school_id
    where ta.school_id=target_school and private.homework_staff_access(target_school,ta.id,staff_mode)
      and position(lower(btrim(search_text)) in lower(sub.name||' '||g.name||' '||c.name||' '||y.name||' '||t.full_name||' '||t.reference))>0
    order by ta.starts_on desc,sub.name,c.name,ta.id limit 26 offset ((page_number-1)*25);
end;
$$;

create function public.save_homework(target_school uuid,staff_mode text,target_homework uuid,
  target_assignment uuid,expected_version integer,new_title text,new_instructions text,
  new_due_date date,new_status text)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.homework_items%rowtype; saved_id uuid;
  assignment public.teaching_assignments%rowtype; academic public.academic_years%rowtype;
  today date; first_audience date; first_published timestamptz;
begin
  if not private.homework_staff_access(target_school,target_assignment,staff_mode) then
    raise exception 'Homework access required' using errcode='42501';
  end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.homework_staff_access(target_school,target_assignment,staff_mode) then
    raise exception 'Homework access required' using errcode='42501';
  end if;
  if expected_version is null or expected_version not between 0 and 2147483646 or
    new_title is null or length(btrim(new_title)) not between 1 and 160 or new_title !~ '[^[:space:]]' or
    new_instructions is null or length(btrim(new_instructions)) not between 1 and 10000 or new_instructions !~ '[^[:space:]]' or
    new_due_date is null or not isfinite(new_due_date) or
    new_status is null or new_status not in ('draft','published','withdrawn') then
    raise exception 'Check homework fields' using errcode='22023';
  end if;
  if target_homework is not null then
    select * into previous from public.homework_items h where h.id=target_homework and h.school_id=target_school;
    if not found or previous.assignment_id<>target_assignment then
      raise exception 'Homework unavailable or assignment changed' using errcode='42501';
    end if;
    if previous.record_version<>expected_version then raise exception 'Homework changed; reload' using errcode='40001'; end if;
    if previous.audience_date is not null and new_status='draft' then
      raise exception 'Use withdrawal for previously published homework' using errcode='22023';
    end if;
  elsif expected_version<>0 or new_status='withdrawn' then
    raise exception 'Invalid new homework' using errcode='22023';
  end if;
  select * into assignment from public.teaching_assignments ta where ta.id=target_assignment and ta.school_id=target_school;
  select * into academic from public.academic_years y where y.id=assignment.academic_year_id and y.school_id=target_school;
  if new_due_date not between academic.starts_on and academic.ends_on then
    raise exception 'Due date must fit the academic year' using errcode='22023';
  end if;
  today := private.school_today(target_school);
  first_audience := previous.audience_date;
  first_published := previous.published_at;
  if new_status='published' and first_audience is null then
    if today not between academic.starts_on and academic.ends_on or new_due_date<today then
      raise exception 'First publication needs a current academic year and a due date today or later' using errcode='22023';
    end if;
    first_audience := today;
    first_published := now();
  end if;
  if first_audience is not null and new_due_date<first_audience then
    raise exception 'Due date precedes the original publication' using errcode='22023';
  end if;
  if target_homework is null then
    insert into public.homework_items(school_id,assignment_id,class_id,academic_year_id,title,instructions,
      due_date,status,audience_date,published_at,created_by)
    values(target_school,target_assignment,assignment.class_id,assignment.academic_year_id,btrim(new_title),
      btrim(new_instructions),new_due_date,new_status,first_audience,first_published,auth.uid()) returning id into saved_id;
  else
    update public.homework_items set title=btrim(new_title),instructions=btrim(new_instructions),
      due_date=new_due_date,status=new_status,audience_date=first_audience,published_at=first_published,
      record_version=record_version+1,updated_at=now()
      where id=target_homework and school_id=target_school returning id into saved_id;
  end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'homework.save',saved_id,jsonb_build_object(
      'previous_status',previous.status,'status',new_status,'version',coalesce(previous.record_version,0)+1));
  return saved_id;
end;
$$;

create function public.list_homework(target_school uuid,portal_mode text,
  selected_student uuid default null,page_number integer default 1,target_homework uuid default null)
returns table(id uuid,assignment_id uuid,assignment_label text,title text,instructions text,due_date date,
  status text,audience_date date,record_version integer,can_edit boolean)
language plpgsql stable security definer set search_path='' as $$
declare member uuid; learner uuid;
begin
  if portal_mode is null or portal_mode not in ('school_admin','teacher','student','guardian') then
    raise exception 'Homework access required' using errcode='42501';
  end if;
  member := private.my_member_with_role(target_school,portal_mode::public.school_role);
  if member is null then raise exception 'Homework access required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  if portal_mode<>'guardian' and selected_student is not null then
    raise exception 'Invalid child selection' using errcode='22023';
  end if;
  if portal_mode='student' then
    select st.id into learner from public.students st where st.school_id=target_school and st.membership_id=member;
    if learner is null then raise exception 'Learner unavailable' using errcode='42501'; end if;
  elsif portal_mode='guardian' then
    select sg.student_id into learner from public.student_guardians sg where sg.school_id=target_school
      and sg.guardian_id=private.my_guardian_id(target_school) and sg.access_enabled and sg.student_id=selected_student;
    if learner is null then raise exception 'Learner unavailable' using errcode='42501'; end if;
  end if;
  return query select h.id,h.assignment_id,sub.name||' · '||g.name||' · '||c.name||' · '||y.name,
    h.title,h.instructions,h.due_date,h.status,h.audience_date,h.record_version,
    private.homework_staff_access(target_school,h.assignment_id,portal_mode)
    from public.homework_items h
    join public.teaching_assignments ta on ta.id=h.assignment_id and ta.school_id=h.school_id
    join public.subjects sub on sub.id=ta.subject_id and sub.school_id=ta.school_id
    join public.classes c on c.id=h.class_id and c.school_id=h.school_id
    join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
    join public.academic_years y on y.id=h.academic_year_id and y.school_id=h.school_id
    where h.school_id=target_school and (target_homework is null or h.id=target_homework) and (
      private.homework_staff_access(target_school,h.assignment_id,portal_mode) or
      (portal_mode in ('student','guardian') and h.status='published' and
        private.homework_learner_access(target_school,h.class_id,h.audience_date,learner)))
    order by h.created_at desc,h.id limit 51 offset ((page_number-1)*50);
end;
$$;
revoke all on function public.search_homework_assignments(uuid,text,text,integer),
  public.save_homework(uuid,text,uuid,uuid,integer,text,text,date,text),
  public.list_homework(uuid,text,uuid,integer,uuid) from public,anon;
grant execute on function public.search_homework_assignments(uuid,text,text,integer),
  public.save_homework(uuid,text,uuid,uuid,integer,text,text,date,text),
  public.list_homework(uuid,text,uuid,integer,uuid) to authenticated;
commit;
