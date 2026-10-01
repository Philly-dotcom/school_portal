import { beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
import { changeEnrollment } from "../src/app/dashboard/registers/lifecycle-actions";
const id = "00000000-0000-4000-8000-000000000001";
const state = { error: "", saved: false };
const fields = { id, version: "1", kind: "transfer", date: "2027-06-01", destination: id, confirm: "yes" };
function form(values: Record<string,string>) { const f = new FormData(); for (const [k,v] of Object.entries(values)) f.set(k,v); return f; }
beforeEach(() => { vi.clearAllMocks(); mock.context.mockResolvedValue({ status: "ready", roles: ["school_admin"], school: { id: "trusted" } }); mock.rpc.mockResolvedValue({ data: id, error: null }); });
it("authorizes before parsing or calling the database", async () => {
  for (const context of [{ status: "signed_out" }, { status: "ready", roles: ["teacher"] }]) {
    mock.context.mockResolvedValue(context);
    expect((await changeEnrollment(state, form(fields))).saved).toBe(false);
  }
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("uses the verified school and passes the expected version", async () => {
  expect((await changeEnrollment(state, form({ ...fields, school_id: "forged" }))).saved).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith("change_enrollment", { target_school: "trusted", target_enrollment: id, expected_version: 1, change_kind: "transfer", change_date: "2027-06-01", destination_class: id });
});
it("requires confirmation, a real date, version and correct destination semantics", async () => {
  for (const patch of [{ confirm: "" }, { date: "2027-02-30" }, { version: "0" }, { kind: "delete" }, { destination: "" }, { kind: "withdrawal" }])
    expect((await changeEnrollment(state, form({ ...fields, ...patch }))).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
  expect((await changeEnrollment(state, form({ ...fields, kind: "withdrawal", destination: "" }))).saved).toBe(true);
});
it("reports stale edits and hides internal database errors", async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { code: "40001", message: "private" } });
  expect((await changeEnrollment(state, form(fields))).error).toContain("Reload");
  mock.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "private" } });
  expect((await changeEnrollment(state, form(fields))).error).not.toContain("private");
});
