begin;
alter table public.teaching_assignments add constraint teaching_identity_school unique(id,school_id,teacher_id,class_id);
create table public.timetable_lessons (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  assignment_id uuid not null,
  teacher_id uuid not null,
  class_id uuid not null,
  weekday integer not null check(weekday between 1 and 7),
  start_minute integer not null check(start_minute between 0 and 1439),
  end_minute integer not null check(end_minute between 1 and 1440 and end_minute>start_minute),
  starts_on date not null,
  ends_on date not null check(ends_on>=starts_on),
  foreign key(assignment_id,school_id,teacher_id,class_id)
    references public.teaching_assignments(id,school_id,teacher_id,class_id)
);
create index timetable_school_day on public.timetable_lessons(school_id,weekday,start_minute);
alter table public.timetable_lessons enable row level security;
revoke all on public.timetable_lessons from public,anon,authenticated;
grant select on public.timetable_lessons to authenticated;
create policy admin_read on public.timetable_lessons for select to authenticated using(private.is_school_admin(school_id));

create function public.create_timetable_lesson(target_school uuid,target_assignment uuid,
  lesson_weekday integer,lesson_start integer,lesson_end integer,first_date date,last_date date)
returns uuid language plpgsql security definer set search_path='' as $$
declare assignment public.teaching_assignments%rowtype; lesson_id uuid;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  -- Serialize writes for this school; all application timetable mutations use this lock.
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  select * into assignment from public.teaching_assignments where id=target_assignment and school_id=target_school;
  if not found then raise exception 'Assignment unavailable' using errcode='22023'; end if;
  if lesson_weekday is null or lesson_weekday not between 1 and 7
    or lesson_start is null or lesson_start not between 0 and 1439
    or lesson_end is null or lesson_end not between 1 and 1440 or lesson_end<=lesson_start
    or first_date is null or last_date is null or not isfinite(first_date) or not isfinite(last_date)
    or first_date>last_date or first_date<assignment.starts_on or last_date>assignment.ends_on then
    raise exception 'Invalid lesson dates or times' using errcode='22023';
  end if;
  if first_date+((lesson_weekday-extract(isodow from first_date)::integer+7)%7)>last_date then
    raise exception 'Date range contains no occurrence of this weekday' using errcode='22023';
  end if;
  if exists(select 1 from public.timetable_lessons l where l.school_id=target_school
    and l.weekday=lesson_weekday and l.start_minute<lesson_end and lesson_start<l.end_minute
    and (l.teacher_id=assignment.teacher_id or l.class_id=assignment.class_id)
    and greatest(first_date,l.starts_on)<=least(last_date,l.ends_on)
    and greatest(first_date,l.starts_on)+((lesson_weekday-extract(isodow from greatest(first_date,l.starts_on))::integer+7)%7)
      <=least(last_date,l.ends_on)) then
    raise exception 'Teacher or class already has a lesson at this time' using errcode='23P01';
  end if;
  insert into public.timetable_lessons(school_id,assignment_id,teacher_id,class_id,weekday,start_minute,end_minute,starts_on,ends_on)
    values(target_school,assignment.id,assignment.teacher_id,assignment.class_id,lesson_weekday,lesson_start,lesson_end,first_date,last_date)
    returning id into lesson_id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(target_school,auth.uid(),'timetable_lessons.insert',lesson_id);
  return lesson_id;
end;
$$;

create function public.remove_timetable_lesson(target_school uuid,target_lesson uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare removed public.timetable_lessons%rowtype;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  delete from public.timetable_lessons where id=target_lesson and school_id=target_school returning * into removed;
  if not found then raise exception 'Lesson unavailable' using errcode='22023'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'timetable_lessons.remove',removed.id,to_jsonb(removed));
  return removed.id;
end;
$$;
revoke all on function public.create_timetable_lesson(uuid,uuid,integer,integer,integer,date,date) from public,anon;
revoke all on function public.remove_timetable_lesson(uuid,uuid) from public,anon;
grant execute on function public.create_timetable_lesson(uuid,uuid,integer,integer,integer,date,date) to authenticated;
grant execute on function public.remove_timetable_lesson(uuid,uuid) to authenticated;
commit;
