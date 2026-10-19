import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), context: vi.fn(), single: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mocks.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc, from: mocks.from }) }));
import { loadAttendanceRegister } from "../src/lib/attendance-data";

const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T10:00:00Z"));
  mocks.context.mockResolvedValue({ status: "ready", school: { id, timezone: "Africa/Johannesburg" }, roles: ["school_admin"] });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: mocks.single };
  mocks.from.mockReturnValue(query);
  mocks.single.mockResolvedValue({ data: { name: "12A", academic_years: { name: "2027", starts_on: "2027-01-18", ends_on: "2027-11-26" } }, error: null });
});
afterEach(() => vi.useRealTimers());

it("keeps an authorized future class selected and explains the date rejection", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  const result = await loadAttendanceRegister(id, "school_admin", id, "2026-10-09");
  expect(result.status).toBe("unavailable");
  expect(result.choice).toEqual({ id, label: "12A · 2027" });
  expect(result.message).toContain("starts on 2027-01-18");
  expect(result.register).toBeNull();
});
it("does not misdiagnose a missing RPC or malformed payload as a future-year rejection", async () => {
  for (const response of [{ data: null, error: { code: "PGRST202" } }, { data: {}, error: null }]) {
    mocks.rpc.mockResolvedValue(response);
    const result = await loadAttendanceRegister(id, "school_admin", id, "2026-10-09");
    expect(result.status).toBe("error");
    expect(result.message).toContain("could not be loaded");
    expect(result.message).not.toContain("starts on");
  }
});
it("never resolves class details for teacher mode, including a dual-role account", async () => {
  mocks.context.mockResolvedValue({ status: "ready", school: { id, timezone: "Africa/Johannesburg" }, roles: ["teacher", "guardian", "school_admin"] });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  const result = await loadAttendanceRegister(id, "teacher", id, "2026-10-09");
  expect(mocks.from).not.toHaveBeenCalled();
  expect(result.choice.id).toBe(id);
  expect(result.choice.label).not.toContain("12A");
  expect(result.message).toContain("both today and the register date");
});
it("does not disclose another school's class through diagnostic reads", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  await loadAttendanceRegister("other-school", "school_admin", id, "2026-10-09");
  expect(mocks.from).not.toHaveBeenCalled();
});
it("keeps failed metadata reads generic and preserves the submitted selection", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  mocks.single.mockResolvedValue({ data: null, error: null });
  const result = await loadAttendanceRegister(id, "school_admin", id, "2026-10-09");
  expect(result.choice.id).toBe(id);
  expect(result.message).not.toContain("2027");
});
it("leaves a successful authorized register untouched", async () => {
  const register = { class_id: id, class_label: "12A", date: "2026-10-09", today: "2026-10-09", version: 0, can_edit: true, page: 1, has_next: false, rows: [] };
  mocks.rpc.mockResolvedValue({ data: register, error: null });
  const result = await loadAttendanceRegister(id, "teacher", id, "2026-10-09");
  expect(result.status).toBe("ready");
  expect(result.register).toEqual(register);
  expect(mocks.from).not.toHaveBeenCalled();
});
it("explains out-of-year dates without opening a register", async () => {
  mocks.single.mockResolvedValue({ data: { name: "12A", academic_years: { name: "2026", starts_on: "2026-01-18", ends_on: "2026-11-26" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  const result = await loadAttendanceRegister(id, "school_admin", id, "2025-10-09");
  expect(result.message).toContain("2026-01-18 to 2026-11-26");
  expect(result.register).toBeNull();
});
it("explains a future date inside a current academic year without granting access", async () => {
  mocks.single.mockResolvedValue({ data: { name: "12A", academic_years: { name: "2026", starts_on: "2026-01-18", ends_on: "2026-11-26" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  const result = await loadAttendanceRegister(id, "school_admin", id, "2026-10-10");
  expect(result.message).toContain("Future attendance registers are unavailable");
  expect(result.register).toBeNull();
});
