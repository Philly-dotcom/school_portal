begin;

create table public.assessment_definition_amendments (
  school_id uuid not null, assessment_id uuid not null, definition_version integer not null,
  roster_version integer not null, draft_version integer not null,
  reason text not null check(length(btrim(reason)) between 1 and 500 and reason ~ '[^[:space:]]'),
  changed_by uuid not null, changed_at timestamptz not null default now(),
  primary key (assessment_id, definition_version),
  foreign key (assessment_id,school_id,definition_version) references public.assessment_versions(assessment_id,school_id,version)
);
alter table public.assessment_definition_amendments enable row level security;
revoke all on public.assessment_definition_amendments from public,anon,authenticated;

-- The ordinary planning writer advances the pointer before inserting a version.
-- Only the amendment transaction can supply the private evidence required here.
create or replace function private.guard_frozen_assessment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.assessment_rosters r where r.assessment_id=old.id)
    and not (new.record_version=old.record_version+1 and
      (to_jsonb(new)-'record_version')=(to_jsonb(old)-'record_version') and
      exists(select 1 from public.assessment_definition_amendments h
        where (h.assessment_id,h.school_id,h.definition_version)=(old.id,old.school_id,new.record_version))) then
    raise exception 'Assessment definition is frozen' using errcode='55000';
  end if;
  return new;
end;
$$;

create function private.dated_roster_differences(school uuid, assessment uuid, effective date, learner uuid)
returns table(student_id uuid,previous_placement jsonb,next_placement jsonb)
language sql stable set search_path='' as $$
  with frozen as (
    select r.student_id,jsonb_build_array(r.enrollment_id,r.placement_version,r.placement_start,r.placement_end) placement
    from public.assessment_roster_entries r where r.school_id=school and r.assessment_id=assessment
      and r.active and (learner is null or r.student_id=learner)
  ), eligible as (
    select e.student_id,jsonb_build_array(e.id,e.record_version,e.starts_on,e.ends_on) placement
    from public.assessments a join public.enrollments e
      on (e.school_id,e.class_id,e.academic_year_id)=(a.school_id,a.class_id,a.academic_year_id)
    where a.id=assessment and a.school_id=school and effective between e.starts_on and e.ends_on
      and (learner is null or e.student_id=learner)
  )
  select coalesce(f.student_id,e.student_id),f.placement,e.placement
  from frozen f full join eligible e using(student_id) where f.placement is distinct from e.placement
$$;
revoke all on function private.dated_roster_differences(uuid,uuid,date,uuid) from public,anon,authenticated;
create or replace function private.roster_differences(school uuid, assessment uuid, learner uuid default null)
returns table(student_id uuid,previous_placement jsonb,next_placement jsonb)
language sql stable set search_path='' as $$
  select d.* from public.assessments a join public.assessment_versions v
    on (v.assessment_id,v.school_id,v.version)=(a.id,a.school_id,a.record_version)
    cross join lateral private.dated_roster_differences(school,assessment,v.effective_date,learner) d
  where a.id=assessment and a.school_id=school
$$;

create function public.preview_frozen_definition(target_school uuid,target_assessment uuid,expected_revision integer,
  proposed_date date,low numeric,high numeric,precision_places integer,page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.assessment_rosters%rowtype; v public.assessment_versions%rowtype; result jsonb;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  select * into r from public.assessment_rosters where assessment_id=target_assessment and school_id=target_school;
  if not found then raise exception 'Frozen assessment required' using errcode='42501'; end if;
  if r.draft_version is distinct from expected_revision then raise exception 'Draft changed' using errcode='PT409'; end if;
  select * into strict v from public.assessment_versions where assessment_id=target_assessment and school_id=target_school and version=r.definition_version;
  if low is null or high is null or precision_places is null or precision_places not between 0 and 6
    or not(low>=0 and high>low and high<=1000000000) or low<>round(low,precision_places) or high<>round(high,precision_places)
    or page_number is null or page_number not between 1 and 100000
    or (proposed_date,low,high,precision_places) is not distinct from (v.effective_date,v.minimum,v.maximum,v.decimal_places)
    then raise exception 'Invalid or unchanged proposal' using errcode='22023'; end if;
  if proposed_date>private.school_today(target_school) or not exists (
    select 1 from public.assessments a join public.teaching_assignments t on (t.id,t.school_id)=(a.assignment_id,a.school_id)
    join public.academic_years y on (y.id,y.school_id)=(a.academic_year_id,a.school_id)
    join public.academic_terms term on (term.id,term.school_id,term.academic_year_id)=(v.term_id,a.school_id,y.id)
    where a.id=target_assessment and a.school_id=target_school and proposed_date between t.starts_on and t.ends_on
      and proposed_date between y.starts_on and y.ends_on and proposed_date between term.starts_on and term.ends_on
  ) then raise exception 'Date outside capture window' using errcode='22023'; end if;

  with delta as (
    select * from private.dated_roster_differences(target_school,target_assessment,proposed_date,null)
    where proposed_date<>v.effective_date
  ), impact as (
    select s.id,s.full_name,s.reference,d.previous_placement,d.next_placement,
      case when d.student_id is null then 'keep' when d.next_placement is null then 'remove'
        when d.previous_placement is null then 'add' else 'update' end as effect,
      case when e.student_id is not null then m.score end as score
    from (select student_id from public.assessment_roster_entries where assessment_id=target_assessment and active
          union select student_id from delta) members
    join public.students s on s.id=members.student_id and s.school_id=target_school
    left join delta d on d.student_id=s.id
    left join public.assessment_roster_entries e on e.assessment_id=target_assessment and e.student_id=s.id and e.active
    left join lateral (select h.score from public.assessment_mark_versions h where h.assessment_id=target_assessment
      and h.student_id=s.id order by h.draft_version desc limit 1) m on true
  ), reviewed as (
    select *,coalesce(effect<>'remove' and (score not between low and high or score<>round(score,precision_places)),false) as incompatible
    from impact
  )
  select jsonb_build_object('token',md5(jsonb_build_array(target_school,target_assessment,r.draft_version,proposed_date,low,high,precision_places,
      jsonb_agg(jsonb_build_array(id,effect,previous_placement,next_placement) order by id))::text),
    'total',count(*),'eligible',count(*) filter(where effect<>'remove'),'blocked',count(*) filter(where incompatible),
    'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from (
      select id,full_name,reference,effect,score::text,incompatible from reviewed order by id limit 25 offset ((page_number-1)*25)
    ) p),'[]'::jsonb)) into result from reviewed;
  return result;
end;
$$;

create function public.amend_frozen_definition(target_school uuid,target_assessment uuid,expected_revision integer,
  proposed_date date,low numeric,high numeric,precision_places integer,preview_token text,amendment_reason text)
returns integer language plpgsql security definer set search_path='' as $$
declare impact jsonb; r public.assessment_rosters%rowtype; v public.assessment_versions%rowtype; delta record; revision integer;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  impact:=public.preview_frozen_definition(target_school,target_assessment,expected_revision,proposed_date,low,high,precision_places,1);
  if (impact->>'token') is distinct from preview_token then raise exception 'Impact changed' using errcode='PT409'; end if;
  if (impact->>'blocked')::int>0 or (impact->>'eligible')::int=0 then raise exception 'Resolve impact first' using errcode='22023'; end if;
  select * into strict r from public.assessment_rosters where assessment_id=target_assessment and school_id=target_school;
  select * into strict v from public.assessment_versions where assessment_id=target_assessment and school_id=target_school and version=r.definition_version;
  insert into public.assessment_versions(school_id,assessment_id,version,term_id,title,instructions,effective_date,minimum,maximum,
    decimal_places,scale_authorised_by,scale_authorised_at,created_by)
    values(target_school,target_assessment,v.version+1,v.term_id,v.title,v.instructions,proposed_date,low,high,
      precision_places,auth.uid(),now(),auth.uid());
  insert into public.assessment_definition_amendments values
    (target_school,target_assessment,v.version+1,r.roster_version+1,r.draft_version+1,btrim(amendment_reason),auth.uid(),now());
  update public.assessments set record_version=v.version+1 where id=target_assessment;
  update public.assessment_rosters set definition_version=v.version+1,roster_version=roster_version+1,draft_version=draft_version+1
    where assessment_id=target_assessment returning draft_version into revision;
  if proposed_date<>v.effective_date then
    for delta in select * from private.roster_differences(target_school,target_assessment) order by student_id loop
      revision:=public.amend_draft_roster(target_school,target_assessment,delta.student_id,revision,
        delta.previous_placement,delta.next_placement,amendment_reason);
    end loop;
  end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'assessment.definition.amend',target_assessment,jsonb_build_object('definition',v.version+1,'draft',revision));
  return revision;
end;
$$;
revoke all on function public.preview_frozen_definition(uuid,uuid,integer,date,numeric,numeric,integer,integer),
 public.amend_frozen_definition(uuid,uuid,integer,date,numeric,numeric,integer,text,text) from public,anon;
grant execute on function public.preview_frozen_definition(uuid,uuid,integer,date,numeric,numeric,integer,integer),
 public.amend_frozen_definition(uuid,uuid,integer,date,numeric,numeric,integer,text,text) to authenticated;
commit;
