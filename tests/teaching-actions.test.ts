import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  context: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mock.from, rpc: mock.rpc }),
}));
import { createTeachingAssignment, changeTeachingAssignment } from "../src/app/dashboard/teaching/actions";
const id = "00000000-0000-4000-8000-000000000001";
const fields = {
  teacher_id: id,
  subject_id: id,
  class_id: id,
  academic_year_id: id,
  starts_on: "2027-01-01",
  ends_on: "2027-12-31",
};
const state = { error: "", saved: false };
function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.context.mockResolvedValue({
    status: "ready",
    roles: ["school_admin"],
    school: { id: "trusted" },
  });
  mock.from.mockReturnValue({ insert: mock.insert });
  mock.insert.mockResolvedValue({ error: null });
  mock.rpc.mockResolvedValue({ error: null });
});
it("blocks non-admin and unverified direct calls", async () => {
  for (const context of [
    { status: "forbidden" },
    { status: "ready", roles: ["teacher"] },
  ]) {
    mock.context.mockResolvedValue(context);
    expect((await createTeachingAssignment(state, form(fields))).saved).toBe(
      false,
    );
  }
  expect(mock.from).not.toHaveBeenCalled();
});
it("derives school ownership from verified context", async () => {
  expect(
    (
      await createTeachingAssignment(
        state,
        form({ ...fields, school_id: "forged", id: "forged" }),
      )
    ).saved,
  ).toBe(true);
  expect(mock.from).toHaveBeenCalledWith("teaching_assignments");
  expect(mock.insert).toHaveBeenCalledWith({ ...fields, school_id: "trusted" });
});
it("rejects malformed selections and dates before writing", async () => {
  for (const invalid of [
    { teacher_id: "invalid" },
    { starts_on: "2027-02-30" },
    { starts_on: "2028-01-01" },
  ])
    expect(
      (await createTeachingAssignment(state, form({ ...fields, ...invalid })))
        .saved,
    ).toBe(false);
  expect(mock.from).not.toHaveBeenCalled();
});
it("reports duplicates without raw database errors", async () => {
  mock.insert.mockResolvedValue({
    error: { code: "23505", message: "internal detail" },
  });
  const result = await createTeachingAssignment(state, form(fields));
  expect(result.saved).toBe(false);
  expect(result.error).toContain("already assigned");
  expect(result.error).not.toContain("internal detail");
});

const changeFields = { id, version: "1", kind: "replace", date: "2027-06-01", teacher: "00000000-0000-4000-8000-000000000002", confirmed: "yes" };
it("authorizes assignment lifecycle calls and ignores forged school ownership", async () => {
  mock.context.mockResolvedValue({ status: "ready", roles: ["teacher"] });
  expect((await changeTeachingAssignment(state, form(changeFields))).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
  mock.context.mockResolvedValue({ status: "ready", roles: ["school_admin"], school: { id: "trusted" } });
  expect((await changeTeachingAssignment(state, form({ ...changeFields, school_id: "forged" }))).saved).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith("change_teaching_assignment", { target_school: "trusted", target_assignment: id, expected_version: 1, change_kind: "replace", change_date: "2027-06-01", replacement_teacher: changeFields.teacher });
});
it("rejects malformed lifecycle inputs and unconfirmed changes before calling SQL", async () => {
  for (const invalid of [{ confirmed: "" }, { version: "0" }, { date: "2027-02-30" }, { kind: "other" }, { teacher: "" }, { kind: "end" }]) {
    expect((await changeTeachingAssignment(state, form({ ...changeFields, ...invalid }))).saved).toBe(false);
  }
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("explains stale forms and timetable conflicts without exposing database details", async () => {
  for (const [code, message] of [["40001", "Reload"], ["23514", "Timetable"], ["23P01", "overlapping"], ["unknown", "Could not"]]) {
    mock.rpc.mockResolvedValue({ error: { code, message: "private SQL details" } });
    const result = await changeTeachingAssignment(state, form(changeFields));
    expect(result.saved).toBe(false); expect(result.error).toContain(message); expect(result.error).not.toContain("private SQL");
  }
});
