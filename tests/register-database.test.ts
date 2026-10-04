import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  adminA = id(3),
  adminB = id(4),
  teacher = id(5),
  guardian = id(6),
  student = id(7),
  outsider = id(8);
const rows: Record<
  string,
  {
    student: string;
    guardian: string;
    year: string;
    class: string;
    teacher: string;
    subject: string;
  }
> = {};
async function asUser(user: string, fn: () => Promise<void>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    await fn();
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub");
  }
}
async function insert(sql: string, values: string[]) {
  return (await db.query<{ id: string }>(sql + " returning id", values)).rows[0]
    .id;
}
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;`);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query(
    "insert into schools(id,name) values($1,'Fictional A'),($2,'Fictional B')",
    [A, B],
  );
  for (const [user, school, role] of [
    [adminA, A, "school_admin"],
    [adminB, B, "school_admin"],
    [teacher, A, "teacher"],
    [guardian, A, "guardian"],
    [student, A, "student"],
  ]) {
    await db.query("insert into auth.users(id) values($1)", [user]);
    await db.query("insert into profiles(user_id) values($1)", [user]);
    await db.query(
      "insert into school_memberships(id,school_id,user_id) values($1,$2,$1)",
      [user, school],
    );
    await db.query("insert into membership_roles values($1,$2,$3)", [
      user,
      school,
      role,
    ]);
  }
  for (const [school, user] of [
    [A, adminA],
    [B, adminB],
  ])
    await asUser(user, async () => {
      const year = await insert(
        "insert into academic_years(school_id,name,starts_on,ends_on) values($1,'2027','2027-01-01','2027-12-31')",
        [school],
      );
      const grade = await insert(
        "insert into grades(school_id,name) values($1,'Grade 8')",
        [school],
      );
      const classroom = await insert(
        "insert into classes(school_id,name,academic_year_id,grade_id) values($1,'8A',$2,$3)",
        [school, year, grade],
      );
      const learner = await insert(
        "insert into students(school_id,full_name,reference) values($1,'Fictional Learner','ST-001')",
        [school],
      );
      const parent = await insert(
        "insert into guardians(school_id,full_name,reference) values($1,'Fictional Guardian','GU-001')",
        [school],
      );
      const teacherRecord = await insert(
        "insert into teachers(school_id,full_name,reference) values($1,'Fictional Teacher','TE-001')",
        [school],
      );
      const subject = await insert(
        "insert into subjects(school_id,name) values($1,'Mathematics')",
        [school],
      );
      await insert(
        "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,'2027-01-01','2027-12-31')",
        [school, teacherRecord, subject, classroom, year],
      );
      await insert(
        "insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Guardian')",
        [school, learner, parent],
      );
      await insert(
        "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-01-01','2027-12-31')",
        [school, learner, classroom, year],
      );
      rows[school] = {
        student: learner,
        guardian: parent,
        year,
        class: classroom,
        teacher: teacherRecord,
        subject,
      };
    });
}, 60000);
afterAll(async () => {
  await db.close();
});
const tables = [
  "students",
  "teachers",
  "guardians",
  "student_guardians",
  "enrollments",
  "teaching_assignments",
];
it("isolates reads in both directions and audits creation without creating Auth users", async () => {
  for (const [school, user] of [
    [A, adminA],
    [B, adminB],
  ])
    await asUser(user, async () => {
      for (const table of tables)
        expect((await db.query(`select school_id from ${table}`)).rows).toEqual(
          [{ school_id: school }],
        );
      expect(
        (
          await db.query(
            "select actor_user_id from audit_events where action='enrollments.insert'",
          )
        ).rows,
      ).toEqual([{ actor_user_id: user }]);
    });
  expect((await db.query("select * from auth.users")).rows).toHaveLength(5);
});
async function deniedWrites(school: string) {
  const r = rows[school];
  await expect(
    db.query(
      "select change_enrollment($1,$2,1,'withdrawal','2027-06-01',null)",
      [school, id(999)],
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    db.query(
      "select create_timetable_lesson($1,$2,1,540,600,'2027-01-01','2027-12-31')",
      [school, id(999)],
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    db.query("select remove_timetable_lesson($1,$2)", [school, id(999)]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    db.query(
      "select correct_school_record($1,'students',$2,1,'Denied','DENIED')",
      [school, r.student],
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    db.query(
      "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,'2027-01-01','2027-12-31')",
      [school, r.teacher, r.subject, r.class, r.year],
    ),
  ).rejects.toMatchObject({ code: "42501" });
  for (const table of ["students", "teachers", "guardians"])
    await expect(
      db.query(
        `insert into ${table}(school_id,full_name,reference) values($1,'Denied','DENIED')`,
        [school],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  await expect(
    db.query(
      "insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Denied')",
      [school, r.student, r.guardian],
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    db.query(
      "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-01-01','2027-12-31')",
      [school, r.student, r.class, r.year],
    ),
  ).rejects.toMatchObject({ code: "42501" });
  for (const table of tables) {
    await expect(
      db.query(`update ${table} set school_id=$1`, [school]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(db.query(`delete from ${table}`)).rejects.toMatchObject({
      code: "42501",
    });
  }
}
it("denies cross-school writes and all non-admin reads/writes", async () => {
  await asUser(adminA, async () => {
    await deniedWrites(B);
  });
  await asUser(adminB, async () => {
    await deniedWrites(A);
  });
  for (const user of [teacher, guardian, student, outsider])
    await asUser(user, async () => {
      for (const table of tables)
        expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
      await deniedWrites(A);
    });
});
it("rejects cross-school links and mismatched class years even as database owner", async () => {
  const a = rows[A],
    b = rows[B];
  await expect(
    db.query(
      "insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Invalid')",
      [A, a.student, b.guardian],
    ),
  ).rejects.toThrow();
  await expect(
    db.query(
      "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-01-01','2027-12-31')",
      [A, b.student, a.class, a.year],
    ),
  ).rejects.toThrow();
  const nextYear = await insert(
    "insert into academic_years(school_id,name,starts_on,ends_on) values($1,'2028','2028-01-01','2028-12-31')",
    [A],
  );
  await expect(
    db.query(
      "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2028-01-01','2028-12-31')",
      [A, a.student, a.class, nextYear],
    ),
  ).rejects.toThrow();
});
it("enforces references, duplicate links, placements and dates", async () => {
  await asUser(adminA, async () => {
    const a = rows[A];
    await expect(
      db.query(
        "insert into students(school_id,full_name,reference) values($1,'Duplicate',' st-001 ')",
        [A],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into guardians(school_id,full_name,reference) values($1,' ','EMPTY')",
        [A],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Parent')",
        [A, a.student, a.guardian],
      ),
    ).rejects.toThrow();
    const fresh = await insert(
      "insert into students(school_id,full_name,reference) values($1,'Fictional New','ST-002')",
      [A],
    );
    for (const [start, end] of [
      ["2026-12-31", "2027-12-31"],
      ["2027-01-01", "2028-01-01"],
      ["2027-05-01", "2027-04-01"],
    ])
      await expect(
        db.query(
          "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6)",
          [A, fresh, a.class, a.year, start, end],
        ),
      ).rejects.toThrow();
    await expect(
      db.query(
        "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,'2027-02-01','2027-12-31')",
        [A, a.student, a.class, a.year],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into students(id,school_id,full_name,reference) values($1,$2,'Forged','FORGED')",
        [id(99), A],
      ),
    ).rejects.toThrow();
  });
});
it("validates teaching relationships, dates, duplicates and creation audit", async () => {
  const a = rows[A],
    b = rows[B];
  const sql =
    "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7)";
  // Owner writes exercise relational constraints independently of RLS.
  for (const fields of [
    [A, b.teacher, a.subject, a.class, a.year],
    [A, a.teacher, b.subject, a.class, a.year],
    [A, a.teacher, a.subject, b.class, a.year],
  ])
    await expect(
      db.query(sql, [...fields, "2027-01-01", "2027-12-31"]),
    ).rejects.toMatchObject({ code: "23503" });
  await asUser(adminA, async () => {
    expect(
      (
        await db.query(
          "select actor_user_id from audit_events where action='teaching_assignments.insert'",
        )
      ).rows,
    ).toEqual([{ actor_user_id: adminA }]);
    await expect(
      db.query(sql, [
        A,
        a.teacher,
        a.subject,
        a.class,
        a.year,
        "2027-01-01",
        "2027-12-31",
      ]),
    ).rejects.toMatchObject({ code: "23505" });
    for (const [start, end] of [
      ["2026-12-31", "2027-12-31"],
      ["2027-01-01", "2028-01-01"],
      ["2027-12-31", "2027-01-01"],
    ])
      await expect(
        db.query(sql, [A, a.teacher, a.subject, a.class, a.year, start, end]),
      ).rejects.toMatchObject({ code: "23514" });
    const coTeacher = await insert(
      "insert into teachers(school_id,full_name,reference) values($1,'Fictional Co-teacher','TE-002')",
      [A],
    );
    await db.query(sql, [
      A,
      coTeacher,
      a.subject,
      a.class,
      a.year,
      "2027-01-01",
      "2027-12-31",
    ]);
    expect(
      (await db.query("select * from teaching_assignments")).rows,
    ).toHaveLength(2);
  });
});
it("corrections reject another school's record IDs, arbitrary table names and invalid fields", async () => {
  await asUser(adminA, async () => {
    await expect(
      db.query(
        "select correct_school_record($1,'students',$2,1,'Denied','DENIED')",
        [A, rows[B].student],
      ),
    ).rejects.toMatchObject({ code: "40001" });
    await expect(
      db.query(
        "select correct_school_record($1,'schools',$2,1,'Denied',null)",
        [A, A],
      ),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      db.query("select correct_school_record($1,'students',$2,1,' ',null)", [
        A,
        rows[A].student,
      ]),
    ).rejects.toMatchObject({ code: "22023" });
  });
});
it("corrects all supported records with stable relationships, version checks and non-PII audit", async () => {
  const enrollments = (await db.query("select * from enrollments order by id"))
    .rows;
  const teaching = (
    await db.query("select * from teaching_assignments order by id")
  ).rows;
  const guardianLinks = (
    await db.query("select * from student_guardians order by id")
  ).rows;
  await db.query(
    "insert into academic_terms(school_id,academic_year_id,name,starts_on,ends_on) values($1,$2,'Term 1','2027-01-01','2027-03-31')",
    [A, rows[A].year],
  );
  await asUser(adminA, async () => {
    for (const kind of [
      "academic_years",
      "academic_terms",
      "grades",
      "subjects",
      "classes",
      "students",
      "teachers",
      "guardians",
    ]) {
      const before = (
        await db.query<Record<string, unknown>>(
          `select * from ${kind} where school_id=$1 order by id limit 1`,
          [A],
        )
      ).rows[0];
      const person = ["students", "teachers", "guardians"].includes(kind);
      const name = kind === "grades" ? "Grade9" : "Fictional corrected";
      const corrected = kind === "grades" ? "Grade 9" : name;
      const args = [A, kind, before.id, 1, name, person ? "CORRECTED" : null];
      expect(
        (
          await db.query(
            "select correct_school_record($1,$2,$3,$4,$5,$6) as version",
            args,
          )
        ).rows,
      ).toEqual([{ version: 2 }]);
      const after = (
        await db.query(`select * from ${kind} where id=$1`, [before.id])
      ).rows[0];
      expect(after).toEqual({
        ...before,
        record_version: 2,
        ...(person
          ? { full_name: corrected, reference: "CORRECTED" }
          : { name: corrected }),
      });
      await expect(
        db.query("select correct_school_record($1,$2,$3,$4,$5,$6)", args),
      ).rejects.toMatchObject({ code: "40001" });
      const audit = await db.query(
        "select details,actor_user_id from audit_events where action=$1 and record_id=$2",
        [kind + ".correct", before.id],
      );
      expect(audit.rows).toEqual([
        {
          actor_user_id: adminA,
          details: {
            previous_version: 1,
            record_version: 2,
            fields: person ? ["full_name", "reference"] : ["name"],
          },
        },
      ]);
      await expect(
        db.query(`update ${kind} set record_version=99 where id=$1`, [
          before.id,
        ]),
      ).rejects.toMatchObject({ code: "42501" });
    }
  });
  expect(
    (await db.query("select * from enrollments order by id")).rows,
  ).toEqual(enrollments);
  expect(
    (await db.query("select * from teaching_assignments order by id")).rows,
  ).toEqual(teaching);
  expect(
    (await db.query("select * from student_guardians order by id")).rows,
  ).toEqual(guardianLinks);
});
it("corrections preserve duplicate grade and register-reference protection", async () => {
  await asUser(adminA, async () => {
    const grade = await insert(
      "insert into grades(school_id,name) values($1,'Grade 10')",
      [A],
    );
    const otherGrade = await insert(
      "insert into grades(school_id,name) values($1,'Grade 11')",
      [A],
    );
    await expect(
      db.query(
        "select correct_school_record($1,'grades',$2,1,'grade10',null)",
        [A, otherGrade],
      ),
    ).rejects.toMatchObject({ code: "23505" });
    expect(
      (await db.query("select record_version from grades where id=$1", [grade]))
        .rows,
    ).toEqual([{ record_version: 1 }]);
    const first = await insert(
      "insert into teachers(school_id,full_name,reference) values($1,'Fictional first','TE-DUP')",
      [A],
    );
    const second = await insert(
      "insert into teachers(school_id,full_name,reference) values($1,'Fictional second','TE-OTHER')",
      [A],
    );
    await expect(
      db.query(
        "select correct_school_record($1,'teachers',$2,1,'Fictional second',' te-dup ')",
        [A, second],
      ),
    ).rejects.toMatchObject({ code: "23505" });
    expect(first).not.toBe(second);
  });
});
it("schedules weekly lessons with teacher/class clash checks and exact recurrence dates", async () => {
  await asUser(adminA, async () => {
    const a = rows[A];
    const assignment = (
      await db.query<{ id: string }>(
        "select id from teaching_assignments where teacher_id=$1 and class_id=$2",
        [a.teacher, a.class],
      )
    ).rows[0].id;
    const schedule = (
      target: string,
      start: number,
      end: number,
      first = "2027-01-01",
      last = "2027-12-31",
      day = 1,
    ) =>
      db.query<{ id: string }>(
        "select create_timetable_lesson($1,$2,$3,$4,$5,$6,$7) as id",
        [A, target, day, start, end, first, last],
      );
    await schedule(assignment, 540, 600);
    await schedule(assignment, 600, 660);
    await expect(schedule(assignment, 570, 610)).rejects.toMatchObject({
      code: "23P01",
    });
    await expect(schedule(assignment, 660, 660)).rejects.toMatchObject({
      code: "22023",
    });
    await expect(
      schedule(assignment, 660, 720, "2026-12-31"),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      schedule(assignment, 660, 720, "2027-01-05", "2027-01-06"),
    ).rejects.toMatchObject({ code: "22023" });
    // Overlapping date ranges without a shared Monday must remain valid.
    await schedule(assignment, 780, 840, "2027-01-04", "2027-01-08");
    await schedule(assignment, 780, 840, "2027-01-05", "2027-01-11");
    const newClass = (
      await db.query<{ id: string }>(
        "insert into classes(school_id,name,grade_id,academic_year_id) select school_id,'Fictional B',grade_id,academic_year_id from classes where id=$1 returning id",
        [a.class],
      )
    ).rows[0].id;
    const otherClassAssignment = await insert(
      "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,'2027-01-01','2027-12-31')",
      [A, a.teacher, a.subject, newClass, a.year],
    );
    await expect(
      schedule(otherClassAssignment, 540, 600),
    ).rejects.toMatchObject({ code: "23P01" });
    const coTeacherAssignment = (
      await db.query<{ id: string }>(
        "select id from teaching_assignments where class_id=$1 and teacher_id<>$2",
        [a.class, a.teacher],
      )
    ).rows[0].id;
    await expect(schedule(coTeacherAssignment, 540, 600)).rejects.toMatchObject(
      { code: "23P01" },
    );
    await schedule(assignment, 540, 600, "2027-01-01", "2027-12-31", 2);
  });
});
it("isolates timetable reads/writes and audits removal without removing school records", async () => {
  let lessonB = "";
  await asUser(adminB, async () => {
    expect(
      (await db.query("select * from timetable_lessons")).rows,
    ).toHaveLength(0);
    const assignment = (
      await db.query<{ id: string }>(
        "select id from teaching_assignments where school_id=$1",
        [B],
      )
    ).rows[0].id;
    lessonB = (
      await db.query<{ id: string }>(
        "select create_timetable_lesson($1,$2,1,540,600,'2027-01-01','2027-12-31') as id",
        [B, assignment],
      )
    ).rows[0].id;
  });
  const before = (await db.query("select * from enrollments order by id")).rows;
  const beforeAssignments = (
    await db.query("select * from teaching_assignments order by id")
  ).rows;
  await asUser(adminA, async () => {
    expect(
      (
        await db.query<{ school_id: string }>(
          "select school_id from timetable_lessons",
        )
      ).rows.every((r) => r.school_id === A),
    ).toBe(true);
    await expect(
      db.query("select remove_timetable_lesson($1,$2)", [A, lessonB]),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      db.query(
        "select create_timetable_lesson($1,$2,1,540,600,'2027-01-01','2027-12-31')",
        [A, lessonB],
      ),
    ).rejects.toMatchObject({ code: "22023" });
    const own = (
      await db.query<{ id: string }>(
        "select id from timetable_lessons order by id limit 1",
      )
    ).rows[0].id;
    await db.query("select remove_timetable_lesson($1,$2)", [A, own]);
    expect(
      (
        await db.query(
          "select details->>'id' as id from audit_events where action='timetable_lessons.remove' and record_id=$1",
          [own],
        )
      ).rows,
    ).toEqual([{ id: own }]);
    await expect(
      db.query("select remove_timetable_lesson($1,$2)", [A, own]),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      db.query("delete from timetable_lessons"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("update timetable_lessons set start_minute=0"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("insert into timetable_lessons(school_id) values($1)", [A]),
    ).rejects.toMatchObject({ code: "42501" });
  });
  for (const user of [teacher, guardian, student, outsider])
    await asUser(user, async () => {
      expect(
        (await db.query("select * from timetable_lessons")).rows,
      ).toHaveLength(0);
    });
  expect(
    (await db.query("select * from enrollments order by id")).rows,
  ).toEqual(before);
  expect(
    (await db.query("select * from teaching_assignments order by id")).rows,
  ).toEqual(beforeAssignments);
});
it("preserves enrollment history, prevents overlaps and rejects stale or foreign lifecycle changes", async () => {
  const a = rows[A],
    b = rows[B];
  const original = (
    await db.query<{ id: string }>(
      "select id from enrollments where student_id=$1",
      [a.student],
    )
  ).rows[0].id;
  const foreign = (
    await db.query<{ id: string }>(
      "select id from enrollments where student_id=$1",
      [b.student],
    )
  ).rows[0].id;
  await asUser(adminA, async () => {
    const grade = (
      await db.query<{ grade_id: string }>(
        "select grade_id from classes where id=$1",
        [a.class],
      )
    ).rows[0].grade_id;
    const destination = await insert(
      "insert into classes(school_id,name,academic_year_id,grade_id) values($1,'8B',$2,$3)",
      [A, a.year, grade],
    );
    const nextYear = await insert(
      "insert into academic_years(school_id,name,starts_on,ends_on) values($1,'2029','2029-01-01','2029-12-31')",
      [A],
    );
    const nextClass = await insert(
      "insert into classes(school_id,name,academic_year_id,grade_id) values($1,'8B',$2,$3)",
      [A, nextYear, grade],
    );
    const call = "select change_enrollment($1,$2,$3,$4,$5,$6) as id";
    const before = (
      await db.query("select * from enrollments where id=$1", [original])
    ).rows;
    for (const fields of [
      [A, foreign, 1, "withdrawal", "2027-06-01", null],
      [A, original, 1, "transfer", "2027-06-01", b.class],
      [A, original, 1, "transfer", "2027-06-01", nextClass],
      [A, original, 1, "transfer", "2027-06-01", a.class],
      [A, original, 1, "transfer", "2027-01-01", destination],
      [A, original, 1, "transfer", "2028-01-01", destination],
      [A, original, 1, "withdrawal", "2027-06-01", destination],
      [A, original, 1, "invalid", "2027-06-01", null],
    ])
      await expect(db.query(call, fields)).rejects.toMatchObject({
        code: "22023",
      });
    await expect(
      db.query(call, [A, original, 99, "withdrawal", "2027-06-01", null]),
    ).rejects.toMatchObject({ code: "40001" });
    expect(
      (await db.query("select * from enrollments where id=$1", [original]))
        .rows,
    ).toEqual(before);
    // Force a later audit failure to prove the close + replacement are atomic.
    await db.exec("reset role");
    await db.exec(
      "alter table audit_events add constraint test_no_transfer check(action <> 'enrollments.transfer')",
    );
    await db.exec("set role authenticated");
    await expect(
      db.query(call, [A, original, 1, "transfer", "2027-06-01", destination]),
    ).rejects.toMatchObject({ code: "23514" });
    expect(
      (await db.query("select * from enrollments where id=$1", [original]))
        .rows,
    ).toEqual(before);
    expect(
      (
        await db.query("select id from enrollments where student_id=$1", [
          a.student,
        ])
      ).rows,
    ).toHaveLength(1);
    await db.exec("reset role");
    await db.exec("alter table audit_events drop constraint test_no_transfer");
    await db.exec("set role authenticated");
    const replacement = (
      await db.query<{ id: string }>(call, [
        A,
        original,
        1,
        "transfer",
        "2027-06-01",
        destination,
      ])
    ).rows[0].id;
    expect(
      (
        await db.query(
          "select ends_on::text,closure,record_version from enrollments where id=$1",
          [original],
        )
      ).rows,
    ).toEqual([
      { ends_on: "2027-05-31", closure: "transfer", record_version: 2 },
    ]);
    expect(
      (
        await db.query(
          "select class_id,starts_on::text,ends_on::text from enrollments where id=$1",
          [replacement],
        )
      ).rows,
    ).toEqual([
      { class_id: destination, starts_on: "2027-06-01", ends_on: "2027-12-31" },
    ]);
    await expect(
      db.query(call, [A, original, 1, "withdrawal", "2027-03-01", null]),
    ).rejects.toMatchObject({ code: "40001" });
    await db.query(call, [A, replacement, 1, "withdrawal", "2027-09-30", null]);
    const create =
      "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6)";
    await expect(
      db.query(create, [
        A,
        a.student,
        a.class,
        a.year,
        "2027-09-30",
        "2027-12-31",
      ]),
    ).rejects.toMatchObject({ code: "23P01" });
    await insert(create, [
      A,
      a.student,
      a.class,
      a.year,
      "2027-10-01",
      "2027-12-31",
    ]);
    await expect(
      db.query("update enrollments set ends_on='2027-12-31' where id=$1", [
        original,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query(
        "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on,closure) values($1,$2,$3,$4,'2027-01-01','2027-01-01','withdrawal')",
        [A, a.student, a.class, a.year],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    expect(
      (
        await db.query(
          "select actor_user_id,details->>'replacement_id' as replacement from audit_events where action='enrollments.transfer'",
        )
      ).rows,
    ).toEqual([{ actor_user_id: adminA, replacement }]);
    expect(
      (
        await db.query(
          "select details->'before'->>'ends_on' as old_end from audit_events where action='enrollments.withdrawal'",
        )
      ).rows,
    ).toEqual([{ old_end: "2027-12-31" }]);
  });
});
it("blocks suspended admins, inactive schools and anonymous users", async () => {
  await db.query(
    "update school_memberships set status='suspended' where user_id=$1",
    [adminA],
  );
  await asUser(adminA, async () => {
    for (const table of tables)
      expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
    await deniedWrites(A);
  });
  await db.query("update schools set active=false where id=$1", [B]);
  await asUser(adminB, async () => {
    for (const table of tables)
      expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
    await deniedWrites(B);
  });
  await db.exec("set role anon");
  try {
    for (const table of tables)
      await expect(db.query(`select * from ${table}`)).rejects.toThrow();
    await deniedWrites(A);
  } finally {
    await db.exec("reset role");
  }
});
