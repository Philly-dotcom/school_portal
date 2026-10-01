import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll,afterAll,it,expect } from "vitest";
const db=new PGlite();
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const school=id(1),keep=id(2),wrong=id(3),year=id(4),badYear=id(5),cls=id(6),badClass=id(7),learner=id(8),teacher=id(9),subject=id(10);
// Run the exact repair with synthetic identifiers and a fictional typo label.
const repair=readFileSync("supabase/repairs/review_grade10_typo.sql","utf8")
  .replaceAll("41d7928a-153f-4070-a09a-a174c3739eed",school)
  .replaceAll("34144959-154d-403e-b0bb-533a2782bccf",keep)
  .replaceAll("3aa918e5-6cd0-45ff-a066-dc7fd21ff513",wrong)
  .replaceAll("Thapelo","Fictional typo");
beforeAll(async()=>{
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
    grant usage on schema public,auth to authenticated,anon;`);
  for(const file of ["202609290001_foundation.sql","202609300002_account_management.sql","202610010003_academic_structure.sql","202610010004_registers.sql","202610010005_teaching_assignments.sql"])
    await db.exec(readFileSync(`supabase/migrations/${file}`,"utf8"));
  await db.query("insert into schools(id,name) values($1,'Fictional School')",[school]);
  await db.query("insert into grades(id,school_id,name) values($1,$3,'grade10'),($2,$3,'grade 10')",[keep,wrong,school]);
  await db.query("insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$3,'2027','2027-01-01','2027-12-31'),($2,$3,'Fictional typo','2027-01-01','2027-12-31')",[year,badYear,school]);
  await db.query("insert into classes(id,school_id,name,grade_id,academic_year_id) values($1,$3,'10A',$4,$6),($2,$3,'Fictional typo',$5,$7)",[cls,badClass,school,keep,wrong,year,badYear]);
  await db.query("insert into students(id,school_id,full_name,reference) values($1,$2,'Fictional Student','ST-1')",[learner,school]);
  await db.query("insert into teachers(id,school_id,full_name,reference) values($1,$2,'Fictional Teacher','TE-1')",[teacher,school]);
  await db.query("insert into subjects(id,school_id,name) values($1,$2,'Mathematics')",[subject,school]);
  await db.query("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-01-01','2027-12-31')",[school,learner,cls,year]);
  await db.query("insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,'2027-01-01','2027-12-31')",[school,teacher,subject,cls,year]);
},60000);
afterAll(async()=>{await db.close();});
it("preview rolls back every change including backup and grade rename",async()=>{
  await db.exec(repair);
  expect((await db.query("select * from grades")).rows).toHaveLength(2);
  expect((await db.query("select name from grades where id=$1",[keep])).rows).toEqual([{name:"grade10"}]);
  expect((await db.query("select * from classes")).rows).toHaveLength(2);
  expect((await db.query("select to_regclass('private.academic_repair_backups') as backup")).rows).toEqual([{backup:null}]);
});
it("refuses cleanup when the mistaken year has a term and preserves all rows",async()=>{
  await db.query("insert into academic_terms(school_id,academic_year_id,name,starts_on,ends_on) values($1,$2,'Fictional term','2027-01-01','2027-03-31')",[school,badYear]);
  await expect(db.exec(repair)).rejects.toThrow("dependent records");
  await db.exec("rollback");
  expect((await db.query("select * from classes")).rows).toHaveLength(2);
  await db.query("delete from academic_terms where academic_year_id=$1",[badYear]);
});
it("commit preserves valid references, backs up removed rows and permits migration 006",async()=>{
  const beforeEnroll=(await db.query("select * from enrollments")).rows;
  const beforeTeach=(await db.query("select * from teaching_assignments")).rows;
  await db.exec(repair.replace(/ROLLBACK;\s*$/,"COMMIT;"));
  expect((await db.query("select id,name from grades")).rows).toEqual([{id:keep,name:"Grade 10"}]);
  expect((await db.query("select id from classes")).rows).toEqual([{id:cls}]);
  expect((await db.query("select id from academic_years")).rows).toEqual([{id:year}]);
  expect((await db.query("select * from enrollments")).rows).toEqual(beforeEnroll);
  expect((await db.query("select * from teaching_assignments")).rows).toEqual(beforeTeach);
  expect((await db.query("select snapshot->'removed_grade'->>'id' as id from private.academic_repair_backups")).rows).toEqual([{id:wrong}]);
  await db.exec("set role authenticated");
  try {await expect(db.query("select * from private.academic_repair_backups")).rejects.toThrow();} finally {await db.exec("reset role");}
  await expect(db.exec(repair)).rejects.toThrow("already recorded");
  await db.exec("rollback");
  await db.exec(readFileSync("supabase/migrations/202610010006_grade_name_normalization.sql","utf8"));
  await expect(db.query("insert into grades(school_id,name) values($1,'Grade10')",[school])).rejects.toMatchObject({code:"23505"});
});
