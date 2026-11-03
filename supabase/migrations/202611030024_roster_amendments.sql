begin;
alter table public.assessment_roster_entries add column active boolean not null default true;
alter table public.assessment_rosters add column roster_version integer not null default 1 check (roster_version>0);

-- Before/after evidence is private. Keep removed entries as FK targets for earlier marks.
create table public.assessment_roster_amendments (
  assessment_id uuid not null, school_id uuid not null, student_id uuid not null,
  roster_version integer not null, draft_version integer not null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  actor_id uuid not null, amended_at timestamptz not null default now(),
  previous_placement jsonb, next_placement jsonb,
  primary key(assessment_id,roster_version),
  foreign key(assessment_id,school_id,student_id)
    references public.assessment_roster_entries(assessment_id,school_id,student_id)
);
alter table public.assessment_roster_amendments enable row level security;
revoke all on public.assessment_roster_amendments from public,anon,authenticated;

create function private.roster_differences(school uuid, assessment uuid, learner uuid default null)
returns table(student_id uuid, previous_placement jsonb, next_placement jsonb)
language sql stable set search_path='' as $$
  with frozen as (
    select r.student_id, jsonb_build_array(r.enrollment_id,r.placement_version,r.placement_start,r.placement_end) placement
    from public.assessment_roster_entries r
    where r.school_id=school and r.assessment_id=assessment and r.active and (learner is null or r.student_id=learner)
  ), eligible as (
    select e.student_id, jsonb_build_array(e.id,e.record_version,e.starts_on,e.ends_on) placement
    from public.assessments a
    join public.assessment_versions v on (v.assessment_id,v.school_id,v.version)=(a.id,a.school_id,a.record_version)
    join public.enrollments e on (e.school_id,e.class_id,e.academic_year_id)=(a.school_id,a.class_id,a.academic_year_id)
      and v.effective_date between e.starts_on and e.ends_on
    where a.id=assessment and a.school_id=school and (learner is null or e.student_id=learner)
  )
  select coalesce(f.student_id,e.student_id), f.placement,e.placement
  from frozen f full join eligible e using(student_id)
  where f.placement is distinct from e.placement
$$;
revoke all on function private.roster_differences(uuid,uuid,uuid) from public,anon,authenticated;

create function public.preview_roster_amendments(target_school uuid,target_assessment uuid,page_number integer default 1)
returns table(learner_id uuid, learner_name text, reference text, previous_placement jsonb, next_placement jsonb, revision integer)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'School Admin required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  return query
    select d.student_id,s.full_name,s.reference,d.previous_placement,d.next_placement,r.draft_version
    from private.roster_differences(target_school,target_assessment) d
    join public.students s on s.id=d.student_id and s.school_id=target_school
    join public.assessment_rosters r on r.assessment_id=target_assessment and r.school_id=target_school
    order by s.id limit 26 offset ((page_number-1)*25);
end;
$$;

create function public.amend_draft_roster(target_school uuid,target_assessment uuid,target_learner uuid,
  expected_revision integer,expected_previous jsonb,expected_next jsonb,amendment_reason text)
returns integer language plpgsql security definer set search_path='' as $$
declare roster public.assessment_rosters%rowtype; delta record; new_version integer;
begin
  if not private.is_school_admin(target_school) then raise exception 'School Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.mark_access(target_school,target_assessment,'school_admin',false) then
    raise exception 'Assessment unavailable' using errcode='42501';
  end if;
  if amendment_reason is null or amendment_reason !~ '[^[:space:]]' or length(btrim(amendment_reason))>500 then
    raise exception 'Reason required' using errcode='22023';
  end if;
  select * into roster from public.assessment_rosters where assessment_id=target_assessment and school_id=target_school for update;
  if not found or expected_revision is distinct from roster.draft_version then
    raise exception 'Roster changed' using errcode='40001';
  end if;
  -- The enrollment history guard serialises placement changes on the same school lock
  -- and rejects overlapping placements in the same academic year.
  select * into delta from private.roster_differences(target_school,target_assessment,target_learner) where student_id=target_learner;
  if not found or delta.previous_placement is distinct from expected_previous or delta.next_placement is distinct from expected_next then
    raise exception 'Placement preview changed' using errcode='40001';
  end if;
  new_version := roster.draft_version+1;
  if delta.next_placement is null then
    update public.assessment_roster_entries set active=false where assessment_id=target_assessment and student_id=target_learner;
  else
    insert into public.assessment_roster_entries(assessment_id,school_id,student_id,enrollment_id,placement_version,placement_start,placement_end)
      values(target_assessment,target_school,target_learner,(delta.next_placement->>0)::uuid,(delta.next_placement->>1)::integer,
        (delta.next_placement->>2)::date,(delta.next_placement->>3)::date)
    on conflict(assessment_id,school_id,student_id) do update set active=true,enrollment_id=excluded.enrollment_id,
      placement_version=excluded.placement_version,placement_start=excluded.placement_start,placement_end=excluded.placement_end;
    if delta.previous_placement is null then
      insert into public.assessment_mark_versions(assessment_id,school_id,student_id,draft_version,state,reason,recorded_by)
        values(target_assessment,target_school,target_learner,new_version,'missing','',auth.uid());
    end if;
  end if;
  insert into public.assessment_roster_amendments(assessment_id,school_id,student_id,roster_version,draft_version,
    reason,actor_id,previous_placement,next_placement)
    values(target_assessment,target_school,target_learner,roster.roster_version+1,new_version,
      btrim(amendment_reason),auth.uid(),delta.previous_placement,delta.next_placement);
  update public.assessment_rosters set roster_version=roster_version+1,draft_version=new_version where assessment_id=target_assessment;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'assessment.roster.amend',target_assessment,jsonb_build_object('roster_version',roster.roster_version+1));
  return new_version;
end;
$$;
revoke all on function public.preview_roster_amendments(uuid,uuid,integer),public.amend_draft_roster(uuid,uuid,uuid,integer,jsonb,jsonb,text) from public,anon;
grant execute on function public.preview_roster_amendments(uuid,uuid,integer),public.amend_draft_roster(uuid,uuid,uuid,integer,jsonb,jsonb,text) to authenticated;

-- Existing capture endpoints now read and edit only active frozen entries.
create or replace function public.read_assessment_draft(target_school uuid,target_assessment uuid,staff_mode text,page_number integer default 1)
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
      and r.active and r.assessment_id=a.id and r.school_id=a.school_id
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

create or replace function public.save_assessment_draft(target_school uuid,target_assessment uuid,staff_mode text,expected_revision integer,changes jsonb)
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
      where e.assessment_id=r.assessment_id and e.school_id=r.school_id and e.student_id=learner and e.active) then
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

commit;
