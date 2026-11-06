begin;
create table public.assessment_correction_grants (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null, assessment_id uuid not null, teacher_id uuid not null, membership_id uuid not null,
  student_id uuid, starts_on date not null, ends_on date not null,
  reason text not null check(length(btrim(reason)) between 1 and 500 and reason ~ '[^[:space:]]'),
  issued_by uuid not null, issued_at timestamptz not null default now(),
  revoked_by uuid, revoked_at timestamptz,
  check(isfinite(starts_on) and isfinite(ends_on) and starts_on<=ends_on),
  check((revoked_by is null)=(revoked_at is null)),
  foreign key(assessment_id,school_id) references public.assessment_rosters(assessment_id,school_id),
  foreign key(assessment_id,school_id,student_id) references public.assessment_roster_entries(assessment_id,school_id,student_id),
  foreign key(teacher_id,school_id) references public.teachers(id,school_id),
  foreign key(membership_id,school_id) references public.school_memberships(id,school_id)
);
create index correction_grant_scope on public.assessment_correction_grants(school_id,membership_id,assessment_id) where revoked_at is null;
alter table public.assessment_correction_grants enable row level security;
revoke all on public.assessment_correction_grants from public,anon,authenticated;

create function public.issue_correction_grant(target_school uuid,target_assessment uuid,target_teacher uuid,target_student uuid,
  valid_from date,valid_until date,grant_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare member uuid; saved uuid;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  select t.membership_id into member from public.teachers t
    join public.school_memberships m on (m.id,m.school_id)=(t.membership_id,t.school_id)
    join public.membership_roles r on (r.membership_id,r.school_id)=(m.id,m.school_id)
    where t.id=target_teacher and t.school_id=target_school and m.status='active' and r.role='teacher';
  if member is null or valid_until<private.school_today(target_school)
    or not exists(select 1 from public.assessment_rosters where assessment_id=target_assessment and school_id=target_school)
    or (target_student is not null and not exists(select 1 from public.assessment_roster_entries
        where assessment_id=target_assessment and school_id=target_school and student_id=target_student and active))
    then raise exception 'Invalid grant scope or dates' using errcode='22023'; end if;
  if exists(select 1 from public.assessment_correction_grants g where g.school_id=target_school and g.assessment_id=target_assessment
    and g.membership_id=member and g.teacher_id=target_teacher and g.revoked_at is null and g.starts_on<=valid_until and valid_from<=g.ends_on
    and (g.student_id is null or target_student is null or g.student_id=target_student))
    then raise exception 'Grant overlaps existing access' using errcode='22023'; end if;
  insert into public.assessment_correction_grants(school_id,assessment_id,teacher_id,membership_id,student_id,
    starts_on,ends_on,reason,issued_by) values(target_school,target_assessment,target_teacher,member,target_student,
    valid_from,valid_until,btrim(grant_reason),auth.uid()) returning id into saved;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'assessment.correction.grant',saved);
  return saved;
end;
$$;
create function public.revoke_correction_grant(target_school uuid,target_grant uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  update public.assessment_correction_grants set revoked_by=auth.uid(),revoked_at=now()
    where id=target_grant and school_id=target_school and revoked_at is null;
  if not found then raise exception 'Grant unavailable' using errcode='22023'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'assessment.correction.revoke',target_grant);
end;
$$;

-- Only grants issued to this still-linked, active teacher membership can be used.
create function private.my_correction_grants(school uuid) returns setof public.assessment_correction_grants
language sql stable security definer set search_path='' as $$
  select g.* from public.assessment_correction_grants g
  where g.school_id=school and g.teacher_id=private.my_teacher_id(school)
    and g.membership_id=private.my_member_with_role(school,'teacher') and g.revoked_at is null
    and private.school_today(school) between g.starts_on and g.ends_on
    and (g.student_id is null or exists(select 1 from public.assessment_roster_entries e where
      (e.assessment_id,e.school_id,e.student_id)=(g.assessment_id,g.school_id,g.student_id) and e.active))
$$;
revoke all on function private.my_correction_grants(uuid) from public,anon,authenticated;

create function public.list_correction_grants(target_school uuid,staff_mode text,target_assessment uuid,page_number integer)
returns table(id uuid,assessment_id uuid,title text,teacher text,learner text,starts_on date,ends_on date)
language plpgsql stable security definer set search_path='' as $$
begin
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  if not ((staff_mode='school_admin' and target_assessment is not null and private.is_school_admin(target_school))
    or (staff_mode='teacher' and private.my_teacher_id(target_school) is not null)) or staff_mode is null then
    raise exception 'Staff access required' using errcode='42501'; end if;
  return query
    with visible as (
      select g.* from public.assessment_correction_grants g where staff_mode='school_admin' and g.school_id=target_school
        and g.assessment_id=target_assessment and g.revoked_at is null and g.ends_on>=private.school_today(target_school)
      union all select g.* from private.my_correction_grants(target_school) g where staff_mode='teacher'
        and (target_assessment is null or g.assessment_id=target_assessment)
    )
    select g.id,g.assessment_id,v.title,t.full_name||' ('||t.reference||')',s.full_name||' ('||s.reference||')',g.starts_on,g.ends_on
    from visible g join public.assessment_rosters r on (r.assessment_id,r.school_id)=(g.assessment_id,g.school_id)
    join public.assessment_versions v on (v.assessment_id,v.school_id,v.version)=(r.assessment_id,r.school_id,r.definition_version)
    join public.teachers t on (t.id,t.school_id)=(g.teacher_id,g.school_id)
    left join public.students s on (s.id,s.school_id)=(g.student_id,g.school_id)
    order by g.issued_at desc,g.id limit 26 offset ((page_number-1)*25);
end;
$$;
revoke all on function public.issue_correction_grant(uuid,uuid,uuid,uuid,date,date,text),
  public.revoke_correction_grant(uuid,uuid),public.list_correction_grants(uuid,text,uuid,integer) from public,anon;
grant execute on function public.issue_correction_grant(uuid,uuid,uuid,uuid,date,date,text),
  public.revoke_correction_grant(uuid,uuid),public.list_correction_grants(uuid,text,uuid,integer) to authenticated;

-- Report deliberate version conflicts as HTTP 409 through PostgREST.
create or replace function public.save_assessment(target_school uuid,staff_mode text,target_assessment uuid,target_assignment uuid,
 expected_version integer,target_term uuid,new_title text,new_instructions text,new_date date,
 new_minimum numeric,new_maximum numeric,new_precision integer,authorise_scale boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.assessments%rowtype; ta public.teaching_assignments%rowtype; saved uuid; next_version integer;
begin
 if not private.assessment_planning_access(target_school,target_assignment,staff_mode) then
 raise exception 'Assessment staff access required' using errcode='42501'; end if;
 perform 1 from public.schools where id=target_school for update;
 if not private.assessment_planning_access(target_school,target_assignment,staff_mode) then
 raise exception 'Assessment staff access required' using errcode='42501'; end if;
 if authorise_scale is null or (authorise_scale and (staff_mode<>'school_admin' or not private.is_school_admin(target_school))) then
 raise exception 'Admin scale authorisation required' using errcode='42501'; end if;
 if expected_version is null or expected_version not between 0 and 2147483646 or
 new_title is null or length(btrim(new_title)) not between 1 and 160 or new_title !~ '[^[:space:]]' or
 new_instructions is null or length(btrim(new_instructions)) not between 1 and 10000 or new_instructions !~ '[^[:space:]]' or
 new_date is null or not isfinite(new_date) or new_minimum is null or new_maximum is null or
 new_precision is null or new_precision not between 0 and 6 or
 not(new_minimum>=0 and new_maximum>new_minimum and new_maximum<=1000000000) or
 new_minimum<>round(new_minimum,new_precision) or new_maximum<>round(new_maximum,new_precision) then
 raise exception 'Check assessment fields and scale' using errcode='22023'; end if;
 select * into ta from public.teaching_assignments where id=target_assignment and school_id=target_school;
 if new_date not between ta.starts_on and ta.ends_on or not exists(
 select 1 from public.academic_terms t join public.academic_years y on y.id=t.academic_year_id and y.school_id=t.school_id
 where t.id=target_term and t.school_id=target_school and t.academic_year_id=ta.academic_year_id
 and new_date between t.starts_on and t.ends_on and new_date between y.starts_on and y.ends_on) then
 raise exception 'Assessment date and term must fit assignment and academic year' using errcode='22023'; end if;
 if target_assessment is null then
 if expected_version<>0 then raise exception 'Invalid initial version' using errcode='40001'; end if;
 insert into public.assessments(school_id,assignment_id,class_id,academic_year_id,record_version)
 values(target_school,ta.id,ta.class_id,ta.academic_year_id,1) returning id into saved;
 next_version:=1;
 else
 select * into a from public.assessments where id=target_assessment and school_id=target_school for update;
 if not found or a.assignment_id<>target_assignment then raise exception 'Assessment unavailable' using errcode='42501'; end if;
 if a.record_version<>expected_version then raise exception 'Assessment changed; reload' using errcode='PT409'; end if;
 saved:=a.id; next_version:=a.record_version+1;
 update public.assessments set record_version=next_version where id=saved;
 end if;
 insert into public.assessment_versions(school_id,assessment_id,version,term_id,title,instructions,effective_date,
 minimum,maximum,decimal_places,scale_authorised_by,scale_authorised_at,created_by)
 values(target_school,saved,next_version,target_term,btrim(new_title),btrim(new_instructions),new_date,
 new_minimum,new_maximum,new_precision,case when authorise_scale then auth.uid() end,
 case when authorise_scale then now() end,auth.uid());
 insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
 values(target_school,auth.uid(),'assessment.save',saved,jsonb_build_object('version',next_version,'scale_authorised',authorise_scale));
 return saved;
end;
$$;

create or replace function public.read_assessment_draft(target_school uuid,target_assessment uuid,staff_mode text,page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assessments%rowtype; v public.assessment_versions%rowtype; revision integer; entries jsonb; ordinary boolean;
begin
  ordinary := private.mark_access(target_school,target_assessment,staff_mode,true);
  if not ordinary and not (staff_mode is not distinct from 'teacher' and exists(select 1 from private.my_correction_grants(target_school) g where g.assessment_id=target_assessment)) then
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
      and (ordinary or exists(select 1 from private.my_correction_grants(target_school) g
        where g.assessment_id=a.id and (g.student_id is null or g.student_id=r.student_id)))
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
  seen uuid[] := '{}'; ordinary boolean; saved integer := 0; previous public.assessment_mark_versions%rowtype;
begin
  ordinary := private.mark_access(target_school,target_assessment,staff_mode,false);
  if not ordinary and not (staff_mode is not distinct from 'teacher' and exists(select 1 from private.my_correction_grants(target_school) g where g.assessment_id=target_assessment)) then
    raise exception 'Draft access required' using errcode='42501';
  end if;
  perform 1 from public.schools where id=target_school for update;
  ordinary := private.mark_access(target_school,target_assessment,staff_mode,false);
  if not ordinary and not (staff_mode is not distinct from 'teacher' and exists(select 1 from private.my_correction_grants(target_school) g where g.assessment_id=target_assessment)) then
    raise exception 'Draft access required' using errcode='42501';
  end if;
  select * into r from public.assessment_rosters where assessment_id=target_assessment and school_id=target_school for update;
  if not found or r.draft_version is distinct from expected_revision then
    raise exception 'Roster changed' using errcode='PT409';
  end if;
  if jsonb_typeof(changes) is distinct from 'array' or jsonb_array_length(changes) not between 1 and 25 then
    raise exception 'Invalid batch' using errcode='22023';
  end if;
  select * into strict v from public.assessment_versions where assessment_id=r.assessment_id
    and school_id=r.school_id and version=r.definition_version;
  if v.effective_date>private.school_today(target_school) or v.scale_authorised_by is null then
    raise exception 'Capture unavailable' using errcode='42501'; end if;
  for entry in select value from jsonb_array_elements(changes) loop
    learner := (entry->>'id')::uuid;
    if not ordinary and not exists(select 1 from private.my_correction_grants(target_school) g
      where g.assessment_id=target_assessment and (g.student_id is null or g.student_id=learner)) then
      raise exception 'Learner outside correction grant' using errcode='42501'; end if;
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
