import { installStorageStub } from "./helpers/storage-stub";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  adminA = id(3),
  adminB = id(4),
  teacherU = id(5);

async function asUser<T>(
  user: string | null,
  fn: () => Promise<T>,
  role = "authenticated",
): Promise<T> {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user ?? "",
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub");
  }
}
const rowsOf = (n: number, prefix = "p") =>
  Array.from({ length: n }, (_, i) => ({
    email: `${prefix}${i}@example.invalid`,
    name: `Fictional ${i}`,
    roles: ["student"],
  }));
const bulk = (user: string, school: string, invites: unknown) =>
  asUser(user, () =>
    db.query("select * from create_school_invitations_bulk($1,$2::jsonb)", [
      school,
      JSON.stringify(invites),
    ]),
  );

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
}, 90000);
afterAll(async () => {
  await db.close();
});

describe("permanent security sweeps (apply to every future migration)", () => {
  it("enables row-level security on every table in public", async () => {
    const r = await db.query(
      "select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity",
    );
    expect(r.rows).toEqual([]);
  });
  it("lets anonymous callers execute no function in public or private", async () => {
    const r =
      await db.query(`select n.nspname||'.'||p.proname fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','private') and has_function_privilege('anon', p.oid, 'execute')`);
    expect(r.rows).toEqual([]);
  });
  it("grants no direct table privileges to anonymous callers", async () => {
    const r =
      await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and has_table_privilege('anon', c.oid, 'select,insert,update,delete')`);
    expect(r.rows).toEqual([]);
  });
  it("gives every security-definer function an empty search_path", async () => {
    const r =
      await db.query(`select n.nspname||'.'||p.proname fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','private') and p.prosecdef and not coalesce(array_to_string(p.proconfig, ','),'') like '%search_path=""%'`);
    expect(r.rows).toEqual([]);
  });
});

describe("append-only audit trail", () => {
  it("rejects update, delete and truncate even for the database owner", async () => {
    await db.query(
      "insert into audit_events(school_id,actor_user_id,action,record_id) values($1,null,'test.event',$1)",
      [A],
    );
    await expect(
      db.query("update audit_events set action='tampered'"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("delete from audit_events")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(db.query("truncate audit_events")).rejects.toMatchObject({
      code: "42501",
    });
  });
});

describe("correction history", () => {
  it("keeps previous values admin-only, outside the audit trail, and purgeable", async () => {
    const student = await asUser(
      adminA,
      async () =>
        (
          await db.query<{ id: string }>(
            "insert into students(school_id,full_name,reference) values($1,'Fictional Typo','ST-001') returning id",
            [A],
          )
        ).rows[0].id,
    );
    await asUser(adminA, () =>
      db.query(
        "select correct_school_record($1,'students',$2,1,'Fictional Fixed','ST-001')",
        [A, student],
      ),
    );
    await asUser(adminA, async () => {
      const h = await db.query<{
        previous: { full_name: string };
        replaced_version: number;
      }>(
        "select previous, replaced_version from record_history where record_id=$1",
        [student],
      );
      expect(h.rows).toHaveLength(1);
      expect(h.rows[0].previous.full_name).toBe("Fictional Typo");
      expect(h.rows[0].replaced_version).toBe(1);
    });
    await asUser(teacherU, async () => {
      expect(
        (await db.query("select * from record_history")).rows,
      ).toHaveLength(0);
    });
    await asUser(adminB, async () => {
      expect(
        (await db.query("select * from record_history")).rows,
      ).toHaveLength(0);
    });
    const audit = JSON.stringify(
      (
        await db.query(
          "select details from audit_events where action='students.correct'",
        )
      ).rows,
    );
    expect(audit).not.toContain("Fictional Typo");
    await asUser(adminA, async () => {
      await expect(
        db.query("delete from record_history"),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        db.query("select purge_record_history($1, interval '1 day')", [A]),
      ).rejects.toMatchObject({ code: "22023" });
      expect(
        (
          await db.query<{ purge_record_history: number }>(
            "select purge_record_history($1, interval '30 days')",
            [A],
          )
        ).rows[0].purge_record_history,
      ).toBe(0);
    });
    await db.query(
      "update record_history set changed_at = now() - interval '3 years'",
    );
    await asUser(teacherU, async () => {
      await expect(
        db.query("select purge_record_history($1)", [A]),
      ).rejects.toMatchObject({ code: "42501" });
    });
    await asUser(adminA, async () => {
      expect(
        (
          await db.query<{ purge_record_history: number }>(
            "select purge_record_history($1)",
            [A],
          )
        ).rows[0].purge_record_history,
      ).toBe(1);
    });
  });
});

describe("bulk invitations", () => {
  it("creates in bulk, skips pending duplicates and audits each row", async () => {
    const first = await bulk(adminA, A, rowsOf(120));
    expect(first.rows[0]).toEqual({ created_count: 120, skipped_count: 0 });
    const again = await bulk(adminA, A, [
      ...rowsOf(3),
      {
        email: "NEW@Example.invalid ",
        name: " New ",
        roles: ["teacher", "teacher"],
      },
    ]);
    expect(again.rows[0]).toEqual({ created_count: 1, skipped_count: 3 });
    const stored = await db.query<{
      email: string;
      display_name: string;
      roles: string[];
      bulk: boolean;
    }>(
      "select email, display_name, roles::text[] as roles, bulk from school_invitations where email='new@example.invalid'",
    );
    expect(stored.rows[0]).toMatchObject({
      email: "new@example.invalid",
      display_name: "New",
      roles: ["teacher"],
      bulk: true,
    });
    expect(
      Number(
        (
          await db.query<{ n: string }>(
            "select count(*) n from audit_events where action='invitation.created'",
          )
        ).rows[0].n,
      ),
    ).toBe(121);
  });
  it("is atomic: one bad row rejects the batch and names the row", async () => {
    const before = Number(
      (
        await db.query<{ n: string }>(
          "select count(*) n from school_invitations",
        )
      ).rows[0].n,
    );
    await expect(
      bulk(adminA, A, [
        ...rowsOf(2, "ok"),
        { email: "not-an-email", name: "Bad", roles: ["student"] },
      ]),
    ).rejects.toThrow(/Row 3: invalid email/);
    await expect(
      bulk(adminA, A, [
        { email: "x1@example.invalid", name: "Bad", roles: ["principal"] },
      ]),
    ).rejects.toThrow(/Row 1: unknown role/);
    await expect(
      bulk(adminA, A, [
        { email: "x2@example.invalid", name: "Bad", roles: [] },
      ]),
    ).rejects.toThrow(/Row 1: choose at least one role/);
    await expect(
      bulk(adminA, A, [
        { email: "p0@example.invalid", name: "Duplicate", roles: [null] },
      ]),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      bulk(adminA, A, [
        {
          email: "p0@example.invalid",
          name: { wrong: "type" },
          roles: ["student"],
        },
      ]),
    ).rejects.toMatchObject({ code: "22023" });
    expect(
      Number(
        (
          await db.query<{ n: string }>(
            "select count(*) n from school_invitations",
          )
        ).rows[0].n,
      ),
    ).toBe(before);
  });
  it("enforces size and daily limits, administrator access, school scope and anonymous denial", async () => {
    await expect(bulk(adminA, A, rowsOf(201, "big"))).rejects.toMatchObject({
      code: "22023",
    });
    await expect(bulk(adminA, A, [])).rejects.toMatchObject({ code: "22023" });
    await expect(bulk(teacherU, A, rowsOf(1, "t"))).rejects.toMatchObject({
      code: "42501",
    });
    await expect(bulk(adminB, A, rowsOf(1, "t"))).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      asUser(
        null,
        () =>
          db.query(
            "select * from create_school_invitations_bulk($1,'[]'::jsonb)",
            [A],
          ),
        "anon",
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await bulk(adminA, A, rowsOf(200, "b2"));
    await bulk(adminA, A, rowsOf(79, "b3")); // 121 + 200 + 79 = 400 bulk rows today
    await expect(bulk(adminA, A, rowsOf(101, "b4"))).rejects.toMatchObject({
      code: "P0001",
    });
  });
  it("does not consume the single-invitation allowance", async () => {
    await asUser(adminA, async () => {
      const r = await db.query<{ create_school_invitation: string }>(
        "select create_school_invitation($1,'single@example.invalid','Single','{teacher}')",
        [A],
      );
      expect(r.rows[0].create_school_invitation).toMatch(/^[0-9a-f-]{36}$/);
      await expect(
        db.query(
          "select create_school_invitation($1,'single2@example.invalid','Single','{teacher}')",
          [A],
        ),
      ).rejects.toMatchObject({ code: "P0001" }); // 1/minute still applies to singles
    });
  });
});

describe("reset_invitation_delivery", () => {
  const reset = (user: string, inv: string) =>
    asUser(user, () =>
      db.query("select reset_invitation_delivery($1,$2,true)", [A, inv]),
    );
  const state = async (inv: string) =>
    (
      await db.query<{
        delivery_status: string;
        delivery_claim: string | null;
      }>(
        "select delivery_status, delivery_claim from school_invitations where id=$1",
        [inv],
      )
    ).rows[0];
  async function invitation(email: string, status: string) {
    const inv = (
      await db.query<{ id: string }>(
        "insert into school_invitations(school_id,email,display_name,roles,invited_by,delivery_status,delivery_claim) values($1,$2,'F','{student}',$3,$4,$5) returning id",
        [A, email, adminA, status, status === "sending" ? id(77) : null],
      )
    ).rows[0].id;
    await db.query(
      "update school_invitations set delivery_attempts=1,last_delivery_attempt_at=now()-interval '11 minutes' where id=$1",
      [inv],
    );
    return inv;
  }
  it("resets failed deliveries and stale sends, but not pending, sent or in-flight ones", async () => {
    const failed = await invitation("r1@example.invalid", "failed");
    await reset(adminA, failed);
    expect(await state(failed)).toEqual({
      delivery_status: "pending",
      delivery_claim: null,
    });
    await expect(reset(adminA, failed)).rejects.toMatchObject({
      code: "22023",
    }); // already pending
    const sent = await invitation("r2@example.invalid", "sent");
    await expect(reset(adminA, sent)).rejects.toMatchObject({ code: "22023" }); // never resend 'sent'
    const stuck = await invitation("r3@example.invalid", "sending");
    await db.query(
      "update school_invitations set last_delivery_attempt_at=now() where id=$1",
      [stuck],
    );
    await db.query(
      "insert into audit_events(school_id,actor_user_id,action,record_id) values($1,$2,'invitation.send_requested',$3)",
      [A, adminA, stuck],
    );
    await expect(reset(adminA, stuck)).rejects.toMatchObject({ code: "22023" }); // in flight (< 10 min)
    const stale = await invitation("r4@example.invalid", "sending"); // no recent send request recorded
    await reset(adminA, stale);
    expect((await state(stale)).delivery_status).toBe("pending");
  });
  it("requires an administrator of the same school and is audited", async () => {
    const failed = await invitation("r5@example.invalid", "failed");
    await expect(reset(teacherU, failed)).rejects.toMatchObject({
      code: "42501",
    });
    await expect(reset(adminB, failed)).rejects.toMatchObject({
      code: "42501",
    });
    await reset(adminA, failed);
    expect(
      Number(
        (
          await db.query<{ n: string }>(
            "select count(*) n from audit_events where action='invitation.delivery_reset' and record_id=$1",
            [failed],
          )
        ).rows[0].n,
      ),
    ).toBe(1);
  });
});

describe("account deletion safety", () => {
  it("lets an Auth account that issued invitations be deleted, which voids those invitations", async () => {
    const issuer = id(60);
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,'issuer@example.invalid',now())",
      [issuer],
    );
    const inv = (
      await db.query<{ id: string }>(
        "insert into school_invitations(school_id,email,display_name,roles,invited_by) values($1,'gone@example.invalid','G','{student}',$2) returning id",
        [A, issuer],
      )
    ).rows[0].id;
    await db.query("delete from auth.users where id=$1", [issuer]);
    expect(
      (
        await db.query(
          "select invited_by from school_invitations where id=$1",
          [inv],
        )
      ).rows,
    ).toEqual([{ invited_by: null }]);
    const recipient = id(61);
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,'gone@example.invalid',now())",
      [recipient],
    );
    await asUser(recipient, async () => {
      await expect(
        db.query("select accept_school_invitation($1)", [A]),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
});

it("bounds retries, requires review, records unknown outcomes and fences obsolete claims", async () => {
  const invite = (
    await db.query<{ id: string }>(
      "insert into school_invitations(school_id,email,display_name,roles,invited_by) values($1,'retry@example.invalid','Fictional Retry','{student}',$2) returning id",
      [A, adminA],
    )
  ).rows[0].id;
  const claim = async () =>
    (
      await asUser(adminA, () =>
        db.query<{ claim_id: string }>(
          "select * from claim_school_invitation($1,$2)",
          [A, invite],
        ),
      )
    ).rows[0].claim_id;
  const finish = (token: string, result: boolean | null) =>
    asUser(
      null,
      () =>
        db.query("select complete_school_invitation_delivery($1,$2,$3)", [
          invite,
          token,
          result,
        ]),
      "service_role",
    );
  const reset = (review: boolean) =>
    asUser(adminA, () =>
      db.query("select reset_invitation_delivery($1,$2,$3)", [
        A,
        invite,
        review,
      ]),
    );
  let oldClaim = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const token = await claim();
    if (oldClaim)
      await expect(finish(oldClaim, true)).rejects.toMatchObject({
        code: "42501",
      });
    await finish(token, attempt === 1 ? null : false);
    if (attempt === 1)
      expect(
        (
          await db.query(
            "select delivery_status from school_invitations where id=$1",
            [invite],
          )
        ).rows,
      ).toEqual([{ delivery_status: "unknown" }]);
    await expect(reset(true)).rejects.toMatchObject({ code: "22023" });
    await db.query(
      "update school_invitations set last_delivery_attempt_at=now()-interval '11 minutes' where id=$1",
      [invite],
    );
    await expect(reset(false)).rejects.toMatchObject({ code: "22023" });
    if (attempt < 3) await reset(true);
    else await expect(reset(true)).rejects.toMatchObject({ code: "22023" });
    oldClaim = token;
  }
  await expect(claim()).rejects.toMatchObject({ code: "22023" });
  expect(
    (
      await db.query(
        "select delivery_attempts from school_invitations where id=$1",
        [invite],
      )
    ).rows,
  ).toEqual([{ delivery_attempts: 3 }]);
});
