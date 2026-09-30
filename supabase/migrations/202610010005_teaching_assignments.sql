begin;
create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  teacher_id uuid not null,
  subject_id uuid not null,
  class_id uuid not null,
  academic_year_id uuid not null,
  starts_on date not null,
  ends_on date not null check(ends_on >= starts_on),
  foreign key(teacher_id,school_id) references public.teachers(id,school_id),
  foreign key(subject_id,school_id) references public.subjects(id,school_id),
  foreign key(class_id,school_id,academic_year_id) references public.classes(id,school_id,academic_year_id),
  foreign key(academic_year_id,school_id) references public.academic_years(id,school_id),
  unique(teacher_id,subject_id,class_id)
);
create index teaching_school_class on public.teaching_assignments(school_id,class_id);
create index teaching_school_subject on public.teaching_assignments(school_id,subject_id);
create function private.validate_teaching_dates() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not private.is_school_admin(NEW.school_id) then
    raise exception 'School administrator access required' using errcode='42501';
  end if;
  if not exists(select 1 from public.academic_years y
    where y.id=NEW.academic_year_id and y.school_id=NEW.school_id
    and NEW.starts_on >= y.starts_on and NEW.ends_on <= y.ends_on) then
    raise exception 'Assignment must fit within its academic year' using errcode='23514';
  end if;
  return NEW;
end;
$$;
revoke all on function private.validate_teaching_dates() from public;
create trigger teaching_dates before insert on public.teaching_assignments
for each row execute function private.validate_teaching_dates();
create trigger teaching_audit after insert on public.teaching_assignments
for each row execute function private.audit_academic_creation();
alter table public.teaching_assignments enable row level security;
revoke all on public.teaching_assignments from public,anon,authenticated;
grant select on public.teaching_assignments to authenticated;
grant insert(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on)
  on public.teaching_assignments to authenticated;
create policy admin_read on public.teaching_assignments for select to authenticated
  using(private.is_school_admin(school_id));
create policy admin_create on public.teaching_assignments for insert to authenticated
  with check(private.is_school_admin(school_id));
commit;
