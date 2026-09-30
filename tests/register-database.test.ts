import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const A=id(1), B=id(2), adminA=id(3), adminB=id(4), teacher=id(5), guardian=id(6), student=id(7), outsider=id(8);
const rows: Record<string,{student:string;guardian:string;year:string;class:string;teacher:string;subject:string}> = {};
async function asUser(user: string, fn: () => Promise<void>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
  try { await fn(); } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
}
async function insert(sql: string, values: string[]) { return (await db.query<{id:string}>(sql+" returning id",values)).rows[0].id; }
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;`);
  for(const file of ["202609290001_foundation.sql","202609300002_account_management.sql","202610010003_academic_structure.sql","202610010004_registers.sql","202610010005_teaching_assignments.sql"])
    await db.exec(readFileSync(`supabase/migrations/${file}`,"utf8"));
  await db.query("insert into schools(id,name) values($1,'Fictional A'),($2,'Fictional B')",[A,B]);
  for(const [user,school,role] of [[adminA,A,"school_admin"],[adminB,B,"school_admin"],[teacher,A,"teacher"],[guardian,A,"guardian"],[student,A,"student"]]) {
    await db.query("insert into auth.users(id) values($1)",[user]);
    await db.query("insert into profiles(user_id) values($1)",[user]);
    await db.query("insert into school_memberships(id,school_id,user_id) values($1,$2,$1)",[user,school]);
    await db.query("insert into membership_roles values($1,$2,$3)",[user,school,role]);
  }
  for(const [school,user] of [[A,adminA],[B,adminB]]) await asUser(user,async () => {
    const year = await insert("insert into academic_years(school_id,name,starts_on,ends_on) values($1,'2027','2027-01-01','2027-12-31')",[school]);
    const grade = await insert("insert into grades(school_id,name) values($1,'Grade 8')",[school]);
    const classroom = await insert("insert into classes(school_id,name,academic_year_id,grade_id) values($1,'8A',$2,$3)",[school,year,grade]);
    const learner = await insert("insert into students(school_id,full_name,reference) values($1,'Fictional Learner','ST-001')",[school]);
    const parent = await insert("insert into guardians(school_id,full_name,reference) values($1,'Fictional Guardian','GU-001')",[school]);
    const teacherRecord = await insert("insert into teachers(school_id,full_name,reference) values($1,'Fictional Teacher','TE-001')",[school]);
    const subject = await insert("insert into subjects(school_id,name) values($1,'Mathematics')",[school]);
    await insert("insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,'2027-01-01','2027-12-31')",[school,teacherRecord,subject,classroom,year]);
    await insert("insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Guardian')",[school,learner,parent]);
    await insert("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-01-01','2027-12-31')",[school,learner,classroom,year]);
    rows[school] = {student:learner,guardian:parent,year,class:classroom,teacher:teacherRecord,subject};
  });
},60000);
afterAll(async () => { await db.close(); });
const tables = ["students","teachers","guardians","student_guardians","enrollments","teaching_assignments"];
it("isolates reads in both directions and audits creation without creating Auth users",async () => {
  for(const [school,user] of [[A,adminA],[B,adminB]]) await asUser(user,async () => {
    for(const table of tables) expect((await db.query(`select school_id from ${table}`)).rows).toEqual([{school_id:school}]);
    expect((await db.query("select actor_user_id from audit_events where action='enrollments.insert'")).rows).toEqual([{actor_user_id:user}]);
  });
  expect((await db.query("select * from auth.users")).rows).toHaveLength(5);
});
async function deniedWrites(school: string) {
  const r=rows[school];
  await expect(db.query("insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,'2027-01-01','2027-12-31')",[school,r.teacher,r.subject,r.class,r.year])).rejects.toMatchObject({code:"42501"});
  for(const table of ["students","teachers","guardians"])
    await expect(db.query(`insert into ${table}(school_id,full_name,reference) values($1,'Denied','DENIED')`,[school])).rejects.toMatchObject({code:"42501"});
  await expect(db.query("insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Denied')",[school,r.student,r.guardian])).rejects.toMatchObject({code:"42501"});
  await expect(db.query("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-01-01','2027-12-31')",[school,r.student,r.class,r.year])).rejects.toMatchObject({code:"42501"});
  for(const table of tables) {
    await expect(db.query(`update ${table} set school_id=$1`,[school])).rejects.toMatchObject({code:"42501"});
    await expect(db.query(`delete from ${table}`)).rejects.toMatchObject({code:"42501"});
  }
}
it("denies cross-school writes and all non-admin reads/writes",async () => {
  await asUser(adminA,async()=>{await deniedWrites(B);});
  await asUser(adminB,async()=>{await deniedWrites(A);});
  for(const user of [teacher,guardian,student,outsider]) await asUser(user,async()=>{
    for(const table of tables) expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
    await deniedWrites(A);
  });
});
it("rejects cross-school links and mismatched class years even as database owner",async () => {
  const a=rows[A], b=rows[B];
  await expect(db.query("insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Invalid')",[A,a.student,b.guardian])).rejects.toThrow();
  await expect(db.query("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-01-01','2027-12-31')",[A,b.student,a.class,a.year])).rejects.toThrow();
  const nextYear=await insert("insert into academic_years(school_id,name,starts_on,ends_on) values($1,'2028','2028-01-01','2028-12-31')",[A]);
  await expect(db.query("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2028-01-01','2028-12-31')",[A,a.student,a.class,nextYear])).rejects.toThrow();
});
it("enforces references, duplicate links, placements and dates",async () => {
  await asUser(adminA,async()=>{
    const a=rows[A];
    await expect(db.query("insert into students(school_id,full_name,reference) values($1,'Duplicate',' st-001 ')",[A])).rejects.toThrow();
    await expect(db.query("insert into guardians(school_id,full_name,reference) values($1,' ','EMPTY')",[A])).rejects.toThrow();
    await expect(db.query("insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Parent')",[A,a.student,a.guardian])).rejects.toThrow();
    const fresh=await insert("insert into students(school_id,full_name,reference) values($1,'Fictional New','ST-002')",[A]);
    for(const [start,end] of [["2026-12-31","2027-12-31"],["2027-01-01","2028-01-01"],["2027-05-01","2027-04-01"]])
      await expect(db.query("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6)",[A,fresh,a.class,a.year,start,end])).rejects.toThrow();
    await expect(db.query("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-02-01','2027-12-31')",[A,a.student,a.class,a.year])).rejects.toThrow();
    await expect(db.query("insert into students(id,school_id,full_name,reference) values($1,$2,'Forged','FORGED')",[id(99),A])).rejects.toThrow();
  });
});
it("validates teaching relationships, dates, duplicates and creation audit",async()=>{
  const a=rows[A], b=rows[B];
  const sql="insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7)";
  // Owner writes exercise relational constraints independently of RLS.
  for(const fields of [[A,b.teacher,a.subject,a.class,a.year],[A,a.teacher,b.subject,a.class,a.year],[A,a.teacher,a.subject,b.class,a.year]])
    await expect(db.query(sql,[...fields,"2027-01-01","2027-12-31"])).rejects.toMatchObject({code:"23503"});
  await asUser(adminA,async()=>{
    expect((await db.query("select actor_user_id from audit_events where action='teaching_assignments.insert'")).rows).toEqual([{actor_user_id:adminA}]);
    await expect(db.query(sql,[A,a.teacher,a.subject,a.class,a.year,"2027-01-01","2027-12-31"])).rejects.toMatchObject({code:"23505"});
    for(const [start,end] of [["2026-12-31","2027-12-31"],["2027-01-01","2028-01-01"],["2027-12-31","2027-01-01"]])
      await expect(db.query(sql,[A,a.teacher,a.subject,a.class,a.year,start,end])).rejects.toMatchObject({code:"23514"});
    const coTeacher=await insert("insert into teachers(school_id,full_name,reference) values($1,'Fictional Co-teacher','TE-002')",[A]);
    await db.query(sql,[A,coTeacher,a.subject,a.class,a.year,"2027-01-01","2027-12-31"]);
    expect((await db.query("select * from teaching_assignments")).rows).toHaveLength(2);
  });
});
it("blocks suspended admins, inactive schools and anonymous users",async()=>{
  await db.query("update school_memberships set status='suspended' where user_id=$1",[adminA]);
  await asUser(adminA,async()=>{for(const table of tables) expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);await deniedWrites(A);});
  await db.query("update schools set active=false where id=$1",[B]);
  await asUser(adminB,async()=>{for(const table of tables) expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);await deniedWrites(B);});
  await db.exec("set role anon");
  try { for(const table of tables) await expect(db.query(`select * from ${table}`)).rejects.toThrow(); await deniedWrites(A); }
  finally {await db.exec("reset role");}
});
