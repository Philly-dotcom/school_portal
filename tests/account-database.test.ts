import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const schoolA = id(1),
  schoolB = id(2),
  admin = id(10),
  teacher = id(11),
  otherAdmin = id(12),
  invited = id(13),
  unverified = id(14);
const member = (user: string) => id(Number(user.slice(-12)) + 100);
async function asUser<T>(user: string, run: () => Promise<T>): Promise<T> {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    return await run();
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub");
  }
}
async function invite(email: string, role = "student") {
  // Advance only prior fixture timestamps to avoid the deliberate send rate limit.
  await db.exec(
    "update school_invitations set created_at=now()-interval '2 minutes'",
  );
  return asUser(admin, async () => {
    const result = await db.query<{ id: string }>(
      "select create_school_invitation($1,$2,'Fictional Recipient',array[$3]::school_role[]) id",
      [schoolA, email, role],
    );
    return result.rows[0].id;
  });
}
async function revoke(invitation: string) {
  await asUser(admin, () =>
    db.query("select revoke_school_invitation($1,$2)", [schoolA, invitation]),
  );
}
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;`);
  await db.exec(
    readFileSync("supabase/migrations/202609290001_foundation.sql", "utf8"),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202609300002_account_management.sql",
      "utf8",
    ),
  );
  for (const [user, email, confirmed] of [
    [admin, "admin@example.invalid", true],
    [teacher, "teacher@example.invalid", true],
    [otherAdmin, "other@example.invalid", true],
    [invited, "learner@example.invalid", true],
    [unverified, "unverified@example.invalid", false],
  ] as const) {
    await db.query(
      "insert into auth.users values($1,$2,case when $3 then now() else null end)",
      [user, email, confirmed],
    );
  }
  await db.query(
    "insert into schools(id,name) values($1,'Fictional A'),($2,'Fictional B')",
    [schoolA, schoolB],
  );
  for (const [user, school, role] of [
    [admin, schoolA, "school_admin"],
    [teacher, schoolA, "teacher"],
    [otherAdmin, schoolB, "school_admin"],
  ]) {
    await db.query(
      "insert into profiles(user_id,display_name) values($1,'Fictional Member')",
      [user],
    );
    await db.query(
      "insert into school_memberships(id,school_id,user_id) values($1,$2,$3)",
      [member(user), school, user],
    );
    await db.query("insert into membership_roles values($1,$2,$3)", [
      member(user),
      school,
      role,
    ]);
  }
}, 60000);
afterAll(async () => {
  await db.close();
});

describe("account-management database RPCs", () => {
  it("returns names and access only within the admin's school", async () => {
    await asUser(admin, async () => {
      const result = await db.query("select * from list_school_members($1)", [
        schoolA,
      ]);
      expect(result.rows).toHaveLength(2);
      await expect(
        db.query("select * from list_school_members($1)", [schoolB]),
      ).rejects.toThrow(/Access denied/);
    });
    await asUser(teacher, async () => {
      await expect(
        db.query("select * from list_school_members($1)", [schoolA]),
      ).rejects.toThrow(/Access denied/);
    });
  });
  it("rejects suspension or demotion of the last admin", async () => {
    await asUser(admin, async () => {
      for (const [status, role] of [
        ["suspended", "school_admin"],
        ["active", "teacher"],
      ]) {
        await expect(
          db.query(
            "select manage_school_member($1,$2,$3,array[$4]::school_role[],1)",
            [schoolA, member(admin), status, role],
          ),
        ).rejects.toThrow(/at least one/);
      }
    });
  });
  it("rejects wrong-school edits, teacher escalation, empty roles and direct writes", async () => {
    await asUser(admin, async () => {
      await expect(
        db.query(
          "select manage_school_member($1,$2,'active',array['teacher']::school_role[],1)",
          [schoolA, member(otherAdmin)],
        ),
      ).rejects.toThrow(/unavailable/);
      await expect(
        db.query(
          "select manage_school_member($1,$2,'active','{}'::school_role[],1)",
          [schoolA, member(teacher)],
        ),
      ).rejects.toThrow(/valid role/);
      await expect(
        db.query("update membership_roles set role='school_admin'"),
      ).rejects.toThrow();
    });
    await asUser(teacher, async () => {
      await expect(
        db.query(
          "select manage_school_member($1,$2,'active',array['school_admin']::school_role[],1)",
          [schoolA, member(teacher)],
        ),
      ).rejects.toThrow(/Access denied/);
      await expect(
        db.query(
          "select create_school_invitation($1,'intruder@example.invalid','Intruder',array['school_admin']::school_role[])",
          [schoolA],
        ),
      ).rejects.toThrow(/Access denied/);
    });
  });
  it("suspends with immediate policy effect, rejects stale forms and records old/new roles", async () => {
    await asUser(admin, () =>
      db.query(
        "select manage_school_member($1,$2,'suspended',array['teacher','guardian']::school_role[],1)",
        [schoolA, member(teacher)],
      ),
    );
    await asUser(teacher, async () => {
      expect((await db.query("select * from schools")).rows).toHaveLength(0);
    });
    await asUser(admin, async () => {
      await expect(
        db.query(
          "select manage_school_member($1,$2,'active',array['teacher']::school_role[],1)",
          [schoolA, member(teacher)],
        ),
      ).rejects.toThrow(/reload/);
      const result = await db.query<{
        details: { previous_status: string; status: string };
      }>(
        "select details from audit_events where action='member.access_changed'",
      );
      expect(result.rows[0].details.previous_status).toBe("active");
      expect(result.rows[0].details.status).toBe("suspended");
      await db.query(
        "select manage_school_member($1,$2,'active',array['teacher']::school_role[],2)",
        [schoolA, member(teacher)],
      );
    });
  });
  it("pending invitations grant no access, are school-private and enforce throttling", async () => {
    const invitation = await invite("learner@example.invalid");
    await asUser(invited, async () => {
      expect((await db.query("select * from schools")).rows).toHaveLength(0);
      expect(
        (await db.query("select * from school_invitations")).rows,
      ).toHaveLength(0);
    });
    await asUser(otherAdmin, async () => {
      expect(
        (await db.query("select * from school_invitations")).rows,
      ).toHaveLength(0);
      await expect(
        db.query("select revoke_school_invitation($1,$2)", [
          schoolA,
          invitation,
        ]),
      ).rejects.toThrow(/Access denied/);
    });
    await asUser(admin, async () => {
      await expect(
        db.query(
          "select create_school_invitation($1,'another@example.invalid','Person',array['teacher']::school_role[])",
          [schoolA],
        ),
      ).rejects.toThrow(/Wait a minute/);
    });
    await revoke(invitation);
    await asUser(invited, async () => {
      await expect(
        db.query("select accept_school_invitation($1)", [schoolA]),
      ).rejects.toThrow(/No valid invitation/);
    });
  });
  it("rejects unconfirmed email, different recipient and expired invitation", async () => {
    const invitation = await invite("unverified@example.invalid");
    await asUser(unverified, async () => {
      await expect(
        db.query("select accept_school_invitation($1)", [schoolA]),
      ).rejects.toThrow(/No valid invitation/);
    });
    await asUser(invited, async () => {
      await expect(
        db.query("select accept_school_invitation($1)", [schoolA]),
      ).rejects.toThrow(/No valid invitation/);
    });
    await revoke(invitation);
    const expired = await invite("learner@example.invalid");
    await db.query(
      "update school_invitations set expires_at=now()-interval '1 second' where id=$1",
      [expired],
    );
    await asUser(invited, async () => {
      await expect(
        db.query("select accept_school_invitation($1)", [schoolA]),
      ).rejects.toThrow(/No valid invitation/);
    });
    await revoke(expired);
  });
  it("claims one send, does not trust the caller with completion, and records provider status", async () => {
    const invitation = await invite("learner@example.invalid");
    const result = await asUser(admin, () =>
      db.query<{ email: string; claim_id: string }>(
        "select * from claim_school_invitation($1,$2)",
        [schoolA, invitation],
      ),
    );
    const claim = result.rows[0].claim_id;
    expect(result.rows[0].email).toBe("learner@example.invalid");
    await asUser(admin, async () => {
      await expect(
        db.query("select * from claim_school_invitation($1,$2)", [
          schoolA,
          invitation,
        ]),
      ).rejects.toThrow(/not ready/);
      await expect(
        db.query("select complete_school_invitation_delivery($1,$2,true)", [
          invitation,
          claim,
        ]),
      ).rejects.toThrow();
    });
    await db.exec("set role service_role");
    try {
      await expect(
        db.query("select complete_school_invitation_delivery($1,$2,true)", [
          invitation,
          id(999),
        ]),
      ).rejects.toThrow(/unavailable/);
      await db.query("select complete_school_invitation_delivery($1,$2,true)", [
        invitation,
        claim,
      ]);
    } finally {
      await db.exec("reset role");
    }
    expect(
      (
        await db.query<{ delivery_status: string }>(
          "select delivery_status from school_invitations where id=$1",
          [invitation],
        )
      ).rows[0].delivery_status,
    ).toBe("sent");
  });
  it("acceptance is atomic, grants exactly the approved roles, and cannot be replayed", async () => {
    await asUser(invited, async () => {
      await db.query("select accept_school_invitation($1)", [schoolA]);
      expect(
        (await db.query("select role from membership_roles")).rows,
      ).toEqual([{ role: "student" }]);
      expect((await db.query("select id from schools")).rows).toEqual([
        { id: schoolA },
      ]);
      await expect(
        db.query("select accept_school_invitation($1)", [schoolA]),
      ).rejects.toThrow(/No valid invitation/);
    });
  });
  it("an invitation never reactivates a suspended member", async () => {
    await db.query(
      "update school_memberships set status='suspended' where user_id=$1",
      [invited],
    );
    const invitation = await invite("learner@example.invalid", "school_admin");
    await asUser(invited, async () => {
      await expect(
        db.query("select accept_school_invitation($1)", [schoolA]),
      ).rejects.toThrow(/already exists/);
    });
    expect(
      (
        await db.query<{ status: string }>(
          "select status from school_memberships where user_id=$1",
          [invited],
        )
      ).rows[0].status,
    ).toBe("suspended");
    await revoke(invitation);
  });
  it("revoking the issuer's authority invalidates pending acceptance", async () => {
    await db.query(
      "update auth.users set email_confirmed_at=now() where id=$1",
      [unverified],
    );
    const invitation = await invite("unverified@example.invalid");
    await db.query(
      "update school_memberships set status='suspended' where user_id=$1",
      [admin],
    );
    await asUser(unverified, async () => {
      await expect(
        db.query("select accept_school_invitation($1)", [schoolA]),
      ).rejects.toThrow(/issuer/);
    });
    await db.query(
      "update school_memberships set status='active' where user_id=$1",
      [admin],
    );
    await revoke(invitation);
  });
  it("anonymous callers cannot invoke provisioning RPCs", async () => {
    await db.exec("set role anon");
    try {
      await expect(
        db.query("select accept_school_invitation($1)", [schoolA]),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
});
