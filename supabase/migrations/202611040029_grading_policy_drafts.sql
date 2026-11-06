begin;

-- Draft source records only. Approval and executable calculation configuration
-- require the school's supplied rules in a later migration.
create table public.grading_policies (
  id uuid primary key,
  school_id uuid not null references public.schools(id),
  academic_year_id uuid not null,
  grade_id uuid not null,
  subject_id uuid not null,
  record_version integer not null check (record_version > 0),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique(id,school_id),
  foreign key(academic_year_id,school_id) references public.academic_years(id,school_id),
  foreign key(grade_id,school_id) references public.grades(id,school_id),
  foreign key(subject_id,school_id) references public.subjects(id,school_id)
);
create table public.grading_policy_versions (
  policy_id uuid not null,
  school_id uuid not null,
  version integer not null check (version > 0),
  title text not null check(length(btrim(title)) between 1 and 160),
  effective_from date not null check(isfinite(effective_from)),
  effective_until date not null check(isfinite(effective_until)),
  source_reference text not null check(length(source_reference)<=1000),
  school_rules text not null check(length(school_rules)<=12000),
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  primary key(policy_id,school_id,version),
  foreign key(policy_id,school_id) references public.grading_policies(id,school_id),
  check(effective_from<=effective_until)
);
alter table public.grading_policies add foreign key(id,school_id,record_version)
  references public.grading_policy_versions(policy_id,school_id,version) deferrable initially deferred;
alter table public.grading_policies enable row level security;
alter table public.grading_policy_versions enable row level security;
revoke all on public.grading_policies,public.grading_policy_versions from public,anon,authenticated;

create function public.save_grading_policy_draft(
  target_school uuid,target_policy uuid,expected_version integer,
  target_year uuid,target_grade uuid,target_subject uuid,
  new_title text,new_start date,new_end date,new_source text,new_rules text
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  policy public.grading_policies%rowtype;
  previous public.grading_policy_versions%rowtype;
  next_version integer;
begin
  if not private.is_school_admin(target_school) then
    raise exception 'School Admin required' using errcode='42501';
  end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then
    raise exception 'School Admin required' using errcode='42501';
  end if;
  if target_policy is null or expected_version is null or expected_version<0 or
     new_title is null or length(btrim(new_title)) not between 1 and 160 or
     new_source is null or length(new_source)>1000 or
     new_rules is null or length(new_rules)>12000 or
     new_start is null or new_end is null or not isfinite(new_start) or not isfinite(new_end) or new_start>new_end then
    raise exception 'Check the policy fields' using errcode='22023';
  end if;
  if not exists(select 1 from public.academic_years y where y.id=target_year and y.school_id=target_school
      and new_start>=y.starts_on and new_end<=y.ends_on) or
     not exists(select 1 from public.grades g where g.id=target_grade and g.school_id=target_school) or
     not exists(select 1 from public.subjects s where s.id=target_subject and s.school_id=target_school) then
    raise exception 'Check school scope and academic-year dates' using errcode='22023';
  end if;
  select * into policy from public.grading_policies where id=target_policy and school_id=target_school for update;
  if found then
    if (policy.academic_year_id,policy.grade_id,policy.subject_id) is distinct from (target_year,target_grade,target_subject) then
      raise exception 'Policy scope is fixed; create a separate draft' using errcode='22023';
    end if;
    select * into strict previous from public.grading_policy_versions
      where (policy_id,school_id,version)=(policy.id,policy.school_id,policy.record_version);
    -- A retried create request for the same saved draft is safe and creates no duplicate.
    if expected_version=0 and policy.record_version=1 and
      (previous.title,previous.effective_from,previous.effective_until,previous.source_reference,previous.school_rules)
      is not distinct from (btrim(new_title),new_start,new_end,btrim(new_source),btrim(new_rules)) then
      return policy.id;
    end if;
    if policy.record_version is distinct from expected_version then
      raise exception 'Policy draft changed' using errcode='PT409';
    end if;
    if (previous.title,previous.effective_from,previous.effective_until,previous.source_reference,previous.school_rules)
      is not distinct from (btrim(new_title),new_start,new_end,btrim(new_source),btrim(new_rules)) then
      return policy.id;
    end if;
    next_version:=policy.record_version+1;
    update public.grading_policies set record_version=next_version where id=policy.id;
  else
    if expected_version<>0 then raise exception 'Policy draft unavailable or changed' using errcode='PT409'; end if;
    next_version:=1;
    insert into public.grading_policies(id,school_id,academic_year_id,grade_id,subject_id,record_version,created_by)
      values(target_policy,target_school,target_year,target_grade,target_subject,next_version,auth.uid());
  end if;
  insert into public.grading_policy_versions(policy_id,school_id,version,title,effective_from,effective_until,source_reference,school_rules,recorded_by)
    values(target_policy,target_school,next_version,btrim(new_title),new_start,new_end,btrim(new_source),btrim(new_rules),auth.uid());
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'grading_policy.draft.save',target_policy,jsonb_build_object('version',next_version));
  return target_policy;
end;
$$;

create function public.list_grading_policy_drafts(target_school uuid,page_number integer)
returns table(id uuid,title text,scope_label text,record_version integer,effective_from date,effective_until date)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'School Admin required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  return query select p.id,v.title,y.name||' / '||g.name||' / '||s.name,p.record_version,v.effective_from,v.effective_until
    from public.grading_policies p
    join public.grading_policy_versions v on (v.policy_id,v.school_id,v.version)=(p.id,p.school_id,p.record_version)
    join public.academic_years y on (y.id,y.school_id)=(p.academic_year_id,p.school_id)
    join public.grades g on (g.id,g.school_id)=(p.grade_id,p.school_id)
    join public.subjects s on (s.id,s.school_id)=(p.subject_id,p.school_id)
    where p.school_id=target_school
    order by v.recorded_at desc,p.id limit 26 offset ((page_number-1)*25);
end;
$$;

create function public.read_grading_policy_draft(target_school uuid,target_policy uuid,page_number integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare current_policy jsonb; history jsonb;
begin
  if not private.is_school_admin(target_school) then raise exception 'School Admin required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  select jsonb_build_object('id',p.id,'year',p.academic_year_id,'grade',p.grade_id,'subject',p.subject_id,
      'scope',y.name||' / '||g.name||' / '||s.name,'version',p.record_version,
      'title',v.title,'start',v.effective_from,'end',v.effective_until,'source',v.source_reference,'rules',v.school_rules)
    into current_policy
    from public.grading_policies p
    join public.grading_policy_versions v on (v.policy_id,v.school_id,v.version)=(p.id,p.school_id,p.record_version)
    join public.academic_years y on (y.id,y.school_id)=(p.academic_year_id,p.school_id)
    join public.grades g on (g.id,g.school_id)=(p.grade_id,p.school_id)
    join public.subjects s on (s.id,s.school_id)=(p.subject_id,p.school_id)
    where p.id=target_policy and p.school_id=target_school;
  if current_policy is null then raise exception 'Policy unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into history from (
    select v.version,v.title,v.effective_from as start,v.effective_until as end,
      v.source_reference as source,v.school_rules as rules,v.recorded_at,v.recorded_by
      from public.grading_policy_versions v where v.policy_id=target_policy and v.school_id=target_school
      order by v.version desc limit 26 offset ((page_number-1)*25)
  ) rows;
  return jsonb_build_object('current',current_policy,'history',history);
end;
$$;

revoke all on function public.save_grading_policy_draft(uuid,uuid,integer,uuid,uuid,uuid,text,date,date,text,text),
  public.list_grading_policy_drafts(uuid,integer),public.read_grading_policy_draft(uuid,uuid,integer) from public,anon;
grant execute on function public.save_grading_policy_draft(uuid,uuid,integer,uuid,uuid,uuid,text,date,date,text,text),
  public.list_grading_policy_drafts(uuid,integer),public.read_grading_policy_draft(uuid,uuid,integer) to authenticated;
commit;
