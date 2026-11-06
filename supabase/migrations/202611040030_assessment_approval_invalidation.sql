begin;

alter table public.assessment_submissions drop constraint assessment_submissions_status_check;
alter table public.assessment_submissions add constraint assessment_submissions_status_check
  check(status in ('pending','approved','returned','superseded','invalidated'));

-- Keep the original approval intact. This separate record explains why it
-- can no longer be used. Publication dependencies must join this transaction
-- when publication is introduced in a later migration.
create table public.assessment_review_invalidations (
  submission_id uuid primary key references public.assessment_review_decisions(submission_id),
  school_id uuid not null,
  reason text not null check(length(reason) between 1 and 500 and reason ~ '[^[:space:]]'),
  invalidated_by uuid not null,
  invalidated_at timestamptz not null default now(),
  foreign key(submission_id,school_id) references public.assessment_submissions(id,school_id)
);
alter table public.assessment_review_invalidations enable row level security;
revoke all on public.assessment_review_invalidations from public,anon,authenticated;

create function public.invalidate_assessment_approval(
  target_school uuid,target_assessment uuid,expected_package integer,invalidation_reason text
) returns void language plpgsql security definer set search_path='' as $$
declare package public.assessment_submissions%rowtype;
begin
  if not private.is_school_admin(target_school) then
    raise exception 'School Admin required' using errcode='42501';
  end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then
    raise exception 'School Admin required' using errcode='42501';
  end if;
  if invalidation_reason is null or length(invalidation_reason)>500 or invalidation_reason !~ '[^[:space:]]' then
    raise exception 'A reason is required' using errcode='22023';
  end if;
  select * into package from public.assessment_submissions
    where assessment_id=target_assessment and school_id=target_school and package_version=expected_package for update;
  if not found or package.status<>'approved' or not exists(
    select 1 from public.assessment_review_decisions d where d.submission_id=package.id and d.school_id=target_school and d.decision='approved'
  ) or not exists(
    select 1 from public.assessment_rosters r where (r.assessment_id,r.school_id,r.definition_version,r.draft_version,r.roster_version)=
      (package.assessment_id,package.school_id,package.definition_version,package.draft_version,package.roster_version)
  ) then
    raise exception 'Approved submission changed or unavailable' using errcode='PT409';
  end if;
  insert into public.assessment_review_invalidations(submission_id,school_id,reason,invalidated_by)
    values(package.id,target_school,btrim(invalidation_reason),auth.uid());
  update public.assessment_submissions set status='invalidated' where id=package.id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'assessment.review.invalidate',package.id,jsonb_build_object('package',expected_package));
end;
$$;
revoke all on function public.invalidate_assessment_approval(uuid,uuid,integer,text) from public,anon;
grant execute on function public.invalidate_assessment_approval(uuid,uuid,integer,text) to authenticated;

create or replace function public.read_assessment_submission_status(target_school uuid,target_assessment uuid,staff_mode text)
returns table(package_version integer,status text,reason text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not coalesce(private.can_submit_assessment(target_school,target_assessment,staff_mode),false) then
    raise exception 'Submission access required' using errcode='42501'; end if;
  return query select s.package_version,s.status,coalesce(i.reason,d.reason) from public.assessment_submissions s
    left join public.assessment_review_decisions d on d.submission_id=s.id
    left join public.assessment_review_invalidations i on i.submission_id=s.id
    where s.assessment_id=target_assessment and s.school_id=target_school
    order by s.package_version desc limit 1;
end;
$$;

create or replace function public.read_assessment_review(target_school uuid,target_submission uuid,staff_mode text,page_number integer)
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
    'precision',definition.decimal_places,'changes',changes,'entries',entries,'reason',decision.reason,'invalidationReason',(select i.reason from public.assessment_review_invalidations i where i.submission_id=package.id and i.school_id=target_school),
    'definitionChanged',exists(select 1 from public.assessment_submissions s where s.id=previous and s.definition_version<>package.definition_version));
end;
$$;

commit;
