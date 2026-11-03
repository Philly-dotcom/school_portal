begin;

-- One initial roster per assessment. The definition and placement evidence are
-- retained independently of subsequent enrolment and assignment changes.
create table public.assessment_rosters (
  assessment_id uuid primary key,
  school_id uuid not null,
  definition_version integer not null,
  draft_version integer not null default 1 check (draft_version > 0),
  frozen_by uuid not null, frozen_at timestamptz not null default now(),
  unique (assessment_id, school_id),
  foreign key (assessment_id, school_id, definition_version)
    references public.assessment_versions(assessment_id, school_id, version)
);

create table public.assessment_roster_entries (
  assessment_id uuid not null, school_id uuid not null, student_id uuid not null,
  enrollment_id uuid not null, placement_version integer not null,
  placement_start date not null, placement_end date not null,
  primary key (assessment_id, school_id, student_id),
  foreign key (assessment_id, school_id) references public.assessment_rosters(assessment_id, school_id),
  foreign key (enrollment_id, school_id, student_id) references public.enrollments(id, school_id, student_id)
);

-- One append-only revision per changed learner per draft save. An untouched
-- roster entry is Missing. UNIQUE plus the roster FK identifies its learner.
create table public.assessment_mark_versions (
  assessment_id uuid not null, school_id uuid not null, student_id uuid not null,
  draft_version integer not null, state text not null check (state in ('missing','scored','absent','exempt')),
  score numeric, reason text not null, recorded_by uuid not null, recorded_at timestamptz not null default now(),
  primary key (assessment_id, school_id, student_id, draft_version),
  foreign key (assessment_id, school_id, student_id)
    references public.assessment_roster_entries(assessment_id, school_id, student_id),
  check ((state='scored') = (score is not null)),
  check (length(reason)<=500 and (state<>'exempt' or reason ~ '[^[:space:]]'))
);

alter table public.assessment_rosters enable row level security;
alter table public.assessment_roster_entries enable row level security;
alter table public.assessment_mark_versions enable row level security;
revoke all on public.assessment_rosters, public.assessment_roster_entries, public.assessment_mark_versions
  from public, anon, authenticated;

create function private.guard_frozen_assessment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.assessment_rosters r where r.assessment_id=old.id) then
    raise exception 'Assessment definition is frozen' using errcode='55000';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_frozen_assessment() from public,anon,authenticated;
create trigger guard_frozen_assessment before update on public.assessments
for each row execute function private.guard_frozen_assessment();

-- Each entry point resolves the assessment against the caller's active school
-- role, the retained assignment, its effective date and the school-local day.
create function private.mark_access(target_school uuid, target_assessment uuid, staff_mode text, preview boolean)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.assessments a
    join public.assessment_versions v on (v.assessment_id,v.school_id,v.version)=(a.id,a.school_id,a.record_version)
    join public.teaching_assignments t on (t.id,t.school_id)=(a.assignment_id,a.school_id)
    where a.id=target_assessment and a.school_id=target_school
      and (preview or (v.effective_date<=private.school_today(a.school_id) and v.scale_authorised_by is not null))
      and ((staff_mode='school_admin' and private.is_school_admin(a.school_id))
        or (staff_mode='teacher' and t.teacher_id=private.my_teacher_id(a.school_id)
          and v.effective_date between t.starts_on and t.ends_on
          and (private.school_today(a.school_id) between t.starts_on and t.ends_on
            or (preview and private.school_today(a.school_id)<t.starts_on)))))
$$;
revoke all on function private.mark_access(uuid,uuid,text,boolean) from public,anon,authenticated;

create function public.freeze_assessment_roster(target_school uuid,target_assessment uuid,staff_mode text,expected_version integer)
returns integer language plpgsql security definer set search_path='' as $$
declare a public.assessments%rowtype; effective date; learners integer;
begin
  if not private.mark_access(target_school,target_assessment,staff_mode,false) then
    raise exception 'Cannot freeze roster' using errcode='42501';
  end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.mark_access(target_school,target_assessment,staff_mode,false) then
    raise exception 'Cannot freeze roster' using errcode='42501';
  end if;
  select * into strict a from public.assessments where id=target_assessment and school_id=target_school;
  if a.record_version is distinct from expected_version or exists(
    select 1 from public.assessment_rosters where assessment_id=a.id) then
    raise exception 'Roster or definition changed' using errcode='40001';
  end if;
  select effective_date into strict effective from public.assessment_versions
    where assessment_id=a.id and school_id=target_school and version=expected_version;
  if not exists(select 1 from public.teaching_assignments t where t.id=a.assignment_id
    and t.school_id=target_school and effective between t.starts_on and t.ends_on) then
    raise exception 'Assessment date outside assignment' using errcode='22023';
  end if;
  if exists(select 1 from public.enrollments e join public.enrollments other
    on other.school_id=e.school_id and other.student_id=e.student_id and other.id<>e.id
    and other.academic_year_id=e.academic_year_id and effective between other.starts_on and other.ends_on
    where e.school_id=target_school and e.class_id=a.class_id and e.academic_year_id=a.academic_year_id
    and effective between e.starts_on and e.ends_on) then
    raise exception 'Conflicting placements on assessment date' using errcode='22023';
  end if;
  insert into public.assessment_rosters(assessment_id,school_id,definition_version,frozen_by)
    values(a.id,target_school,expected_version,auth.uid());
  insert into public.assessment_roster_entries
    (assessment_id,school_id,student_id,enrollment_id,placement_version,placement_start,placement_end)
    select a.id,target_school,e.student_id,e.id,e.record_version,e.starts_on,e.ends_on
    from public.enrollments e where e.school_id=target_school and e.class_id=a.class_id
      and e.academic_year_id=a.academic_year_id and effective between e.starts_on and e.ends_on;
  get diagnostics learners = row_count;
  if learners=0 then raise exception 'No eligible learners' using errcode='22023'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'assessment.freeze',a.id,jsonb_build_object('definition',expected_version,'learners',learners));
  return 1;
end;
$$;

create function public.read_assessment_draft(target_school uuid,target_assessment uuid,staff_mode text,page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assessments%rowtype; v public.assessment_versions%rowtype; revision integer; entries jsonb;
begin
  if not private.mark_access(target_school,target_assessment,staff_mode,true) then
    raise exception 'Assessment unavailable' using errcode='42501';
  end if;
  if page_number is null or page_number not between 1 and 100000 then
    raise exception 'Invalid page' using errcode='22023';
  end if;
  select * into strict a from public.assessments where id=target_assessment and school_id=target_school;
  select * into strict v from public.assessment_versions where assessment_id=a.id and school_id=a.school_id and version=a.record_version;
  select draft_version into revision from public.assessment_rosters where assessment_id=a.id;
  with members as (
    select e.student_id from public.enrollments e where revision is null
      and e.school_id=a.school_id and e.class_id=a.class_id and e.academic_year_id=a.academic_year_id
      and v.effective_date between e.starts_on and e.ends_on
    union all
    select r.student_id from public.assessment_roster_entries r where revision is not null
      and r.assessment_id=a.id and r.school_id=a.school_id
  ), bounded as (
    select s.id,s.full_name,s.reference from members m join public.students s on s.id=m.student_id and s.school_id=a.school_id
    order by s.id limit 26 offset ((page_number-1)*25)
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.full_name,'reference',b.reference,
    'state',coalesce(h.state,'missing'),'score',h.score::text,'reason',coalesce(h.reason,'')) order by b.id),'[]')
  into entries from bounded b left join lateral (
    select state,score,reason from public.assessment_mark_versions m where m.assessment_id=a.id
      and m.school_id=a.school_id and m.student_id=b.id order by draft_version desc limit 1
  ) h on true;
  return jsonb_build_object('title',v.title,'date',v.effective_date,'today',private.school_today(target_school),
    'authorised',v.scale_authorised_by is not null,'minimum',v.minimum::text,'maximum',v.maximum::text,
    'precision',v.decimal_places,'definition',a.record_version,'revision',revision,'entries',entries);
end;
$$;

create function public.save_assessment_draft(target_school uuid,target_assessment uuid,staff_mode text,expected_revision integer,changes jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare r public.assessment_rosters%rowtype; v public.assessment_versions%rowtype;
  entry jsonb; learner uuid; disposition text; raw numeric; explanation text;
  seen uuid[] := '{}'; saved integer := 0; previous public.assessment_mark_versions%rowtype;
begin
  if not private.mark_access(target_school,target_assessment,staff_mode,false) then
    raise exception 'Draft access required' using errcode='42501';
  end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.mark_access(target_school,target_assessment,staff_mode,false) then
    raise exception 'Draft access required' using errcode='42501';
  end if;
  select * into r from public.assessment_rosters where assessment_id=target_assessment and school_id=target_school for update;
  if not found or r.draft_version is distinct from expected_revision then
    raise exception 'Roster changed' using errcode='40001';
  end if;
  if jsonb_typeof(changes) is distinct from 'array' or jsonb_array_length(changes) not between 1 and 25 then
    raise exception 'Invalid batch' using errcode='22023';
  end if;
  select * into strict v from public.assessment_versions where assessment_id=r.assessment_id
    and school_id=r.school_id and version=r.definition_version;
  for entry in select value from jsonb_array_elements(changes) loop
    learner := (entry->>'id')::uuid;
    if learner=any(seen) or not exists(select 1 from public.assessment_roster_entries e
      where e.assessment_id=r.assessment_id and e.school_id=r.school_id and e.student_id=learner) then
      raise exception 'Invalid roster entry' using errcode='22023';
    end if;
    seen := array_append(seen,learner);
    disposition := entry->>'state';
    explanation := btrim(coalesce(entry->>'reason',''));
    raw := null;
    if disposition is null or disposition not in ('missing','absent','exempt','scored')
      or length(explanation)>500 or (disposition='exempt' and explanation !~ '[^[:space:]]') then
      raise exception 'Invalid disposition' using errcode='22023';
    end if;
    if disposition='scored' then
      if (entry->>'score') is null or (entry->>'score') !~ '^[0-9]{1,10}([.][0-9]{1,6})?$' then
        raise exception 'Invalid score' using errcode='22023';
      end if;
      raw := (entry->>'score')::numeric;
      if raw not between v.minimum and v.maximum or raw<>round(raw,v.decimal_places) then
        raise exception 'Score outside authorised scale' using errcode='22023';
      end if;
    elsif entry->>'score' is not null then
      raise exception 'Non-score states cannot carry a mark' using errcode='22023';
    end if;
    select * into previous from public.assessment_mark_versions m where m.assessment_id=r.assessment_id
      and m.school_id=r.school_id and m.student_id=learner order by m.draft_version desc limit 1;
    if (coalesce(previous.state,'missing'),previous.score,coalesce(previous.reason,''))
        is distinct from (disposition,raw,explanation) then
      insert into public.assessment_mark_versions values
        (r.assessment_id,r.school_id,learner,r.draft_version+1,disposition,raw,explanation,auth.uid(),now());
      saved := saved+1;
    end if;
  end loop;
  if saved>0 then
    update public.assessment_rosters set draft_version=draft_version+1 where assessment_id=r.assessment_id;
    insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
      values(r.school_id,auth.uid(),'assessment.draft.save',r.assessment_id,jsonb_build_object('version',r.draft_version+1,'changed',saved));
    return r.draft_version+1;
  end if;
  return r.draft_version;
end;
$$;
revoke all on function public.freeze_assessment_roster(uuid,uuid,text,integer),
  public.read_assessment_draft(uuid,uuid,text,integer), public.save_assessment_draft(uuid,uuid,text,integer,jsonb) from public,anon;
grant execute on function public.freeze_assessment_roster(uuid,uuid,text,integer),
  public.read_assessment_draft(uuid,uuid,text,integer), public.save_assessment_draft(uuid,uuid,text,integer,jsonb) to authenticated;
commit;
