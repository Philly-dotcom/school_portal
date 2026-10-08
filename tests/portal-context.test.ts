import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const mock = vi.hoisted(() => ({
  context: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mock.from, rpc: mock.rpc }),
}));
import { loadPortalActor } from "../src/lib/portal-data";
import { availablePortalModes, portalHref } from "../src/lib/portal-validation";
import { loadMyTimetable } from "../src/lib/my-timetable-data";
import { ChildSelector } from "../src/components/child-selector";

const child = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const calls: { table: string; filters: unknown[][] }[] = [];
const replies: Record<string, { data: unknown; error: unknown }> = {};
beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  for (const key of Object.keys(replies)) delete replies[key];
  mock.context.mockResolvedValue({
    status: "ready",
    school: { id: "trusted-school" },
    userId: "trusted-user",
    roles: ["teacher", "guardian", "student"],
  });
  replies.school_memberships = { data: { id: "trusted-member" }, error: null };
  for (const table of ["teachers", "students", "guardians"])
    replies[table] = {
      data: { id: child, full_name: "Fictional Person", reference: "TEST" },
      error: null,
    };
  replies.student_guardians = { data: [], error: null };
  mock.from.mockImplementation((table: string) => {
    const filters: unknown[][] = [];
    calls.push({ table, filters });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: (...args: unknown[]) => {
        filters.push(args);
        return query;
      },
      in: (...args: unknown[]) => {
        filters.push(args);
        return query;
      },
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      maybeSingle: () => Promise.resolve(replies[table]),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(replies[table]).then(resolve),
    };
    return query;
  });
});
it("resolves the person through server identity, school and active membership", async () => {
  expect((await loadPortalActor("teacher")).status).toBe("ready");
  expect(calls[0].filters).toEqual([
    ["school_id", "trusted-school"],
    ["user_id", "trusted-user"],
    ["status", "active"],
  ]);
  expect(calls[1]).toEqual({
    table: "teachers",
    filters: [
      ["school_id", "trusted-school"],
      ["membership_id", "trusted-member"],
    ],
  });
});
it("rejects malformed children, role changes and non-guardian child selection before queries", async () => {
  expect((await loadPortalActor("guardian", "bad")).status).toBe("forbidden");
  expect((await loadPortalActor("student", child)).status).toBe("forbidden");
  mock.context.mockResolvedValue({ status: "ready", roles: ["student"] });
  expect((await loadPortalActor("teacher")).status).toBe("forbidden");
  expect(mock.from).not.toHaveBeenCalled();
});
it("rejects a forged child even when the guardian has no grants", async () => {
  expect((await loadPortalActor("guardian", child)).status).toBe("forbidden");
  expect(await loadPortalActor("guardian")).toMatchObject({
    status: "ready",
    children: [],
    selectedChild: null,
  });
});
it("does not turn a multi-role teacher's roster into guardian children", async () => {
  replies.student_guardians.data = [
    { student_id: child, relationship: "Guardian" },
  ];
  replies.students.data = [
    { id: child, full_name: "Fictional Learner", reference: "ST-1" },
  ];
  expect(await loadPortalActor("guardian", child)).toMatchObject({
    status: "ready",
    selectedChild: { id: child },
  });
  expect(calls.find((c) => c.table === "students")?.filters).toContainEqual([
    "id",
    [child],
  ]);
  expect(
    calls.find((c) => c.table === "student_guardians")?.filters,
  ).toContainEqual(["access_enabled", true]);
  expect((await loadPortalActor("guardian", other)).status).toBe("forbidden");
});
it("distinguishes unlinked records, failed reads and incomplete child results", async () => {
  replies.teachers.data = null;
  expect((await loadPortalActor("teacher")).status).toBe("empty");
  replies.teachers.error = { message: "PRIVATE" };
  expect(await loadPortalActor("teacher")).toEqual({ status: "unavailable" });
  replies.student_guardians.data = [
    { student_id: child, relationship: "Guardian" },
  ];
  replies.students.data = [];
  expect(await loadPortalActor("guardian")).toEqual({ status: "unavailable" });
  mock.from.mockImplementation(() => {
    throw new Error("PRIVATE");
  });
  expect(await loadPortalActor("teacher")).toEqual({ status: "unavailable" });
});
it("keeps child and role across pagination, resets pagination when selecting a child", () => {
  expect(availablePortalModes(["teacher", "guardian", "super_admin"])).toEqual([
    "teacher",
    "guardian",
  ]);
  expect(portalHref("my-timetable", "guardian", child, 2)).toContain(
    `child=${child}&myTimetablePage=2`,
  );
  const html = renderToStaticMarkup(
    createElement(ChildSelector, {
      learners: [
        {
          id: child,
          fullName: "Fictional",
          reference: "ST",
          relationship: "Guardian",
        },
      ],
      mode: "guardian",
      view: "my-timetable",
    }),
  );
  expect(html).toContain('name="view" value="my-timetable"');
  expect(html).not.toContain("myTimetablePage");
});
it("bounds timetable pages and distinguishes database failure from an empty week", async () => {
  const actor = {
    status: "ready",
    mode: "student",
    schoolId: "trusted-school",
    person: { id: child, fullName: "Fictional", reference: "ST" },
  } as const;
  mock.rpc.mockResolvedValue({ data: [], error: null });
  expect(await loadMyTimetable(actor, "100001")).toEqual({
    rows: [],
    page: 1,
    hasNext: false,
  });
  expect(mock.rpc).toHaveBeenCalledWith("list_my_timetable", {
    target_school: "trusted-school",
    portal_mode: "student",
    selected_student: null,
    page_number: 1,
  });
  mock.rpc.mockResolvedValue({ data: null, error: { message: "PRIVATE" } });
  expect(await loadMyTimetable(actor)).toBeNull();
  mock.rpc.mockRejectedValue(new Error("PRIVATE"));
  expect(await loadMyTimetable(actor)).toBeNull();
});
