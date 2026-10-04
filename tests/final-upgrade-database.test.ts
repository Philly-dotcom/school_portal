import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const id = (n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const A=id(1),B=id(2),admin=id(3),person=id(4),otherMembership=id(5);
const records:Record<string,string>={};
async function asUser<T>(user:string,fn:()=>Promise<T>) {
  await db.exec("set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
  try { return await fn(); } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
}
beforeAll(async()=> {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon;`);
  const migrations=readdirSync("supabase/migrations").sort();
  for(const file of migrations.slice(0,9)) await db.exec(readFileSync(`supabase/migrations/${file}`,"utf8"));
  await db.query("insert into schools(id,name) values($1,'Fictional A'),($2,'Fictional B')",[A,B]);
  for(const user of [admin,person]) {
    await db.query("insert into auth.users values($1,$2,now())",[user,`${user}@example.invalid`]);
    await db.query("insert into profiles(user_id,display_name) values($1,'Fictional Person')",[user]);
    await db.query("insert into school_memberships(id,school_id,user_id) values($1,$2,$1)",[user,A]);
  }
  await db.query("insert into membership_roles values($1,$2,'school_admin'),($3,$2,'student'),($3,$2,'teacher'),($3,$2,'guardian')",[admin,A,person]);
  await db.query("insert into school_memberships(id,school_id,user_id) values($1,$2,$3)",[otherMembership,B,person]);
  await db.query("insert into membership_roles values($1,$2,'teacher')",[otherMembership,B]);
  for(const kind of ["students","teachers","guardians"]) records[kind]=(await db.query<{id:string}>(`insert into ${kind}(school_id,full_name,reference) values($1,'Fictional Original','ORIGINAL') returning id`,[A])).rows[0].id;
  records.other=(await db.query<{id:string}>("insert into teachers(school_id,full_name,reference) values($1,'Fictional Other School','OTHER') returning id",[B])).rows[0].id;
  records.relationship=(await db.query<{id:string}>("insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Fictional relationship') returning id",[A,records.students,records.guardians])).rows[0].id;
  const year=(await db.query<{id:string}>("insert into academic_years(school_id,name,starts_on,ends_on) values($1,'2026','2026-01-01','2026-12-31') returning id",[A])).rows[0].id;
  const grade=(await db.query<{id:string}>("insert into grades(school_id,name) values($1,'Grade 10') returning id",[A])).rows[0].id;
  const classroom=(await db.query<{id:string}>("insert into classes(school_id,academic_year_id,grade_id,name) values($1,$2,$3,'10A') returning id",[A,year,grade])).rows[0].id;
  records.enrollment=(await db.query<{id:string}>("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2026-01-01','2026-12-31') returning id",[A,records.students,classroom,year])).rows[0].id;
  records.invitation=(await db.query<{id:string}>("insert into school_invitations(school_id,email,display_name,roles,invited_by,delivery_status) values($1,$2,'Fictional Invitation','{student}',$3,'sending') returning id",[A,`${person}@example.invalid`,admin])).rows[0].id;
  for(const file of migrations.slice(9,12)) await db.exec(readFileSync(`supabase/migrations/${file}`,"utf8"));
  // Reproduce the applied 010 RPC failure with Supabase's actual Auth email type.
  await expect(asUser(admin,()=>db.query("select * from list_linkable_members($1)",[A])))
    .rejects.toMatchObject({code:"42804"});
  for(const file of migrations.slice(12)) await db.exec(readFileSync(`supabase/migrations/${file}`,"utf8"));
},90000);
afterAll(async()=>{await db.close();});

it("repairs the email return type on upgrade while retaining admin and school boundaries",async()=> {
  const result=await asUser(admin,()=>db.query<{id:string;verified_email:string}>("select * from list_linkable_members($1)",[A]));
  expect(result.rows).toHaveLength(2);
  expect(result.rows.find(row=>row.id===admin)?.verified_email).toBe(`${admin}@example.invalid`);
  await expect(asUser(person,()=>db.query("select * from list_linkable_members($1)",[A]))).rejects.toMatchObject({code:"42501"});
  await expect(asUser(admin,()=>db.query("select * from list_linkable_members($1)",[B]))).rejects.toMatchObject({code:"42501"});
});

it("upgrades populated 001–009 in order, preserving records and defaulting to no new personal access",async()=> {
  expect((await db.query("select membership_id,reference from students where id=$1",[records.students])).rows).toEqual([{membership_id:null,reference:"ORIGINAL"}]);
  expect((await db.query("select access_enabled,record_version from student_guardians where id=$1",[records.relationship])).rows).toEqual([{access_enabled:false,record_version:1}]);
  expect((await db.query("select bulk,delivery_attempts from school_invitations where id=$1",[records.invitation])).rows).toEqual([{bulk:false,delivery_attempts:1}]);
  expect((await db.query("select id from enrollments")).rows).toEqual([{id:records.enrollment}]);
  await asUser(person,async()=>{expect((await db.query("select id from students")).rows).toEqual([]);});
});

it("erases every linked role in one school, preserving academic history and the other school and Auth identity",async()=> {
  for(const kind of ["students","teachers","guardians"]) await asUser(admin,async()=> {
    await db.query("select link_register_to_member($1,$2,$3,$4,1)",[A,kind,records[kind],person]);
    await db.query("select correct_school_record($1,$2,$3,2,'Fictional Corrected','CORRECTED')",[A,kind,records[kind]]);
  });
  await db.query("update teachers set membership_id=$1 where id=$2",[otherMembership,records.other]);
  await asUser(admin,()=>db.query("select set_guardian_access($1,$2,1,true)",[A,records.relationship]));
  await expect(asUser(admin,()=>db.query("select private.erase_school_member($1,$2)",[A,person]))).rejects.toMatchObject({code:"42501"});
  await expect(db.query("select private.erase_school_member($1,$2)",[A,admin])).rejects.toMatchObject({code:"23514"});
  // Prove the documented rehearsal is rollback-safe before committing it in this fixture.
  await db.exec("begin"); await db.query("select private.erase_school_member($1,$2)",[A,person]); await db.exec("rollback");
  expect((await db.query("select id from school_memberships where id=$1",[person])).rows).toHaveLength(1);
  await db.query("select private.erase_school_member($1,$2)",[A,person]);
  for(const kind of ["students","teachers","guardians"]) {
    const row=(await db.query<{full_name:string;reference:string;membership_id:string|null;record_version:number}>(`select full_name,reference,membership_id,record_version from ${kind} where id=$1`,[records[kind]])).rows[0];
    expect(row.full_name).toBe("[erased]"); expect(row.reference).toHaveLength(39); expect(row.membership_id).toBeNull(); expect(row.record_version).toBe(4);
  }
  expect((await db.query("select * from record_history where school_id=$1",[A])).rows).toEqual([]);
  expect((await db.query("select id from enrollments")).rows).toEqual([{id:records.enrollment}]);
  expect((await db.query("select access_enabled,relationship from student_guardians")).rows).toEqual([{access_enabled:false,relationship:"[erased]"}]);
  const invitation=(await db.query<{email:string;display_name:string;status:string;delivery_claim:string|null}>("select email,display_name,status,delivery_claim from school_invitations where id=$1",[records.invitation])).rows[0];
  expect(invitation).toMatchObject({display_name:"[erased]",status:"revoked",delivery_claim:null}); expect(invitation.email).toMatch(/^erased-/);
  expect((await db.query("select id from school_memberships where user_id=$1",[person])).rows).toEqual([{id:otherMembership}]);
  expect((await db.query("select full_name from teachers where id=$1",[records.other])).rows).toEqual([{full_name:"Fictional Other School"}]);
  expect((await db.query("select id from auth.users where id=$1",[person])).rows).toHaveLength(1);
  await asUser(person,async()=>{expect((await db.query("select * from students where school_id=$1",[A])).rows).toEqual([]);});
  const audit=JSON.stringify((await db.query("select details from audit_events where action like '%.erased'")).rows);
  expect(audit).not.toContain("Fictional");
});
