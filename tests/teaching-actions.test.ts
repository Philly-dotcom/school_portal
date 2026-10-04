import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  context: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mock.from }),
}));
import { createTeachingAssignment } from "../src/app/dashboard/teaching/actions";
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
