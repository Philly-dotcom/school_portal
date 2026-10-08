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
  teacher = id(4),
  student = id(5),
  guardian = id(6),
  outsider = id(7),
  idle = id(8);
const year = id(10),
  grade = id(11),
  classroom = id(12),
  secondClass = id(13),
  subject = id(14),
  teacherRecord = id(15),
  learner = id(16),
  peer = id(17),
  guardianRecord = id(18),
  enrollment = id(19);
let today: string, yesterday: string;
async function user(who: string) {
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [who]);
}
async function owner() {
  await db.exec("reset role");
}
async function save(
  version = 0,
  entries: unknown = [{ studentId: learner, status: "present" }],
  date = today,
  mode = "teacher",
  reason = "",
  target = classroom,
) {
  return (
    await db.query<{ result: { id: string; version: number } }>(
      "select save_attendance($1,$2,$3,$4,$5,$6,$7) result",
      [school, target, date, mode, version, JSON.stringify(entries), reason],
    )
  ).rows[0].result;
}
async function register(date = today, mode = "teacher", page = 1) {
  return (
    await db.query<{
      result: {
        version: number;
        can_edit: boolean;
        has_next: boolean;
        rows: { student_id: string; status: string | null }[];
      };
    }>("select get_attendance_register($1,$2,$3,$4,$5) result", [
      school,
      classroom,
      date,
      mode,
      page,
    ])
  ).rows[0].result;
}
async function rejection(fn: () => Promise<unknown>, code: string) {
  await db.exec("savepoint failure_check");
  await expect(fn()).rejects.toMatchObject({ code });
  await db.exec(
    "rollback to savepoint failure_check; release savepoint failure_check",
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
    "insert into schools(id,name,timezone) values($1,'Fictional A','Africa/Johannesburg'),($2,'Fictional B','UTC')",
    [school, otherSchool],
  );
  for (const [who, role, where] of [
    [admin, "school_admin", school],
    [teacher, "teacher", school],
    [student, "student", school],
    [guardian, "guardian", school],
    [outsider, "school_admin", otherSchool],
    [idle, "teacher", school],
  ]) {
    await db.query("insert into auth.users(id) values($1)", [who]);
    await db.query("insert into profiles(user_id) values($1)", [who]);
    await db.query(
      "insert into school_memberships(id,user_id,school_id) values($1,$1,$2)",
      [who, where],
    );
    await db.query("insert into membership_roles values($1,$2,$3)", [
      who,
      where,
      role,
    ]);
  }
  const dates = (
    await db.query<{ today: string; yesterday: string }>(
      "select private.school_today($1)::text today,(private.school_today($1)-1)::text yesterday",
      [school],
    )
  ).rows[0];
  today = dates.today;
  yesterday = dates.yesterday;
  await db.query(
    "insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Fictional year',current_date-370,current_date+370)",
    [year, school],
  );
  await db.query(
    "insert into grades(id,school_id,name) values($1,$2,'Grade 8')",
    [grade, school],
  );
  await db.query(
    "insert into classes(id,school_id,name,academic_year_id,grade_id) values($1,$2,'8A',$3,$4),($5,$2,'8B',$3,$4)",
    [classroom, school, year, grade, secondClass],
  );
  await db.query(
    "insert into subjects(id,school_id,name) values($1,$2,'Mathematics')",
    [subject, school],
  );
  await db.query(
    "insert into teachers(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Teacher','T1',$3)",
    [teacherRecord, school, teacher],
  );
  await db.query(
    "insert into students(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Learner','S1',$3),($4,$2,'Fictional Peer','S2',null)",
    [learner, school, student, peer],
  );
  await db.query(
    "insert into guardians(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Guardian','G1',$3)",
    [guardianRecord, school, guardian],
  );
  await db.query(
    "insert into student_guardians(school_id,student_id,guardian_id,relationship,access_enabled) values($1,$2,$3,'Guardian',true)",
    [school, learner, guardianRecord],
  );
  await db.query(
    "insert into enrollments(id,school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,current_date-30,current_date+30),($6,$2,$7,$4,$5,current_date-30,current_date+30)",
    [enrollment, school, learner, classroom, year, id(20), peer],
  );
  await db.query(
    "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,current_date-30,current_date+30)",
    [school, teacherRecord, subject, classroom, year],
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

it("saves only explicit marks, increments a single version and audits before/after", async () => {
  await user(teacher);
  expect((await register()).rows.every((r) => r.status === null)).toBe(true);
  expect((await save()).version).toBe(1);
  expect((await register()).rows.map((r) => r.status)).toEqual([
    "present",
    null,
  ]);
  expect((await save(1, [{ studentId: peer, status: "late" }])).version).toBe(
    2,
  );
  expect((await register()).rows.map((r) => r.status)).toEqual([
    "present",
    "late",
  ]);
  await save(2, [{ studentId: learner, status: null }]);
  expect((await register()).rows.map((r) => r.status)).toEqual([null, "late"]);
  await owner();
  const audit = await db.query<{ details: { changes: unknown[] } }>(
    "select details from audit_events where action='attendance.save' order by id desc limit 1",
  );
  expect(audit.rows[0].details.changes).toEqual([
    { student_id: learner, before: "present", after: null },
  ]);
});
it("rejects stale creation and update with no partial changes", async () => {
  await user(teacher);
  await save();
  await rejection(
    () => save(0, [{ studentId: peer, status: "absent" }]),
    "40001",
  );
  await save(1, [{ studentId: learner, status: "late" }]);
  await rejection(
    () => save(1, [{ studentId: peer, status: "absent" }]),
    "40001",
  );
  expect((await register()).rows.map((r) => r.status)).toEqual(["late", null]);
});
it("allows older admin entries only with a reason and teacher history is read-only", async () => {
  await user(admin);
  await rejection(() => save(0, undefined, yesterday, "school_admin"), "22023");
  await rejection(
    () => save(0, undefined, yesterday, "school_admin", "\t\n "),
    "22023",
  );
  await save(
    0,
    undefined,
    yesterday,
    "school_admin",
    "Recorded from the fictional paper register",
  );
  await user(teacher);
  expect((await register(yesterday)).can_edit).toBe(false);
  await rejection(
    () => save(1, undefined, yesterday, "teacher", "Correction"),
    "42501",
  );
});
it.each([idle, student, guardian, outsider])(
  "denies unrelated staff and non-staff %s",
  async (who) => {
    await user(who);
    await rejection(() => save(), "42501");
    await rejection(() => register(), "42501");
  },
);
it("denies forged admin mode and a class without a teaching assignment", async () => {
  await user(teacher);
  await rejection(() => save(0, undefined, today, "school_admin"), "42501");
  await rejection(
    () => save(0, undefined, today, "teacher", "", secondClass),
    "42501",
  );
});
it("requires a teacher's assignment to cover the historical date too", async () => {
  await db.query("update teaching_assignments set starts_on=$1", [today]);
  await user(teacher);
  expect((await register()).can_edit).toBe(true);
  await rejection(() => register(yesterday), "42501");
});
it("does not allow future registers or dates outside the academic year", async () => {
  const future = (
    await db.query<{ date: string }>("select ($1::date+1)::text date", [today])
  ).rows[0].date;
  await user(admin);
  await rejection(() => save(0, undefined, future, "school_admin"), "42501");
  await rejection(
    () => save(0, undefined, "2000-01-01", "school_admin", "Correction"),
    "42501",
  );
});
it("searches only permitted classes and treats wildcard text literally", async () => {
  await user(teacher);
  expect(
    (
      await db.query(
        "select * from list_attendance_classes($1,'teacher','8',1)",
        [school],
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query(
        "select * from list_attendance_classes($1,'teacher','%',1)",
        [school],
      )
    ).rows,
  ).toHaveLength(0);
  await user(outsider);
  await rejection(
    () =>
      db.query(
        "select * from list_attendance_classes($1,'school_admin','',1)",
        [school],
      ),
    "42501",
  );
});
it.each([
  null,
  {},
  [],
  [{ studentId: learner, status: "unknown" }],
  [{ studentId: learner, status: "present", schoolId: otherSchool }],
  [
    { studentId: learner, status: "present" },
    { studentId: learner, status: "late" },
  ],
  Array(101).fill({ studentId: learner, status: "present" }),
])("rejects malformed batches %#", async (entries) => {
  await user(teacher);
  await rejection(() => save(0, entries), "22023");
  expect((await register()).version).toBe(0);
});
it("rolls back an otherwise valid first mark if a later learner is invalid", async () => {
  await user(teacher);
  await rejection(
    () =>
      save(0, [
        { studentId: learner, status: "present" },
        { studentId: id(999), status: "absent" },
      ]),
    "22023",
  );
  expect((await register()).version).toBe(0);
});
it("rolls back marks and version when audit insertion fails", async () => {
  await db.exec(`create function public.fail_attendance_audit() returns trigger language plpgsql as $$ begin
    if new.action='attendance.save' then raise exception 'test failure'; end if; return new; end $$;
    create trigger fail_attendance_audit before insert on audit_events for each row execute function fail_attendance_audit();`);
  await user(teacher);
  await rejection(() => save(), "P0001");
  expect((await register()).version).toBe(0);
});
it("preserves historical entries and prevents a contradictory backdated transfer", async () => {
  await user(teacher);
  await save();
  await user(admin);
  await rejection(
    () =>
      db.query("select change_enrollment($1,$2,1,'transfer',$3,$4)", [
        school,
        enrollment,
        today,
        secondClass,
      ]),
    "23514",
  );
  await db.query("select change_enrollment($1,$2,1,'transfer',$3::date+1,$4)", [
    school,
    enrollment,
    today,
    secondClass,
  ]);
  expect((await register(today, "school_admin")).rows[0].status).toBe(
    "present",
  );
});
it("limits student/guardian history to the exact learner, including for a teacher/guardian", async () => {
  await user(teacher);
  await save(0, [
    { studentId: learner, status: "present" },
    { studentId: peer, status: "absent" },
  ]);
  await owner();
  await db.query("insert into membership_roles values($1,$2,'teacher')", [
    guardian,
    school,
  ]);
  await user(student);
  expect(
    (await db.query("select * from attendance_entries")).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from attendance_sessions")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select * from list_my_attendance($1,'student')", [school]))
      .rows,
  ).toHaveLength(1);
  await user(guardian);
  expect(
    (
      await db.query("select * from list_my_attendance($1,'guardian',$2)", [
        school,
        learner,
      ])
    ).rows,
  ).toHaveLength(1);
  await rejection(
    () =>
      db.query("select * from list_my_attendance($1,'guardian',$2)", [
        school,
        peer,
      ]),
    "42501",
  );
  await owner();
  await db.exec("update student_guardians set access_enabled=false");
  await user(guardian);
  expect(
    (await db.query("select * from attendance_entries")).rows,
  ).toHaveLength(0);
  await rejection(
    () =>
      db.query("select * from list_my_attendance($1,'guardian',$2)", [
        school,
        learner,
      ]),
    "42501",
  );
});
it("hides School A records from a School B admin", async () => {
  await user(teacher);
  await save();
  await user(outsider);
  expect(
    (await db.query("select * from attendance_sessions")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select * from attendance_entries")).rows,
  ).toHaveLength(0);
  await rejection(() => save(0, undefined, today, "school_admin"), "42501");
});
it.each(["role", "suspended", "school", "assignment"])(
  "rechecks %s access on every read and write",
  async (change) => {
    await user(teacher);
    await save();
    await owner();
    if (change === "role")
      await db.query("delete from membership_roles where membership_id=$1", [
        teacher,
      ]);
    if (change === "suspended")
      await db.query(
        "update school_memberships set status='suspended' where id=$1",
        [teacher],
      );
    if (change === "school")
      await db.query("update schools set active=false where id=$1", [school]);
    if (change === "assignment")
      await db.query("update teaching_assignments set ends_on=$1::date-1", [
        today,
      ]);
    await user(teacher);
    await rejection(() => register(), "42501");
    await rejection(() => save(1), "42501");
  },
);
it("denies direct mutations and anonymous RPC calls", async () => {
  await user(admin);
  for (const table of ["attendance_sessions", "attendance_entries"]) {
    await rejection(
      () => db.exec(`insert into ${table} default values`),
      "42501",
    );
    await rejection(() => db.exec(`delete from ${table}`), "42501");
    await rejection(
      () => db.exec(`update ${table} set school_id=school_id`),
      "42501",
    );
  }
  await db.exec("set local role anon");
  await rejection(() => register(), "42501");
  await rejection(() => save(), "42501");
});
it("paginates the roster without dropping marks from a different page", async () => {
  for (let n = 100; n < 151; n++) {
    await db.query(
      "insert into students(id,school_id,full_name,reference) values($1,$2,$3,$3)",
      [id(n), school, `Fictional ${n}`],
    );
    await db.query(
      "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,current_date-10,current_date+10)",
      [school, id(n), classroom, year],
    );
  }
  await user(teacher);
  expect((await register()).rows).toHaveLength(50);
  expect((await register()).has_next).toBe(true);
  expect((await register(today, "teacher", 2)).rows).toHaveLength(3);
  await save();
  await save(1, [{ studentId: id(100), status: "present" }]);
  expect(
    (await register(today, "teacher", 2)).rows.find(
      (r) => r.student_id === learner,
    )?.status,
  ).toBe("present");
});
