-- Phase 4.1: staff assessment planning only. No marks or publication.
begin;
create table public.assessments (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 assignment_id uuid not null, class_id uuid not null, academic_year_id uuid not null,
 record_version integer not null check(record_version>0),
 unique(id,school_id),
 foreign key(assignment_id,school_id,class_id,academic_year_id)
 references public.teaching_assignments(id,school_id,class_id,academic_year_id)
);
create table public.assessment_versions (
 id uuid primary key default gen_random_uuid(), school_id uuid not null,
 assessment_id uuid not null, version integer not null check(version>0), term_id uuid not null,
 title text not null check(length(btrim(title)) between 1 and 160),
 instructions text not null check(length(btrim(instructions)) between 1 and 10000),
 effective_date date not null check(isfinite(effective_date)),
 minimum numeric not null, maximum numeric not null, decimal_places integer not null check(decimal_places between 0 and 6),
 scale_authorised_by uuid, scale_authorised_at timestamptz,
 created_by uuid not null, created_at timestamptz not null default now(),
 foreign key(assessment_id,school_id) references public.assessments(id,school_id),
 foreign key(term_id,school_id) references public.academic_terms(id,school_id),
 unique(assessment_id,school_id,version),
 check(minimum>=0 and maximum>minimum and maximum<=1000000000),
 check(minimum=round(minimum,decimal_places) and maximum=round(maximum,decimal_places)),
 check((scale_authorised_by is null)=(scale_authorised_at is null))
);
alter table public.assessments add constraint assessment_current_version
 foreign key(id,school_id,record_version) references public.assessment_versions(assessment_id,school_id,version)
 deferrable initially deferred;
create index assessments_school_assignment on public.assessments(school_id,assignment_id,id);

create function private.assessment_planning_access(target_school uuid,target_assignment uuid,staff_mode text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(exists(select 1 from public.teaching_assignments ta where ta.id=target_assignment and ta.school_id=target_school
 and ((staff_mode='school_admin' and private.is_school_admin(target_school)) or
 (staff_mode='teacher' and ta.teacher_id=private.my_teacher_id(target_school)
 and ta.ends_on>=private.school_today(target_school)))),false);
$$;
revoke all on function private.assessment_planning_access(uuid,uuid,text) from public,anon;
grant execute on function private.assessment_planning_access(uuid,uuid,text) to authenticated;
alter table public.assessments enable row level security;
alter table public.assessment_versions enable row level security;
revoke all on public.assessments,public.assessment_versions from public,anon,authenticated;
grant select on public.assessments,public.assessment_versions to authenticated;
create policy staff_read on public.assessments for select to authenticated using (
 private.assessment_planning_access(school_id,assignment_id,'school_admin') or
 private.assessment_planning_access(school_id,assignment_id,'teacher'));
create policy staff_read on public.assessment_versions for select to authenticated using (
 exists(select 1 from public.assessments a where a.id=assessment_id and a.school_id=assessment_versions.school_id));

create function public.save_assessment(target_school uuid,staff_mode text,target_assessment uuid,target_assignment uuid,
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
 if a.record_version<>expected_version then raise exception 'Assessment changed; reload' using errcode='40001'; end if;
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

create function public.search_assessment_choices(target_school uuid,staff_mode text,choice_kind text,
 target_assignment uuid default null,search_text text default '',page_number integer default 1)
returns table(id uuid,label text) language plpgsql stable security definer set search_path='' as $$
begin
 if staff_mode is null or staff_mode not in ('school_admin','teacher') or
 private.my_member_with_role(target_school,staff_mode::public.school_role) is null then
 raise exception 'Staff access required' using errcode='42501'; end if;
 if choice_kind is null or choice_kind not in ('assignment','term') or search_text is null or length(search_text)>80 or
 page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid search' using errcode='22023'; end if;
 if choice_kind='assignment' then
 return query select ta.id,sub.name||' / '||c.name||' / '||y.name||' / '||ta.starts_on::text||' - '||ta.ends_on::text
 from public.teaching_assignments ta join public.subjects sub on sub.id=ta.subject_id and sub.school_id=ta.school_id
 join public.classes c on c.id=ta.class_id and c.school_id=ta.school_id
 join public.academic_years y on y.id=ta.academic_year_id and y.school_id=ta.school_id
 where ta.school_id=target_school and private.assessment_planning_access(target_school,ta.id,staff_mode)
 and position(lower(btrim(search_text)) in lower(sub.name||' '||c.name||' '||y.name))>0
 order by ta.starts_on desc,ta.id limit 26 offset ((page_number-1)*25);
 else
 if not private.assessment_planning_access(target_school,target_assignment,staff_mode) then
 raise exception 'Assignment unavailable' using errcode='42501'; end if;
 return query select t.id,t.name||' / '||t.starts_on::text||' - '||t.ends_on::text
 from public.academic_terms t join public.teaching_assignments ta on ta.academic_year_id=t.academic_year_id and ta.school_id=t.school_id
 where ta.id=target_assignment and t.school_id=target_school and position(lower(btrim(search_text)) in lower(t.name))>0
 order by t.starts_on,t.id limit 26 offset ((page_number-1)*25);
 end if;
end;
$$;
create function public.list_assessments(target_school uuid,staff_mode text,page_number integer default 1,target_assessment uuid default null)
returns table(id uuid,assignment_id uuid,assignment_label text,term_id uuid,term_label text,title text,instructions text,
 effective_date date,minimum text,maximum text,decimal_places integer,scale_authorised boolean,record_version integer)
language plpgsql stable security definer set search_path='' as $$
begin
 if staff_mode is null or staff_mode not in ('school_admin','teacher') or
 private.my_member_with_role(target_school,staff_mode::public.school_role) is null then
 raise exception 'Staff access required' using errcode='42501'; end if;
 if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
 return query select a.id,a.assignment_id,sub.name||' / '||c.name||' / '||y.name,v.term_id,t.name,
 v.title,v.instructions,v.effective_date,v.minimum::text,v.maximum::text,v.decimal_places,v.scale_authorised_by is not null,a.record_version
 from public.assessments a join public.assessment_versions v on v.assessment_id=a.id and v.school_id=a.school_id and v.version=a.record_version
 join public.teaching_assignments ta on ta.id=a.assignment_id and ta.school_id=a.school_id
 join public.subjects sub on sub.id=ta.subject_id and sub.school_id=ta.school_id
 join public.classes c on c.id=a.class_id and c.school_id=a.school_id
 join public.academic_years y on y.id=a.academic_year_id and y.school_id=a.school_id
 join public.academic_terms t on t.id=v.term_id and t.school_id=v.school_id
 where a.school_id=target_school and (target_assessment is null or a.id=target_assessment)
 and private.assessment_planning_access(target_school,a.assignment_id,staff_mode)
 order by v.effective_date desc,a.id limit 26 offset ((page_number-1)*25);
end;
$$;
revoke all on function public.save_assessment(uuid,text,uuid,uuid,integer,uuid,text,text,date,numeric,numeric,integer,boolean),
 public.search_assessment_choices(uuid,text,text,uuid,text,integer),public.list_assessments(uuid,text,integer,uuid) from public,anon;
grant execute on function public.save_assessment(uuid,text,uuid,uuid,integer,uuid,text,text,date,numeric,numeric,integer,boolean),
 public.search_assessment_choices(uuid,text,text,uuid,text,integer),public.list_assessments(uuid,text,integer,uuid) to authenticated;
commit;
