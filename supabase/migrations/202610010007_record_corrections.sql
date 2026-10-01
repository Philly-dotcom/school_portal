-- Corrections to labels/references only: no dates, ownership or relationship edits.
begin;
do $$
declare t text;
begin
  foreach t in array array['academic_years','academic_terms','grades','subjects','classes','students','teachers','guardians'] loop
    execute format('alter table public.%I add column record_version integer not null default 1 check(record_version > 0)',t);
  end loop;
end;
$$;

create function public.correct_school_record(
  target_school uuid, record_kind text, target_record uuid,
  expected_version integer, corrected_name text, corrected_reference text default null
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  next_version integer;
  person_record boolean;
  clean_name text := btrim(corrected_name);
  clean_reference text := btrim(corrected_reference);
begin
  if not private.is_school_admin(target_school) then
    raise exception 'School administrator access required' using errcode='42501';
  end if;
  if record_kind is null or record_kind not in
    ('academic_years','academic_terms','grades','subjects','classes','students','teachers','guardians') then
    raise exception 'Unsupported record type' using errcode='22023';
  end if;
  person_record := record_kind in ('students','teachers','guardians');
  if expected_version is null or expected_version < 1 or target_record is null
    or clean_name is null or length(clean_name) not between 1 and (case when person_record then 120 else 80 end)
    or (person_record and (clean_reference is null or length(clean_reference) not between 1 and 40))
    or (not person_record and corrected_reference is not null) then
    raise exception 'Invalid correction fields' using errcode='22023';
  end if;
  if record_kind='grades' and clean_name ~* '^grade[[:space:]]*([0-9]+|r)$' then
    clean_name := regexp_replace(clean_name,'^grade[[:space:]]*([0-9]+|r)$','Grade \1','i');
    if lower(clean_name)='grade r' then clean_name := 'Grade R'; end if;
  end if;
  -- Identifiers come only from the allowlist above. All data is parameterized.
  if person_record then
    execute format('update public.%I set full_name=$1, reference=$2, record_version=record_version+1
      where id=$3 and school_id=$4 and record_version=$5 returning record_version',record_kind)
      into next_version using clean_name,clean_reference,target_record,target_school,expected_version;
  else
    execute format('update public.%I set name=$1, record_version=record_version+1
      where id=$2 and school_id=$3 and record_version=$4 returning record_version',record_kind)
      into next_version using clean_name,target_record,target_school,expected_version;
  end if;
  if next_version is null then
    raise exception 'Record unavailable or changed. Reload before editing.' using errcode='40001';
  end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),record_kind||'.correct',target_record,
      jsonb_build_object('previous_version',expected_version,'record_version',next_version,
        'fields',case when person_record then jsonb_build_array('full_name','reference') else jsonb_build_array('name') end));
  return next_version;
end;
$$;
revoke all on function public.correct_school_record(uuid,text,uuid,integer,text,text) from public,anon;
grant execute on function public.correct_school_record(uuid,text,uuid,integer,text,text) to authenticated;

commit;
