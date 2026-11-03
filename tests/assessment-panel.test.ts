import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { ReadySchoolContext } from "../src/lib/auth-context";
import { AssessmentPanel } from "../src/components/assessment-panel";
import { loadAssessments } from "../src/lib/assessment-data";
vi.mock("../src/components/marks-panel", () => ({ MarksPanel: vi.fn() }));
vi.mock("../src/components/roster-amendment-panel", () => ({ RosterAmendmentPanel: vi.fn() }));

vi.mock("../src/lib/assessment-data", () => ({ loadAssessments: vi.fn() }));
vi.mock("@/app/dashboard/assessments/actions", () => ({
  authoriseAssessmentScale: vi.fn(), saveAssessment: vi.fn(), searchAssessmentChoices: vi.fn(),
}));
vi.mock("@/app/dashboard/search/actions", () => ({ searchSchoolRecords: vi.fn() }));

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
});
