begin;

-- Scope comes from the selected assessment version. A later definition edit
-- cannot move a grant to another term. Review windows can extend past term end.
create table public.assessment_reviewer_grants (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null, membership_id uuid not null, academic_year_id uuid not null,
  term_id uuid not null, class_id uuid not null, subject_id uuid not null,
  starts_on date, ends_on date, issued_by uuid not null, issued_at timestamptz not null default now(),
  revoked_by uuid, revoked_at timestamptz,
  check ((starts_on is null or isfinite(starts_on)) and (ends_on is null or isfinite(ends_on))),
  check (starts_on is null or ends_on is null or starts_on<=ends_on),
  check ((revoked_at is null)=(revoked_by is null)),
  foreign key(membership_id,school_id) references public.school_memberships(id,school_id),
  foreign key(class_id,school_id,academic_year_id) references public.classes(id,school_id,academic_year_id),
  foreign key(term_id,school_id) references public.academic_terms(id,school_id),
  foreign key(subject_id,school_id) references public.subjects(id,school_id)
);
create index reviewer_scope on public.assessment_reviewer_grants
  (school_id,membership_id,term_id,class_id,subject_id) where revoked_at is null;
alter table public.assessment_reviewer_grants enable row level security;
revoke all on public.assessment_reviewer_grants from public,anon,authenticated;

create function private.assessment_review_scope(school uuid,assessment uuid,definition integer)
returns table(academic_year_id uuid,term_id uuid,class_id uuid,subject_id uuid)
language sql stable set search_path='' as $$
  select a.academic_year_id,v.term_id,a.class_id,t.subject_id from public.assessments a
  join public.assessment_versions v on (v.assessment_id,v.school_id,v.version)=(a.id,a.school_id,definition)
  join public.teaching_assignments t on (t.id,t.school_id)=(a.assignment_id,a.school_id)
  where a.id=assessment and a.school_id=school
$$;

-- Called by future review RPCs with the version attached to the submitted package.
-- Kept private so this slice exposes no draft or submitted marks to a reviewer.
create function private.my_assessment_reviewer_grant(school uuid,assessment uuid,definition integer,staff_mode text)
returns uuid language sql stable security definer set search_path='' as $$
  select g.id from public.assessment_reviewer_grants g
  join private.assessment_review_scope(school,assessment,definition) s
    on (s.academic_year_id,s.term_id,s.class_id,s.subject_id)=(g.academic_year_id,g.term_id,g.class_id,g.subject_id)
  where g.school_id=school and g.revoked_at is null and daterange(g.starts_on,g.ends_on,'[]') @> private.school_today(school)
    and g.membership_id=case staff_mode when 'teacher' then private.my_member_with_role(school,'teacher')
      when 'school_admin' then private.my_member_with_role(school,'school_admin') end
$$;
revoke all on function private.assessment_review_scope(uuid,uuid,integer),private.my_assessment_reviewer_grant(uuid,uuid,integer,text)
 from public,anon,authenticated;

create function public.search_assessment_reviewers(target_school uuid,search_text text,page_number integer)
returns table(id uuid,label text) language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  if search_text is null or length(search_text)>80 or page_number is null or page_number not between 1 and 100000 then
    raise exception 'Invalid search' using errcode='22023'; end if;
  return query select m.id,coalesce(nullif(p.display_name,''),'School member')||' · '||m.id::text
    from public.school_memberships m join public.profiles p on p.user_id=m.user_id
    where m.school_id=target_school and m.status='active' and exists(select 1 from public.membership_roles r
      where r.membership_id=m.id and r.school_id=m.school_id and r.role in ('school_admin','teacher'))
      and position(lower(btrim(search_text)) in lower(coalesce(p.display_name,'')||' '||m.id::text))>0
    order by p.display_name,m.id limit 26 offset ((page_number-1)*25);
end;
$$;

create function public.issue_assessment_reviewer_grant(target_school uuid,target_assessment uuid,expected_definition integer,
  target_member uuid,valid_from date,valid_until date) returns uuid
language plpgsql security definer set search_path='' as $$
declare scope record; saved uuid;
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  if not exists(select 1 from public.assessments a where (a.id,a.school_id,a.record_version)=(target_assessment,target_school,expected_definition)) then
    raise exception 'Assessment unavailable or changed' using errcode='PT409'; end if;
  select * into strict scope from private.assessment_review_scope(target_school,target_assessment,expected_definition);
  if not exists(select 1 from public.school_memberships m join public.membership_roles r
    on (r.membership_id,r.school_id)=(m.id,m.school_id) where m.school_id=target_school and m.id=target_member
      and m.status='active' and r.role in ('teacher','school_admin')) then
    raise exception 'Active staff membership required' using errcode='22023'; end if;
  if valid_until<private.school_today(target_school) or valid_from>valid_until then
    raise exception 'Invalid review window' using errcode='22023'; end if;
  if exists(select 1 from public.assessment_reviewer_grants g where
    (g.school_id,g.membership_id,g.academic_year_id,g.term_id,g.class_id,g.subject_id)=
    (target_school,target_member,scope.academic_year_id,scope.term_id,scope.class_id,scope.subject_id)
    and g.revoked_at is null and daterange(valid_from,valid_until,'[]') && daterange(g.starts_on,g.ends_on,'[]')) then
    raise exception 'Overlapping reviewer grant' using errcode='22023'; end if;
  insert into public.assessment_reviewer_grants(school_id,membership_id,academic_year_id,term_id,class_id,subject_id,starts_on,ends_on,issued_by)
    values(target_school,target_member,scope.academic_year_id,scope.term_id,scope.class_id,scope.subject_id,valid_from,valid_until,auth.uid())
    returning id into saved;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'assessment.reviewer.issue',saved);
  return saved;
end;
$$;

create function public.revoke_assessment_reviewer_grant(target_school uuid,target_grant uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  update public.assessment_reviewer_grants set revoked_by=auth.uid(),revoked_at=now()
    where id=target_grant and school_id=target_school and revoked_at is null;
  if not found then raise exception 'Grant unavailable' using errcode='22023'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'assessment.reviewer.revoke',target_grant);
end;
$$;

create function public.list_assessment_reviewer_grants(target_school uuid,page_number integer)
returns table(id uuid,reviewer text,scope_label text,starts_on date,ends_on date)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  return query select g.id,coalesce(nullif(p.display_name,''),'School member')||' · '||m.id::text,
    y.name||' / '||term.name||' / '||c.name||' / '||s.name,g.starts_on,g.ends_on
    from public.assessment_reviewer_grants g
    join public.school_memberships m on (m.id,m.school_id)=(g.membership_id,g.school_id)
    join public.profiles p on p.user_id=m.user_id
    join public.academic_years y on y.id=g.academic_year_id join public.academic_terms term on term.id=g.term_id
    join public.classes c on c.id=g.class_id join public.subjects s on s.id=g.subject_id
    where g.school_id=target_school and g.revoked_at is null and (g.ends_on is null or g.ends_on>=private.school_today(target_school))
    order by g.issued_at desc,g.id limit 26 offset ((page_number-1)*25);
end;
$$;
revoke all on function public.search_assessment_reviewers(uuid,text,integer),public.list_assessment_reviewer_grants(uuid,integer),
  public.issue_assessment_reviewer_grant(uuid,uuid,integer,uuid,date,date),public.revoke_assessment_reviewer_grant(uuid,uuid) from public,anon;
grant execute on function public.search_assessment_reviewers(uuid,text,integer),public.list_assessment_reviewer_grants(uuid,integer),
  public.issue_assessment_reviewer_grant(uuid,uuid,integer,uuid,date,date),public.revoke_assessment_reviewer_grant(uuid,uuid) to authenticated;
commit;
