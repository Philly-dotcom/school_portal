import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
const db = new PGlite();
const A = "10000000-0000-4000-8000-000000000001", B = "10000000-0000-4000-8000-000000000002";
const admin = "20000000-0000-4000-8000-000000000001", other = "20000000-0000-4000-8000-000000000002", teacher = "20000000-0000-4000-8000-000000000003";
let year: string, grade: string;
async function asUser(user: string, fn: () => Promise<void>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try { await fn(); } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
}
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;`);
  for (const file of ["202609290001_foundation.sql", "202609300002_account_management.sql", "202610010003_academic_structure.sql"])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into schools(id,name) values($1,'Fictional A'),($2,'Fictional B')", [A,B]);
  for (const [id, school, role] of [[admin,A,"school_admin"],[other,B,"school_admin"],[teacher,A,"teacher"]]) {
    await db.query("insert into auth.users(id) values($1)", [id]);
    await db.query("insert into profiles(user_id) values($1)", [id]);
    await db.query("insert into school_memberships(id,school_id,user_id) values($1,$2,$1)", [id,school]);
    await db.query("insert into membership_roles values($1,$2,$3)", [id,school,role]);
  }
  await asUser(admin, async () => {
    year = (await db.query<{id:string}>("insert into academic_years(school_id,name,starts_on,ends_on) values($1,'2027','2027-01-01','2027-12-31') returning id",[A])).rows[0].id;
    grade = (await db.query<{id:string}>("insert into grades(school_id,name) values($1,'Grade 1') returning id",[A])).rows[0].id;
    await db.query("insert into subjects(school_id,name) values($1,'Mathematics')",[A]);
    await db.query("insert into classes(school_id,name,academic_year_id,grade_id) values($1,'A',$2,$3)",[A,year,grade]);
    await db.query("insert into academic_terms(school_id,name,academic_year_id,starts_on,ends_on) values($1,'Term 1',$2,'2027-01-01','2027-03-31')",[A,year]);
  });
},60000);
afterAll(async () => { await db.close(); });
it("allows school admin creation and records the actor in audit", async () => {
  await asUser(admin, async () => {
    expect((await db.query("select * from classes")).rows).toHaveLength(1);
    expect((await db.query("select * from audit_events where action='classes.insert' and actor_user_id=$1",[admin])).rows).toHaveLength(1);
  });
});
it("denies cross-school and teacher reads and writes on every academic table", async () => {
  for (const user of [other,teacher]) await asUser(user,async () => {
    for (const table of ["academic_years","academic_terms","grades","subjects","classes"]) {
      expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
      const fields = table === "academic_years" ? ",starts_on,ends_on" : table === "academic_terms" ? ",academic_year_id,starts_on,ends_on" : table === "classes" ? ",academic_year_id,grade_id" : "";
      const vals = table === "academic_years" ? ",'2027-01-01','2027-12-31'" : table === "academic_terms" ? `,'${year}','2027-01-01','2027-03-31'` : table === "classes" ? `,'${year}','${grade}'` : "";
      await expect(db.query(`insert into ${table}(school_id,name${fields}) values($1,'Denied'${vals})`,[A])).rejects.toThrow();
      await expect(db.query(`update ${table} set name='Denied'`)).rejects.toThrow();
      await expect(db.query(`delete from ${table}`)).rejects.toThrow();
    }
  });
});
it("rejects mixed-school parent references even for owner", async () => {
  await expect(db.query("insert into classes(school_id,name,academic_year_id,grade_id) values($1,'Invalid',$2,$3)",[B,year,grade])).rejects.toThrow();
});
it("validates dates and duplicate names in the database", async () => {
  await asUser(admin,async () => {
    await expect(db.query("insert into academic_terms(school_id,name,academic_year_id,starts_on,ends_on) values($1,'Invalid',$2,'2026-01-01','2027-03-31')",[A,year])).rejects.toThrow();
    await expect(db.query("insert into academic_years(school_id,name,starts_on,ends_on) values($1,'Invalid','2027-12-31','2027-01-01')",[A])).rejects.toThrow();
    await expect(db.query("insert into grades(school_id,name) values($1,' grade 1 ')",[A])).rejects.toThrow();
    await expect(db.query("update academic_years set ends_on='2026-01-01'")).rejects.toThrow();
  });
});
it("blocks suspended admins, inactive schools and anonymous requests", async () => {
  await db.query("update school_memberships set status='suspended' where user_id=$1",[admin]);
  await asUser(admin,async () => {
    expect((await db.query("select * from grades")).rows).toHaveLength(0);
    await expect(db.query("insert into grades(school_id,name) values($1,'Denied')",[A])).rejects.toThrow();
  });
  await db.query("update school_memberships set status='active' where user_id=$1",[admin]);
  await db.query("update schools set active=false where id=$1",[A]);
  await asUser(admin,async () => {
    expect((await db.query("select * from classes")).rows).toHaveLength(0);
    await expect(db.query("insert into subjects(school_id,name) values($1,'Denied')",[A])).rejects.toThrow();
  });
  await db.exec("set role anon");
  try { await expect(db.query("select * from academic_years")).rejects.toThrow(); }
  finally { await db.exec("reset role"); }
});
