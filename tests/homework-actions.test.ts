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
import { saveHomework } from "../src/app/dashboard/homework/actions";
import { searchHomeworkAssignments } from "../src/app/dashboard/homework/search-actions";
import { loadHomework } from "../src/lib/homework-data";
const id = "00000000-0000-4000-8000-000000000001";
const state = { error: "", saved: false };
function form(changes: Record<string, string | undefined> = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({
    mode: "teacher",
    id: "",
    assignmentId: id,
    version: "0",
    title: " Practice ",
    instructions: " Read chapter one. ",
    dueDate: "2026-10-09",
    status: "draft",
    ...changes,
  }))
    if (value !== undefined) result.set(key, value);
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.context.mockResolvedValue({
    status: "ready",
    roles: ["teacher"],
    school: { id: "trusted" },
  });
  mock.rpc.mockResolvedValue({ data: id, error: null });
});
it("uses the trusted school and trimmed input, ignoring forged authors and audience dates", async () => {
  expect(
    await saveHomework(
      state,
      form({
        schoolId: "forged",
        created_by: "forged",
        audience_date: "2000-01-01",
      }),
    ),
  ).toEqual({ error: "", saved: true });
  expect(mock.rpc).toHaveBeenCalledWith("save_homework", {
    target_school: "trusted",
    staff_mode: "teacher",
    target_homework: null,
    target_assignment: id,
    expected_version: 0,
    new_title: "Practice",
    new_instructions: "Read chapter one.",
    new_due_date: "2026-10-09",
    new_status: "draft",
  });
  expect(mock.revalidate).toHaveBeenCalledWith("/dashboard");
});
it.each(["student", "guardian", "school_admin"])(
  "requires the requested staff role instead of assuming it for %s",
  async (role) => {
    mock.context.mockResolvedValue({ status: "ready", roles: [role] });
    expect((await saveHomework(state, form())).saved).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  },
);
it.each([
  { version: "" },
  { id, version: "0" },
  { title: " " },
  { instructions: "x".repeat(10001) },
  { dueDate: "2026-02-30" },
  { status: "submitted" },
  { mode: "school_admin" },
])("rejects invalid or forged inputs %#", async (change) => {
  expect((await saveHomework(state, form(change))).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("reports version conflicts without exposing SQL details", async () => {
  mock.rpc.mockResolvedValue({ error: { code: "40001", message: "PRIVATE" } });
  expect((await saveHomework(state, form())).error).toContain("changed");
  mock.rpc.mockRejectedValue(new Error("PRIVATE"));
  expect((await saveHomework(state, form())).error).not.toContain("PRIVATE");
  expect(mock.revalidate).not.toHaveBeenCalled();
});
it("preserves authentication redirects", async () => {
  mock.context.mockRejectedValue(new Error("REDIRECT"));
  await expect(saveHomework(state, form())).rejects.toThrow("REDIRECT");
});
it("uses a bounded teacher search rather than the admin timetable search", async () => {
  mock.rpc.mockResolvedValue({
    data: Array.from({ length: 26 }, () => ({
      id,
      label: "Fictional assignment",
    })),
    error: null,
  });
  const result = await searchHomeworkAssignments("teacher", " Math ", 2);
  expect(result.choices).toHaveLength(25);
  expect(result.hasNext).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith("search_homework_assignments", {
    target_school: "trusted",
    staff_mode: "teacher",
    search_text: "Math",
    page_number: 2,
  });
  mock.rpc.mockClear();
  expect(
    (await searchHomeworkAssignments("school_admin", "", 1)).error,
  ).not.toBe("");
  expect(
    (await searchHomeworkAssignments("teacher", "", 100001)).error,
  ).not.toBe("");
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("keeps an unavailable read distinct from an empty list and scopes edit lookups", async () => {
  mock.rpc.mockResolvedValue({ data: [], error: null });
  expect(
    await loadHomework("trusted", "guardian", { child: id, page: "2" }),
  ).toEqual({ rows: [], page: 2, hasNext: false });
  expect(mock.rpc).toHaveBeenCalledWith("list_homework", {
    target_school: "trusted",
    portal_mode: "guardian",
    selected_student: id,
    page_number: 2,
    target_homework: null,
  });
  await loadHomework("trusted", "teacher", { edit: id, page: "7" });
  expect(mock.rpc).toHaveBeenLastCalledWith("list_homework", {
    target_school: "trusted",
    portal_mode: "teacher",
    selected_student: null,
    page_number: 1,
    target_homework: id,
  });
  mock.rpc.mockResolvedValue({ data: null, error: { message: "PRIVATE" } });
  expect(await loadHomework("trusted", "student")).toBeNull();
});
