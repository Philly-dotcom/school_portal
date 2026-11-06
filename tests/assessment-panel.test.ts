import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { ReadySchoolContext } from "../src/lib/auth-context";
import { AssessmentPanel } from "../src/components/assessment-panel";
import { loadAssessments } from "../src/lib/assessment-data";
import { AssessmentReviewPanel } from "../src/components/assessment-review-panel";
import { GradingPolicyPanel } from "../src/components/grading-policy-panel";
vi.mock("../src/components/marks-panel", () => ({ MarksPanel: vi.fn() }));
vi.mock("../src/components/assessment-review-panel", () => ({ AssessmentReviewPanel: vi.fn() }));
vi.mock("../src/components/grading-policy-panel", () => ({ GradingPolicyPanel: vi.fn() }));
vi.mock("../src/components/reviewer-grant-list", () => ({ ReviewerGrantList: vi.fn() }));
vi.mock("../src/components/reviewer-grant-form", () => ({ ReviewerGrantForm: vi.fn() }));
vi.mock("../src/components/correction-grant-panel", () => ({ CorrectionGrantPanel: vi.fn() }));
vi.mock("../src/components/roster-amendment-panel", () => ({ RosterAmendmentPanel: vi.fn() }));

vi.mock("../src/lib/assessment-data", () => ({ loadAssessments: vi.fn() }));
vi.mock("@/app/dashboard/assessments/actions", () => ({
  authoriseAssessmentScale: vi.fn(), saveAssessment: vi.fn(), searchAssessmentChoices: vi.fn(),
}));
vi.mock("@/app/dashboard/search/actions", () => ({ searchSchoolRecords: vi.fn() }));

const { reviewRpc } = vi.hoisted(() => ({ reviewRpc: vi.fn() }));
vi.mock("../src/components/assessment-review-form", () => ({ AssessmentReviewForm: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: reviewRpc }) }));

it.each([1, 2])("shows the retained learner evidence for review submission %i", async version => {
  const { AssessmentReviewPanel: Review } = await vi.importActual<typeof import("../src/components/assessment-review-panel")>("../src/components/assessment-review-panel");
  const id = "00000000-0000-4000-8000-000000000001";
  reviewRpc.mockResolvedValue({ data: {
    id, title: "Map reading", instructions: "", scope: "Geography", package: version, status: "approved",
    definition: 1, draft: 4, date: "2026-10-30", minimum: "0", maximum: "40", precision: 0,
    reason: null, definitionChanged: false, changes: { added: 1, removed: 0, changed: 0 },
    entries: [{ id, name: "Test learner", reference: "ST-TEST", state: "scored", score: "0", reason: "",
      mark_version: 3, changed: true, placement: [id, 2, "2026-01-01", "2026-11-30"] }],
  }, error: null });
  const html = renderToStaticMarkup(await Review({ school: id, mode: "teacher", id, page: 1 }));
  expect(html).toContain("Mark version 3 · Enrolment version 2");
  expect(html).toContain("2026-01-01 to 2026-11-30");
  expect(html.includes("First submission")).toBe(version === 1);
  expect(html.includes("Compared with submission 1")).toBe(version === 2);
  expect(html.includes("Added or changed")).toBe(version === 2);
});

it.each([
  ["school_admin", false, true],
  ["teacher", false, false],
  ["school_admin", true, false],
] as const)("shows the list action for %s with scale_authorised=%s: %s", async (mode, authorised, show) => {
  const id = "00000000-0000-4000-8000-000000000001";
  vi.mocked(loadAssessments).mockResolvedValue({ rows: [{
    id, assignment_id: id, assignment_label: "Geography", term_id: id, term_label: "Term 4",
    title: "Map reading", instructions: "Read the map", effective_date: "2026-11-03",
    minimum: "0", maximum: "40", decimal_places: 0, scale_authorised: authorised, record_version: 3,
  }], hasNext: false });
  const context: ReadySchoolContext = { status: "ready", roles: [mode], school: {id, name: "Test", timezone: "UTC"}, userId: id };
  const html = renderToStaticMarkup(await AssessmentPanel({ context, params: {}, mode }));
  expect(html.includes('aria-label="Authorise scale for Map reading, version 3"')).toBe(show);
  expect(html.includes("Manage assessment reviewer grants")).toBe(mode === "school_admin");
  expect(html.includes("Reporting policy drafts")).toBe(mode === "school_admin");
});

it.each([
  ["teacher", {policy:"list"}],
  ["school_admin", {policy:"list",child:"00000000-0000-4000-8000-000000000002"}],
  ["school_admin", {policy:"list",reviewPage:"1"}],
  ["school_admin", {policy:["new","list"] as string[]}],
  ["school_admin", {policy:"new",policyPage:"2"}],
] as const)("rejects policy routes with an incorrect workspace or mixed context %#",async (mode,params)=>{
  vi.mocked(GradingPolicyPanel).mockClear();
  const id="00000000-0000-4000-8000-000000000001";
  const context:ReadySchoolContext={status:"ready",roles:["teacher","school_admin","guardian"],school:{id,name:"Test",timezone:"UTC"},userId:id};
  const html=renderToStaticMarkup(await AssessmentPanel({context,params:{...params},mode}));
  expect(html).toContain('role="alert"');
  expect(GradingPolicyPanel).not.toHaveBeenCalled();
});
it.each([
  {child:"00000000-0000-4000-8000-000000000002",reviewPage:"1"},
  {reviewPage:"1",marks:"00000000-0000-4000-8000-000000000002"},
  {reviewPage:["1","2"]},
])("rejects mixed guardian/edit contexts and repeated review page values %#",async params=>{
  vi.mocked(AssessmentReviewPanel).mockClear();
  const id="00000000-0000-4000-8000-000000000001";
  const context:ReadySchoolContext={status:"ready",roles:["teacher","guardian"],school:{id,name:"Test",timezone:"UTC"},userId:id};
  const html=renderToStaticMarkup(await AssessmentPanel({context,params,mode:"teacher"}));
  expect(html).toContain('role="alert"');
  expect(AssessmentReviewPanel).not.toHaveBeenCalled();
});
