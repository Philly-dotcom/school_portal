import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
import { authoriseAssessmentScale, saveAssessment } from "../src/app/dashboard/assessments/actions";
import { updateMarkDraft } from "../src/app/dashboard/marks/actions";
import { changeAssessmentReview } from "../src/app/dashboard/marks/review-actions";
import { saveGradingPolicyDraft } from "../src/app/dashboard/assessments/policy-actions";
it("invalidates only the expected package within the server's Admin school",async()=>{
    mock.context.mockResolvedValue({status:"ready",roles:["school_admin"],school:{id:"trusted"}});
    mock.rpc.mockReturnValue({abortSignal:async()=>({error:null})});
    const form=reviewForm({kind:"invalidate",mode:"school_admin",version:"3",reason:" Disputed approval ",school:"forged"});
    expect(await changeAssessmentReview("",form)).toContain("Approval invalidated");
    expect(mock.rpc).toHaveBeenCalledWith("invalidate_assessment_approval",{
        target_school:"trusted",target_assessment:id,expected_package:3,invalidation_reason:"Disputed approval",
    });
});
it.each([
    {mode:"teacher",reason:"Dispute"},
    {mode:"school_admin",reason:" "},
])("rejects an invalid approval-invalidation form %#",async fields=>{
    mock.context.mockResolvedValue({status:"ready",roles:["school_admin","teacher"],school:{id:"trusted"}});
    await changeAssessmentReview("",reviewForm({kind:"invalidate",...fields}));
    expect(mock.rpc).not.toHaveBeenCalled();
});
it("denies a teacher invoking the Admin invalidation action directly",async()=>{
    await changeAssessmentReview("",reviewForm({kind:"invalidate",mode:"school_admin",reason:"Dispute"}));
    expect(mock.rpc).not.toHaveBeenCalled();
});
const id = "00000000-0000-4000-8000-000000000001";
function policyForm(values: Record<string, string | undefined> = {}) {
    const data = new FormData();
    for (const [name, value] of Object.entries({ id, version: "0", year: id, grade: id, subject: id,
        title: " Fictional policy ", start: "2026-01-01", end: "2026-12-31", source: "", rules: "", ...values })) if(value!==undefined) data.set(name, value);
    return data;
}
it("saves incomplete policy drafts with trusted school scope and a stable request identity", async () => {
    mock.context.mockResolvedValue({status:"ready",roles:["school_admin"],school:{id:"trusted"}});
    mock.rpc.mockReturnValue({abortSignal: async () => ({data:id,error:null})});
    expect((await saveGradingPolicyDraft({error:"",saved:false},policyForm({school:"forged"}))).saved).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith("save_grading_policy_draft",expect.objectContaining({
        target_school:"trusted",target_policy:id,expected_version:0,new_title:"Fictional policy",new_rules:"",new_source:"",
    }));
});
it("rejects a teacher invoking policy writes directly",async()=>{
    expect((await saveGradingPolicyDraft({error:"",saved:false},policyForm())).saved).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
});
it.each([{start:"2026-02-30"},{start:"2027-01-01"},{title:" "},{version:"-1"}])("rejects invalid policy form %#",async input=>{
    mock.context.mockResolvedValue({status:"ready",roles:["school_admin"],school:{id:"trusted"}});
    expect((await saveGradingPolicyDraft({error:"",saved:false},policyForm(input))).saved).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
});
it("reports stale policy saves without exposing database details",async()=>{
    mock.context.mockResolvedValue({status:"ready",roles:["school_admin"],school:{id:"trusted"}});
    mock.rpc.mockReturnValue({abortSignal: async () => ({error:{code:"PT409",message:"PRIVATE"}})});
    const result=await saveGradingPolicyDraft({error:"",saved:false},policyForm());
    expect(result.error).toContain("changed");
    expect(result.error).not.toContain("PRIVATE");
    expect(mock.revalidate).not.toHaveBeenCalled();
});
function reviewForm(values: Record<string,string | undefined> = {}) {
    const data = new FormData();
    for (const [name,value] of Object.entries({kind:"submit",mode:"teacher",id,version:"2",previous:"0",...values})) if(value!==undefined) data.set(name,value);
    return data;
}
it("submits only within the server school and binds the draft and prior submission versions", async () => {
    mock.rpc.mockReturnValue({abortSignal: async () => ({data:id,error:null})});
    expect(await changeAssessmentReview("",reviewForm({school:"forged"}))).toBe("Submitted for review.");
    expect(mock.rpc).toHaveBeenCalledWith("submit_assessment",{target_school:"trusted",staff_mode:"teacher",
        target_assessment:id,expected_revision:2,expected_previous:0});
});
it.each([{mode:"guardian"},{mode:"school_admin"},{kind:"decide",decision:"returned",reason:" "}])("rejects unauthorized review forms and blank return reasons %#",async input=>{
    await changeAssessmentReview("",reviewForm(input));
    expect(mock.rpc).not.toHaveBeenCalled();
});
it("returns safe stale-review feedback without revalidating a failed action",async()=>{
    mock.rpc.mockReturnValue({abortSignal: async () => ({error:{code:"PT409",message:"PRIVATE"}})});
    const result=await changeAssessmentReview("",reviewForm());
    expect(result).toContain("changed"); expect(result).not.toContain("PRIVATE");
    expect(mock.revalidate).not.toHaveBeenCalled();
});
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

it("recognises the explicit HTTP conflict reported by migration 025", async () => {
  mock.rpc.mockResolvedValue({error:{code:"PT409"}});
  expect((await saveAssessment({error:"",saved:false},form())).error).toContain("changed");
});
it("checks a newer visible version after an unclassified edit failure", async () => {
  mock.rpc.mockResolvedValueOnce({error:{code:""}}).mockResolvedValueOnce({data:[proposal],error:null});
  expect((await saveAssessment({error:"",saved:false},form({id,version:"1"}))).error).toContain("saved assessment version changed");
  expect(mock.revalidate).not.toHaveBeenCalled();
});

it.each([
  [{ status: 409, error: { code: "PT409" } }, "roster changed"],
  [{ status: 0, error: { code: "" } }, "could not be confirmed"],
] as const)("distinguishes a stale mark save from an unknown outcome %#", async (response, message) => {
  const abortSignal = vi.fn().mockResolvedValue(response);
  mock.rpc.mockReturnValue({ abortSignal });
  const result = await updateMarkDraft({ id, mode: "teacher", version: 1,
    operation: { kind: "save", changes: [{ id, score: "0", state: "scored", reason: "" }] } });
  expect(result.error).toContain(message);
  expect(abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  expect(mock.rpc).toHaveBeenCalledTimes(1);
  expect(mock.revalidate).not.toHaveBeenCalled();
});
