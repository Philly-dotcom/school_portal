import { installStorageStub } from "./helpers/storage-stub";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const school = id(1),
  foreign = id(2),
  admin = id(3),
  teacher = id(4),
  student = id(5),
  guardian = id(6),
  outsider = id(7),
  lateUser = id(8),
  idle = id(9);
const year = id(10),
  grade = id(11),
  classroom = id(12),
  secondClass = id(13),
  subject = id(14),
  teacherRecord = id(15),
  learner = id(16),
  lateLearner = id(17),
  guardianRecord = id(18),
  enrollment = id(19),
  assignment = id(20),
  foreignAssignment = id(40);
let today: string, yesterday: string, due: string;
async function user(who: string) {
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [who]);
}
async function owner() {
  await db.exec("reset role");
}
async function save(
  options: {
    id?: string;
    version?: number;
    status?: string;
    mode?: string;
    assignment?: string;
    due?: string;
    title?: string;
    instructions?: string;
  } = {},
) {
  return (
    await db.query<{ id: string }>(
      "select save_homework($1,$2,$3,$4,$5,$6,$7,$8,$9) id",
      [
        school,
        options.mode ?? "teacher",
        options.id ?? null,
        options.assignment ?? assignment,
        options.version ?? 0,
        options.title ?? "Fictional exercises",
        options.instructions ??
          "Read pages 1–2.\nAnswer the questions in your workbook.",
        options.due ?? due,
        options.status ?? "draft",
      ],
    )
  ).rows[0].id;
}
async function list(
  mode = "student",
  child: string | null = null,
  page = 1,
  target: string | null = null,
) {
  return (
    await db.query<{
      id: string;
      audience_date: Date;
      status: string;
      record_version: number;
      can_edit: boolean;
    }>("select * from list_homework($1,$2,$3,$4,$5)", [
      school,
      mode,
      child,
      page,
      target,
    ])
  ).rows;
}
async function rejection(fn: () => Promise<unknown>, code: string) {
  await db.exec("savepoint rejected_call");
  await expect(fn()).rejects.toMatchObject({ code });
  await db.exec(
    "rollback to savepoint rejected_call; release savepoint rejected_call",
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
    [school, foreign],
  );
  for (const [who, role, where] of [
    [admin, "school_admin", school],
    [teacher, "teacher", school],
    [student, "student", school],
    [guardian, "guardian", school],
    [outsider, "school_admin", foreign],
    [lateUser, "student", school],
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
    await db.query<{ today: string; yesterday: string; due: string }>(
      "select private.school_today($1)::text today,(private.school_today($1)-1)::text yesterday,(private.school_today($1)+7)::text due",
      [school],
    )
  ).rows[0];
  ({ today, yesterday, due } = dates);
  await db.query(
    "insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Fictional year',current_date-370,current_date+370),($3,$4,'Other year',current_date-370,current_date+370)",
    [year, school, id(30), foreign],
  );
  await db.query(
    "insert into grades(id,school_id,name) values($1,$2,'Grade 8'),($3,$4,'Grade 8')",
    [grade, school, id(31), foreign],
  );
  await db.query(
    "insert into classes(id,school_id,name,academic_year_id,grade_id) values($1,$2,'8A',$3,$4),($5,$2,'8B',$3,$4),($6,$7,'8A',$8,$9)",
    [
      classroom,
      school,
      year,
      grade,
      secondClass,
      id(32),
      foreign,
      id(30),
      id(31),
    ],
  );
  await db.query(
    "insert into subjects(id,school_id,name) values($1,$2,'Mathematics'),($3,$4,'Mathematics')",
    [subject, school, id(34), foreign],
  );
  await db.query(
    "insert into teachers(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Teacher','T1',$3),($4,$5,'Foreign Teacher','T1',null)",
    [teacherRecord, school, teacher, id(35), foreign],
  );
  await db.query(
    "insert into students(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Original','S1',$3),($4,$2,'Fictional Newcomer','S2',$5)",
    [learner, school, student, lateLearner, lateUser],
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
    "insert into enrollments(id,school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,current_date-30,current_date+30),($6,$2,$7,$4,$5,$8,current_date+30)",
    [enrollment, school, learner, classroom, year, id(21), lateLearner, today],
  );
  await db.query(
    "insert into teaching_assignments(id,school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,current_date-30,current_date+30),($7,$8,$9,$10,$11,$12,current_date-30,current_date+30)",
    [
      assignment,
      school,
      teacherRecord,
      subject,
      classroom,
      year,
      foreignAssignment,
      foreign,
      id(35),
      id(34),
      id(32),
      id(30),
    ],
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

it("keeps drafts hidden, publishes directly, withdraws and preserves publication across republication", async () => {
  await user(teacher);
  const item = await save();
  expect((await list("teacher"))[0].status).toBe("draft");
  await user(student);
  expect(await list()).toHaveLength(0);
  expect((await db.query("select * from homework_items")).rows).toHaveLength(0);
  await user(teacher);
  await save({ id: item, version: 1, status: "published" });
  await user(student);
  expect((await list())[0]).toMatchObject({
    id: item,
    status: "published",
    can_edit: false,
  });
  await user(teacher);
  await save({ id: item, version: 2, status: "withdrawn" });
  await user(student);
  expect(await list()).toHaveLength(0);
  await user(teacher);
  await save({ id: item, version: 3, status: "published", title: "Revised" });
  await owner();
  const row = (
    await db.query<{
      audience: string;
      created_by: string;
      record_version: number;
    }>(
      "select audience_date::text audience,created_by,record_version from homework_items where id=$1",
      [item],
    )
  ).rows[0];
  expect(row).toEqual({
    audience: today,
    created_by: teacher,
    record_version: 4,
  });
});
it("uses original dated enrollment, not the current class, after transfers and republication", async () => {
  await user(teacher);
  const item = await save({ status: "published" });
  await owner();
  // Simulate an item first published yesterday, before the newcomer enrolled.
  await db.query(
    "update homework_items set audience_date=$1,published_at=now()-interval '1 day' where id=$2",
    [yesterday, item],
  );
  await user(admin);
  await db.query("select change_enrollment($1,$2,1,'transfer',$3,$4)", [
    school,
    enrollment,
    today,
    secondClass,
  ]);
  await user(student);
  expect(await list()).toHaveLength(1);
  await user(lateUser);
  expect(await list()).toHaveLength(0);
  expect((await db.query("select * from homework_items")).rows).toHaveLength(0);
  await user(teacher);
  await save({ id: item, version: 1, status: "withdrawn" });
  await save({ id: item, version: 2, status: "published" });
  await user(lateUser);
  expect(await list()).toHaveLength(0);
  await user(student);
  expect(await list()).toHaveLength(1);
});
it.each([idle, student, guardian, outsider])(
  "denies unauthorized writes by %s",
  async (who) => {
    await user(who);
    await rejection(() => save(), "42501");
  },
);
it("rejects other-school assignments, forged school requests and reassignment of an existing item", async () => {
  await user(teacher);
  const item = await save();
  await rejection(() => save({ assignment: foreignAssignment }), "42501");
  await rejection(
    () => db.query("select * from list_homework($1,'teacher')", [foreign]),
    "42501",
  );
  await owner();
  await db.query(
    "insert into teaching_assignments(id,school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,current_date-20,current_date+20)",
    [id(22), school, teacherRecord, subject, secondClass, year],
  );
  await user(teacher);
  await rejection(
    () => save({ id: item, version: 1, assignment: id(22) }),
    "42501",
  );
});
it("removes former teacher write/read authority but leaves admin management available", async () => {
  await user(teacher);
  const item = await save({ status: "published" });
  await owner();
  await db.query("update teaching_assignments set ends_on=$1", [yesterday]);
  await user(teacher);
  expect(await list("teacher")).toHaveLength(0);
  await rejection(
    () => save({ id: item, version: 1, status: "published" }),
    "42501",
  );
  await user(admin);
  expect((await list("school_admin"))[0].can_edit).toBe(true);
  await save({
    id: item,
    version: 1,
    status: "withdrawn",
    mode: "school_admin",
  });
});
it("requires explicit guardian child grants even on a teacher/guardian account", async () => {
  await user(teacher);
  await save({ status: "published" });
  await owner();
  await db.query("insert into membership_roles values($1,$2,'guardian')", [
    teacher,
    school,
  ]);
  await db.query("update guardians set membership_id=$1 where id=$2", [
    teacher,
    guardianRecord,
  ]);
  await user(teacher);
  expect(await list("guardian", learner)).toHaveLength(1);
  await rejection(() => list("guardian", lateLearner), "42501");
  await owner();
  await db.exec("update student_guardians set access_enabled=false");
  await user(teacher);
  await rejection(() => list("guardian", learner), "42501");
  // Teacher authority must not be accidentally removed by the guardian rule.
  expect(await list("teacher")).toHaveLength(1);
});
it("rejects stale versions without overwriting the first editor", async () => {
  await user(teacher);
  const item = await save();
  await save({ id: item, version: 1, title: "First editor" });
  await rejection(
    () => save({ id: item, version: 1, title: "Stale editor" }),
    "40001",
  );
  expect(
    (
      await db.query<{ title: string }>(
        "select title from homework_items where id=$1",
        [item],
      )
    ).rows[0].title,
  ).toBe("First editor");
});
it("rolls back the item if auditing fails", async () => {
  await db.exec(`create function public.fail_homework_audit() returns trigger language plpgsql as $$ begin
    if new.action='homework.save' then raise exception 'test failure'; end if; return new; end $$;
    create trigger fail_homework_audit before insert on audit_events for each row execute function fail_homework_audit();`);
  await user(teacher);
  await rejection(() => save(), "P0001");
  expect(await list("teacher")).toHaveLength(0);
});
it.each([
  { title: "\t " },
  { instructions: "\n " },
  { title: "x".repeat(161) },
  { instructions: "x".repeat(10001) },
  { due: "infinity" },
  { due: "2000-01-01" },
  { status: "submitted" },
  { status: "withdrawn" },
])("rejects invalid fields %#", async (options) => {
  await user(teacher);
  await rejection(() => save(options), "22023");
});
it("rejects past-due first publication and reverting a published item to draft", async () => {
  await user(teacher);
  await rejection(() => save({ status: "published", due: yesterday }), "22023");
  const item = await save({ status: "published" });
  await rejection(
    () => save({ id: item, version: 1, status: "draft" }),
    "22023",
  );
});
it.each(["suspension", "role", "school", "unlink"])(
  "rechecks %s before reads and writes",
  async (change) => {
    await user(teacher);
    const item = await save({ status: "published" });
    await owner();
    if (change === "suspension")
      await db.query(
        "update school_memberships set status='suspended' where id=$1",
        [teacher],
      );
    if (change === "role")
      await db.query("delete from membership_roles where membership_id=$1", [
        teacher,
      ]);
    if (change === "school")
      await db.query("update schools set active=false where id=$1", [school]);
    if (change === "unlink")
      await db.exec("update teachers set membership_id=null");
    await user(teacher);
    await rejection(
      () => save({ id: item, version: 1, status: "published" }),
      "42501",
    );
    expect((await db.query("select * from homework_items")).rows).toHaveLength(
      0,
    );
  },
);
it("keeps direct mutations and anonymous RPCs denied", async () => {
  await user(admin);
  for (const sql of [
    "insert into homework_items default values",
    "update homework_items set title='bad'",
    "delete from homework_items",
  ])
    await rejection(() => db.exec(sql), "42501");
  await db.exec("set local role anon");
  await rejection(() => list(), "42501");
  await rejection(() => save(), "42501");
});
it("filters before pagination and lets a School B admin read only their own homework", async () => {
  await user(teacher);
  for (let n = 0; n < 52; n++) await save({ title: `Fictional item ${n}` });
  const first = await list("teacher");
  const second = await list("teacher", null, 2);
  expect(first).toHaveLength(51);
  expect(second).toHaveLength(2);
  expect(
    new Set([...first.slice(0, 50), ...second].map((row) => row.id)).size,
  ).toBe(52);
  await user(outsider);
  expect((await db.query("select * from homework_items")).rows).toHaveLength(0);
  await db.query(
    "select save_homework($1,'school_admin',null,$2,0,'Foreign item','Fictional instructions',$3,'draft')",
    [foreign, foreignAssignment, due],
  );
  expect((await db.query("select * from homework_items")).rows).toHaveLength(1);
  await user(teacher);
  expect((await db.query("select * from homework_items")).rows).toHaveLength(
    52,
  );
}, 20000);
it("bounds assignment search and distinguishes assignment periods in labels", async () => {
  await user(teacher);
  const choices = await db.query<{ label: string }>(
    "select * from search_homework_assignments($1,'teacher','Math',1)",
    [school],
  );
  expect(choices.rows).toHaveLength(1);
  expect(choices.rows[0].label).toContain("Fictional Teacher");
  expect(choices.rows[0].label).toMatch(/\d{4}-\d{2}-\d{2}–\d{4}-\d{2}-\d{2}/);
  expect(
    (
      await db.query(
        "select * from search_homework_assignments($1,'teacher','%',1)",
        [school],
      )
    ).rows,
  ).toHaveLength(0);
  await rejection(
    () =>
      db.query(
        "select * from search_homework_assignments($1,'teacher','',100001)",
        [school],
      ),
    "22023",
  );
});
