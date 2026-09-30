-- School-owned registers are separate from authentication identities.
begin;
do $$
declare t text;
begin
  foreach t in array array['students','teachers','guardians'] loop
    execute format('create table public.%I (
      id uuid primary key default gen_random_uuid(),
      school_id uuid not null references public.schools(id),
      full_name text not null check(length(trim(full_name)) between 1 and 120),
      reference text not null check(length(trim(reference)) between 1 and 40),
      created_at timestamptz not null default now(),
      unique(id, school_id))', t);
    execute format('create unique index %I on public.%I(school_id,lower(trim(reference)))', t || '_reference', t);
  end loop;
end;
$$;

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  student_id uuid not null,
  guardian_id uuid not null,
  relationship text not null check(length(trim(relationship)) between 1 and 60),
  foreign key(student_id,school_id) references public.students(id,school_id),
  foreign key(guardian_id,school_id) references public.guardians(id,school_id),
  unique(student_id,guardian_id)
);
create index guardian_students on public.student_guardians(school_id,guardian_id);

alter table public.classes add constraint class_year_school unique(id,school_id,academic_year_id);
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  student_id uuid not null,
  class_id uuid not null,
  academic_year_id uuid not null,
  starts_on date not null,
  ends_on date not null check(ends_on >= starts_on),
  foreign key(student_id,school_id) references public.students(id,school_id),
  foreign key(class_id,school_id,academic_year_id) references public.classes(id,school_id,academic_year_id),
  foreign key(academic_year_id,school_id) references public.academic_years(id,school_id),
  -- Initial placement only; transfers require a separate history-preserving workflow.
  unique(student_id,academic_year_id)
);
create index class_enrollments on public.enrollments(school_id,class_id);
create function private.validate_enrollment_dates() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- BEFORE triggers run before RLS WITH CHECK. Reject application callers before
  -- looking up parent dates so permission failures are not calendar errors.
  if current_user = 'authenticated' and not private.is_school_admin(NEW.school_id) then
    raise exception 'School administrator access required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.academic_years y
    where y.id = NEW.academic_year_id and y.school_id = NEW.school_id
      and NEW.starts_on >= y.starts_on and NEW.ends_on <= y.ends_on) then
    raise exception 'Enrollment must fit within its academic year' using errcode = '23514';
  end if;
  return NEW;
end;
$$;
revoke all on function private.validate_enrollment_dates() from public;
create trigger enrollment_dates before insert on public.enrollments
for each row execute function private.validate_enrollment_dates();

do $$
declare t text;
begin
  foreach t in array array['students','teachers','guardians','student_guardians','enrollments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public,anon,authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy admin_read on public.%I for select to authenticated using(private.is_school_admin(school_id))',t);
    execute format('create policy admin_create on public.%I for insert to authenticated with check(private.is_school_admin(school_id))',t);
    execute format('create trigger register_audit after insert on public.%I for each row execute function private.audit_academic_creation()',t);
  end loop;
end;
$$;
grant insert(school_id,full_name,reference) on public.students, public.teachers, public.guardians to authenticated;
grant insert(school_id,student_id,guardian_id,relationship) on public.student_guardians to authenticated;
grant insert(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) on public.enrollments to authenticated;
commit;
