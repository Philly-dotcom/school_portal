-- Academic setup only. No Auth accounts, messages or sample records are created.
begin;
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  name text not null check (length(trim(name)) between 1 and 80),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  unique(id, school_id)
);
create unique index academic_year_name on public.academic_years(school_id, lower(trim(name)));
create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  academic_year_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  foreign key(academic_year_id, school_id) references public.academic_years(id, school_id),
  unique(id, school_id)
);
create unique index academic_term_name on public.academic_terms(school_id, academic_year_id, lower(trim(name)));
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  name text not null check (length(trim(name)) between 1 and 80),
  unique(id, school_id)
);
create unique index grade_name on public.grades(school_id, lower(trim(name)));
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  name text not null check (length(trim(name)) between 1 and 80),
  unique(id, school_id)
);
create unique index subject_name on public.subjects(school_id, lower(trim(name)));
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  academic_year_id uuid not null,
  grade_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80),
  foreign key(academic_year_id, school_id) references public.academic_years(id, school_id),
  foreign key(grade_id, school_id) references public.grades(id, school_id),
  unique(id, school_id)
);
create unique index class_name on public.classes(school_id, academic_year_id, grade_id, lower(trim(name)));

create function private.validate_term_dates() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.academic_years y
    where y.id = NEW.academic_year_id and y.school_id = NEW.school_id
      and NEW.starts_on >= y.starts_on and NEW.ends_on <= y.ends_on) then
    raise exception 'Term must fit within its academic year' using errcode = '23514';
  end if;
  return NEW;
end;
$$;
revoke all on function private.validate_term_dates() from public;
create trigger term_dates before insert on public.academic_terms
for each row execute function private.validate_term_dates();

create function private.audit_academic_creation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events(school_id, actor_user_id, action, record_id)
  values (NEW.school_id, auth.uid(), TG_TABLE_NAME || '.insert', NEW.id);
  return null;
end;
$$;
revoke all on function private.audit_academic_creation() from public;

-- Administrator-only until the teaching/enrollment access relationships exist.
-- Creation only: editing, archiving and rollover need separate lifecycle rules.
do $$
declare t text;
begin
  foreach t in array array['academic_years','academic_terms','grades','subjects','classes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy admin_read on public.%I for select to authenticated using (private.is_school_admin(school_id))', t);
    execute format('create policy admin_create on public.%I for insert to authenticated with check (private.is_school_admin(school_id))', t);
    execute format('create trigger academic_audit after insert on public.%I for each row execute function private.audit_academic_creation()', t);
  end loop;
end;
$$;
grant insert(school_id,name,starts_on,ends_on) on public.academic_years to authenticated;
grant insert(school_id,academic_year_id,name,starts_on,ends_on) on public.academic_terms to authenticated;
grant insert(school_id,name) on public.grades, public.subjects to authenticated;
grant insert(school_id,academic_year_id,grade_id,name) on public.classes to authenticated;
commit;
