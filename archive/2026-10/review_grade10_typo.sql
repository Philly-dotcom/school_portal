-- One-school repair for the two grade rows reviewed on 2026-10-01.
-- PREVIEW BY DEFAULT: keep ROLLBACK at the end until the result is approved.
-- To apply after reviewing: change only the final ROLLBACK to COMMIT and run all.
begin;
set local lock_timeout = '5s';
lock table public.grades, public.classes, public.academic_years,
  public.academic_terms, public.enrollments, public.teaching_assignments
  in share row exclusive mode;

create table if not exists private.academic_repair_backups (
  repair_id text primary key,
  created_at timestamptz not null default now(),
  snapshot jsonb not null
);
revoke all on private.academic_repair_backups from public,anon,authenticated;

do $$
declare
  target_school constant uuid := '41d7928a-153f-4070-a09a-a174c3739eed';
  keep_grade constant uuid := '34144959-154d-403e-b0bb-533a2782bccf';
  mistaken_grade constant uuid := '3aa918e5-6cd0-45ff-a066-dc7fd21ff513';
  mistaken_class public.classes%rowtype;
  mistaken_year public.academic_years%rowtype;
  good_class uuid;
  snapshot jsonb;
begin
  if exists(select 1 from private.academic_repair_backups where repair_id='grade10-typo-20261001') then
    raise exception 'Repair already recorded. Stop and review; do not rerun.';
  end if;
  if not exists(select 1 from public.grades where id=keep_grade and school_id=target_school and name='grade10')
    or not exists(select 1 from public.grades where id=mistaken_grade and school_id=target_school and name='grade 10') then
    raise exception 'Grade rows differ from the reviewed state. Nothing changed.';
  end if;
  if (select count(*) from public.classes c join public.academic_years y
      on y.id=c.academic_year_id and y.school_id=c.school_id
      where c.school_id=target_school and c.grade_id=keep_grade and c.name='10A' and y.name='2027') <> 1 then
    raise exception 'Expected class 10A in 2027 was not uniquely found.';
  end if;
  select c.id into good_class from public.classes c join public.academic_years y
    on y.id=c.academic_year_id and y.school_id=c.school_id
    where c.school_id=target_school and c.grade_id=keep_grade and c.name='10A' and y.name='2027';
  if (select count(*) from public.classes where grade_id=mistaken_grade) <> 1 then
    raise exception 'Mistaken grade now has a different set of classes. Review required.';
  end if;
  select * into strict mistaken_class from public.classes where grade_id=mistaken_grade and school_id=target_school;
  select * into strict mistaken_year from public.academic_years where id=mistaken_class.academic_year_id and school_id=target_school;
  if mistaken_class.name <> 'Thapelo' or mistaken_year.name <> 'Thapelo' then
    raise exception 'Mistaken class/year names differ from the reviewed state.';
  end if;
  if exists(select 1 from public.enrollments where class_id=mistaken_class.id or academic_year_id=mistaken_year.id)
    or exists(select 1 from public.teaching_assignments where class_id=mistaken_class.id or academic_year_id=mistaken_year.id)
    or exists(select 1 from public.academic_terms where academic_year_id=mistaken_year.id)
    or exists(select 1 from public.classes where academic_year_id=mistaken_year.id and id<>mistaken_class.id) then
    raise exception 'Mistaken class/year has dependent records. Nothing will be removed.';
  end if;
  snapshot := jsonb_build_object(
    'school_id',target_school,
    'retained_grade',(select to_jsonb(g) from public.grades g where id=keep_grade),
    'removed_grade',(select to_jsonb(g) from public.grades g where id=mistaken_grade),
    'removed_class',to_jsonb(mistaken_class),
    'removed_year',to_jsonb(mistaken_year));
  insert into private.academic_repair_backups(repair_id,snapshot) values('grade10-typo-20261001',snapshot);
  -- No cascading deletes and no modifications to class 10A or its references.
  delete from public.classes where id=mistaken_class.id and school_id=target_school;
  delete from public.grades where id=mistaken_grade and school_id=target_school;
  delete from public.academic_years where id=mistaken_year.id and school_id=target_school;
  update public.grades set name='Grade 10' where id=keep_grade and school_id=target_school;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(target_school,auth.uid(),'operator.grade10_typo_repair',keep_grade);
end;
$$;

-- Preview of the retained class after repair. No learner/teacher names returned.
select g.name as grade_name,c.name as class_name,y.name as academic_year,
  (select count(*) from public.enrollments e where e.class_id=c.id) as enrollments,
  (select count(*) from public.teaching_assignments t where t.class_id=c.id) as teaching_assignments
from public.classes c
join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
where g.id='34144959-154d-403e-b0bb-533a2782bccf'
  and g.school_id='41d7928a-153f-4070-a09a-a174c3739eed';

ROLLBACK;
