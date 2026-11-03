import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
import { authoriseAssessmentScale, saveAssessment } from "../src/app/dashboard/assessments/actions";
const id = "00000000-0000-4000-8000-000000000001";
function form(changes: Record<string, string | undefined> = {}) { const f = new FormData(); for (const [k, v] of Object.entries({ mode: "teacher", id: "", version: "0", assignmentId: id, termId: id, title: " Test ", instructions: " Read ", effectiveDate: "2026-10-29", minimum: "0", maximum: "40", precision: "0", ...changes }))
    if (v !== undefined) f.set(k, v); return f; }
beforeEach(() => { vi.clearAllMocks(); mock.context.mockResolvedValue({ status: "ready", roles: ["teacher"], school: { id: "trusted" } }); mock.rpc.mockResolvedValue({ data: id, error: null }); });
it("uses trusted school and decimal strings", async () => { expect((await saveAssessment({ error: "", saved: false }, form({ schoolId: "forged" }))).saved).toBe(true); expect(mock.rpc).toHaveBeenCalledWith("save_assessment", expect.objectContaining({ target_school: "trusted", new_maximum: "40", new_title: "Test", authorise_scale: false })); });
it.each([{ mode: "guardian" }, { mode: "school_admin" }, { authorise: "on" }, { effectiveDate: "2026-02-30" }, { maximum: "1.01", precision: "0" }, { maximum: "NaN" }, { version: "" }])("rejects invalid or unauthorised input %#", async (change) => { expect((await saveAssessment({ error: "", saved: false }, form(change))).saved).toBe(false); expect(mock.rpc).not.toHaveBeenCalled(); });
it("reports stale saves and hides raw database errors", async () => { mock.rpc.mockResolvedValue({ error: { code: "40001", message: "SECRET" } }); expect((await saveAssessment({ error: "", saved: false }, form())).error).toContain("changed"); expect(mock.revalidate).not.toHaveBeenCalled(); });
it("keeps authentication redirects outside catch", async () => { mock.context.mockRejectedValue(new Error("REDIRECT")); await expect(saveAssessment({ error: "", saved: false }, form())).rejects.toThrow("REDIRECT"); });

const proposal = {
  id, assignment_id: id, assignment_label: "Geography", term_id: id, term_label: "Term 4",
  title: "Map reading", instructions: "Read the map", effective_date: "2026-11-03",
  minimum: "0", maximum: "37.5", decimal_places: 1, scale_authorised: false, record_version: 3,
};

it("authorises the stored proposal at the version Admin saw", async () => {
  mock.context.mockResolvedValue({ status: "ready", roles: ["school_admin"], school: { id: "trusted" } });
  mock.rpc.mockResolvedValueOnce({ data: [proposal], error: null });
  expect((await authoriseAssessmentScale(id, 3)).saved).toBe(true);
  expect(mock.rpc).toHaveBeenLastCalledWith("save_assessment", expect.objectContaining({
    target_school: "trusted", staff_mode: "school_admin", target_assessment: id,
    expected_version: 3, new_title: "Map reading", new_maximum: "37.5", authorise_scale: true,
  }));
});

it("refuses authorisation after a teacher has changed the proposal", async () => {
  mock.context.mockResolvedValue({ status: "ready", roles: ["school_admin"], school: { id: "trusted" } });
  mock.rpc.mockResolvedValueOnce({ data: [proposal], error: null });
  expect((await authoriseAssessmentScale(id, 2)).saved).toBe(false);
  expect(mock.rpc).toHaveBeenCalledTimes(1);
  expect(mock.revalidate).not.toHaveBeenCalled();
});

it("rejects a teacher invoking the Admin action directly", async () => {
  expect((await authoriseAssessmentScale(id, 3)).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
