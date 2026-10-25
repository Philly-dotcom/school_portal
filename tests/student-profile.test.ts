import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(), context: vi.fn(), from: vi.fn(), eq: vi.fn(), range: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal-data", () => ({ loadPortalActor: mocks.actor }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mocks.context }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from }),
}));
import { loadStudentProfile } from "../src/lib/student-profile-data";
import { StudentProfile } from "../src/components/student-profile";

const id = "00000000-0000-4000-8000-000000000001";
const enrollment = {
  id, starts_on: "2026-01-18", ends_on: "2026-11-26", closure: null,
  academic_years: { name: "2026" },
  classes: { name: "Acceptance 12A", grades: { name: "Grade 12" } },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Already 20 October in the school's timezone, still the 19th in UTC.
  vi.setSystemTime(new Date("2026-10-19T22:30:00Z"));
  mocks.actor.mockResolvedValue({
    status: "ready", mode: "student", schoolId: "trusted-school",
    person: { id, fullName: "Fictional Student", reference: "TEST-003" },
  });
  mocks.context.mockResolvedValue({
    status: "ready", roles: ["student"],
    school: { id: "trusted-school", name: "Fictional School", timezone: "Africa/Johannesburg" },
  });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: mocks.eq.mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: mocks.range,
  };
  mocks.from.mockReturnValue(query);
  mocks.range.mockResolvedValue({ data: [enrollment], error: null });
});
afterEach(() => vi.useRealTimers());

it("puts the current placement in dashboard tiles while retaining full profile history", async () => {
  const html = renderToStaticMarkup(await StudentProfile({ dashboard: true }));
  expect(html).toContain('aria-label="Current enrolment summary"');
  expect(html).toContain("Current grade"); expect(html).toContain("Acceptance 12A");
  expect(html).toContain("2026"); expect(html).toContain("TEST-003");
  expect(html).not.toContain('<details class="student-profile-history" open');
  expect(mocks.range).toHaveBeenCalledTimes(1);
});
it("does not promote a future placement into the current dashboard tiles", async () => {
  mocks.range.mockResolvedValue({ data: [{ ...enrollment, starts_on: "2027-01-18", ends_on: "2027-11-26", academic_years: { name: "2027" } }], error: null });
  const html = renderToStaticMarkup(await StudentProfile({ dashboard: true }));
  const summary = html.split('<details')[0];
  expect(summary).toContain("Not currently enrolled"); expect(summary).not.toContain("2027");
  expect(html).toContain("Upcoming"); expect(html).toContain("2027");
});

it("reads only the server-resolved student's enrolments in their school", async () => {
  const result = await loadStudentProfile();
  expect(mocks.actor).toHaveBeenCalledWith("student");
  expect(mocks.eq.mock.calls).toEqual([["school_id", "trusted-school"], ["student_id", id]]);
  expect(result).toMatchObject({ status: "ready", today: "2026-10-20", enrollments: [enrollment] });
});

it("does not query enrolments for an unlinked account or mismatched school", async () => {
  mocks.actor.mockResolvedValueOnce({ status: "empty" });
  expect(await loadStudentProfile()).toEqual({ status: "empty" });
  mocks.context.mockResolvedValueOnce({
    status: "ready", roles: ["student"], school: { id: "other-school" },
  });
  expect(await loadStudentProfile()).toEqual({ status: "unavailable" });
  expect(mocks.from).not.toHaveBeenCalled();
});

it("keeps failed or missing relationships separate from no enrolments", async () => {
  for (const reply of [
    { data: null, error: { message: "Denied" } },
    { data: [{ ...enrollment, classes: null }], error: null },
  ]) {
    mocks.range.mockResolvedValueOnce(reply);
    expect(await loadStudentProfile()).toEqual({ status: "unavailable" });
  }
  mocks.range.mockResolvedValueOnce({ data: [], error: null });
  const html = renderToStaticMarkup(await StudentProfile());
  expect(html).toContain("no enrolment has been recorded");
});

it("shows the profile and distinguishes current, upcoming and past placements at school-local boundaries", async () => {
  mocks.range.mockResolvedValue({
    data: [
      { ...enrollment, starts_on: "2026-10-20", ends_on: "2026-10-20" },
      { ...enrollment, id: "00000000-0000-4000-8000-000000000002", starts_on: "2027-01-18", ends_on: "2027-11-26", academic_years: { name: "2027" } },
      { ...enrollment, id: "00000000-0000-4000-8000-000000000003", ends_on: "2026-10-19", closure: "transfer" },
    ], error: null,
  });
  const html = renderToStaticMarkup(createElement("main", null, await StudentProfile()));
  for (const text of ["My profile", "Fictional School", "TEST-003", "2027", "Grade 12", "Acceptance 12A", "Current", "Upcoming", "Past", "Transfer recorded"]) {
    expect(html).toContain(text);
  }
});

it("continues after a full batch rather than dropping older enrolments", async () => {
  mocks.range.mockResolvedValueOnce({ data: Array(100).fill(enrollment), error: null });
  mocks.range.mockResolvedValueOnce({ data: [enrollment], error: null });
  const result = await loadStudentProfile();
  expect(result.status === "ready" && result.enrollments.length).toBe(101);
  expect(mocks.range.mock.calls).toEqual([[0, 99], [100, 199]]);
});
