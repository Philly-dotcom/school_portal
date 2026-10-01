-- No records are renamed, merged or removed. Review existing collisions first.
begin;
lock table public.grades in share row exclusive mode;
create function private.grade_name_key(value text) returns text
language sql immutable strict set search_path = '' as $$
  select lower(regexp_replace(
    regexp_replace(value, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    '^grade[[:space:]]*([0-9]+|r)$', 'Grade \1', 'i'));
$$;
revoke all on function private.grade_name_key(text) from public;
grant execute on function private.grade_name_key(text) to authenticated;

do $$
begin
  if exists(select 1 from public.grades
    group by school_id, private.grade_name_key(name) having count(*) > 1) then
    raise exception 'Equivalent grade names already exist. Review grade references before applying migration 006; no records have been changed.' using errcode='23505';
  end if;
end;
$$;
drop index public.grade_name;
create unique index grade_name on public.grades(school_id,private.grade_name_key(name));
commit;
