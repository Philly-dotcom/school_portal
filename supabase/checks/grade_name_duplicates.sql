-- Read-only preflight; run in the dedicated School Portal SQL editor.
-- Identifies existing grade variants and the classes that use them. No writes.
with keyed as (
  select id,school_id,name,lower(regexp_replace(
    regexp_replace(name,'^[[:space:]]+|[[:space:]]+$','','g'),
    '^grade[[:space:]]*([0-9]+|r)$','Grade \1','i')) as grade_key
  from public.grades
), duplicates as (
  select school_id,grade_key from keyed group by school_id,grade_key having count(*)>1
)
select g.school_id,g.grade_key,g.id as grade_id,g.name,
  count(c.id) as referencing_classes
from keyed g join duplicates d using(school_id,grade_key)
left join public.classes c on c.grade_id=g.id and c.school_id=g.school_id
group by g.school_id,g.grade_key,g.id,g.name
order by g.school_id,g.grade_key,g.name;
