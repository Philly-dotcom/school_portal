import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Fictional data only. Runs every real migration in embedded PostgreSQL.
const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1), B = id(2);
const adminA = id(3), adminB = id(4), teacherU = id(5), guardianU = id(6), studentU = id(7), idleTeacherU = id(8);
const y = new Date().getUTCFullYear();
const ids: Record<string, string> = {};

async function asUser<T>(user: string, fn: () => Promise<T>): Promise<T> {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try { return await fn(); } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
}
async function insert(sql: string, values: unknown[]) { return (await db.query<{ id: string }>(sql + " returning id", values)).rows[0].id; }
async function count(table: string) { return Number((await db.query<{ n: string }>(`select count(*) n from ${table}`)).rows[0].n); }
async function link(user: string, kind: string, record: string, membership: string | null) {
  return asUser(user, () => db.query("select link_register_to_member($1,$2,$3,$4)", [A, kind, record, membership]));
}

beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;`);
  for (const file of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into schools(id,name) values($1,'Fictional A'),($2,'Fictional B')", [A, B]);
  for (const [user, school, role] of [[adminA, A, "school_admin"], [adminB, B, "school_admin"], [teacherU, A, "teacher"],
    [guardianU, A, "guardian"], [studentU, A, "student"], [idleTeacherU, A, "teacher"]]) {
    await db.query("insert into auth.users(id) values($1)", [user]);
    await db.query("insert into profiles(user_id) values($1)", [user]);
    await db.query("insert into school_memberships(id,school_id,user_id) values($1,$2,$1)", [user, school]);
    await db.query("insert into membership_roles values($1,$2,$3)", [user, school, role]);
  }
  await asUser(adminA, async () => {
    const year = await insert("insert into academic_years(school_id,name,starts_on,ends_on) values($1,'Test year',$2,$3)", [A, `${y - 1}-01-01`, `${y + 1}-12-31`]);
    const grade = await insert("insert into grades(school_id,name) values($1,'Grade 8')", [A]);
    const c8a = await insert("insert into classes(school_id,name,academic_year_id,grade_id) values($1,'8A',$2,$3)", [A, year, grade]);
    const c8b = await insert("insert into classes(school_id,name,academic_year_id,grade_id) values($1,'8B',$2,$3)", [A, year, grade]);
    const subject = await insert("insert into subjects(school_id,name) values($1,'Mathematics')", [A]);
    const s1 = await insert("insert into students(school_id,full_name,reference) values($1,'Fictional One','ST-001')", [A]);
    const s2 = await insert("insert into students(school_id,full_name,reference) values($1,'Fictional Two','ST-002')", [A]);
    const g1 = await insert("insert into guardians(school_id,full_name,reference) values($1,'Fictional Guardian','GU-001')", [A]);
    const t1 = await insert("insert into teachers(school_id,full_name,reference) values($1,'Fictional Teacher','TE-001')", [A]);
    const t2 = await insert("insert into teachers(school_id,full_name,reference) values($1,'Fictional Idle','TE-002')", [A]);
    await insert("insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7)",
      [A, t1, subject, c8a, year, `${y - 1}-01-01`, `${y + 1}-12-31`]);
    await insert("insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7)",
      [A, t1, subject, c8b, year, `${y - 1}-01-01`, `${y - 1}-12-31`]); // expired
    await insert("insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Guardian')", [A, s1, g1]);
    await insert("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6)", [A, s1, c8a, year, `${y - 1}-01-01`, `${y + 1}-12-31`]);
    await insert("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6)", [A, s2, c8b, year, `${y - 1}-01-01`, `${y + 1}-12-31`]);
    Object.assign(ids, { year, c8a, c8b, s1, s2, g1, t1, t2 });
  });
  await asUser(adminB, async () => { await insert("insert into students(school_id,full_name,reference) values($1,'Fictional Other School','ST-900')", [B]); });
}, 90000);
afterAll(async () => { await db.close(); });

const linkedTables = ["students", "teachers", "guardians", "student_guardians", "enrollments", "classes", "teaching_assignments", "timetable_lessons"];

describe("before any record is linked to a login", () => {
  it("gives teachers, guardians and students no personal or relationship data", async () => {
    for (const user of [teacherU, guardianU, studentU, idleTeacherU]) await asUser(user, async () => {
      for (const table of linkedTables) expect(await count(table), `${table} for ${user}`).toBe(0);
    });
  });
  it("lets active members read non-sensitive reference data of their own school only", async () => {
    await asUser(teacherU, async () => { expect(await count("grades")).toBe(1); expect(await count("subjects")).toBe(1); expect(await count("academic_years")).toBe(1); });
    await asUser(adminB, async () => { expect(await count("grades")).toBe(0); });
  });
});

describe("link_register_to_member", () => {
  it("is administrator-only and validates role, school, record type and duplicates", async () => {
    await expect(link(teacherU, "teachers", ids.t1, teacherU)).rejects.toMatchObject({ code: "42501" });
    await expect(link(adminB, "teachers", ids.t1, teacherU)).rejects.toMatchObject({ code: "42501" });
    await expect(link(adminA, "teachers", ids.t1, guardianU)).rejects.toMatchObject({ code: "22023" }); // wrong role
    await expect(link(adminA, "teachers", ids.t1, adminB)).rejects.toMatchObject({ code: "22023" });    // other school
    await expect(link(adminA, "audit_events", ids.t1, teacherU)).rejects.toMatchObject({ code: "22023" });
    await expect(link(adminA, "teachers", id(999), teacherU)).rejects.toMatchObject({ code: "22023" });
    await expect(asUser(adminA, () => db.query("update teachers set membership_id=$1 where id=$2", [teacherU, ids.t1]))).rejects.toMatchObject({ code: "42501" });
  });
  it("links, audits, rejects a second record for the same login, and unlinks", async () => {
    await link(adminA, "teachers", ids.t1, teacherU);
    await expect(link(adminA, "teachers", ids.t2, teacherU)).rejects.toMatchObject({ code: "23505" });
    await link(adminA, "teachers", ids.t2, idleTeacherU);
    await link(adminA, "teachers", ids.t2, null);
    const audit = await db.query<{ action: string }>("select action from audit_events where record_id=$1 and action like 'teachers.%link' order by id", [ids.t2]);
    expect(audit.rows.map((r) => r.action)).toEqual(["teachers.link", "teachers.unlink"]);
    await link(adminA, "guardians", ids.g1, guardianU);
    await link(adminA, "students", ids.s1, studentU);
  });
});

describe("after linking", () => {
  it("shows a teacher only their own record, assignments, today's classes and roster", async () => {
    await asUser(teacherU, async () => {
      expect((await db.query("select id from teachers")).rows).toEqual([{ id: ids.t1 }]);
      expect(await count("teaching_assignments")).toBe(2);
      expect((await db.query("select id from classes")).rows).toEqual([{ id: ids.c8a }]); // 8B assignment expired
      expect((await db.query("select id from students")).rows).toEqual([{ id: ids.s1 }]); // roster only, not S2
      expect((await db.query("select student_id from enrollments")).rows).toEqual([{ student_id: ids.s1 }]);
      expect(await count("guardians")).toBe(0);
      expect(await count("student_guardians")).toBe(0);
    });
  });
  it("shows a guardian only their own record, link and child", async () => {
    await asUser(guardianU, async () => {
      expect((await db.query("select id from guardians")).rows).toEqual([{ id: ids.g1 }]);
      expect((await db.query("select id from students")).rows).toEqual([{ id: ids.s1 }]);
      expect(await count("student_guardians")).toBe(1);
      expect((await db.query("select id from classes")).rows).toEqual([{ id: ids.c8a }]);
      expect(await count("teachers")).toBe(0);
    });
  });
  it("shows a student only themselves", async () => {
    await asUser(studentU, async () => {
      expect((await db.query("select id from students")).rows).toEqual([{ id: ids.s1 }]);
      expect(await count("guardians")).toBe(0);
      expect(await count("student_guardians")).toBe(0);
      expect(await count("teachers")).toBe(0);
    });
  });
  it("never exposes other schools and never grants writes", async () => {
    for (const user of [teacherU, guardianU, studentU]) await asUser(user, async () => {
      expect((await db.query("select 1 from students where school_id=$1", [B])).rows).toHaveLength(0);
      await expect(db.query("insert into students(school_id,full_name,reference) values($1,'x','x')", [A])).rejects.toMatchObject({ code: "42501" });
      await expect(db.query("update students set full_name='x'")).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("revokes access immediately when the role is removed or the member is suspended", async () => {
    await db.query("delete from membership_roles where membership_id=$1 and role='teacher'", [teacherU]);
    await asUser(teacherU, async () => { expect(await count("teachers")).toBe(0); expect(await count("students")).toBe(0); });
    await db.query("insert into membership_roles values($1,$2,'teacher')", [teacherU, A]);
    await asUser(teacherU, async () => { expect(await count("teachers")).toBe(1); });
    await db.query("update school_memberships set status='suspended' where id=$1", [guardianU]);
    await asUser(guardianU, async () => { expect(await count("guardians")).toBe(0); expect(await count("students")).toBe(0); });
    await db.query("update school_memberships set status='active' where id=$1", [guardianU]);
  });
  it("survives an invalid stored timezone without breaking reads", async () => {
    await db.query("update schools set timezone='Not/AZone' where id=$1", [A]);
    await asUser(teacherU, async () => { expect((await db.query("select id from classes")).rows).toEqual([{ id: ids.c8a }]); });
    await db.query("update schools set timezone='Africa/Johannesburg' where id=$1", [A]);
  });
});
