import { installStorageStub } from "./helpers/storage-stub";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const school = id(1),
  otherSchool = id(2),
  admin = id(3),
  otherAdmin = id(4);
const oldTeacher = id(5),
  newTeacher = id(6),
  foreignTeacher = id(7);
const year = id(8),
  grade = id(9),
  classroom = id(10),
  subject = id(11),
  assignment = id(12),
  lesson = id(13);
let today: string, start: string, end: string;
async function asUser<T>(user: string, run: () => Promise<T>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("savepoint user_call");
  try {
    const value = await run();
    await db.exec("release savepoint user_call");
    return value;
  } catch (error) {
    await db.exec(
      "rollback to savepoint user_call; release savepoint user_call",
    );
    throw error;
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub");
  }
}
function change(
  user = admin,
  kind = "replace",
  date = today,
  teacher: string | null = newTeacher,
  version = 1,
  target = school,
) {
  return asUser(user, () =>
    db.query<{ id: string }>(
      "select change_teaching_assignment($1,$2,$3,$4,$5,$6) as id",
      [target, assignment, version, kind, date, teacher],
    ),
  );
}
async function row() {
  return (
    await db.query<{
      ends_on: string;
      closure: string | null;
      record_version: number;
    }>(
      "select ends_on::text,closure,record_version from teaching_assignments where id=$1",
      [assignment],
    )
  ).rows[0];
}
// Expected SQL failures run inside savepoints so each test can keep its transaction.
async function rejected(run: () => Promise<unknown>, code: string) {
  await db.exec("savepoint denied");
  try {
    await expect(run()).rejects.toMatchObject({ code });
  } finally {
    await db.exec("rollback to savepoint denied; release savepoint denied");
  }
}
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon;`);
  await installStorageStub(db);
  const files = readdirSync("supabase/migrations").sort();
  for (const f of files.filter((f) => f < "202610040014"))
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  today = (await db.query<{ d: string }>("select current_date::text as d"))
    .rows[0].d;
  start = `${Number(today.slice(0, 4)) - 1}-01-01`;
  end = `${Number(today.slice(0, 4)) + 1}-12-31`;
  await db.query(
    "insert into schools(id,name) values($1,'Fictional A'),($2,'Fictional B')",
    [school, otherSchool],
  );
  for (const [user, s, role] of [
    [admin, school, "school_admin"],
    [otherAdmin, otherSchool, "school_admin"],
    [oldTeacher, school, "teacher"],
    [newTeacher, school, "teacher"],
  ]) {
    await db.query("insert into auth.users(id) values($1)", [user]);
    await db.query("insert into profiles(user_id) values($1)", [user]);
    await db.query(
      "insert into school_memberships(id,school_id,user_id) values($1,$2,$1)",
      [user, s],
    );
    await db.query("insert into membership_roles values($1,$2,$3)", [
      user,
      s,
      role,
    ]);
  }
  for (const t of [oldTeacher, newTeacher])
    await db.query(
      "insert into teachers(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Teacher',$3,$1)",
      [t, school, t],
    );
  await db.query(
    "insert into teachers(id,school_id,full_name,reference) values($1,$2,'Fictional Foreign','FOREIGN')",
    [foreignTeacher, otherSchool],
  );
  await db.query(
    "insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Fictional year',$3,$4)",
    [year, school, start, end],
  );
  await db.query(
    "insert into grades(id,school_id,name) values($1,$2,'Grade 10')",
    [grade, school],
  );
  await db.query(
    "insert into classes(id,school_id,academic_year_id,grade_id,name) values($1,$2,$3,$4,'10A')",
    [classroom, school, year, grade],
  );
  await db.query(
    "insert into subjects(id,school_id,name) values($1,$2,'Fictional Subject')",
    [subject, school],
  );
  await db.query(
    "insert into teaching_assignments(id,school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7,$8)",
    [assignment, school, oldTeacher, subject, classroom, year, start, end],
  );
  await db.query(
    "insert into timetable_lessons(id,school_id,assignment_id,teacher_id,class_id,weekday,start_minute,end_minute,starts_on,ends_on) values($1,$2,$3,$4,$5,1,540,600,$6,$6::date+30)",
    [lesson, school, assignment, oldTeacher, classroom, start],
  );
  const student = id(14);
  await db.query(
    "insert into students(id,school_id,full_name,reference) values($1,$2,'Fictional Learner','ST-1')",
    [student, school],
  );
  await db.query(
    "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6)",
    [school, student, classroom, year, start, end],
  );
  for (const f of files.filter((f) => f >= "202610040014"))
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
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

it("upgrades existing assignments and lessons without changing their dates or references", async () => {
  expect(await row()).toEqual({
    ends_on: end,
    closure: null,
    record_version: 1,
  });
  expect(
    (
      await db.query(
        "select assignment_id from timetable_lessons where id=$1",
        [lesson],
      )
    ).rows,
  ).toEqual([{ assignment_id: assignment }]);
});
it("replaces a teacher atomically, retains history and switches current roster access on the effective day", async () => {
  expect(
    (await asUser(oldTeacher, () => db.query("select id from students"))).rows,
  ).toHaveLength(1);
  expect(
    (await asUser(newTeacher, () => db.query("select id from students"))).rows,
  ).toHaveLength(0);
  const next = (await change()).rows[0].id;
  expect(await row()).toMatchObject({ closure: "replace", record_version: 2 });
  expect(
    (
      await db.query(
        "select (ends_on=$2::date-1) as adjacent from teaching_assignments where id=$1",
        [assignment, today],
      )
    ).rows,
  ).toEqual([{ adjacent: true }]);
  expect(
    (
      await db.query(
        "select teacher_id,starts_on::text,ends_on::text,subject_id,class_id from teaching_assignments where id=$1",
        [next],
      )
    ).rows,
  ).toEqual([
    {
      teacher_id: newTeacher,
      starts_on: today,
      ends_on: end,
      subject_id: subject,
      class_id: classroom,
    },
  ]);
  expect(
    (await asUser(oldTeacher, () => db.query("select id from students"))).rows,
  ).toHaveLength(0);
  expect(
    (await asUser(newTeacher, () => db.query("select id from students"))).rows,
  ).toHaveLength(1);
  expect(
    (
      await asUser(oldTeacher, () =>
        db.query("select id from teaching_assignments"),
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query(
        "select details->>'replacement_id' as id from audit_events where action='teaching_assignments.replace'",
      )
    ).rows,
  ).toEqual([{ id: next }]);
  await rejected(() => change(), "40001");
});
it("ends an assignment inclusively, rejects stale changes and allows a later non-overlapping period", async () => {
  await change(admin, "end", today, null);
  expect(await row()).toEqual({
    ends_on: today,
    closure: "end",
    record_version: 2,
  });
  await rejected(() => change(admin, "end", today, null, 2), "40001");
  await rejected(
    () =>
      asUser(admin, () =>
        db.query(
          "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7)",
          [school, oldTeacher, subject, classroom, year, today, end],
        ),
      ),
    "23P01",
  );
  await asUser(admin, () =>
    db.query(
      "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6::date+1,$7)",
      [school, oldTeacher, subject, classroom, year, today, end],
    ),
  );
});
it("keeps today's roster with the old teacher for a future replacement", async () => {
  const tomorrow = (
    await db.query<{ d: string }>("select (current_date+2)::text as d")
  ).rows[0].d;
  await change(admin, "replace", tomorrow);
  expect(
    (await asUser(oldTeacher, () => db.query("select id from students"))).rows,
  ).toHaveLength(1);
  expect(
    (await asUser(newTeacher, () => db.query("select id from students"))).rows,
  ).toHaveLength(0);
});
it("rejects non-admin and foreign-school reads/writes without exposing the other school", async () => {
  expect(
    (
      await asUser(otherAdmin, () =>
        db.query("select id from teaching_assignments where school_id=$1", [
          school,
        ]),
      )
    ).rows,
  ).toEqual([]);
  await rejected(() => change(oldTeacher), "42501");
  await rejected(() => change(otherAdmin), "42501");
  await rejected(
    () => change(otherAdmin, "end", today, null, 1, otherSchool),
    "22023",
  );
  await rejected(
    () =>
      asUser(admin, () =>
        db.query(
          "update teaching_assignments set ends_on=current_date where id=$1",
          [assignment],
        ),
      ),
    "42501",
  );
  await rejected(
    () =>
      asUser(admin, () =>
        db.query("delete from teaching_assignments where id=$1", [assignment]),
      ),
    "42501",
  );
  await rejected(
    () => change(admin, "replace", today, foreignTeacher),
    "22023",
  );
  await db.query(
    "update school_memberships set status='suspended' where id=$1",
    [admin],
  );
  await rejected(() => change(), "42501");
});
it("rejects invalid dates, same teacher and extraneous destinations without changing history", async () => {
  for (const [kind, date, teacher] of [
    ["replace", start, newTeacher],
    ["replace", today, oldTeacher],
    ["end", today, newTeacher],
    ["invalid", today, newTeacher],
    ["end", "9999-01-01", null],
  ] as const)
    await rejected(() => change(admin, kind, date, teacher), "22023");
  await rejected(() => change(admin, "end", today, null, 99), "40001");
  expect(await row()).toEqual({
    ends_on: end,
    closure: null,
    record_version: 1,
  });
});
it("blocks shortening over existing lessons and leaves the timetable untouched", async () => {
  await rejected(() => change(admin, "end", start, null), "23514");
  expect(await row()).toEqual({
    ends_on: end,
    closure: null,
    record_version: 1,
  });
  expect((await db.query("select id from timetable_lessons")).rows).toEqual([
    { id: lesson },
  ]);
  await change(admin, "end", today, null);
  await rejected(
    () =>
      asUser(admin, () =>
        db.query("select create_timetable_lesson($1,$2,1,600,660,$3,$4)", [
          school,
          assignment,
          today,
          end,
        ]),
      ),
    "22023",
  );
});
it("rolls back the old assignment if replacement overlaps or audit fails", async () => {
  await db.query(
    "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7)",
    [school, newTeacher, subject, classroom, year, start, end],
  );
  await rejected(() => change(), "23P01");
  expect(await row()).toEqual({
    ends_on: end,
    closure: null,
    record_version: 1,
  });
  await db.exec(`create function private.fail_lifecycle_audit() returns trigger language plpgsql set search_path='' as $$begin raise exception 'test audit failure'; end;$$;
    create trigger fail_lifecycle_audit before insert on public.audit_events for each row when(new.action='teaching_assignments.end') execute function private.fail_lifecycle_audit();`);
  await rejected(() => change(admin, "end", today, null), "P0001");
  expect(await row()).toEqual({
    ends_on: end,
    closure: null,
    record_version: 1,
  });
});
