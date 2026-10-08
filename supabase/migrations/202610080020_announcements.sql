begin;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  class_id uuid,
  title text not null check(length(btrim(title)) between 1 and 160),
  body text not null check(length(btrim(body)) between 1 and 10000),
  status text not null check(status in ('draft','published','withdrawn')),
  published_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  record_version integer not null default 1 check(record_version>0),
  unique(id,school_id),
  foreign key(class_id,school_id) references public.classes(id,school_id),
  check(status<>'published' or published_at is not null),
  check(status<>'draft' or published_at is null)
);
create index announcements_school_order on public.announcements(school_id,created_at desc,id);
create index announcements_class on public.announcements(school_id,class_id);
alter table public.announcements enable row level security;
revoke all on public.announcements from public,anon,authenticated;
grant select on public.announcements to authenticated;

-- A null class is a school-wide notice. Only School Admin can manage it.
create function private.announcement_staff_access(target_school uuid,target_class uuid,staff_mode text)
returns boolean language sql stable security definer set search_path='' as $$
  select (target_class is null or exists(select 1 from public.classes c where c.id=target_class and c.school_id=target_school))
    and ((staff_mode='school_admin' and private.is_school_admin(target_school)) or
      (staff_mode='teacher' and target_class in (select private.my_taught_class_ids(target_school))));
$$;
create function private.announcement_learner_access(target_school uuid,target_class uuid,target_student uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select target_student in (select private.my_student_ids(target_school)) and
    (target_class is null or exists(select 1 from public.enrollments e
      where e.school_id=target_school and e.student_id=target_student and e.class_id=target_class
        and private.school_today(target_school) between e.starts_on and e.ends_on));
$$;
revoke all on function private.announcement_staff_access(uuid,uuid,text),
  private.announcement_learner_access(uuid,uuid,uuid) from public,anon;
grant execute on function private.announcement_staff_access(uuid,uuid,text),
  private.announcement_learner_access(uuid,uuid,uuid) to authenticated;
create policy permitted_read on public.announcements for select to authenticated using (
  private.announcement_staff_access(school_id,class_id,'school_admin') or
  private.announcement_staff_access(school_id,class_id,'teacher') or
  (status='published' and (
    (class_id is null and private.my_member_with_role(school_id,'teacher') is not null) or
    exists(select 1 from private.my_student_ids(school_id) learner
      where private.announcement_learner_access(school_id,class_id,learner))))
);

create function public.search_announcement_classes(target_school uuid,staff_mode text,
  search_text text default '',page_number integer default 1)
returns table(id uuid,label text) language plpgsql stable security definer set search_path='' as $$
begin
  if staff_mode is null or staff_mode not in ('school_admin','teacher') or
    private.my_member_with_role(target_school,staff_mode::public.school_role) is null then
    raise exception 'Staff access required' using errcode='42501';
  end if;
  if page_number is null or page_number not between 1 and 100000 or search_text is null or length(search_text)>80 then
    raise exception 'Invalid search' using errcode='22023';
  end if;
  return query select c.id,g.name||' · '||c.name||' · '||y.name
    from public.classes c
    join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
    join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
    where c.school_id=target_school and private.announcement_staff_access(target_school,c.id,staff_mode)
      and position(lower(btrim(search_text)) in lower(g.name||' '||c.name||' '||y.name))>0
    order by y.starts_on desc,g.name,c.name,c.id limit 26 offset ((page_number-1)*25);
end;
$$;

create function public.save_announcement(target_school uuid,staff_mode text,target_announcement uuid,
  target_class uuid,expected_version integer,new_title text,new_body text,new_status text)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.announcements%rowtype; saved_id uuid; first_published timestamptz;
begin
  if not coalesce(private.announcement_staff_access(target_school,target_class,staff_mode),false) then
    raise exception 'Announcement access required' using errcode='42501';
  end if;
  perform 1 from public.schools where id=target_school for update;
  if not coalesce(private.announcement_staff_access(target_school,target_class,staff_mode),false) then
    raise exception 'Announcement access required' using errcode='42501';
  end if;
  if expected_version is null or expected_version not between 0 and 2147483646 or
    new_title is null or length(btrim(new_title)) not between 1 and 160 or new_title !~ '[^[:space:]]' or
    new_body is null or length(btrim(new_body)) not between 1 and 10000 or new_body !~ '[^[:space:]]' or
    new_status is null or new_status not in ('draft','published','withdrawn') then
    raise exception 'Check announcement fields' using errcode='22023';
  end if;
  if target_announcement is not null then
    select * into previous from public.announcements a where a.id=target_announcement and a.school_id=target_school;
    if not found or previous.class_id is distinct from target_class then
      raise exception 'Announcement unavailable or audience changed' using errcode='42501';
    end if;
    if previous.record_version<>expected_version then raise exception 'Announcement changed; reload' using errcode='40001'; end if;
    if previous.published_at is not null and new_status='draft' then
      raise exception 'Withdraw previously published announcements' using errcode='22023';
    end if;
  elsif expected_version<>0 or new_status='withdrawn' then
    raise exception 'Invalid new announcement' using errcode='22023';
  end if;
  first_published := previous.published_at;
  if new_status='published' and first_published is null then first_published := now(); end if;
  if target_announcement is null then
    insert into public.announcements(school_id,class_id,title,body,status,published_at,created_by)
      values(target_school,target_class,btrim(new_title),btrim(new_body),new_status,first_published,auth.uid()) returning id into saved_id;
  else
    update public.announcements set title=btrim(new_title),body=btrim(new_body),status=new_status,
      published_at=first_published,record_version=record_version+1,updated_at=now()
      where id=target_announcement and school_id=target_school returning id into saved_id;
  end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'announcement.save',saved_id,jsonb_build_object(
      'previous_status',previous.status,'status',new_status,'version',coalesce(previous.record_version,0)+1));
  return saved_id;
end;
$$;

create function public.list_announcements(target_school uuid,portal_mode text,
  selected_student uuid default null,page_number integer default 1,target_announcement uuid default null)
returns table(id uuid,class_id uuid,audience_label text,title text,body text,status text,
  published_at timestamptz,record_version integer,can_edit boolean)
language plpgsql stable security definer set search_path='' as $$
declare member uuid; learner uuid;
begin
  if portal_mode is null or portal_mode not in ('school_admin','teacher','student','guardian') then
    raise exception 'Announcement access required' using errcode='42501';
  end if;
  member := private.my_member_with_role(target_school,portal_mode::public.school_role);
  if member is null then raise exception 'Announcement access required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  if portal_mode<>'guardian' and selected_student is not null then raise exception 'Invalid child selection' using errcode='22023'; end if;
  if portal_mode='student' then
    select st.id into learner from public.students st where st.school_id=target_school and st.membership_id=member;
    if learner is null then raise exception 'Learner unavailable' using errcode='42501'; end if;
  elsif portal_mode='guardian' then
    select sg.student_id into learner from public.student_guardians sg where sg.school_id=target_school
      and sg.guardian_id=private.my_guardian_id(target_school) and sg.access_enabled and sg.student_id=selected_student;
    if learner is null then raise exception 'Learner unavailable' using errcode='42501'; end if;
  end if;
  return query select a.id,a.class_id,
    case when a.class_id is null then 'Whole school' else g.name||' · '||c.name||' · '||y.name end,
    a.title,a.body,a.status,a.published_at,a.record_version,
    coalesce(private.announcement_staff_access(target_school,a.class_id,portal_mode),false)
    from public.announcements a
    left join public.classes c on c.id=a.class_id and c.school_id=a.school_id
    left join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
    left join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
    where a.school_id=target_school and (target_announcement is null or a.id=target_announcement) and (
      private.announcement_staff_access(target_school,a.class_id,portal_mode) or
      (a.status='published' and (
        (portal_mode='teacher' and a.class_id is null) or
        (portal_mode in ('student','guardian') and private.announcement_learner_access(target_school,a.class_id,learner)))))
    order by a.created_at desc,a.id limit 51 offset ((page_number-1)*50);
end;
$$;
revoke all on function public.search_announcement_classes(uuid,text,text,integer),
  public.save_announcement(uuid,text,uuid,uuid,integer,text,text,text),
  public.list_announcements(uuid,text,uuid,integer,uuid) from public,anon;
grant execute on function public.search_announcement_classes(uuid,text,text,integer),
  public.save_announcement(uuid,text,uuid,uuid,integer,text,text,text),
  public.list_announcements(uuid,text,uuid,integer,uuid) to authenticated;
commit;
