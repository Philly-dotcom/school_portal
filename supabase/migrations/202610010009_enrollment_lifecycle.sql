begin;
alter table public.enrollments
  add column record_version integer not null default 1 check(record_version > 0),
  add column closure text check(closure in ('transfer','withdrawal')),
  drop constraint enrollments_student_id_academic_year_id_key;
-- A student may have historical placements, but only one unclosed placement per year.
create unique index enrollment_open_placement on public.enrollments(student_id,academic_year_id) where closure is null;

create function private.guard_enrollment_history() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- SECURITY DEFINER permits the lock without granting callers school UPDATE access.
  if current_setting('role',true) = 'authenticated' and not private.is_school_admin(new.school_id) then
    raise exception 'Admin required' using errcode='42501';
  end if;
  perform 1 from public.schools where id=new.school_id for update;
  if current_setting('role',true) = 'authenticated' and not private.is_school_admin(new.school_id) then
    raise exception 'Admin required' using errcode='42501';
  end if;
  if not isfinite(new.starts_on) or not isfinite(new.ends_on) or not exists (
    select 1 from public.academic_years y where y.id=new.academic_year_id and y.school_id=new.school_id
      and new.starts_on>=y.starts_on and new.ends_on<=y.ends_on) then
    raise exception 'Enrollment must fit the academic year' using errcode='23514';
  end if;
  if exists(select 1 from public.enrollments e where e.school_id=new.school_id
    and e.student_id=new.student_id and e.academic_year_id=new.academic_year_id and e.id<>new.id
    and e.starts_on<=new.ends_on and new.starts_on<=e.ends_on) then
    raise exception 'Enrollment dates overlap' using errcode='23P01';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_enrollment_history() from public,anon,authenticated;
create trigger enrollment_history before insert or update on public.enrollments
  for each row execute function private.guard_enrollment_history();

create function public.change_enrollment(target_school uuid,target_enrollment uuid,
  expected_version integer,change_kind text,change_date date,destination_class uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.enrollments%rowtype; replacement uuid;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  select * into previous from public.enrollments where id=target_enrollment and school_id=target_school;
  if not found then raise exception 'Enrollment unavailable' using errcode='22023'; end if;
  if expected_version is null or previous.record_version<>expected_version or previous.closure is not null then
    raise exception 'Enrollment changed; reload' using errcode='40001';
  end if;
  if change_kind is null or change_kind not in ('transfer','withdrawal') or change_date is null
    or not isfinite(change_date) or change_date<previous.starts_on or change_date>previous.ends_on then
    raise exception 'Invalid change or date' using errcode='22023';
  end if;
  if change_kind='transfer' then
    if change_date<=previous.starts_on or destination_class is null or destination_class=previous.class_id
      or not exists(select 1 from public.classes c where c.id=destination_class and c.school_id=target_school
        and c.academic_year_id=previous.academic_year_id) then
      raise exception 'Choose another class in the same year and a later start day' using errcode='22023';
    end if;
  elsif destination_class is not null then
    raise exception 'Withdrawal has no destination class' using errcode='22023';
  end if;
  update public.enrollments set ends_on=case when change_kind='transfer' then change_date-1 else change_date end,
    closure=change_kind,record_version=record_version+1 where id=previous.id;
  if change_kind='transfer' then
    insert into public.enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on)
      values(target_school,previous.student_id,destination_class,previous.academic_year_id,change_date,previous.ends_on)
      returning id into replacement;
  end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'enrollments.'||change_kind,previous.id,
      jsonb_build_object('before',to_jsonb(previous),'change_date',change_date,'destination_class',destination_class,'replacement_id',replacement));
  return coalesce(replacement,previous.id);
end;
$$;
revoke all on function public.change_enrollment(uuid,uuid,integer,text,date,uuid) from public,anon;
grant execute on function public.change_enrollment(uuid,uuid,integer,text,date,uuid) to authenticated;
-- Direct UPDATE/DELETE remain denied; INSERT cannot supply lifecycle/version columns.
commit;
