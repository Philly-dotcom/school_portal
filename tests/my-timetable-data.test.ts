import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), limit: vi.fn(), eq: vi.fn(), context: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mocks.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc, from: mocks.from }) }));
import { loadMyTimetable } from "../src/lib/my-timetable-data";
import type { PortalActor } from "../src/lib/portal-validation";
const id = "00000000-0000-4000-8000-000000000001";
const actor: Extract<PortalActor, { status: "ready" }> = { status: "ready", mode: "student", schoolId: id, person: { id, fullName: "Fictional learner", reference: "TEST" } };
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T10:00:00Z"));
  mocks.context.mockResolvedValue({ status: "ready", school: { id, timezone: "Africa/Johannesburg" }, roles: ["student", "teacher", "guardian"] });
  const query = { select: vi.fn().mockReturnThis(), eq: mocks.eq, lte: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: mocks.limit };
  mocks.eq.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.rpc.mockResolvedValue({ data: [], error: null });
});
afterEach(() => vi.useRealTimers());
it("explains a verified future enrolment without treating it as current access", async () => {
  mocks.limit.mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: [{ starts_on: "2027-01-18", ends_on: "2027-11-26" }], error: null });
  const result = await loadMyTimetable(actor);
  expect(result?.rows).toEqual([]);
  expect(result?.emptyMessage).toContain("next recorded enrolment starts on 2027-01-18");
});
it("distinguishes a current placement with no lessons from no placement", async () => {
  mocks.limit.mockResolvedValue({ data: [{ starts_on: "2026-01-18", ends_on: "2026-11-26" }], error: null });
  expect((await loadMyTimetable(actor))?.emptyMessage).toContain("No lessons are scheduled for this week");
});
it("does not turn a failed date read into a missing-enrolment claim", async () => {
  mocks.limit.mockResolvedValue({ data: null, error: { code: "failed" } });
  expect((await loadMyTimetable(actor))?.emptyMessage).toContain("could not be checked");
});
it("does not inspect placements after an RPC failure or on an empty later page", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
  expect(await loadMyTimetable(actor)).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
  expect((await loadMyTimetable(actor, "2"))?.emptyMessage).toContain("previous page");
  expect(mocks.from).not.toHaveBeenCalled();
});
it("requires guardian selection and scopes the read to that learner rather than the guardian", async () => {
  const guardian = { ...actor, mode: "guardian" as const, children: [], selectedChild: null };
  expect(await loadMyTimetable(guardian)).toBeNull();
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.limit.mockResolvedValue({ data: [], error: null });
  await loadMyTimetable({ ...guardian, selectedChild: { id: "child-id", fullName: "Fictional child", reference: "TEST-CHILD", relationship: "Parent" } });
  expect(mocks.eq).toHaveBeenCalledWith("student_id", "child-id");
  expect(mocks.from).not.toHaveBeenCalledWith("teaching_assignments");
});
it("explains a teacher's own future assignment without inspecting student placements", async () => {
  mocks.limit.mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: [{ starts_on: "2027-01-18", ends_on: "2027-11-26" }], error: null });
  const result = await loadMyTimetable({ ...actor, mode: "teacher" });
  expect(result?.emptyMessage).toContain("next recorded teaching assignment starts on 2027-01-18");
  expect(mocks.eq).toHaveBeenCalledWith("teacher_id", id);
  expect(mocks.from).not.toHaveBeenCalledWith("enrollments");
});
