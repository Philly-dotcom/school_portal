import { installStorageStub } from "./helpers/storage-stub";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Fictional data only. Runs every real migration in embedded PostgreSQL.
const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2);
const adminA = id(3),
  adminB = id(4),
  teacherU = id(5),
  guardianU = id(6),
  studentU = id(7),
  idleTeacherU = id(8);
const y = new Date().getUTCFullYear();
const ids: Record<string, string> = {};

async function asUser<T>(user: string, fn: () => Promise<T>): Promise<T> {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub");
  }
}
async function insert(sql: string, values: unknown[]) {
  return (await db.query<{ id: string }>(sql + " returning id", values)).rows[0]
    .id;
}
async function count(table: string) {
  return Number(
    (await db.query<{ n: string }>(`select count(*) n from ${table}`)).rows[0]
      .n,
  );
}
async function link(
  user: string,
  kind: string,
  record: string,
  membership: string | null,
) {
  const version = ["students", "teachers", "guardians"].includes(kind)
    ? ((
        await db.query<{ record_version: number }>(
          `select record_version from ${kind} where id=$1`,
          [record],
        )
      ).rows[0]?.record_version ?? 1)
    : 1;
  return asUser(user, () =>
    db.query("select link_register_to_member($1,$2,$3,$4,$5)", [
      A,
      kind,
      record,
      membership,
      version,
    ]),
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
    "insert into schools(id,name) values($1,'Fictional A'),($2,'Fictional B')",
    [A, B],
  );
  for (const [user, school, role] of [
    [adminA, A, "school_admin"],
    [adminB, B, "school_admin"],
    [teacherU, A, "teacher"],
    [guardianU, A, "guardian"],
    [studentU, A, "student"],
    [idleTeacherU, A, "teacher"],
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
  await asUser(adminA, async () => {
    const year = await insert(
      "insert into academic_years(school_id,name,starts_on,ends_on) values($1,'Test year',$2,$3)",
      [A, `${y - 1}-01-01`, `${y + 1}-12-31`],
    );
    const grade = await insert(
      "insert into grades(school_id,name) values($1,'Grade 8')",
      [A],
    );
    const c8a = await insert(
      "insert into classes(school_id,name,academic_year_id,grade_id) values($1,'8A',$2,$3)",
      [A, year, grade],
    );
    const c8b = await insert(
      "insert into classes(school_id,name,academic_year_id,grade_id) values($1,'8B',$2,$3)",
      [A, year, grade],
    );
    const subject = await insert(
      "insert into subjects(school_id,name) values($1,'Mathematics')",
      [A],
    );
    const s1 = await insert(
      "insert into students(school_id,full_name,reference) values($1,'Fictional One','ST-001')",
      [A],
    );
    const s2 = await insert(
      "insert into students(school_id,full_name,reference) values($1,'Fictional Two','ST-002')",
      [A],
    );
    const g1 = await insert(
      "insert into guardians(school_id,full_name,reference) values($1,'Fictional Guardian','GU-001')",
      [A],
    );
    const t1 = await insert(
      "insert into teachers(school_id,full_name,reference) values($1,'Fictional Teacher','TE-001')",
      [A],
    );
    const t2 = await insert(
      "insert into teachers(school_id,full_name,reference) values($1,'Fictional Idle','TE-002')",
      [A],
    );
    await insert(
      "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7)",
      [A, t1, subject, c8a, year, `${y - 1}-01-01`, `${y + 1}-12-31`],
    );
    await insert(
      "insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,$7)",
      [A, t1, subject, c8b, year, `${y - 1}-01-01`, `${y - 1}-12-31`],
    ); // expired
    await insert(
      "insert into student_guardians(school_id,student_id,guardian_id,relationship) values($1,$2,$3,'Guardian')",
      [A, s1, g1],
    );
    await insert(
      "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6)",
      [A, s1, c8a, year, `${y - 1}-01-01`, `${y + 1}-12-31`],
    );
    await insert(
      "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6)",
      [A, s2, c8b, year, `${y - 1}-01-01`, `${y + 1}-12-31`],
    );
    Object.assign(ids, { year, c8a, c8b, s1, s2, g1, t1, t2 });
  });
  await asUser(adminB, async () => {
    await insert(
      "insert into students(school_id,full_name,reference) values($1,'Fictional Other School','ST-900')",
      [B],
    );
  });
}, 90000);
afterAll(async () => {
  await db.close();
});

const linkedTables = [
  "students",
  "teachers",
  "guardians",
  "student_guardians",
  "enrollments",
  "classes",
  "teaching_assignments",
  "timetable_lessons",
];

describe("before any record is linked to a login", () => {
  it("gives teachers, guardians and students no personal or relationship data", async () => {
    for (const user of [teacherU, guardianU, studentU, idleTeacherU])
      await asUser(user, async () => {
        for (const table of linkedTables)
          expect(await count(table), `${table} for ${user}`).toBe(0);
      });
  });
  it("lets active members read non-sensitive reference data of their own school only", async () => {
    await asUser(teacherU, async () => {
      expect(await count("grades")).toBe(1);
      expect(await count("subjects")).toBe(1);
      expect(await count("academic_years")).toBe(1);
    });
    await asUser(adminB, async () => {
      expect(await count("grades")).toBe(0);
    });
  });
});

describe("link_register_to_member", () => {
  it("is administrator-only and validates role, school, record type and duplicates", async () => {
    await expect(
      link(teacherU, "teachers", ids.t1, teacherU),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      link(adminB, "teachers", ids.t1, teacherU),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      link(adminA, "teachers", ids.t1, guardianU),
    ).rejects.toMatchObject({ code: "22023" }); // wrong role
    await expect(
      link(adminA, "teachers", ids.t1, adminB),
    ).rejects.toMatchObject({ code: "22023" }); // other school
    await expect(
      link(adminA, "audit_events", ids.t1, teacherU),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      link(adminA, "teachers", id(999), teacherU),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      asUser(adminA, () =>
        db.query("update teachers set membership_id=$1 where id=$2", [
          teacherU,
          ids.t1,
        ]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("links, audits, rejects a second record for the same login, and unlinks", async () => {
    await link(adminA, "teachers", ids.t1, teacherU);
    await expect(
      link(adminA, "teachers", ids.t2, teacherU),
    ).rejects.toMatchObject({ code: "23505" });
    await link(adminA, "teachers", ids.t2, idleTeacherU);
    await link(adminA, "teachers", ids.t2, null);
    const audit = await db.query<{ action: string }>(
      "select action from audit_events where record_id=$1 and action like 'teachers.%link' order by id",
      [ids.t2],
    );
    expect(audit.rows.map((r) => r.action)).toEqual([
      "teachers.link",
      "teachers.unlink",
    ]);
    await link(adminA, "guardians", ids.g1, guardianU);
    await link(adminA, "students", ids.s1, studentU);
  });
});

describe("after linking", () => {
  it("shows a teacher only their own record, assignments, today's classes and roster", async () => {
    await asUser(teacherU, async () => {
      expect((await db.query("select id from teachers")).rows).toEqual([
        { id: ids.t1 },
      ]);
      expect(await count("teaching_assignments")).toBe(2);
      expect((await db.query("select id from classes")).rows).toEqual([
        { id: ids.c8a },
      ]); // 8B assignment expired
      expect((await db.query("select id from students")).rows).toEqual([
        { id: ids.s1 },
      ]); // roster only, not S2
      expect(
        (await db.query("select student_id from enrollments")).rows,
      ).toEqual([{ student_id: ids.s1 }]);
      expect(await count("guardians")).toBe(0);
      expect(await count("student_guardians")).toBe(0);
    });
  });
  it("requires an explicit guardian access grant before exposing a child", async () => {
    await asUser(guardianU, async () => {
      expect(await count("students")).toBe(0);
    });
    const relationship = (
      await db.query<{ id: string }>(
        "select id from student_guardians where guardian_id=$1",
        [ids.g1],
      )
    ).rows[0].id;
    await asUser(adminA, () =>
      db.query("select set_guardian_access($1,$2,1,true)", [A, relationship]),
    );
    await asUser(guardianU, async () => {
      expect((await db.query("select id from guardians")).rows).toEqual([
        { id: ids.g1 },
      ]);
      expect((await db.query("select id from students")).rows).toEqual([
        { id: ids.s1 },
      ]);
      expect(await count("student_guardians")).toBe(1);
      expect((await db.query("select id from classes")).rows).toEqual([
        { id: ids.c8a },
      ]);
      expect(await count("teachers")).toBe(0);
    });
  });
  it("shows a student only themselves", async () => {
    await asUser(studentU, async () => {
      expect((await db.query("select id from students")).rows).toEqual([
        { id: ids.s1 },
      ]);
      expect(await count("guardians")).toBe(0);
      expect(await count("student_guardians")).toBe(0);
      expect(await count("teachers")).toBe(0);
    });
  });
  it("never exposes other schools and never grants writes", async () => {
    for (const user of [teacherU, guardianU, studentU])
      await asUser(user, async () => {
        expect(
          (await db.query("select 1 from students where school_id=$1", [B]))
            .rows,
        ).toHaveLength(0);
        await expect(
          db.query(
            "insert into students(school_id,full_name,reference) values($1,'x','x')",
            [A],
          ),
        ).rejects.toMatchObject({ code: "42501" });
        await expect(
          db.query("update students set full_name='x'"),
        ).rejects.toMatchObject({ code: "42501" });
      });
  });
  it("revokes access immediately when the role is removed or the member is suspended", async () => {
    await db.query(
      "delete from membership_roles where membership_id=$1 and role='teacher'",
      [teacherU],
    );
    await asUser(teacherU, async () => {
      expect(await count("teachers")).toBe(0);
      expect(await count("students")).toBe(0);
    });
    await db.query("insert into membership_roles values($1,$2,'teacher')", [
      teacherU,
      A,
    ]);
    await asUser(teacherU, async () => {
      expect(await count("teachers")).toBe(1);
    });
    await db.query(
      "update school_memberships set status='suspended' where id=$1",
      [guardianU],
    );
    await asUser(guardianU, async () => {
      expect(await count("guardians")).toBe(0);
      expect(await count("students")).toBe(0);
    });
    await db.query(
      "update school_memberships set status='active' where id=$1",
      [guardianU],
    );
  });
  it("survives an invalid stored timezone without breaking reads", async () => {
    await db.query("update schools set timezone='Not/AZone' where id=$1", [A]);
    await asUser(teacherU, async () => {
      expect((await db.query("select id from classes")).rows).toEqual([
        { id: ids.c8a },
      ]);
    });
    await db.query(
      "update schools set timezone='Africa/Johannesburg' where id=$1",
      [A],
    );
  });
});

describe("link and access regressions on the final schema", () => {
  it("rejects stale admin intent and linking to a suspended member", async () => {
    const version = (
      await db.query<{ record_version: number }>(
        "select record_version from teachers where id=$1",
        [ids.t2],
      )
    ).rows[0].record_version;
    await link(adminA, "teachers", ids.t2, idleTeacherU);
    await expect(
      asUser(adminA, () =>
        db.query("select link_register_to_member($1,'teachers',$2,null,$3)", [
          A,
          ids.t2,
          version,
        ]),
      ),
    ).rejects.toMatchObject({ code: "40001" });
    await db.query(
      "update school_memberships set status='suspended' where id=$1",
      [idleTeacherU],
    );
    await expect(
      link(adminA, "teachers", ids.t2, idleTeacherU),
    ).rejects.toMatchObject({ code: "22023" });
    await link(adminA, "teachers", ids.t2, null); // removing inactive links is allowed
    await db.query(
      "update school_memberships set status='active' where id=$1",
      [idleTeacherU],
    );
    await link(adminA, "teachers", ids.t2, idleTeacherU);
  });
  it("identifies duplicate display names through verified email and stable membership IDs, admin-only", async () => {
    await db.query(
      "update profiles set display_name='Fictional Duplicate' where user_id in ($1,$2)",
      [teacherU, idleTeacherU],
    );
    await db.query(
      "update auth.users set email='teacher@example.invalid',email_confirmed_at=now() where id=$1",
      [teacherU],
    );
    await db.query(
      "update auth.users set email='unverified@example.invalid' where id=$1",
      [idleTeacherU],
    );
    const result = await asUser(adminA, () =>
      db.query<{ id: string; verified_email: string | null }>(
        "select * from list_linkable_members($1)",
        [A],
      ),
    );
    expect(result.rows.find((m) => m.id === teacherU)?.verified_email).toBe(
      "teacher@example.invalid",
    );
    expect(
      result.rows.find((m) => m.id === idleTeacherU)?.verified_email,
    ).toBeNull();
    expect(result.rows.some((m) => m.id === adminB)).toBe(false);
    await expect(
      asUser(teacherU, () =>
        db.query("select * from list_linkable_members($1)", [A]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asUser(adminB, () =>
        db.query("select * from list_linkable_members($1)", [A]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("revokes guardian access without deleting family history and rejects stale or foreign grants", async () => {
    const relation = (
      await db.query<{ id: string; record_version: number }>(
        "select id,record_version from student_guardians where guardian_id=$1",
        [ids.g1],
      )
    ).rows[0];
    await expect(
      asUser(adminB, () =>
        db.query("select set_guardian_access($1,$2,$3,false)", [
          A,
          relation.id,
          relation.record_version,
        ]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asUser(guardianU, () =>
        db.query("update student_guardians set access_enabled=true"),
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await asUser(adminA, () =>
      db.query("select set_guardian_access($1,$2,$3,false)", [
        A,
        relation.id,
        relation.record_version,
      ]),
    );
    await asUser(guardianU, async () => {
      expect(await count("students")).toBe(0);
      expect(await count("enrollments")).toBe(0);
      expect(await count("classes")).toBe(0);
    });
    expect(await count("student_guardians")).toBe(1);
    await expect(
      asUser(adminA, () =>
        db.query("select set_guardian_access($1,$2,$3,true)", [
          A,
          relation.id,
          relation.record_version,
        ]),
      ),
    ).rejects.toMatchObject({ code: "40001" });
    await asUser(adminA, () =>
      db.query("select set_guardian_access($1,$2,$3,true)", [
        A,
        relation.id,
        relation.record_version + 1,
      ]),
    );
  });
  it("uses inclusive dates, excludes future and expired learners, and preserves future-transfer history", async () => {
    const today = "private.school_today($1)";
    const expected: string[] = [ids.s1];
    for (const [label, start, end, visible] of [
      ["future", 1, 30, false],
      ["expired", -30, -1, false],
      ["starts", 0, 30, true],
      ["ends", -30, 0, true],
    ] as const) {
      await asUser(adminA, async () => {
        const student = await insert(
          "insert into students(school_id,full_name,reference) values($1,$2,$2)",
          [A, label],
        );
        await insert(
          `insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,${today}+${start},${today}+${end})`,
          [A, student, ids.c8a, ids.year],
        );
        if (visible) expected.push(student);
      });
    }
    const subject = (
      await db.query<{ id: string }>(
        "select id from subjects where school_id=$1",
        [A],
      )
    ).rows[0].id;
    await asUser(adminA, () =>
      insert(
        `insert into teaching_assignments(school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,${today}-30,${today}+30)`,
        [A, ids.t2, subject, ids.c8b, ids.year],
      ),
    );
    const enrollment = (
      await db.query<{ id: string }>(
        "select id from enrollments where student_id=$1",
        [ids.s1],
      )
    ).rows[0].id;
    await asUser(adminA, () =>
      db.query(`select change_enrollment($1,$2,1,'transfer',${today}+10,$3)`, [
        A,
        enrollment,
        ids.c8b,
      ]),
    );
    await asUser(teacherU, async () => {
      expect(
        (await db.query<{ id: string }>("select id from students")).rows
          .map((r) => r.id)
          .sort(),
      ).toEqual(expected.sort());
      expect(
        (
          await db.query<{ student_id: string }>(
            "select student_id from enrollments",
          )
        ).rows
          .map((r) => r.student_id)
          .sort(),
      ).toEqual(expected.sort());
    });
    await asUser(idleTeacherU, async () => {
      expect(
        (await db.query("select id from students where id=$1", [ids.s1])).rows,
      ).toHaveLength(0);
    });
    await asUser(studentU, async () => {
      expect(await count("enrollments")).toBe(2);
    });
    await asUser(guardianU, async () => {
      expect(await count("enrollments")).toBe(2);
    });
    const assignments = (
      await db.query<{ id: string; class_id: string }>(
        `select id,class_id from teaching_assignments where school_id=$1 and ${today} between starts_on and ends_on`,
        [A],
      )
    ).rows;
    for (const assignment of assignments)
      await asUser(adminA, () =>
        db.query(
          `select create_timetable_lesson($1,$2,1,480,540,${today}-7,${today}+28)`,
          [A, assignment.id],
        ),
      );
    await asUser(studentU, async () => {
      expect(
        (await db.query("select class_id from timetable_lessons")).rows,
      ).toEqual([{ class_id: ids.c8a }]);
    });
    // Withdrawal today remains visible today; withdrawal yesterday grants no current roster access.
    const other = (
      await db.query<{ id: string }>(
        "select id from enrollments where student_id=$1",
        [ids.s2],
      )
    ).rows[0].id;
    await asUser(adminA, () =>
      db.query(
        `select change_enrollment($1,$2,1,'withdrawal',${today}-1,null)`,
        [A, other],
      ),
    );
    await asUser(idleTeacherU, async () => {
      expect(await count("students")).toBe(0);
    });
    // Advance only the test's school-date helper in a rollback-only transaction.
    const effective = (
      await db.query<{ effective_date: string }>(
        "select (private.school_today($1)+10)::text as effective_date",
        [A],
      )
    ).rows[0].effective_date;
    await db.exec("begin");
    try {
      await db.exec(
        `create or replace function private.school_today(target_school uuid) returns date language sql stable security definer set search_path='' as $$select date '${effective}'$$`,
      );
      await asUser(teacherU, async () => {
        expect(
          (await db.query("select id from students where id=$1", [ids.s1]))
            .rows,
        ).toEqual([]);
      });
      await asUser(idleTeacherU, async () => {
        expect(
          (await db.query("select id from students where id=$1", [ids.s1]))
            .rows,
        ).toEqual([{ id: ids.s1 }]);
      });
      await asUser(studentU, async () => {
        expect(
          (await db.query("select class_id from timetable_lessons")).rows,
        ).toEqual([{ class_id: ids.c8b }]);
      });
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("paged register account search", () => {
  const search = (user: string, school = A, kind = "teachers", record = ids.t2, query = "", page = 1) =>
    asUser(user, () => db.query<{ id: string; verified_email: string | null }>(
      "select * from search_register_members($1,$2,$3,$4,$5)", [school, kind, record, query, page]));

  it("denies foreign-school, non-admin, anonymous and malformed requests", async () => {
    for (const user of [adminB, teacherU, guardianU, studentU])
      await expect(search(user)).rejects.toMatchObject({ code: "42501" });
    await expect(search(adminA, B)).rejects.toMatchObject({ code: "42501" });
    await expect(search(adminA, A, "teachers", id(999999))).rejects.toMatchObject({ code: "42501" });
    await expect(search(adminA, A, "profiles")).rejects.toMatchObject({ code: "22023" });
    await expect(search(adminA, A, "teachers", ids.t2, "", 0)).rejects.toMatchObject({ code: "22023" });
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from search_register_members($1,'teachers',$2,'',1)", [A, ids.t2])).rejects.toMatchObject({ code: "42501" });
    } finally { await db.exec("reset role"); }
  });

  it("filters ownership before pagination beyond 500 records and searches email only when verified", async () => {
    await db.exec("begin");
    try {
      // All synthetic; rolled back after the assertion. First 505 accounts are taken.
      await db.exec(`insert into auth.users(id,email,email_confirmed_at)
        select md5('search-test-'||n)::uuid,'search-'||n||'@example.invalid',case when n=531 then null else now() end
        from generate_series(1,532) n;
        insert into profiles(user_id,display_name)
        select md5('search-test-'||n)::uuid,'Search fixture '||lpad(n::text,4,'0') from generate_series(1,532) n;`);
      await db.query(`insert into school_memberships(id,school_id,user_id)
        select md5('search-test-'||n)::uuid,$1,md5('search-test-'||n)::uuid from generate_series(1,532) n`, [A]);
      await db.query(`insert into membership_roles(membership_id,school_id,role)
        select md5('search-test-'||n)::uuid,$1,'teacher' from generate_series(1,532) n`, [A]);
      await db.query(`insert into teachers(school_id,full_name,reference,membership_id)
        select $1,'Search fixture '||n,'SEARCH-'||n,md5('search-test-'||n)::uuid from generate_series(1,505) n`, [A]);
      const page1 = await search(adminA, A, "teachers", ids.t2, "Search fixture", 1);
      const page2 = await search(adminA, A, "teachers", ids.t2, "Search fixture", 2);
      expect(page1.rows).toHaveLength(26); // one lookahead row for the action
      expect(page2.rows).toHaveLength(2);
      expect(new Set([...page1.rows.slice(0,25), ...page2.rows].map(r => r.id)).size).toBe(27);
      expect((await search(adminA, A, "teachers", ids.t2, "search-531@")).rows).toHaveLength(0);
      expect((await search(adminA, A, "teachers", ids.t2, "search-532@")).rows).toHaveLength(1);
      expect((await search(adminA, A, "teachers", ids.t2, "%")).rows).toHaveLength(0);
      await db.exec("update school_memberships set status='suspended' where id=md5('search-test-532')::uuid");
      expect((await search(adminA, A, "teachers", ids.t2, "search-532@")).rows).toHaveLength(0);
      await db.exec("delete from membership_roles where membership_id=md5('search-test-530')::uuid");
      expect((await search(adminA, A, "teachers", ids.t2, "Search fixture 0530")).rows).toHaveLength(0);
      // An existing account is eligible for its own record, but not another one.
      const owned = (await db.query<{id:string}>("select id from teachers where reference='SEARCH-1' and school_id=$1",[A])).rows[0].id;
      expect((await search(adminA, A, "teachers", owned, "Search fixture 0001")).rows).toHaveLength(1);
      expect((await search(adminA, A, "teachers", ids.t2, "Search fixture 0001")).rows).toHaveLength(0);
    } finally { await db.exec("rollback"); }
  });
});
