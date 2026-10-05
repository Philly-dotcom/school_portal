-- Read-only search for timetable choices. Uses the caller's RLS context.
create function public.search_timetable_assignments(
  target_school uuid, search_text text default '', page_number integer default 1
)
returns table(id uuid, label text, starts_on date, ends_on date)
language plpgsql stable security invoker set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then
    raise exception 'Admin required' using errcode='42501';
  end if;
  if search_text is null or length(search_text)>80 or page_number is null
    or page_number<1 or page_number>100000 then
    raise exception 'Invalid search' using errcode='22023';
  end if;
  return query
    select a.id,
      s.name || ' · ' || c.name || ' · ' || g.name || ' · ' || y.name || ' · '
        || t.full_name || ' (' || t.reference || ') · '
        || a.starts_on::text || ' – ' || a.ends_on::text,
      a.starts_on,a.ends_on
    from public.teaching_assignments a
    join public.teachers t on t.id=a.teacher_id and t.school_id=a.school_id
    join public.subjects s on s.id=a.subject_id and s.school_id=a.school_id
    join public.classes c on c.id=a.class_id and c.school_id=a.school_id
    join public.grades g on g.id=c.grade_id and g.school_id=a.school_id
    join public.academic_years y on y.id=c.academic_year_id and y.school_id=a.school_id
    where a.school_id=target_school
      and strpos(lower(concat_ws(' ',t.full_name,t.reference,s.name,c.name,g.name,y.name)),lower(btrim(search_text)))>0
    order by t.full_name,s.name,c.name,y.name,a.starts_on,a.id
    limit 26 offset ((page_number-1)*25);
end;
$$;
revoke all on function public.search_timetable_assignments(uuid,text,integer) from public,anon;
grant execute on function public.search_timetable_assignments(uuid,text,integer) to authenticated;
