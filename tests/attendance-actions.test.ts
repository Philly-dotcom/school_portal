import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  context: vi.fn(),
  rpc: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mock.rpc }),
}));
import { saveAttendance } from "../src/app/dashboard/attendance/actions";
import { searchAttendanceClasses } from "../src/app/dashboard/attendance/search-actions";
import {
  loadAttendanceRegister,
  loadMyAttendance,
} from "../src/lib/attendance-data";
const id = "00000000-0000-4000-8000-000000000001";
const state = { error: "", saved: false };
function form(changes: Record<string, string | undefined> = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({
    mode: "teacher",
    classId: id,
    date: "2026-10-08",
    version: "0",
    entries: JSON.stringify([{ studentId: id, status: "present" }]),
    reason: "",
    ...changes,
  }))
    if (value !== undefined) result.set(key, value);
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.context.mockResolvedValue({
    status: "ready",
    school: { id: "trusted-school" },
    roles: ["teacher"],
  });
  mock.rpc.mockResolvedValue({ data: { id, version: 1 }, error: null });
});
it("derives school on the server and forwards the exact validated batch", async () => {
  expect(
    await saveAttendance(
      state,
      form({ schoolId: "forged", recorded_by: "forged" }),
    ),
  ).toEqual({ error: "", saved: true, version: 1 });
  expect(mock.rpc).toHaveBeenCalledWith("save_attendance", {
    target_school: "trusted-school",
    target_class: id,
    target_date: "2026-10-08",
    staff_mode: "teacher",
    expected_version: 0,
    entries: [{ studentId: id, status: "present" }],
    correction_reason: "",
  });
  expect(mock.revalidate).toHaveBeenCalledWith("/dashboard");
});
it.each(["student", "guardian", "school_admin"])(
  "does not infer teacher rights from role %s",
  async (role) => {
    mock.context.mockResolvedValue({ status: "ready", roles: [role] });
    expect((await saveAttendance(state, form())).saved).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  },
);
it.each([
  { entries: "bad" },
  { entries: "x".repeat(20001) },
  { entries: "[]" },
  { version: "" },
  { version: "-1" },
  { date: "2026-02-30" },
  { mode: "school_admin" },
])("rejects invalid or unauthorized inputs %#", async (values) => {
  expect((await saveAttendance(state, form(values))).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("returns a conflict message and keeps SQL/transport details private", async () => {
  mock.rpc.mockResolvedValue({ error: { code: "40001", message: "PRIVATE" } });
  expect((await saveAttendance(state, form())).error).toContain(
    "register changed",
  );
  mock.rpc.mockRejectedValue(new Error("PRIVATE"));
  expect((await saveAttendance(state, form())).error).not.toContain("PRIVATE");
  expect(mock.revalidate).not.toHaveBeenCalled();
});
it("does not swallow authentication redirects", async () => {
  mock.context.mockRejectedValue(new Error("REDIRECT:/login"));
  await expect(saveAttendance(state, form())).rejects.toThrow(
    "REDIRECT:/login",
  );
});
it("bounds staff class search and refuses forged modes", async () => {
  mock.rpc.mockResolvedValue({
    data: Array.from({ length: 26 }, () => ({ id, label: "Fictional class" })),
    error: null,
  });
  expect(await searchAttendanceClasses("teacher", "  8A  ", 2)).toMatchObject({
    hasNext: true,
    error: "",
  });
  expect(mock.rpc).toHaveBeenCalledWith("list_attendance_classes", {
    target_school: "trusted-school",
    staff_mode: "teacher",
    search_text: "8A",
    page_number: 2,
  });
  mock.rpc.mockClear();
  for (const args of [
    ["school_admin", "", 1],
    ["teacher", "", 100001],
    ["teacher", "x".repeat(81), 1],
  ] as const)
    expect(
      (await searchAttendanceClasses(args[0], args[1], args[2])).error,
    ).not.toBe("");
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("keeps unavailable history distinct from zero recorded marks", async () => {
  const actor = {
    status: "ready",
    mode: "student",
    schoolId: "trusted-school",
    person: { id, fullName: "Fictional", reference: "S1" },
  } as const;
  mock.rpc.mockResolvedValue({ data: [], error: null });
  expect(await loadMyAttendance(actor, "2")).toEqual({
    rows: [],
    page: 2,
    hasNext: false,
  });
  expect(mock.rpc).toHaveBeenCalledWith("list_my_attendance", {
    target_school: "trusted-school",
    portal_mode: "student",
    selected_student: null,
    page_number: 2,
  });
  mock.rpc.mockResolvedValue({ data: null, error: { message: "PRIVATE" } });
  expect(await loadMyAttendance(actor)).toBeNull();
  expect(
    await loadAttendanceRegister("trusted-school", "teacher", id, "2026-10-08"),
  ).toBeNull();
});
