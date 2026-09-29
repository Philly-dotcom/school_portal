import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Executes the actual migration in embedded PostgreSQL. Only the Supabase Auth
// identity boundary is stubbed; RLS, constraints, roles and triggers are real SQL.
const db = new PGlite();
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const adminA = "20000000-0000-4000-8000-000000000001";
const teacherA = "20000000-0000-4000-8000-000000000002";
const adminB = "20000000-0000-4000-8000-000000000003";
const outsider = "20000000-0000-4000-8000-000000000004";
const membershipA = "30000000-0000-4000-8000-000000000001";

async function asUser<T>(user: string, operation: () => Promise<T>): Promise<T> {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  try { return await operation(); }
  finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
}

beforeAll(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated, anon;
  `);
  await db.exec(readFileSync("supabase/migrations/202609290001_foundation.sql", "utf8"));
  for (const user of [adminA, teacherA, adminB, outsider]) {
    await db.query("insert into auth.users values ($1)", [user]);
    await db.query("insert into public.profiles(user_id) values ($1)", [user]);
  }
  await db.query("insert into schools(id, name) values ($1, 'Fictional School A'), ($2, 'Fictional School B')", [A, B]);
  for (const [user, school, role, id] of [
    [adminA, A, "school_admin", membershipA],
    [teacherA, A, "teacher", "30000000-0000-4000-8000-000000000002"],
    [adminB, B, "school_admin", "30000000-0000-4000-8000-000000000003"],
  ]) {
    await db.query("insert into school_memberships(id, school_id, user_id) values ($1,$2,$3)", [id, school, user]);
    await db.query("insert into membership_roles values ($1,$2,$3)", [id, school, role]);
  }
}, 60000);

afterAll(async () => { await db.close(); });

describe("actual foundation database boundaries", () => {
  it("each admin can read only their school and its memberships", async () => {
    for (const [user, school, count] of [[adminA, A, 2], [adminB, B, 1]] as const) {
      await asUser(user, async () => {
        expect((await db.query("select id from schools")).rows).toEqual([{ id: school }]);
        expect((await db.query("select id from school_memberships")).rows).toHaveLength(count);
      });
    }
  });
  it("teachers can read only their own membership and roles", async () => {
    await asUser(teacherA, async () => {
      expect((await db.query("select user_id from school_memberships")).rows).toEqual([{ user_id: teacherA }]);
      expect((await db.query("select role from membership_roles")).rows).toEqual([{ role: "teacher" }]);
      expect((await db.query("select * from audit_events")).rows).toHaveLength(0);
    });
  });
  it("an admin can edit their school's name, not another school's name", async () => {
    await asUser(adminA, async () => {
      expect((await db.query("update schools set name='School A updated' where id=$1 returning id", [A])).rows).toHaveLength(1);
      expect((await db.query("update schools set name='Intrusion' where id=$1 returning id", [B])).rows).toHaveLength(0);
      const audit = await db.query("select action from audit_events where action='schools.update'");
      expect(audit.rows).toHaveLength(1);
    });
  });
  it("teachers cannot modify even their own school's settings", async () => {
    await asUser(teacherA, async () => {
      expect((await db.query("update schools set name='Intrusion' where id=$1 returning id", [A])).rows).toHaveLength(0);
    });
  });
  it("forbids role escalation, membership changes and audit tampering", async () => {
    await asUser(adminA, async () => {
      await expect(db.query("insert into membership_roles values ($1,$2,'guardian')", [membershipA,A])).rejects.toThrow();
      await expect(db.query("update school_memberships set status='suspended'")).rejects.toThrow();
      await expect(db.query("delete from audit_events")).rejects.toThrow();
      await expect(db.query("update schools set active=false where id=$1", [A])).rejects.toThrow();
    });
  });
  it("a composite foreign key rejects a cross-school role even for the DB owner", async () => {
    await expect(db.query("insert into membership_roles values ($1,$2,'guardian')", [membershipA,B])).rejects.toThrow();
  });
  it("blocks users without membership and suspended memberships", async () => {
    await asUser(outsider, async () => {
      expect((await db.query("select * from schools")).rows).toHaveLength(0);
    });
    await db.query("update school_memberships set status='suspended' where user_id=$1", [teacherA]);
    await asUser(teacherA, async () => {
      expect((await db.query("select * from schools")).rows).toHaveLength(0);
      expect((await db.query("select * from membership_roles")).rows).toHaveLength(0);
      expect((await db.query("select * from school_memberships")).rows).toHaveLength(0);
    });
  });
  it("blocks access when an entire school is inactive", async () => {
    await db.query("update schools set active=false where id=$1", [B]);
    await asUser(adminB, async () => {
      expect((await db.query("select * from schools")).rows).toHaveLength(0);
      expect((await db.query("select * from membership_roles")).rows).toHaveLength(0);
    });
  });
  it("anonymous requests cannot read school records", async () => {
    await db.exec("set role anon");
    try { await expect(db.query("select * from schools")).rejects.toThrow(); }
    finally { await db.exec("reset role"); }
  });
});
