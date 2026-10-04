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
import { createAcademicRecord } from "../src/app/dashboard/academic/actions";
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
    school: { id: "trusted-school" },
  });
  mock.from.mockReturnValue({ insert: mock.insert });
  mock.insert.mockResolvedValue({ error: null });
});
it("denies direct non-admin actions before contacting the database", async () => {
  mock.context.mockResolvedValue({ status: "ready", roles: ["teacher"] });
  expect(
    (
      await createAcademicRecord(
        state,
        form({ kind: "grades", name: "Grade 1" }),
      )
    ).saved,
  ).toBe(false);
  expect(mock.from).not.toHaveBeenCalled();
});
it("uses the verified school and discards injected fields", async () => {
  expect(
    (
      await createAcademicRecord(
        state,
        form({
          kind: "grades",
          name: " Grade 1 ",
          school_id: "forged",
          id: "forged",
        }),
      )
    ).saved,
  ).toBe(true);
  expect(mock.insert).toHaveBeenCalledWith({
    name: "Grade 1",
    school_id: "trusted-school",
  });
});
it("rejects arbitrary tables, impossible dates and reversed dates", async () => {
  for (const data of [
    { kind: "schools", name: "Bad" },
    {
      kind: "academic_years",
      name: "Bad",
      starts_on: "2027-02-30",
      ends_on: "2027-12-31",
    },
    {
      kind: "academic_years",
      name: "Bad",
      starts_on: "2027-12-31",
      ends_on: "2027-01-01",
    },
  ])
    expect(
      (await createAcademicRecord(state, form(data as Record<string, string>)))
        .saved,
    ).toBe(false);
  expect(mock.from).not.toHaveBeenCalled();
});
it("does not report success when database validation rejects a write", async () => {
  mock.insert.mockResolvedValue({ error: { code: "23505" } });
  expect(
    (
      await createAcademicRecord(
        state,
        form({ kind: "grades", name: "Grade 1" }),
      )
    ).error,
  ).toContain("already exists");
});
it("normalizes Grade10 before inserting and returns success rather than the initial state", async () => {
  const result = await createAcademicRecord(
    state,
    form({ kind: "grades", name: "Grade10" }),
  );
  expect(mock.insert).toHaveBeenCalledWith({
    name: "Grade 10",
    school_id: "trusted-school",
  });
  expect(result).toEqual({ error: "", saved: true });
  expect(state).toEqual({ error: "", saved: false });
});
