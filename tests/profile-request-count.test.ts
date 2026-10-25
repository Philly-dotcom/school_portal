import { beforeEach, expect, it, vi } from "vitest";

const backend = vi.hoisted(() => ({ calls: [] as string[], active: true }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));
vi.mock("@/lib/config", () => ({ isPortalConfigured: () => true, getSchoolId: () => "school" }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => { backend.calls.push("auth"); return { data: { user: { id: "user", email: "test@example.invalid" } }, error: null }; } },
    from: (table: string) => {
      const result = () => {
        backend.calls.push(table);
        const data = table === "school_memberships" ? backend.active ? { id: "member", membership_roles: [{ role: "teacher" }, { role: "student" }] } : null
          : table === "schools" ? { id: "school", name: "Fictional School", timezone: "UTC" }
          : table === "teachers" || table === "students" ? { id: "00000000-0000-4000-8000-000000000001", full_name: "Fictional Person", reference: "TEST" }
          : [];
        return Promise.resolve({ data, error: null });
      };
      const query = { select: () => query, eq: () => query, order: () => query, maybeSingle: result, range: result };
      return query;
    },
  }),
}));
import { getSchoolContext } from "../src/lib/auth-context";
import { loadPortalActor } from "../src/lib/portal-data";
import { loadTeacherProfile } from "../src/lib/staff-profile-data";
import { loadStudentProfile } from "../src/lib/student-profile-data";

beforeEach(() => { backend.calls.length = 0; backend.active = true; });
it.each(["teacher", "student"] as const)("measures %s overview backend calls", async (mode) => {
  const context = await getSchoolContext();
  if (context.status !== "ready") throw new Error("Expected ready context");
  const actor = await loadPortalActor(mode, undefined, context);
  if (actor.status !== "ready") throw new Error("Expected linked actor");
  const result = await (mode === "teacher" ? loadTeacherProfile({ context, actor }) : loadStudentProfile({ context, actor }));
  expect(result.status).toBe("ready");
  console.info(`${mode} overview backend operations: ${backend.calls.length}; auth: ${backend.calls.filter(c => c === "auth").length}`);
  // Before optimisation this exact render flow required 17 backend operations.
  expect(backend.calls.length).toBe(6);
  expect(backend.calls.filter(c => c === "auth")).toHaveLength(1);
});

it("fresh renders observe a suspended membership rather than reusing previous access", async () => {
  expect((await getSchoolContext()).status).toBe("ready");
  backend.active = false;
  expect((await getSchoolContext()).status).toBe("forbidden");
  expect((await loadPortalActor("teacher")).status).toBe("forbidden");
  expect(backend.calls).not.toContain("teachers");
});
it("a reused render context still rejects unassigned roles and malformed child selection", async () => {
  const context = await getSchoolContext();
  if (context.status !== "ready") throw new Error("Expected context");
  backend.calls.length = 0;
  expect(await loadPortalActor("guardian", undefined, context)).toEqual({ status: "forbidden" });
  expect(await loadPortalActor("teacher", "bad", context)).toEqual({ status: "forbidden" });
  expect(backend.calls).toEqual([]);
});
