-- APPLIED on 9 October 2026. Historical record; do not rerun.
-- Approved fictional School Portal data correction, 9 October 2026.
-- Guarded one-off repair. No schema, policy, account or relationship changes.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $repair$
declare
  school constant uuid := '41d7928a-153f-4070-a09a-a174c3739eed';
  year27 constant uuid := '76086d13-7b59-40cb-b128-e77703c99ec9';
  year26 constant uuid := '304b6d6f-06c0-4c85-8f89-bbe068fe7417';
  en2 constant uuid := '69905e68-1556-41f9-a17e-e00400714e99';
  en3 constant uuid := '5e3f3311-47ae-4da3-a93f-733e3f70157e';
  prior_years jsonb; prior_enrollments jsonb; old_row jsonb; new_row jsonb;
begin
  perform 1 from public.schools where id=school for update;
  if not found then raise exception 'Expected school missing'; end if;
  lock table public.academic_years,public.academic_terms,public.classes,
    public.enrollments,public.teaching_assignments,public.timetable_lessons,
    public.attendance_sessions,public.attendance_entries,public.homework_items
    in share row exclusive mode;
  if not exists(select 1 from public.academic_years where id=year27 and school_id=school
    and name='2027_mistake' and starts_on=date '2027-01-18' and ends_on=date '2030-11-22' and record_version=4)
    or not exists(select 1 from public.academic_years where id=year26 and school_id=school
    and name='2026' and starts_on=date '2027-01-18' and ends_on=date '2027-11-26' and record_version=2)
    then raise exception 'Academic years changed; inspect before retrying'; end if;
  if not exists(select 1 from public.enrollments where id=en2 and school_id=school and academic_year_id=year27
    and student_id='db43db76-b0a9-4418-b451-550fa42e8334' and class_id='5a081658-facf-439b-9809-cc14ef1161ca'
    and starts_on=date '2027-01-18' and ends_on=date '2030-11-22' and closure is null and record_version=1)
    or not exists(select 1 from public.enrollments where id=en3 and school_id=school and academic_year_id=year27
    and student_id='1e874e25-529b-4f1d-8c85-876788e6ed5a' and class_id='601f2984-cc74-4c0f-a6fb-41c93d6c7064'
    and starts_on=date '2027-01-18' and ends_on=date '2027-01-18' and closure='withdrawal' and record_version=2)
    then raise exception 'Enrollment state changed; inspect before retrying'; end if;
  if not exists(select 1 from public.audit_events where id=113 and school_id=school and record_id=en3
    and action='enrollments.withdrawal' and details->'before'->>'ends_on'='2027-11-26'
    and details->'before'->>'closure' is null)
    then raise exception 'Original placement audit does not match'; end if;
  if exists(select 1 from public.classes where academic_year_id=year26)
    or exists(select 1 from public.academic_terms where academic_year_id=year26)
    or exists(select 1 from public.enrollments where academic_year_id=year26)
    or exists(select 1 from public.teaching_assignments where academic_year_id=year26)
    or exists(select 1 from public.homework_items where academic_year_id=year26)
    then raise exception '2026 year is no longer empty'; end if;
  if exists(select 1 from public.attendance_sessions where school_id=school)
    or exists(select 1 from public.attendance_entries where school_id=school)
    or exists(select 1 from public.homework_items where school_id=school and audience_date is not null)
    then raise exception 'Operational history appeared; review before correction'; end if;
  if exists(select 1 from public.academic_terms where academic_year_id=year27 and
      (starts_on<date '2027-01-18' or ends_on>date '2027-11-26'))
    or exists(select 1 from public.teaching_assignments where academic_year_id=year27 and
      (starts_on<date '2027-01-18' or ends_on>date '2027-11-26'))
    or exists(select 1 from public.enrollments where academic_year_id=year27 and id<>en2 and
      (starts_on<date '2027-01-18' or ends_on>date '2027-11-26'))
    or exists(select 1 from public.timetable_lessons l join public.classes c on c.id=l.class_id and c.school_id=l.school_id
      where c.academic_year_id=year27 and (l.starts_on<date '2027-01-18' or l.ends_on>date '2027-11-26'))
    or exists(select 1 from public.homework_items where academic_year_id=year27 and
      (due_date<date '2027-01-18' or due_date>date '2027-11-26'))
    then raise exception 'Unexpected out-of-range dependent record'; end if;
  if exists(select 1 from public.enrollments e where e.school_id=school and e.student_id='1e874e25-529b-4f1d-8c85-876788e6ed5a'
    and e.id<>en3 and e.starts_on<=date '2027-11-26' and e.ends_on>=date '2027-01-18')
    then raise exception 'Restoration would overlap another placement'; end if;
  select jsonb_agg(to_jsonb(y)) into prior_years from public.academic_years y where id in (year27,year26);
  select jsonb_agg(to_jsonb(e)) into prior_enrollments from public.enrollments e where id in (en2,en3);
  -- Correct children while the parent still contains both old and corrected dates.
  update public.enrollments set ends_on=date '2027-11-26',record_version=record_version+1 where id=en2 and school_id=school;
  update public.enrollments set ends_on=date '2027-11-26',closure=null,record_version=record_version+1 where id=en3 and school_id=school;
  update public.academic_years set name='2027',ends_on=date '2027-11-26',record_version=record_version+1 where id=year27 and school_id=school;
  -- Fictional 2026 test period, not an assertion about an official school calendar.
  update public.academic_years set starts_on=date '2026-01-18',ends_on=date '2026-11-26',record_version=record_version+1 where id=year26 and school_id=school;
  for old_row in select value from jsonb_array_elements(prior_years) loop
    select to_jsonb(y) into new_row from public.academic_years y where id=(old_row->>'id')::uuid;
    insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
      values(school,null,'academic_years.data_repair',(old_row->>'id')::uuid,jsonb_build_object(
        'repair','20261009_academic_dates','source','Supabase SQL Editor operator; user-approved fictional data repair',
        'reason','Correct academic calendar without moving or deleting dependent records','before',old_row,'after',new_row));
  end loop;
  for old_row in select value from jsonb_array_elements(prior_enrollments) loop
    select to_jsonb(e) into new_row from public.enrollments e where id=(old_row->>'id')::uuid;
    insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
      values(school,null,'enrollments.data_repair',(old_row->>'id')::uuid,jsonb_build_object(
        'repair','20261009_academic_dates','source','Supabase SQL Editor operator; user-approved fictional data repair',
        'reason',case when (old_row->>'id')::uuid=en3 then 'Reverse accidental withdrawal during attempted year move; retain original withdrawal audit 113'
          else 'Correct mistaken 2030 end date to intended 2027 year end' end,'before',old_row,'after',new_row));
  end loop;
end;
$repair$;
select 'academic_year' as record_type,id,name as label,starts_on,ends_on,record_version,null::text as closure
from public.academic_years where school_id='41d7928a-153f-4070-a09a-a174c3739eed'
union all select 'enrollment',e.id,s.reference,e.starts_on,e.ends_on,e.record_version,e.closure
from public.enrollments e join public.students s on s.id=e.student_id and s.school_id=e.school_id
where e.id in ('69905e68-1556-41f9-a17e-e00400714e99','5e3f3311-47ae-4da3-a93f-733e3f70157e');
commit;