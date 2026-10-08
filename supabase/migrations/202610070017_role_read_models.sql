begin;
 
create function public.list_my_timetable(
  target_school uuid, portal_mode text, selected_student uuid default null,
  page_number integer default 1
) returns table (
  id uuid, weekday integer, start_minute integer, end_minute integer,
  lesson_date date, subject_name text, class_name text, grade_name text,
  teacher_name text
) language plpgsql stable security definer set search_path = '' as $$
declare
  caller_member uuid;
  caller_teacher uuid;
  learner uuid;
  today date;
  monday date;
begin
  if portal_mode is null or portal_mode not in ('teacher','student','guardian')
    or page_number is null or page_number not between 1 and 100000 then
    raise exception 'Invalid timetable request' using errcode='22023';
  end if;
  caller_member := private.my_member_with_role(target_school, portal_mode::public.school_role);
  if caller_member is null then
    raise exception 'Workspace unavailable' using errcode='42501';
  end if;
  if portal_mode = 'teacher' then
    if selected_student is not null then
      raise exception 'Invalid timetable request' using errcode='22023';
    end if;
    caller_teacher := private.my_teacher_id(target_school);
    if caller_teacher is null then raise exception 'Workspace unavailable' using errcode='42501'; end if;
  elsif portal_mode = 'student' then
    if selected_student is not null then
      raise exception 'Invalid timetable request' using errcode='22023';
    end if;
    select s.id into learner from public.students s
      where s.school_id=target_school and s.membership_id=caller_member;
    if learner is null then raise exception 'Workspace unavailable' using errcode='42501'; end if;
  else
    select sg.student_id into learner from public.student_guardians sg
      where sg.school_id=target_school and sg.guardian_id=private.my_guardian_id(target_school)
        and sg.access_enabled and sg.student_id=selected_student;
    if learner is null then raise exception 'Workspace unavailable' using errcode='42501'; end if;
  end if;
  today := private.school_today(target_school);
  monday := today - (extract(isodow from today)::integer - 1);
  return query
    select l.id,l.weekday,l.start_minute,l.end_minute,
      monday+l.weekday-1,sub.name,c.name,g.name,t.full_name
    from public.timetable_lessons l
    join public.teaching_assignments ta on ta.id=l.assignment_id and ta.school_id=l.school_id
    join public.teachers t on t.id=ta.teacher_id and t.school_id=ta.school_id
    join public.subjects sub on sub.id=ta.subject_id and sub.school_id=ta.school_id
    join public.classes c on c.id=l.class_id and c.school_id=l.school_id
    join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
    where l.school_id=target_school
      and monday+l.weekday-1 between l.starts_on and l.ends_on
      and monday+l.weekday-1 between ta.starts_on and ta.ends_on
      and (
        (portal_mode='teacher' and l.teacher_id=caller_teacher and today between ta.starts_on and ta.ends_on)
        or
        (portal_mode in ('student','guardian') and exists (
          select 1 from public.enrollments e
          where e.school_id=target_school and e.class_id=l.class_id and e.student_id=learner
            and today between e.starts_on and e.ends_on
            and monday+l.weekday-1 between e.starts_on and e.ends_on
        ))
      )
    order by l.weekday,l.start_minute,l.id
    limit 51 offset ((page_number-1)*50);
end;
$$;
revoke all on function public.list_my_timetable(uuid,text,uuid,integer) from public,anon;
grant execute on function public.list_my_timetable(uuid,text,uuid,integer) to authenticated;
commit;
