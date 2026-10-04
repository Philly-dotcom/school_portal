begin;
alter table public.teaching_assignments
  add column record_version integer not null default 1 check(record_version > 0),
  add column closure text check(closure in ('end','replace')),
  drop constraint teaching_assignments_teacher_id_subject_id_class_id_key;

-- Serialize assignment changes with timetable writes and check inclusive periods.
create function private.guard_teaching_history() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if current_setting('role',true)='authenticated' and not private.is_school_admin(new.school_id) then
    raise exception 'Admin required' using errcode='42501';
  end if;
  perform 1 from public.schools where id=new.school_id for update;
  if current_setting('role',true)='authenticated' and not private.is_school_admin(new.school_id) then
    raise exception 'Admin required' using errcode='42501';
  end if;
  if new.starts_on is null or new.ends_on is null or new.starts_on>new.ends_on
    or not isfinite(new.starts_on) or not isfinite(new.ends_on) or not exists (
    select 1 from public.academic_years y where y.id=new.academic_year_id and y.school_id=new.school_id
      and new.starts_on>=y.starts_on and new.ends_on<=y.ends_on) then
    raise exception 'Assignment must fit within its academic year' using errcode='23514';
  end if;
  if exists(select 1 from public.teaching_assignments a where a.school_id=new.school_id
    and a.teacher_id=new.teacher_id and a.subject_id=new.subject_id and a.class_id=new.class_id
    and a.id<>new.id and a.starts_on<=new.ends_on and new.starts_on<=a.ends_on) then
    raise exception 'Teaching assignment dates overlap' using errcode='23P01';
  end if;
  if tg_op='UPDATE' and exists(select 1 from public.timetable_lessons l
    where l.assignment_id=new.id and l.school_id=new.school_id
      and (l.starts_on<new.starts_on or l.ends_on>new.ends_on)) then
    raise exception 'Existing lessons extend beyond the assignment' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_teaching_history() from public,anon,authenticated;
drop trigger teaching_dates on public.teaching_assignments;
drop function private.validate_teaching_dates();
create trigger teaching_history before insert or update on public.teaching_assignments
  for each row execute function private.guard_teaching_history();

create function public.change_teaching_assignment(target_school uuid,target_assignment uuid,
  expected_version integer,change_kind text,change_date date,replacement_teacher uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.teaching_assignments%rowtype; replacement uuid;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  select * into previous from public.teaching_assignments where id=target_assignment and school_id=target_school;
  if not found then raise exception 'Assignment unavailable' using errcode='22023'; end if;
  if expected_version is null or previous.record_version<>expected_version or previous.closure is not null then
    raise exception 'Assignment changed; reload' using errcode='40001';
  end if;
  if change_kind is null or change_kind not in ('end','replace') or change_date is null
    or not isfinite(change_date) or change_date<previous.starts_on or change_date>previous.ends_on then
    raise exception 'Invalid change or date' using errcode='22023';
  end if;
  if change_kind='replace' then
    if change_date<=previous.starts_on or replacement_teacher is null or replacement_teacher=previous.teacher_id
      or not exists(select 1 from public.teachers where id=replacement_teacher and school_id=target_school) then
      raise exception 'Choose another school teacher and a later start date' using errcode='22023';
    end if;
  elsif replacement_teacher is not null then
    raise exception 'Ending has no replacement teacher' using errcode='22023';
  end if;
  update public.teaching_assignments
    set ends_on=case when change_kind='replace' then change_date-1 else change_date end,
      closure=change_kind,record_version=record_version+1 where id=previous.id;
  if change_kind='replace' then
    insert into public.teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on)
      values(target_school,replacement_teacher,previous.subject_id,previous.class_id,previous.academic_year_id,change_date,previous.ends_on)
      returning id into replacement;
  end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'teaching_assignments.'||change_kind,previous.id,
      jsonb_build_object('before',to_jsonb(previous),'change_date',change_date,
        'replacement_teacher',replacement_teacher,'replacement_id',replacement));
  return coalesce(replacement,previous.id);
end;
$$;
revoke all on function public.change_teaching_assignment(uuid,uuid,integer,text,date,uuid) from public,anon;
grant execute on function public.change_teaching_assignment(uuid,uuid,integer,text,date,uuid) to authenticated;
-- Existing SELECT/INSERT grants and RLS remain. No direct UPDATE/DELETE or lifecycle-column INSERT grants.
commit;
