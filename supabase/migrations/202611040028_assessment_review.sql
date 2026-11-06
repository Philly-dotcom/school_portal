begin;

-- Submissions retain the complete frozen roster and exact mark references.
-- Reporting policy binding and publication are a separate, later operation.
create table public.assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null, assessment_id uuid not null,
  package_version integer not null check (package_version > 0),
  definition_version integer not null, draft_version integer not null,
  roster_version integer not null,
  status text not null default 'pending' check (status in ('pending','approved','returned','superseded')),
  submitted_by uuid not null, submitted_at timestamptz not null default now(),
  unique(id,school_id), unique(id,school_id,assessment_id), unique(assessment_id,school_id,package_version),
  foreign key(assessment_id,school_id,definition_version)
    references public.assessment_versions(assessment_id,school_id,version)
);
create unique index assessment_one_current_submission on public.assessment_submissions(assessment_id)
  where status in ('pending','approved');
create table public.assessment_submission_entries (
  submission_id uuid not null, school_id uuid not null, assessment_id uuid not null,
  student_id uuid not null, mark_version integer not null,
  placement jsonb not null,
  primary key(submission_id,student_id),
  foreign key(submission_id,school_id,assessment_id) references public.assessment_submissions(id,school_id,assessment_id),
  foreign key(assessment_id,school_id,student_id,mark_version)
    references public.assessment_mark_versions(assessment_id,school_id,student_id,draft_version)
);
alter table public.assessment_reviewer_grants add unique(id,school_id);
create table public.assessment_review_decisions (
  submission_id uuid primary key, school_id uuid not null,
  decision text not null check(decision in ('approved','returned')),
  reason text not null check(length(reason)<=500 and (decision<>'returned' or reason ~ '[^[:space:]]')),
  reviewer_grant_id uuid not null,
  decided_by uuid not null, decided_at timestamptz not null default now(),
  foreign key(submission_id,school_id) references public.assessment_submissions(id,school_id),
  foreign key(reviewer_grant_id,school_id) references public.assessment_reviewer_grants(id,school_id)
);
alter table public.assessment_submissions enable row level security;
alter table public.assessment_submission_entries enable row level security;
alter table public.assessment_review_decisions enable row level security;
revoke all on public.assessment_submissions,public.assessment_submission_entries,public.assessment_review_decisions
  from public,anon,authenticated;

create function private.can_submit_assessment(school uuid,assessment uuid,staff_mode text)
returns boolean language sql stable security definer set search_path='' as $$
  select private.mark_access(school,assessment,staff_mode,false)
    or (staff_mode='teacher' and exists(select 1 from private.my_correction_grants(school) g where g.assessment_id=assessment))
$$;

-- All existing mark, placement and definition amendments advance this row.
-- Keep completed decisions as evidence even when their package is superseded.
create function private.invalidate_assessment_submission() returns trigger
language plpgsql security definer set search_path='' as $$
declare changed uuid;
begin
  if (new.draft_version,new.roster_version,new.definition_version) is distinct from
     (old.draft_version,old.roster_version,old.definition_version) then
    update public.assessment_submissions set status='superseded'
      where assessment_id=new.assessment_id and school_id=new.school_id and status in ('pending','approved')
      returning id into changed;
    if changed is not null then
      insert into public.audit_events(school_id,actor_user_id,action,record_id)
        values(new.school_id,auth.uid(),'assessment.review.supersede',changed);
    end if;
  end if;
  return new;
end;
$$;
create trigger invalidate_assessment_submission after update on public.assessment_rosters
  for each row execute function private.invalidate_assessment_submission();

create function public.submit_assessment(target_school uuid,target_assessment uuid,staff_mode text,expected_revision integer,expected_previous integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare roster public.assessment_rosters%rowtype; saved uuid; learners integer; next_package integer;
begin
  if not coalesce(private.can_submit_assessment(target_school,target_assessment,staff_mode),false) then
    raise exception 'Submission access required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not coalesce(private.can_submit_assessment(target_school,target_assessment,staff_mode),false) then
    raise exception 'Submission access required' using errcode='42501'; end if;
  select * into roster from public.assessment_rosters where assessment_id=target_assessment and school_id=target_school for update;
  if not found or roster.draft_version is distinct from expected_revision then
    raise exception 'Roster changed' using errcode='PT409'; end if;
  if exists(select 1 from public.assessment_submissions s where s.assessment_id=target_assessment and s.status in ('pending','approved')) then
    raise exception 'Already submitted' using errcode='PT409'; end if;
  select coalesce(max(s.package_version),0)+1 into next_package from public.assessment_submissions s
    where s.assessment_id=target_assessment and s.school_id=target_school;
  if expected_previous is distinct from next_package-1 then
    raise exception 'Submission history changed' using errcode='PT409'; end if;
  insert into public.assessment_submissions(school_id,assessment_id,package_version,definition_version,draft_version,roster_version,submitted_by)
    values(target_school,target_assessment,next_package,roster.definition_version,roster.draft_version,roster.roster_version,auth.uid()) returning id into saved;
  insert into public.assessment_submission_entries(submission_id,school_id,assessment_id,student_id,mark_version,placement)
    select saved,e.school_id,e.assessment_id,e.student_id,m.draft_version,
      jsonb_build_array(e.enrollment_id,e.placement_version,e.placement_start,e.placement_end)
    from public.assessment_roster_entries e
    join lateral (select v.* from public.assessment_mark_versions v
      where v.assessment_id=e.assessment_id and v.school_id=e.school_id and v.student_id=e.student_id
      order by v.draft_version desc limit 1) m on m.state in ('scored','absent','exempt')
    where e.assessment_id=target_assessment and e.school_id=target_school and e.active;
  get diagnostics learners = row_count;
  if learners=0 or learners<>(select count(*) from public.assessment_roster_entries e
    where e.assessment_id=target_assessment and e.school_id=target_school and e.active) then
    raise exception 'Resolve every missing mark before submission' using errcode='22023'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'assessment.submit',saved,jsonb_build_object('package',next_package,'learners',learners));
  return saved;
end;
$$;

create function public.read_assessment_submission_status(target_school uuid,target_assessment uuid,staff_mode text)
returns table(package_version integer,status text,reason text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not coalesce(private.can_submit_assessment(target_school,target_assessment,staff_mode),false) then
    raise exception 'Submission access required' using errcode='42501'; end if;
  return query select s.package_version,s.status,d.reason from public.assessment_submissions s
    left join public.assessment_review_decisions d on d.submission_id=s.id
    where s.assessment_id=target_assessment and s.school_id=target_school
    order by s.package_version desc limit 1;
end;
$$;

create function public.list_assessment_reviews(target_school uuid,staff_mode text,page_number integer)
returns table(id uuid,title text,package_version integer,status text)
language plpgsql stable security definer set search_path='' as $$
begin
  if staff_mode is null or staff_mode not in ('teacher','school_admin') or
    private.my_member_with_role(target_school,staff_mode::public.school_role) is null then
    raise exception 'Staff access required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  return query select s.id,v.title,s.package_version,s.status from public.assessment_submissions s
    join public.assessment_versions v on (v.assessment_id,v.school_id,v.version)=(s.assessment_id,s.school_id,s.definition_version)
    where s.school_id=target_school and private.my_assessment_reviewer_grant(target_school,s.assessment_id,s.definition_version,staff_mode) is not null
    order by (s.status='pending') desc,s.submitted_at desc,s.id limit 26 offset ((page_number-1)*25);
end;
$$;

create function public.read_assessment_review(target_school uuid,target_submission uuid,staff_mode text,page_number integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare package public.assessment_submissions%rowtype; definition public.assessment_versions%rowtype;
  entries jsonb; previous uuid; changes jsonb; decision public.assessment_review_decisions%rowtype;
begin
  select * into package from public.assessment_submissions where id=target_submission and school_id=target_school;
  if not found or private.my_assessment_reviewer_grant(target_school,package.assessment_id,package.definition_version,staff_mode) is null then
    raise exception 'Review unavailable' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  select * into strict definition from public.assessment_versions where
    (assessment_id,school_id,version)=(package.assessment_id,target_school,package.definition_version);
  select id into previous from public.assessment_submissions where assessment_id=package.assessment_id
    and school_id=target_school and package_version=package.package_version-1;
  with difference as (
    select n.student_id added,o.student_id removed,n.mark_version new_mark,o.mark_version old_mark,
      n.placement new_placement,o.placement old_placement
    from (select * from public.assessment_submission_entries where submission_id=target_submission) n
    full join (select * from public.assessment_submission_entries where submission_id=previous) o using(student_id)
  ) select jsonb_build_object('added',count(*) filter(where removed is null),
    'removed',count(*) filter(where added is null),
    'changed',count(*) filter(where added is not null and removed is not null and
      (new_mark,new_placement) is distinct from (old_mark,old_placement))) into changes from difference;
  select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into entries from (
    select e.student_id id,s.full_name name,s.reference,m.state,m.score::text,m.reason,
      e.mark_version,e.placement,
      (old.student_id is null or (e.mark_version,e.placement) is distinct from (old.mark_version,old.placement)) changed
    from public.assessment_submission_entries e
    join public.students s on (s.id,s.school_id)=(e.student_id,e.school_id)
    join public.assessment_mark_versions m on (m.assessment_id,m.school_id,m.student_id,m.draft_version)=
      (e.assessment_id,e.school_id,e.student_id,e.mark_version)
    left join public.assessment_submission_entries old on old.submission_id=previous and old.student_id=e.student_id
    where e.submission_id=target_submission and e.school_id=target_school
    order by s.reference,s.id limit 26 offset ((page_number-1)*25)
  ) rows;
  select * into decision from public.assessment_review_decisions where submission_id=target_submission;
  return jsonb_build_object('id',package.id,'package',package.package_version,'status',package.status,
    'title',definition.title,'instructions',definition.instructions,'definition',package.definition_version,'draft',package.draft_version,
    'scope',(select y.name||' / '||t.name||' / '||c.name||' / '||subject.name
      from private.assessment_review_scope(target_school,package.assessment_id,package.definition_version) scope
      join public.academic_years y on y.id=scope.academic_year_id
      join public.academic_terms t on t.id=scope.term_id
      join public.classes c on c.id=scope.class_id
      join public.subjects subject on subject.id=scope.subject_id),
    'date',definition.effective_date,'minimum',definition.minimum::text,'maximum',definition.maximum::text,
    'precision',definition.decimal_places,'changes',changes,'entries',entries,'reason',decision.reason,
    'definitionChanged',exists(select 1 from public.assessment_submissions s where s.id=previous and s.definition_version<>package.definition_version));
end;
$$;

create function public.decide_assessment_review(target_school uuid,target_submission uuid,staff_mode text,
  expected_package integer,new_decision text,decision_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare package public.assessment_submissions%rowtype; grant_id uuid;
begin
  perform 1 from public.schools where id=target_school for update;
  select * into package from public.assessment_submissions where id=target_submission and school_id=target_school for update;
  if not found then raise exception 'Review unavailable' using errcode='42501'; end if;
  grant_id:=private.my_assessment_reviewer_grant(target_school,package.assessment_id,package.definition_version,staff_mode);
  if grant_id is null then raise exception 'Review unavailable' using errcode='42501'; end if;
  if package.package_version is distinct from expected_package or package.status<>'pending' or not exists(
    select 1 from public.assessment_rosters r where (r.assessment_id,r.school_id,r.definition_version,r.draft_version,r.roster_version)=
      (package.assessment_id,package.school_id,package.definition_version,package.draft_version,package.roster_version)) then
    raise exception 'Review package changed' using errcode='PT409'; end if;
  if new_decision is null or new_decision not in ('approved','returned') or decision_reason is null or length(decision_reason)>500
    or (new_decision='returned' and decision_reason !~ '[^[:space:]]') then
    raise exception 'Choose a decision and give a return reason' using errcode='22023'; end if;
  insert into public.assessment_review_decisions(submission_id,school_id,decision,reason,reviewer_grant_id,decided_by)
    values(package.id,target_school,new_decision,btrim(decision_reason),grant_id,auth.uid());
  update public.assessment_submissions set status=new_decision where id=package.id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'assessment.review.'||new_decision,package.id,jsonb_build_object('grant',grant_id,'package',expected_package));
end;
$$;

revoke all on function private.can_submit_assessment(uuid,uuid,text),private.invalidate_assessment_submission() from public,anon,authenticated;
revoke all on function public.submit_assessment(uuid,uuid,text,integer,integer),public.read_assessment_submission_status(uuid,uuid,text),
  public.list_assessment_reviews(uuid,text,integer),public.read_assessment_review(uuid,uuid,text,integer),
  public.decide_assessment_review(uuid,uuid,text,integer,text,text) from public,anon;
grant execute on function public.submit_assessment(uuid,uuid,text,integer,integer),public.read_assessment_submission_status(uuid,uuid,text),
  public.list_assessment_reviews(uuid,text,integer),public.read_assessment_review(uuid,uuid,text,integer),
  public.decide_assessment_review(uuid,uuid,text,integer,text,text) to authenticated;
commit;
