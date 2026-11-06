import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, afterEach, afterAll, expect, it } from "vitest";
import { installStorageStub } from "./helpers/storage-stub";
const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function user(n: number) {
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id(n)]);
}
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
 create schema auth; create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon;`);
  await installStorageStub(db);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const base of [0, 100]) {
    await db.query(
      "insert into schools(id,name,timezone) values($1,'Fictional school','Africa/Johannesburg')",
      [id(base + 1)],
    );
    for (const [n, role] of [
      [2, "school_admin"],
      [3, "teacher"],
      [4, "student"],
      [5, "guardian"],
    ] as const) {
      await db.query("insert into auth.users(id) values($1)", [id(base + n)]);
      await db.query("insert into profiles(user_id) values($1)", [
        id(base + n),
      ]);
      await db.query(
        "insert into school_memberships(id,user_id,school_id) values($1,$1,$2)",
        [id(base + n), id(base + 1)],
      );
      await db.query("insert into membership_roles values($1,$2,$3)", [
        id(base + n),
        id(base + 1),
        role,
      ]);
    }
    await db.query(
      "insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Fictional year',current_date-90,current_date+90)",
      [id(base + 10), id(base + 1)],
    );
    await db.query(
      "insert into academic_terms(id,school_id,academic_year_id,name,starts_on,ends_on) values($1,$2,$3,'Term',current_date-60,current_date+60)",
      [id(base + 11), id(base + 1), id(base + 10)],
    );
    await db.query(
      "insert into grades(id,school_id,name) values($1,$2,'Grade 8')",
      [id(base + 12), id(base + 1)],
    );
    await db.query(
      "insert into subjects(id,school_id,name) values($1,$2,'Maths')",
      [id(base + 13), id(base + 1)],
    );
    await db.query(
      "insert into classes(id,school_id,academic_year_id,grade_id,name) values($1,$2,$3,$4,'8A')",
      [id(base + 14), id(base + 1), id(base + 10), id(base + 12)],
    );
    await db.query(
      "insert into teachers(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Teacher','T1',$3)",
      [id(base + 15), id(base + 1), id(base + 3)],
    );
    await db.query(
      "insert into teaching_assignments(id,school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,current_date-30,current_date+30)",
      [
        id(base + 16),
        id(base + 1),
        id(base + 15),
        id(base + 13),
        id(base + 14),
        id(base + 10),
      ],
    );
  }
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
async function save(
  o: {
    mode?: string;
    item?: string;
    version?: number;
    term?: string;
    assignment?: string;
    minimum?: string;
    maximum?: string;
    precision?: number;
    authorise?: boolean;
    offset?: number;
  } = {},
) {
  return (
    await db.query<{
      id: string;
    }>(
      "select save_assessment($1,$2,$3,$4,$5,$6,'Fictional test','Instructions',current_date+$7::integer,$8::numeric,$9::numeric,$10,$11) id",
      [
        id(1),
        o.mode ?? "teacher",
        o.item ?? null,
        o.assignment ?? id(16),
        o.version ?? 0,
        o.term ?? id(11),
        o.offset ?? 1,
        o.minimum ?? "0",
        o.maximum ?? "40",
        o.precision ?? 0,
        o.authorise ?? false,
      ],
    )
  ).rows[0].id;
}
it("retains definition versions and requires fresh explicit Admin scale authorisation", async () => {
  await user(3);
  const item = await save();
  await user(2);
  await save({ item, version: 1, mode: "school_admin", authorise: true });
  await user(3);
  await save({ item, version: 2 });
  const rows = (
    await db.query<{
      version: number;
      scale_authorised_by: string | null;
    }>(
      "select version,scale_authorised_by from assessment_versions order by version",
    )
  ).rows;
  expect(rows.map((r) => r.scale_authorised_by)).toEqual([null, id(2), null]);
  await expect(save({ item, version: 2 })).rejects.toThrow(/changed/);
});
it.each([4, 5, 102, 103])(
  "denies caller %s draft reads and RPC writes",
  async (who) => {
    await user(3);
    await save();
    await user(who);
    expect((await db.query("select * from assessments")).rows).toHaveLength(0);
    expect(
      (await db.query("select * from assessment_versions")).rows,
    ).toHaveLength(0);
    await expect(save()).rejects.toThrow(/access/);
  },
);
it("denies anonymous direct reads", async () => {
  await db.exec("set local role anon");
  await expect(db.query("select * from assessment_versions")).rejects.toThrow(
    /permission denied/,
  );
});
it("denies direct staff mutation of immutable versions", async () => {
  await user(2);
  await expect(
    db.query("update assessment_versions set title='Changed'"),
  ).rejects.toThrow(/permission denied/);
});
it.each([
  { term: id(111) },
  { assignment: id(116) },
  { offset: 61 },
  { minimum: "2", maximum: "1" },
  { maximum: "NaN" },
  { maximum: "Infinity" },
  { maximum: "1.11", precision: 1 },
  { authorise: true },
])(
  "rejects invalid relationship, bounds or teacher authorisation %#",
  async (o) => {
    await user(3);
    await expect(save(o)).rejects.toThrow();
  },
);
it("permits assigned teacher future planning but not another teacher's choices", async () => {
  await user(3);
  await save({ offset: 20 });
  const choices = (
    await db.query(
      "select * from search_assessment_choices($1,'teacher','assignment',null,'',1)",
      [id(1)],
    )
  ).rows;
  expect(choices).toHaveLength(1);
  await expect(
    db.query(
      "select * from search_assessment_choices($1,'teacher','term',$2,'',1)",
      [id(1), id(116)],
    ),
  ).rejects.toThrow();
});
it("does not offer expired assignments to teachers", async () => {
  await db.query(
    "update teaching_assignments set ends_on=current_date-1 where id=$1",
    [id(16)],
  );
  await user(3);
  await expect(save({ offset: -2 })).rejects.toThrow(/access/);
});
it("checks year agreement even when term belongs to the same school", async () => {
  await db.query(
    "insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Other',current_date-90,current_date+90)",
    [id(50), id(1)],
  );
  await db.query(
    "insert into academic_terms(id,school_id,academic_year_id,name,starts_on,ends_on) values($1,$2,$3,'Other',current_date-60,current_date+60)",
    [id(51), id(1), id(50)],
  );
  await user(3);
  await expect(save({ term: id(51) })).rejects.toThrow(/term/);
});

it("finds terms by the selected assignment year with a blank or matching search", async () => {
  await user(3);
  const search = async (query: string) =>
    (
      await db.query<{ id: string; label: string }>(
        "select * from search_assessment_choices($1,'teacher','term',$2,$3,1)",
        [id(1), id(16), query],
      )
    ).rows;
  expect((await search("")).map((row) => row.id)).toEqual([id(11)]);
  expect((await search(" term ")).map((row) => row.id)).toEqual([id(11)]);
  expect(await search("unmatched")).toEqual([]);
  await db.exec("reset role");
  await db.query("delete from academic_terms where id=$1", [id(11)]);
  await user(3);
  // An assignment exists, but an empty year must not inherit School B's terms.
  expect(await search("")).toEqual([]);
});

async function prepareDraft(offset = -2, authorise = true, count = 2) {
  for (let i = 0; i < count; i++) {
    const learner = id(200 + i);
    await db.query(
      "insert into students(id,school_id,full_name,reference) values($1,$2,'Fictional learner',$3)",
      [learner, id(1), "S" + i],
    );
    await db.query(
      "insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,current_date-15,current_date+15)",
      [id(1), learner, id(14), id(10)],
    );
  }
  await user(2);
  return save({ mode: "school_admin", offset, authorise });
}
const freeze = (item: string) =>
  db.query("select freeze_assessment_roster($1,$2,'school_admin',1)", [
    id(1),
    item,
  ]);
const readDraft = async (item: string, page = 1) =>
  (
    await db.query<{
      draft: {
        revision: number | null;
        entries: { id: string; state: string; score: string | null }[];
      };
    }>("select read_assessment_draft($1,$2,'teacher',$3) draft", [
      id(1),
      item,
      page,
    ])
  ).rows[0].draft;
const mark = (
  i: number,
  state: string,
  score: string | null = null,
  reason = "",
) => ({ id: id(200 + i), state, score, reason });
const write = (
  item: string,
  version: number,
  changes: ReturnType<typeof mark>[],
) =>
  db.query("select save_assessment_draft($1,$2,'teacher',$3,$4::jsonb)", [
    id(1),
    item,
    version,
    JSON.stringify(changes),
  ]);

it("retains dated placements, preserves untouched pages and distinguishes zero from missing", async () => {
  const item = await prepareDraft(-2, true, 26);
  await user(3);
  expect((await readDraft(item)).revision).toBeNull();
  await user(2);
  await freeze(item);
  await db.exec("reset role");
  await db.query(
    "update enrollments set starts_on=current_date where student_id=$1",
    [id(225)],
  );
  await user(3);
  await write(item, 1, [
    mark(0, "scored", "0"),
    mark(1, "exempt", null, "School-approved exemption"),
  ]);
  await write(item, 2, [mark(25, "absent")]);
  const first = await readDraft(item);
  expect(first.revision).toBe(3);
  expect(first.entries.slice(0, 3).map((x) => [x.state, x.score])).toEqual([
    ["scored", "0"],
    ["exempt", null],
    ["missing", null],
  ]);
  expect((await readDraft(item, 2)).entries).toMatchObject([
    { id: id(225), state: "absent" },
  ]);
  await expect(write(item, 2, [mark(0, "missing")])).rejects.toThrow(/changed/);
});
it.each([
  mark(1, "scored", "41"),
  mark(1, "scored", "1.1"),
  mark(1, "exempt"),
  mark(1, "absent", "0"),
  mark(75, "absent"),
])("rolls back invalid draft batches %#", async (invalid) => {
  const item = await prepareDraft();
  await freeze(item);
  await user(3);
  await db.exec("savepoint invalid_batch");
  await expect(
    write(item, 1, [mark(0, "scored", "5"), invalid]),
  ).rejects.toThrow();
  await db.exec("rollback to invalid_batch");
  expect(await readDraft(item)).toMatchObject({
    revision: 1,
    entries: [{ state: "missing" }, { state: "missing" }],
  });
});
it.each([
  [3, true],
  [-2, false],
] as const)(
  "rejects premature capture or unauthorised scale %#",
  async (offset, approved) => {
    const item = await prepareDraft(offset, approved);
    await expect(freeze(item)).rejects.toThrow(/freeze/);
  },
);
it("locks the academic definition once the roster is frozen", async () => {
  const item = await prepareDraft();
  await freeze(item);
  await expect(
    save({ item, mode: "school_admin", version: 1, offset: -2 }),
  ).rejects.toThrow(/frozen/);
});
it.each([4, 5, 102, 103])(
  "denies draft RPCs and direct mark access to caller %s",
  async (who) => {
    const item = await prepareDraft();
    await freeze(item);
    await user(who);
    for (const request of [
      () => readDraft(item),
      () => write(item, 1, [mark(0, "absent")]),
      () => freeze(item),
      () => db.query("select * from assessment_mark_versions"),
      () => db.query("delete from assessment_rosters"),
    ]) {
      await db.exec("savepoint forbidden");
      await expect(request()).rejects.toThrow();
      await db.exec("rollback to forbidden");
    }
  },
);

type Difference = {
  learner_id: string;
  previous_placement: unknown;
  next_placement: unknown;
  revision: number;
};
const differences = async (item: string) =>
  (
    await db.query<Difference>(
      "select * from preview_roster_amendments($1,$2)",
      [id(1), item],
    )
  ).rows;
const amend = (
  item: string,
  row: Difference,
  reason = "Correct fictional placement",
) =>
  db.query("select amend_draft_roster($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)", [
    id(1),
    item,
    row.learner_id,
    row.revision,
    row.previous_placement && JSON.stringify(row.previous_placement),
    row.next_placement && JSON.stringify(row.next_placement),
    reason,
  ]);
async function movePlacement(days: number) {
  await db.exec("reset role");
  await db.query(
    "update enrollments set starts_on=current_date+$1::integer,record_version=record_version+1 where student_id=$2",
    [days, id(200)],
  );
  await user(2);
}
it("previews removals, retains marks and restores a re-eligible learner as Missing", async () => {
  const item = await prepareDraft();
  await freeze(item);
  await user(3);
  await write(item, 1, [mark(0, "scored", "10"), mark(1, "scored", "7")]);
  await movePlacement(0);
  const [removed] = await differences(item);
  expect(removed).toMatchObject({
    learner_id: id(200),
    next_placement: null,
    revision: 2,
  });
  await amend(item, removed);
  await user(3);
  expect((await readDraft(item)).entries).toMatchObject([
    { id: id(201), score: "7" },
  ]);
  await db.exec("savepoint removed_write");
  await expect(write(item, 3, [mark(0, "absent")])).rejects.toThrow(
    /roster entry/,
  );
  await db.exec("rollback to removed_write");
  await movePlacement(-10);
  const [restored] = await differences(item);
  expect(restored.previous_placement).toBeNull();
  await amend(item, restored);
  await user(3);
  expect((await readDraft(item)).entries).toMatchObject([
    { id: id(200), state: "missing" },
    { id: id(201), score: "7" },
  ]);
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select roster_version from assessment_roster_amendments order by roster_version",
      )
    ).rows,
  ).toEqual([{ roster_version: 2 }, { roster_version: 3 }]);
  expect(
    (
      await db.query(
        "select score::text from assessment_mark_versions where student_id=$1 order by draft_version",
        [id(200)],
      )
    ).rows,
  ).toEqual([{ score: "10" }, { score: null }]);
});
it("rejects changed eligibility evidence even when the draft version is untouched", async () => {
  const item = await prepareDraft();
  await freeze(item);
  await movePlacement(-9);
  const [preview] = await differences(item);
  await movePlacement(-8);
  await expect(amend(item, preview)).rejects.toThrow(/preview changed/);
});
it("requires a reason, rejects a preview after a mark save and retains the mark on a placement refresh", async () => {
  const item = await prepareDraft();
  await freeze(item);
  await movePlacement(-9);
  const [oldPreview] = await differences(item);
  await db.exec("savepoint blank_reason");
  await expect(amend(item, oldPreview, " ")).rejects.toThrow(/Reason/);
  await db.exec("rollback to blank_reason");
  await user(3);
  await write(item, 1, [mark(0, "scored", "8")]);
  await user(2);
  await db.exec("savepoint stale");
  await expect(amend(item, oldPreview)).rejects.toThrow(/changed/);
  await db.exec("rollback to stale");
  const [current] = await differences(item);
  await amend(item, current);
  expect(await differences(item)).toEqual([]);
  await user(3);
  expect((await readDraft(item)).entries[0]).toMatchObject({
    state: "scored",
    score: "8",
  });
});
it.each([3, 4, 5, 102])(
  "denies amendment preview and apply to caller %s",
  async (who) => {
    const item = await prepareDraft();
    await freeze(item);
    await movePlacement(0);
    const [preview] = await differences(item);
    await user(who);
    await db.exec("savepoint no_preview");
    await expect(differences(item)).rejects.toThrow(/Admin/);
    await db.exec("rollback to no_preview");
    await expect(amend(item, preview)).rejects.toThrow(/Admin/);
  },
);
const issueGrant = async (
  item: string,
  learner: string | null,
  teacher = id(15),
  start = 0,
  end = 5,
) =>
  (
    await db.query<{ id: string }>(
      "select issue_correction_grant($1,$2,$3,$4,current_date+$5::int,current_date+$6::int,'Fictional correction') id",
      [id(1), item, teacher, learner, start, end],
    )
  ).rows[0].id;
const grantList = async () =>
  (
    await db.query<{ assessment_id: string }>(
      "select * from list_correction_grants($1,'teacher',null,1)",
      [id(1)],
    )
  ).rows;
async function historicalDraft() {
  const item = await prepareDraft(-5);
  await freeze(item);
  await db.exec("reset role");
  await db.query(
    "update teaching_assignments set ends_on=current_date-2 where id=$1",
    [id(16)],
  );
  await user(2);
  return item;
}
it("limits historical reads and writes to the named learner, including mixed batches and revocation", async () => {
  const item = await historicalDraft();
  const grant = await issueGrant(item, id(200));
  await user(3);
  expect(await grantList()).toMatchObject([{ assessment_id: item }]);
  expect((await readDraft(item)).entries.map((x) => x.id)).toEqual([id(200)]);
  await db.exec("savepoint mixed");
  await expect(
    write(item, 1, [mark(0, "absent"), mark(1, "absent")]),
  ).rejects.toThrow(/outside correction grant/);
  await db.exec("rollback to mixed");
  expect(await readDraft(item)).toMatchObject({
    revision: 1,
    entries: [{ state: "missing" }],
  });
  await write(item, 1, [mark(0, "scored", "0")]);
  await user(2);
  await db.query("select revoke_correction_grant($1,$2)", [id(1), grant]);
  await user(3);
  expect(await grantList()).toEqual([]);
  await expect(write(item, 2, [mark(0, "absent")])).rejects.toThrow(/access/);
});
it("permits assessment-wide historical draft access without definition-editing rights", async () => {
  const item = await historicalDraft();
  await issueGrant(item, null);
  await user(3);
  expect((await readDraft(item)).entries).toHaveLength(2);
  await write(item, 1, [mark(0, "absent"), mark(1, "scored", "1")]);
  await expect(
    save({ item, mode: "teacher", version: 1, offset: -5 }),
  ).rejects.toThrow(/access/);
});
it.each(["future", "expired", "unlinked", "role removed"] as const)(
  "denies historical access when %s",
  async (condition) => {
    const item = await historicalDraft();
    const grant = await issueGrant(
      item,
      id(200),
      id(15),
      condition === "future" ? 3 : 0,
    );
    await db.exec("reset role");
    if (condition === "expired")
      await db.query(
        "update assessment_correction_grants set starts_on=current_date-4,ends_on=current_date-2 where id=$1",
        [grant],
      );
    if (condition === "unlinked")
      await db.query("update teachers set membership_id=null where id=$1", [
        id(15),
      ]);
    if (condition === "role removed")
      await db.query("delete from membership_roles where membership_id=$1", [
        id(3),
      ]);
    await user(3);
    await expect(readDraft(item)).rejects.toThrow(/unavailable/);
  },
);
it.each([3, 4, 5, 102])("rejects grant issuance by caller %s", async (who) => {
  const item = await historicalDraft();
  await user(who);
  await expect(issueGrant(item, null)).rejects.toThrow(/Admin/);
});
it("rejects a teacher from another school", async () => {
  const item = await historicalDraft();
  await expect(issueGrant(item, null, id(115))).rejects.toThrow(/scope/);
});
type Impact = {
  token: string;
  total: number;
  blocked: number;
  eligible: number;
  rows: { id: string; effect: string; score: string | null }[];
};
const inspectDefinition = async (
  item: string,
  revision: number,
  day: number,
  high = "50",
  precision = 0,
  page = 1,
) =>
  (
    await db.query<{ impact: Impact }>(
      "select preview_frozen_definition($1,$2,$3,current_date+$4::int,0,$5,$6,$7) impact",
      [id(1), item, revision, day, high, precision, page],
    )
  ).rows[0].impact;
const commitDefinition = (
  item: string,
  revision: number,
  day: number,
  high: string,
  precision: number,
  token: string,
  reason = "Fictional date or scale correction",
) =>
  db.query(
    "select amend_frozen_definition($1,$2,$3,current_date+$4::int,0,$5,$6,$7,$8)",
    [id(1), item, revision, day, high, precision, token, reason],
  );

it("amends date and scale together, retains previous versions and starts new learners at Missing", async () => {
  const item = await prepareDraft(-5);
  await db.exec("reset role");
  await db.query(
    "update enrollments set starts_on=current_date-3 where student_id=$1",
    [id(200)],
  );
  await db.query(
    "update enrollments set ends_on=current_date-4 where student_id=$1",
    [id(201)],
  );
  await user(2);
  await freeze(item);
  await user(3);
  await write(item, 1, [mark(1, "scored", "35")]);
  await user(2);
  const impact = await inspectDefinition(item, 2, -2, "30");
  expect(impact).toMatchObject({
    eligible: 1,
    blocked: 0,
    rows: [{ effect: "add" }, { effect: "remove", score: "35" }],
  });
  await commitDefinition(item, 2, -2, "30", 0, impact.token);
  await user(3);
  expect((await readDraft(item)).entries).toMatchObject([
    { id: id(200), state: "missing" },
  ]);
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select version,maximum::text from assessment_versions where assessment_id=$1 order by version",
        [item],
      )
    ).rows,
  ).toEqual([
    { version: 1, maximum: "40" },
    { version: 2, maximum: "30" },
  ]);
  expect(
    (
      await db.query(
        "select score::text from assessment_mark_versions where student_id=$1",
        [id(201)],
      )
    ).rows,
  ).toEqual([{ score: "35" }]);
  expect(
    (
      await db.query(
        "select reason,changed_by from assessment_definition_amendments where assessment_id=$1",
        [item],
      )
    ).rows,
  ).toEqual([
    { reason: "Fictional date or scale correction", changed_by: id(2) },
  ]);
});
it("scale-only changes keep frozen placements and reject incompatible scores atomically", async () => {
  const item = await prepareDraft(-2);
  await freeze(item);
  await user(3);
  await write(item, 1, [mark(0, "scored", "35")]);
  await movePlacement(0);
  const impact = await inspectDefinition(item, 2, -2, "30");
  expect(impact).toMatchObject({
    eligible: 2,
    blocked: 1,
    rows: [{ effect: "keep" }, { effect: "keep" }],
  });
  await db.exec("savepoint incompatible");
  await expect(
    commitDefinition(item, 2, -2, "30", 0, impact.token),
  ).rejects.toThrow(/Resolve impact/);
  await db.exec("rollback to incompatible");
  const ok = await inspectDefinition(item, 2, -2, "50");
  await commitDefinition(item, 2, -2, "50", 0, ok.token);
  await user(3);
  expect(await readDraft(item)).toMatchObject({
    revision: 3,
    entries: [{ score: "35" }, { state: "missing" }],
  });
});
it("rejects changed placement evidence even without another mark save", async () => {
  const item = await prepareDraft(-5);
  await freeze(item);
  const impact = await inspectDefinition(item, 1, -2);
  await movePlacement(0);
  await expect(
    commitDefinition(item, 1, -2, "50", 0, impact.token),
  ).rejects.toThrow(/Impact changed/);
});
it("checks all pages for incompatible marks and rejects stale drafts", async () => {
  const item = await prepareDraft(-2, true, 26);
  await freeze(item);
  await user(3);
  await write(item, 1, [mark(25, "scored", "36")]);
  await user(2);
  const first = await inspectDefinition(item, 2, -2, "30");
  const second = await inspectDefinition(item, 2, -2, "30", 0, 2);
  expect(first.rows.length).toBe(25);
  expect(first.blocked).toBe(1);
  expect(second.token).toBe(first.token);
  expect(second.rows[0]).toMatchObject({ id: id(225), score: "36" });
  await user(3);
  await write(item, 2, [mark(25, "missing")]);
  await user(2);
  await expect(
    commitDefinition(item, 2, -2, "30", 0, first.token),
  ).rejects.toThrow(/Draft changed/);
});
it.each([3, 4, 5, 102])(
  "denies non-owning Admin or non-Admin %s both amendment operations",
  async (who) => {
    const item = await prepareDraft();
    await freeze(item);
    const preview = await inspectDefinition(item, 1, -2);
    await user(who);
    await db.exec("savepoint forbidden_preview");
    await expect(inspectDefinition(item, 1, -2)).rejects.toThrow();
    await db.exec("rollback to forbidden_preview");
    await expect(
      commitDefinition(item, 1, -2, "50", 0, preview.token),
    ).rejects.toThrow();
  },
);
it.each([2, -75])("rejects ineligible proposed date offset %s", async (day) => {
  const item = await prepareDraft();
  await freeze(item);
  await expect(inspectDefinition(item, 1, day)).rejects.toThrow(/Date outside/);
});

it("blocks a precision reduction without rounding and keeps the authorised original scale", async () => {
  const item = await prepareDraft();
  await save({
    item,
    mode: "school_admin",
    version: 1,
    offset: -2,
    precision: 1,
    authorise: true,
  });
  await db.query("select freeze_assessment_roster($1,$2,'school_admin',2)", [
    id(1),
    item,
  ]);
  await user(3);
  await write(item, 1, [mark(0, "scored", "12.5")]);
  await user(2);
  const preview = await inspectDefinition(item, 2, -2, "40", 0);
  expect(preview.blocked).toBe(1);
  await db.exec("savepoint precision_change");
  await expect(
    commitDefinition(item, 2, -2, "40", 0, preview.token),
  ).rejects.toThrow(/Resolve impact/);
  await db.exec("rollback to precision_change");
  await user(3);
  expect((await readDraft(item)).entries[0].score).toBe("12.5");
});
it("refuses an empty proposed roster and requires a reason before unlocking a definition", async () => {
  const item = await prepareDraft();
  await freeze(item);
  const empty = await inspectDefinition(item, 1, -20);
  expect(empty.eligible).toBe(0);
  await db.exec("savepoint no_learners");
  await expect(
    commitDefinition(item, 1, -20, "50", 0, empty.token),
  ).rejects.toThrow(/Resolve impact/);
  await db.exec("rollback to no_learners");
  const preview = await inspectDefinition(item, 1, -2);
  await db.exec("savepoint no_reason");
  await expect(
    commitDefinition(item, 1, -2, "50", 0, preview.token, " "),
  ).rejects.toThrow();
  await db.exec("rollback to no_reason");
  await expect(
    save({ item, mode: "school_admin", version: 1, offset: -2 }),
  ).rejects.toThrow(/frozen/);
});

async function grantReviewer(
  item: string,
  member = 3,
  version = 1,
  first: number | null = null,
  last: number | null = null,
) {
  return (
    await db.query<{ id: string }>(
      "select issue_assessment_reviewer_grant($1,$2,$3,$4,current_date+$5::int,current_date+$6::int) id",
      [id(1), item, version, id(member), first, last],
    )
  ).rows[0].id;
}
// Exercise the private decision helper as its SQL caller would, preserving
// the simulated authenticated subject. Ordinary clients cannot execute it.
async function matchReviewer(
  who: number,
  item: string,
  mode: string,
  version = 1,
) {
  await user(who);
  await db.exec("reset role");
  return (
    await db.query<{ grant_id: string | null }>(
      "select private.my_assessment_reviewer_grant($1,$2,$3,$4) grant_id",
      [id(1), item, version, mode],
    )
  ).rows[0].grant_id;
}
it("requires explicit reviewer authority, permits self-review grants and revokes them immediately", async () => {
  await user(2);
  const item = await save({ mode: "school_admin" });
  expect(await matchReviewer(2, item, "school_admin")).toBeNull();
  await user(2);
  const grant = await grantReviewer(item, 2);
  expect(await matchReviewer(2, item, "school_admin")).toBe(grant);
  expect(await matchReviewer(2, item, "guardian")).toBeNull();
  await user(2);
  await db.query("select revoke_assessment_reviewer_grant($1,$2)", [
    id(1),
    grant,
  ]);
  expect(await matchReviewer(2, item, "school_admin")).toBeNull();
  expect(
    (
      await db.query(
        "select action from audit_events where record_id=$1 order by action",
        [grant],
      )
    ).rows,
  ).toEqual([
    { action: "assessment.reviewer.issue" },
    { action: "assessment.reviewer.revoke" },
  ]);
});
it("matches another assessment in the same scope but only the retained version from the granted term", async () => {
  await db.query(
    "insert into academic_terms(id,school_id,academic_year_id,name,starts_on,ends_on) values($1,$2,$3,'Other',current_date-10,current_date+10)",
    [id(52), id(1), id(10)],
  );
  await user(2);
  const a = await save({ mode: "school_admin" }),
    b = await save({ mode: "school_admin" });
  const grant = await grantReviewer(a);
  await save({ item: a, version: 1, mode: "school_admin", term: id(52) });
  expect(await matchReviewer(3, b, "teacher")).toBe(grant);
  expect(await matchReviewer(3, a, "teacher", 2)).toBeNull();
  expect(await matchReviewer(3, a, "teacher", 1)).toBe(grant);
  expect(await matchReviewer(103, a, "teacher")).toBeNull();
  await user(2);
  await expect(grantReviewer(a, 3, 1)).rejects.toThrow(/changed/);
});
it("searches only active same-school staff and rejects a cross-school candidate", async () => {
  await user(2);
  const rows = (
    await db.query<{ id: string }>(
      "select * from search_assessment_reviewers($1,'',1)",
      [id(1)],
    )
  ).rows;
  expect(rows.map((r) => r.id).sort()).toEqual([id(2), id(3)]);
  const item = await save({ mode: "school_admin" });
  await expect(grantReviewer(item, 103)).rejects.toThrow(/staff/);
});
it.each([4, 5])(
  "refuses to grant review to non-staff membership %s",
  async (who) => {
    await user(2);
    const item = await save({ mode: "school_admin" });
    await expect(grantReviewer(item, who)).rejects.toThrow(/staff/);
  },
);
it.each([3, 4, 5, 102])(
  "denies reviewer grant management to caller %s",
  async (who) => {
    await user(2);
    const item = await save({ mode: "school_admin" });
    const grant = await grantReviewer(item);
    await user(who);
    for (const attempt of [
      () => grantReviewer(item, 2),
      () =>
        db.query("select * from list_assessment_reviewer_grants($1,1)", [
          id(1),
        ]),
      () =>
        db.query("select revoke_assessment_reviewer_grant($1,$2)", [
          id(1),
          grant,
        ]),
      () => db.query("select * from assessment_reviewer_grants"),
    ]) {
      await db.exec("savepoint denied_reviewer");
      await expect(attempt()).rejects.toThrow();
      await db.exec("rollback to denied_reviewer");
    }
  },
);
it("rejects overlapping windows and enforces expiry, future starts and role removal", async () => {
  await user(2);
  const item = await save({ mode: "school_admin" });
  await grantReviewer(item, 3, 1, 2, 8);
  expect(await matchReviewer(3, item, "teacher")).toBeNull();
  await user(2);
  const grant = await grantReviewer(item, 3, 1, null, 1);
  expect(await matchReviewer(3, item, "teacher")).toBe(grant);
  await user(2);
  await db.exec("savepoint overlap");
  await expect(grantReviewer(item, 3, 1, 1, 2)).rejects.toThrow(/Overlapping/);
  await db.exec("rollback to overlap");
  await db.exec("reset role");
  await db.query(
    "update assessment_reviewer_grants set ends_on=current_date-2 where id=$1",
    [grant],
  );
  expect(await matchReviewer(3, item, "teacher")).toBeNull();
  await db.query(
    "update assessment_reviewer_grants set ends_on=current_date+1 where id=$1",
    [grant],
  );
  await db.query(
    "delete from membership_roles where membership_id=$1 and role='teacher'",
    [id(3)],
  );
  expect(await matchReviewer(3, item, "teacher")).toBeNull();
});
it("reviewer authority alone cannot expose or change frozen draft marks", async () => {
  const item = await historicalDraft();
  const grant = await grantReviewer(item);
  expect(await matchReviewer(3, item, "teacher")).toBe(grant);
  await user(3);
  await db.exec("savepoint draft_read");
  await expect(readDraft(item)).rejects.toThrow(/unavailable/);
  await db.exec("rollback to draft_read");
  await expect(write(item, 1, [mark(0, "absent")])).rejects.toThrow(/access/);
});

async function completeRoster() {
  const item = await prepareDraft();
  await freeze(item);
  await user(3);
  await write(item, 1, [
    mark(0, "scored", "0"),
    mark(1, "exempt", null, "Approved exemption"),
  ]);
  return item;
}
async function submitRoster(
  item: string,
  revision = 2,
  previous = 0,
  mode = "teacher",
) {
  return (
    await db.query<{ id: string }>(
      "select submit_assessment($1,$2,$3,$4,$5) id",
      [id(1), item, mode, revision, previous],
    )
  ).rows[0].id;
}
async function readReview(submission: string, mode = "teacher", page = 1) {
  return (
    await db.query<{
      review: {
        status: string;
        package: number;
        definitionChanged: boolean;
        changes: { added: number; removed: number; changed: number };
        entries: { score: string | null; state: string }[];
      };
    }>("select read_assessment_review($1,$2,$3,$4) review", [
      id(1),
      submission,
      mode,
      page,
    ])
  ).rows[0].review;
}
const decideReview = (
  submission: string,
  decision = "approved",
  reason = "",
  version = 1,
  mode = "teacher",
) =>
  db.query("select decide_assessment_review($1,$2,$3,$4,$5,$6)", [
    id(1),
    submission,
    mode,
    version,
    decision,
    reason,
  ]);

it("submits a complete snapshot, requires reviewer authority and retains self-review evidence", async () => {
  const item = await completeRoster();
  const submission = await submitRoster(item);
  await db.exec("savepoint no_review_grant");
  await expect(readReview(submission)).rejects.toThrow(/unavailable/);
  await db.exec("rollback to no_review_grant");
  await user(2);
  const grant = await grantReviewer(item);
  await user(3);
  expect(await readReview(submission)).toMatchObject({
    status: "pending",
    entries: [
      { state: "scored", score: "0" },
      { state: "exempt", score: null },
    ],
  });
  await decideReview(submission);
  expect((await readReview(submission)).status).toBe("approved");
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select reviewer_grant_id,decided_by from assessment_review_decisions where submission_id=$1",
        [submission],
      )
    ).rows,
  ).toEqual([{ reviewer_grant_id: grant, decided_by: id(3) }]);
});
it("blocks incomplete rosters across pages and rolls back the attempted submission", async () => {
  const item = await prepareDraft(-2, true, 26);
  await freeze(item);
  await user(3);
  await write(
    item,
    1,
    Array.from({ length: 25 }, (_, i) => mark(i, "absent")),
  );
  await db.exec("savepoint incomplete_submission");
  await expect(submitRoster(item)).rejects.toThrow(/missing mark/);
  await db.exec("rollback to incomplete_submission");
  await db.exec("reset role");
  expect(
    (await db.query("select * from assessment_submissions")).rows,
  ).toHaveLength(0);
  await user(3);
  await write(item, 2, [mark(25, "absent")]);
  const submission = await submitRoster(item, 3);
  await user(2);
  await grantReviewer(item);
  await user(3);
  expect((await readReview(submission)).entries).toHaveLength(26);
  expect((await readReview(submission, "teacher", 2)).entries).toHaveLength(1);
});
it("requires a return reason and rejects a replayed submission from before the return", async () => {
  const item = await completeRoster();
  const submission = await submitRoster(item);
  await user(2);
  await grantReviewer(item);
  await user(3);
  await db.exec("savepoint return_reason");
  await expect(decideReview(submission, "returned", " ")).rejects.toThrow(
    /reason/,
  );
  await db.exec("rollback to return_reason");
  await decideReview(submission, "returned", "Check the exemption evidence");
  await db.exec("savepoint replay");
  await expect(submitRoster(item)).rejects.toThrow(/history changed/);
  await db.exec("rollback to replay");
  const next = await submitRoster(item, 2, 1);
  expect(await readReview(next)).toMatchObject({
    package: 2,
    status: "pending",
  });
  expect((await readReview(submission)).status).toBe("returned");
});
it.each(["pending", "approved"])(
  "supersedes %s packages on mark changes and rejects decisions on their old version",
  async (status) => {
    const item = await completeRoster();
    const submission = await submitRoster(item);
    await user(2);
    await grantReviewer(item);
    await user(3);
    if (status === "approved") await decideReview(submission);
    await write(item, 2, [mark(0, "scored", "10")]);
    expect(await readReview(submission)).toMatchObject({
      status: "superseded",
      entries: [{ score: "0" }, { state: "exempt" }],
    });
    await db.exec("savepoint old_package");
    await expect(decideReview(submission)).rejects.toThrow(/changed/);
    await db.exec("rollback to old_package");
    const next = await submitRoster(item, 3, 1);
    expect(await readReview(next)).toMatchObject({
      package: 2,
      changes: { added: 0, removed: 0, changed: 1 },
      entries: [{ score: "10" }, { state: "exempt" }],
    });
  },
);
it("rechecks reviewer revocation on an already-open submission without erasing earlier approvals", async () => {
  const item = await completeRoster();
  const submission = await submitRoster(item);
  await user(2);
  const grant = await grantReviewer(item);
  await user(3);
  await readReview(submission);
  await user(2);
  await db.query("select revoke_assessment_reviewer_grant($1,$2)", [
    id(1),
    grant,
  ]);
  await user(3);
  await db.exec("savepoint revoked_review");
  await expect(decideReview(submission)).rejects.toThrow(/unavailable/);
  await db.exec("rollback to revoked_review");
  await user(2);
  const renewed = await grantReviewer(item);
  await user(3);
  await decideReview(submission);
  await user(2);
  await db.query("select revoke_assessment_reviewer_grant($1,$2)", [
    id(1),
    renewed,
  ]);
  await db.exec("reset role");
  expect(
    (
      await db.query<{ status: string }>(
        "select status from assessment_submissions where id=$1",
        [submission],
      )
    ).rows[0].status,
  ).toBe("approved");
  expect(
    (
      await db.query(
        "select * from assessment_review_decisions where submission_id=$1",
        [submission],
      )
    ).rows,
  ).toHaveLength(1);
});
it.each([4, 5, 102, 103])(
  "denies submission and review access to unrelated caller %s",
  async (who) => {
    const item = await completeRoster();
    const submission = await submitRoster(item);
    await user(who);
    for (const action of [
      () => submitRoster(item),
      () => readReview(submission),
      () => decideReview(submission),
      () => db.query("select * from assessment_submissions"),
      () => db.query("select * from assessment_submission_entries"),
      () => db.query("select * from assessment_review_decisions"),
      () =>
        db.query(
          "update assessment_submissions set status='approved' where id=$1",
          [submission],
        ),
    ]) {
      await db.exec("savepoint denied_review");
      await expect(action()).rejects.toThrow();
      await db.exec("rollback to denied_review");
    }
  },
);
it("keeps teacher reviewer access out of guardian mode and rejects duplicate decisions", async () => {
  const item = await completeRoster();
  const submission = await submitRoster(item);
  await user(2);
  await grantReviewer(item);
  await user(3);
  await db.exec("savepoint wrong_mode");
  await expect(readReview(submission, "guardian")).rejects.toThrow(
    /unavailable/,
  );
  await db.exec("rollback to wrong_mode");
  await decideReview(submission);
  await expect(decideReview(submission)).rejects.toThrow(/changed/);
});
it("invalidates approval after a scale amendment while keeping its old definition and decision", async () => {
  const item = await completeRoster();
  const submission = await submitRoster(item);
  await user(2);
  await grantReviewer(item);
  await user(3);
  await decideReview(submission);
  await user(2);
  const preview = await inspectDefinition(item, 2, -2, "50");
  await commitDefinition(item, 2, -2, "50", 0, preview.token);
  await user(3);
  expect((await readReview(submission)).status).toBe("superseded");
  const next = await submitRoster(item, 3, 1);
  expect(await readReview(next)).toMatchObject({
    status: "pending",
    definitionChanged: true,
  });
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select * from assessment_review_decisions where submission_id=$1",
        [submission],
      )
    ).rows,
  ).toHaveLength(1);
});
it("allows a valid historical correction grant to submit without granting reviewer access", async () => {
  const item = await historicalDraft();
  await issueGrant(item, null);
  await user(3);
  await write(item, 1, [mark(0, "absent"), mark(1, "absent")]);
  const submission = await submitRoster(item);
  await expect(readReview(submission)).rejects.toThrow(/unavailable/);
});
it("denies anonymous RPC and direct-table access to submissions", async () => {
  const item = await completeRoster();
  const submission = await submitRoster(item);
  await db.exec("set local role anon");
  for (const action of [
    () => submitRoster(item),
    () => readReview(submission),
    () => decideReview(submission),
    () => db.query("select * from assessment_submissions"),
    () => db.query("select * from assessment_submission_entries"),
    () => db.query("select * from assessment_review_decisions"),
  ]) {
    await db.exec("savepoint anonymous_review");
    await expect(action()).rejects.toThrow();
    await db.exec("rollback to anonymous_review");
  }
});

async function savePolicy(options: {
  policy?: string; version?: number; year?: string; grade?: string; subject?: string;
  title?: string; start?: number; end?: number; source?: string; rules?: string;
} = {}) {
  return (await db.query<{ id: string }>(
    "select save_grading_policy_draft($1,$2,$3,$4,$5,$6,$7,current_date+$8::int,current_date+$9::int,$10,$11) id",
    [id(1), options.policy ?? id(400), options.version ?? 0, options.year ?? id(10),
      options.grade ?? id(12), options.subject ?? id(13), options.title ?? "Fictional policy draft",
      options.start ?? -60, options.end ?? 60, options.source ?? "", options.rules ?? ""],
  )).rows[0].id;
}
async function readPolicy(policy = id(400), page = 1) {
  return (await db.query<{ policy: {
    current: { version: number; title: string; rules: string; source: string };
    history: { version: number; title: string; rules: string }[];
  } }>("select read_grading_policy_draft($1,$2,$3) policy", [id(1), policy, page])).rows[0].policy;
}

it("retains policy draft versions and source text without treating incomplete rules as approval", async () => {
  await user(2);
  await savePolicy();
  await savePolicy({ version: 1, source: "Fictional school paper v1", rules: "Rounding still undecided" });
  expect(await readPolicy()).toMatchObject({
    current: { version: 2, source: "Fictional school paper v1", rules: "Rounding still undecided" },
    history: [{ version: 2, rules: "Rounding still undecided" }, { version: 1, rules: "" }],
  });
  await db.exec("set constraints all immediate");
  await db.exec("reset role");
  const audit = await db.query<{ details: { version: number } }>(
    "select details from audit_events where record_id=$1 and action='grading_policy.draft.save' order by (details->>'version')::int", [id(400)],
  );
  expect(audit.rows.map(row => row.details.version)).toEqual([1, 2]);
});
it("handles repeated creates and unchanged saves without duplicate policy versions", async () => {
  await user(2);
  const policy = await savePolicy();
  expect(await savePolicy()).toBe(policy);
  expect(await savePolicy({ version: 1 })).toBe(policy);
  expect((await readPolicy()).history).toHaveLength(1);
  await savePolicy({ version: 1, title: "Changed draft" });
  await db.exec("savepoint stale_policy");
  await expect(savePolicy({ version: 1, rules: "Old tab" })).rejects.toThrow(/changed/);
  await db.exec("rollback to stale_policy");
  expect((await readPolicy()).current.title).toBe("Changed draft");
  await expect(savePolicy()).rejects.toThrow(/changed/);
});
it.each([
  { year: id(110) }, { grade: id(112) }, { subject: id(113) },
  { start: -91 }, { end: 91 }, { start: 5, end: -5 }, { title: " " },
])("rejects invalid policy scope, fields or dates %#", async options => {
  await user(2);
  await expect(savePolicy(options)).rejects.toThrow();
});
it("keeps an existing policy scope fixed and permits future-year planning", async () => {
  await db.query("insert into grades(id,school_id,name) values($1,$2,'Grade 9')", [id(401), id(1)]);
  await db.query("insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Future fictional year',current_date+100,current_date+200)", [id(402), id(1)]);
  await user(2);
  await savePolicy();
  await db.exec("savepoint fixed_scope");
  await expect(savePolicy({ version: 1, grade: id(401) })).rejects.toThrow(/scope is fixed/);
  await db.exec("rollback to fixed_scope");
  await savePolicy({ policy: id(403), year: id(402), start: 100, end: 200 });
  expect((await readPolicy(id(403))).current.version).toBe(1);
});
it.each([3, 4, 5, 102])("denies policy reads and writes to caller %s", async who => {
  await user(2); await savePolicy(); await user(who);
  for (const action of [
    () => savePolicy({ version: 1, title: "Forbidden" }),
    () => readPolicy(),
    () => db.query("select * from list_grading_policy_drafts($1,1)", [id(1)]),
    () => db.query("select * from grading_policy_versions"),
    () => db.query("select * from grading_policies"),
    () => db.query("update grading_policy_versions set title='Forbidden' where policy_id=$1", [id(400)]),
    () => db.query("delete from grading_policies where id=$1", [id(400)]),
  ]) {
    await db.exec("savepoint denied_policy");
    await expect(action()).rejects.toThrow();
    await db.exec("rollback to denied_policy");
  }
});
it("denies anonymous access and direct Admin mutation of policy history", async () => {
  await user(2); await savePolicy();
  await db.exec("savepoint policy_history");
  await expect(db.query("update grading_policy_versions set title='Changed' where policy_id=$1", [id(400)])).rejects.toThrow();
  await db.exec("rollback to policy_history");
  await db.exec("set local role anon");
  for (const action of [() => savePolicy(), () => readPolicy(), () => db.query("select * from grading_policy_versions")]) {
    await db.exec("savepoint anonymous_policy");
    await expect(action()).rejects.toThrow();
    await db.exec("rollback to anonymous_policy");
  }
});
it("bounds policy history pages and rejects missing or invalid-page reads", async () => {
  await user(2); await savePolicy();
  for (let version = 1; version < 27; version++) await savePolicy({ version, rules: `Fictional revision ${version + 1}` });
  expect((await readPolicy()).history).toHaveLength(26);
  expect((await readPolicy(id(400), 2)).history.map(row => row.version)).toEqual([2, 1]);
  await db.exec("savepoint invalid_policy_page");
  await expect(readPolicy(id(400), 0)).rejects.toThrow(/Invalid page/);
  await db.exec("rollback to invalid_policy_page");
  await expect(readPolicy(id(499))).rejects.toThrow(/unavailable/);
});

const invalidateApproval = (item: string, version = 1, reason = "Fictional approval dispute") =>
  db.query("select invalidate_assessment_approval($1,$2,$3,$4)", [id(1), item, version, reason]);

async function approvedRoster() {
  const item = await completeRoster();
  const submission = await submitRoster(item);
  await user(2);
  await grantReviewer(item);
  await user(3);
  await decideReview(submission, "approved", "Original reviewer explanation");
  return { item, submission };
}

it("lets Admin invalidate an approval without a reviewer grant and retains both decisions", async () => {
  const { item, submission } = await approvedRoster();
  await user(2);
  await invalidateApproval(item);
  const status = await db.query<{status: string; reason: string}>(
    "select * from read_assessment_submission_status($1,$2,'school_admin')", [id(1),item]);
  expect(status.rows[0]).toMatchObject({status:"invalidated",reason:"Fictional approval dispute"});
  await user(3);
  expect(await readReview(submission)).toMatchObject({status:"invalidated",invalidationReason:"Fictional approval dispute"});
  const next = await submitRoster(item,2,1);
  expect(await readReview(next)).toMatchObject({status:"pending",package:2});
  await decideReview(next,"approved","New review",2);
  await db.exec("reset role");
  expect((await db.query("select decision,reason from assessment_review_decisions where submission_id=$1",[submission])).rows)
    .toEqual([{decision:"approved",reason:"Original reviewer explanation"}]);
  expect((await db.query("select invalidated_by from assessment_review_invalidations where submission_id=$1",[submission])).rows)
    .toEqual([{invalidated_by:id(2)}]);
  expect((await db.query("select * from audit_events where record_id=$1 and action='assessment.review.invalidate'",[submission])).rows).toHaveLength(1);
});
it.each(["", " ", "x".repeat(501)])("requires a bounded nonblank invalidation reason %#",async reason=>{
  const {item}=await approvedRoster();
  await user(2);
  await db.exec("savepoint invalid_reason");
  await expect(invalidateApproval(item,1,reason)).rejects.toThrow(/reason/);
  await db.exec("rollback to invalid_reason");
  await db.exec("reset role");
  expect((await db.query("select * from assessment_review_invalidations")).rows).toHaveLength(0);
});
it("rejects stale and duplicate invalidation without affecting a newer approval",async()=>{
  const {item,submission}=await approvedRoster();
  await user(2); await invalidateApproval(item);
  await user(3); const next=await submitRoster(item,2,1); await decideReview(next,"approved","",2);
  await user(2);
  await db.exec("savepoint stale_invalidation");
  await expect(invalidateApproval(item)).rejects.toThrow(/changed/);
  await db.exec("rollback to stale_invalidation");
  await user(3);
  expect((await readReview(next)).status).toBe("approved");
  expect((await readReview(submission)).status).toBe("invalidated");
});
it.each([3,4,5,102])("denies approval invalidation and direct record mutation to caller %s",async who=>{
  const {item}=await approvedRoster();
  await user(who);
  for(const action of [()=>invalidateApproval(item),
    ()=>db.query("select * from assessment_review_invalidations"),
    ()=>db.query("delete from assessment_review_invalidations"),
    ()=>db.query("update assessment_submissions set status='invalidated'")]) {
    await db.exec("savepoint denied_invalidation");
    await expect(action()).rejects.toThrow();
    await db.exec("rollback to denied_invalidation");
  }
});
it("rejects invalidation of pending or already superseded work",async()=>{
  const item=await completeRoster(); const submission=await submitRoster(item);
  await user(2);
  await db.exec("savepoint pending_invalidation");
  await expect(invalidateApproval(item)).rejects.toThrow(/changed/);
  await db.exec("rollback to pending_invalidation");
  await grantReviewer(item); await user(3); await decideReview(submission);
  await write(item,2,[mark(0,"scored","4")]);
  await user(2);
  await expect(invalidateApproval(item)).rejects.toThrow(/changed/);
});
it("denies anonymous invalidation and rolls back the transition if its audit fails",async()=>{
  const {item}=await approvedRoster();
  await db.exec("set local role anon");
  await db.exec("savepoint anon_invalidation");
  await expect(invalidateApproval(item)).rejects.toThrow();
  await db.exec("rollback to anon_invalidation");
  await db.exec("reset role");
  await db.exec(`create function public.reject_invalidation_audit() returns trigger language plpgsql as $$
    begin if new.action='assessment.review.invalidate' then raise exception 'Fictional audit failure'; end if; return new; end $$;
    create trigger reject_invalidation_audit before insert on public.audit_events for each row execute function public.reject_invalidation_audit();`);
  await user(2);
  await db.exec("savepoint failed_invalidation");
  await expect(invalidateApproval(item)).rejects.toThrow(/audit failure/);
  await db.exec("rollback to failed_invalidation");
  await db.exec("reset role");
  expect((await db.query("select * from assessment_review_invalidations")).rows).toHaveLength(0);
  expect((await db.query<{status:string}>("select status from assessment_submissions where assessment_id=$1",[item])).rows[0].status).toBe("approved");
});
