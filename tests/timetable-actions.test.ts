import { beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mock.rpc }),
}));
import {
  saveLesson,
  removeLesson,
} from "../src/app/dashboard/timetable/actions";
const id = "00000000-0000-4000-8000-000000000001",
  state = { error: "", saved: false };
const fields = {
  assignment_id: id,
  weekday: "1",
  start_time: "09:00",
  end_time: "10:00",
  starts_on: "2027-01-01",
  ends_on: "2027-12-31",
};
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
  mock.rpc.mockResolvedValue({ data: id, error: null });
});
it("checks administrator access before creating or removing", async () => {
  mock.context.mockResolvedValue({ status: "ready", roles: ["teacher"] });
  for (const action of [saveLesson, removeLesson])
    expect((await action(state, form(fields))).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("derives the school and converts local wall-clock minutes", async () => {
  expect(
    (
      await saveLesson(
        state,
        form({ ...fields, school_id: "forged", teacher_id: "forged" }),
      )
    ).saved,
  ).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith("create_timetable_lesson", {
    target_school: "trusted",
    target_assignment: id,
    lesson_weekday: 1,
    lesson_start: 540,
    lesson_end: 600,
    first_date: "2027-01-01",
    last_date: "2027-12-31",
  });
});
it("rejects invalid weekdays, time ranges and dates", async () => {
  for (const change of [
    { weekday: "8" },
    { end_time: "08:00" },
    { start_time: "25:00" },
    { starts_on: "2027-02-30" },
  ])
    expect(
      (await saveLesson(state, form({ ...fields, ...change }))).saved,
    ).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("requires deliberate removal and reports scheduling conflicts", async () => {
  expect((await removeLesson(state, form({ id }))).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
  expect((await removeLesson(state, form({ id, confirm: "yes" }))).saved).toBe(
    true,
  );
  expect(mock.rpc).toHaveBeenCalledWith("remove_timetable_lesson", {
    target_school: "trusted",
    target_lesson: id,
  });
  mock.rpc.mockResolvedValue({
    error: { code: "23P01", message: "internal" },
    data: null,
  });
  expect((await saveLesson(state, form(fields))).error).toContain(
    "already has a lesson",
  );
});
