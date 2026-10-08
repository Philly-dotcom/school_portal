import { installStorageStub } from "./helpers/storage-stub";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const school = id(1),
  otherSchool = id(2),
  teacher = id(3),
  student = id(4),
  guardian = id(5),
  outsider = id(6),
  otherStudent = id(7);
async function user(value: string) {
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [value]);
}
function read(
  mode: string,
  child: string | null = null,
  target = school,
  page = 1,
) {
  return db.query<Record<string, unknown>>(
    "select * from list_my_timetable($1,$2,$3,$4)",
    [target, mode, child, page],
  );
}
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;`);
  await installStorageStub(db);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query(
    "insert into schools(id,name,timezone) values($1,'Fictional A','Pacific/Kiritimati'),($2,'Fictional B','UTC')",
    [school, otherSchool],
  );
  for (const [who, role, where] of [
    [teacher, "teacher", school],
    [student, "student", school],
    [guardian, "guardian", school],
    [outsider, "teacher", otherSchool],
    [otherStudent, "student", school],
  ]) {
    await db.query("insert into auth.users(id) values($1)", [who]);
    await db.query("insert into profiles(user_id) values($1)", [who]);
    await db.query(
      "insert into school_memberships(id,school_id,user_id) values($1,$2,$1)",
      [who, where],
    );
    await db.query("insert into membership_roles values($1,$2,$3)", [
      who,
      where,
      role,
    ]);
  }
  await db.query("insert into membership_roles values($1,$2,'teacher')", [
    guardian,
    school,
  ]);
  await db.query(
    "insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Fictional year',current_date-370,current_date+370)",
    [id(10), school],
  );
  await db.query(
    "insert into grades(id,school_id,name) values($1,$2,'Grade 8')",
    [id(11), school],
  );
  await db.query(
    "insert into classes(id,school_id,name,academic_year_id,grade_id) values($1,$2,'8A',$3,$4)",
    [id(12), school, id(10), id(11)],
  );
  await db.query(
    "insert into subjects(id,school_id,name) values($1,$2,'Mathematics')",
    [id(13), school],
  );
  await db.query(
    "insert into teachers(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Teacher','T1',$3),($4,$2,'Fictional Guardian Teacher','T2',$5)",
    [id(14), school, teacher, id(24), guardian],
  );
  await db.query(
    "insert into students(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Learner','S1',$3),($4,$2,'Fictional Other Learner','S2',$5)",
    [id(15), school, student, id(25), otherStudent],
  );
  await db.query(
    "insert into guardians(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Guardian','G1',$3)",
    [id(16), school, guardian],
  );
  await db.query(
    "insert into student_guardians(school_id,student_id,guardian_id,relationship,access_enabled) values($1,$2,$3,'Guardian',true)",
    [school, id(15), id(16)],
  );
  await db.query(
    "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,current_date-30,current_date+30),($1,$5,$3,$4,current_date-30,current_date+30)",
    [school, id(15), id(12), id(10), id(25)],
  );
  await db.query(
    "insert into teaching_assignments(id,school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,current_date-30,current_date+30),($7,$2,$8,$4,$5,$6,current_date-30,current_date+30)",
    [id(17), school, id(14), id(13), id(12), id(10), id(27), id(24)],
  );
  await db.query(
    "insert into timetable_lessons(id,school_id,assignment_id,teacher_id,class_id,weekday,start_minute,end_minute,starts_on,ends_on) values($1,$2,$3,$4,$5,extract(isodow from private.school_today($2))::integer,480,540,current_date-20,current_date+20)",
    [id(18), school, id(17), id(14), id(12)],
  );
}, 90000);
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db.close();
});

it.each([
  [teacher, "teacher", null],
  [student, "student", null],
  [guardian, "guardian", id(15)],
])("returns only lesson display fields for %s", async (who, mode, child) => {
  const today = (
    await db.query<{ today: string }>(
      "select private.school_today($1)::text today",
      [school],
    )
  ).rows[0].today;
  await user(who!);
  const result = await read(mode!, child);
  expect(result.rows).toHaveLength(1);
  expect(Object.keys(result.rows[0]).sort()).toEqual(
    [
      "id",
      "weekday",
      "start_minute",
      "end_minute",
      "lesson_date",
      "subject_name",
      "class_name",
      "grade_name",
      "teacher_name",
    ].sort(),
  );
  expect(
    new Date(result.rows[0].lesson_date as string).toISOString().slice(0, 10),
  ).toBe(today);
  if (mode !== "teacher")
    expect(
      (await db.query("select id from teachers where id=$1", [id(14)])).rows,
    ).toHaveLength(0);
});
it("does not let a teacher/guardian use roster access as a child grant", async () => {
  await user(guardian);
  expect(
    (await db.query("select id from students where id=$1", [id(25)])).rows,
  ).toHaveLength(1);
  await expect(read("guardian", id(25))).rejects.toMatchObject({
    code: "42501",
  });
});
it.each([
  [outsider, "teacher", null],
  [student, "teacher", null],
  [guardian, "guardian", null],
])(
  "rejects unrelated or ungranted requests by %s",
  async (who, mode, child) => {
    await user(who!);
    await expect(read(mode!, child)).rejects.toMatchObject({ code: "42501" });
  },
);
it("rejects a forged school", async () => {
  await user(teacher);
  await expect(read("teacher", null, otherSchool)).rejects.toMatchObject({
    code: "42501",
  });
});
it("rejects a supplied student in student mode", async () => {
  await user(student);
  await expect(read("student", id(25))).rejects.toMatchObject({
    code: "22023",
  });
});
it.each(["suspension", "role", "grant", "school", "link"])(
  "rechecks access after %s changes",
  async (change) => {
    if (change === "suspension")
      await db.query(
        "update school_memberships set status='suspended' where id=$1",
        [guardian],
      );
    if (change === "role")
      await db.query(
        "delete from membership_roles where membership_id=$1 and role='guardian'",
        [guardian],
      );
    if (change === "grant")
      await db.exec("update student_guardians set access_enabled=false");
    if (change === "school")
      await db.query("update schools set active=false where id=$1", [school]);
    if (change === "link")
      await db.exec("update guardians set membership_id=null");
    await user(guardian);
    await expect(read("guardian", id(15))).rejects.toMatchObject({
      code: "42501",
    });
  },
);
it("hides lessons outside today's placement", async () => {
  await db.query("update enrollments set ends_on=private.school_today($1)-1", [
    school,
  ]);
  await user(student);
  expect((await read("student")).rows).toHaveLength(0);
});
it("hides lessons with no occurrence this week", async () => {
  await db.exec(
    "update timetable_lessons set starts_on=current_date+10,ends_on=current_date+20",
  );
  await user(student);
  expect((await read("student")).rows).toHaveLength(0);
});
it("keeps table writes denied", async () => {
  await user(student);
  await expect(
    db.exec("update timetable_lessons set start_minute=1"),
  ).rejects.toMatchObject({ code: "42501" });
});
it("denies anonymous function execution", async () => {
  await db.exec("set local role anon");
  await expect(read("student")).rejects.toMatchObject({ code: "42501" });
});
it("validates pagination", async () => {
  await user(teacher);
  await expect(read("teacher", null, school, 100001)).rejects.toMatchObject({
    code: "22023",
  });
});
