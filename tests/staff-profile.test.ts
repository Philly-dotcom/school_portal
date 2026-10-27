import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(), context: vi.fn(), from: vi.fn(), user: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal-data", () => ({ loadPortalActor: mocks.actor }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mocks.context }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from, auth: { getUser: mocks.user } }),
}));
import { loadAdminProfile, loadTeacherProfile } from "../src/lib/staff-profile-data";
import { AdminProfile, TeacherProfile } from "../src/components/staff-profile";
import { RoleOverview } from "../src/components/role-overview";

const id = "00000000-0000-4000-8000-000000000001";
const assignment = {
  starts_on: "2026-10-20", ends_on: "2026-11-26",
  subjects: { id, name: "Geography" },
  academic_years: { id, name: "2026" },
};
const replies: Record<string, { data: unknown; error: unknown }> = {};
const filters: unknown[][] = [];
beforeEach(() => {
  vi.clearAllMocks();
  filters.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T22:30:00Z"));
  mocks.actor.mockResolvedValue({
    status: "ready", mode: "teacher", schoolId: "school",
    person: { id, fullName: "Fictional Teacher", reference: "TE-003" },
  });
  mocks.context.mockResolvedValue({
    status: "ready", roles: ["teacher", "school_admin"], userId: "user",
    school: { id: "school", name: "Fictional School", timezone: "Africa/Johannesburg" },
  });
  mocks.user.mockResolvedValue({ data: { user: { id: "user", email: "admin@example.invalid" } }, error: null });
  replies.profiles = { data: { display_name: "Fictional Admin" }, error: null };
  replies.school_memberships = { data: { id }, error: null };
  replies.teaching_assignments = { data: [assignment], error: null };
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      eq: (...args: unknown[]) => { filters.push([table, ...args]); return query; },
      range: () => Promise.resolve(replies[table]),
      maybeSingle: () => Promise.resolve(replies[table]),
    };
    return query;
  });
});
afterEach(() => vi.useRealTimers());

it("shares one verified profile read between header identity details and greeting", async () => {
  const profileRead = loadAdminProfile();
  const header = renderToStaticMarkup(await AdminProfile({ detailsOnly: true, profileRead }));
  const heading = renderToStaticMarkup(await AdminProfile({ dashboard: true, headingOnly: true, profileRead }));
  expect(header).toContain("Fictional Admin"); expect(header).toContain("admin@example.invalid");
  expect(heading).toContain("Welcome back, Fictional Admin");
  expect(heading).not.toContain("admin-profile-disclosure");
  expect(mocks.user).toHaveBeenCalledTimes(1);
});

it("greets the verified admin without removing profile details or fetching them twice", async () => {
  const html = renderToStaticMarkup(await AdminProfile({ dashboard: true }));
  expect(html).toContain("Welcome back, Fictional Admin");
  expect(html).toContain("admin@example.invalid"); expect(html).toContain("school membership ID");
  expect(mocks.user).toHaveBeenCalledTimes(1);
  expect(html).not.toContain('<details class="admin-profile-disclosure" open');
});

it("scopes teacher subjects to their own linked record and school, deduplicating class assignments", async () => {
  replies.teaching_assignments.data = [assignment, assignment, {
    ...assignment, starts_on: "2027-01-18", ends_on: "2027-11-26",
    academic_years: { id, name: "2027" },
  }];
  const result = await loadTeacherProfile();
  expect(mocks.actor).toHaveBeenCalledWith("teacher");
  expect(filters).toEqual([
    ["teaching_assignments", "school_id", "school"],
    ["teaching_assignments", "teacher_id", id],
  ]);
  expect(result).toMatchObject({
    status: "ready", subjects: [
      { name: "Geography", academicYear: "2026", period: "Current" },
      { name: "Geography", academicYear: "2027", period: "Upcoming" },
    ],
  });
});

it("denies a teacher profile without the role or linked account", async () => {
  mocks.actor.mockResolvedValueOnce({ status: "empty" });
  expect(await loadTeacherProfile()).toEqual({ status: "empty" });
  mocks.context.mockResolvedValueOnce({ status: "ready", roles: ["guardian"], school: { id: "school" } });
  expect(await loadTeacherProfile()).toEqual({ status: "unavailable" });
  expect(mocks.from).not.toHaveBeenCalled();
});

it("distinguishes no linked subjects from failed or incomplete reads", async () => {
  replies.teaching_assignments.data = [];
  expect(renderToStaticMarkup(await TeacherProfile())).toContain("No subjects are linked");
  replies.teaching_assignments.data = [{ ...assignment, subjects: null }];
  expect(await loadTeacherProfile()).toEqual({ status: "unavailable" });
  replies.teaching_assignments = { data: null, error: { message: "Denied" } };
  expect(await loadTeacherProfile()).toEqual({ status: "unavailable" });
});

it("reads only the admin's own profile, active membership and authenticated email", async () => {
  const html = renderToStaticMarkup(await AdminProfile());
  for (const value of ["Fictional Admin", "admin@example.invalid", id, "Fictional School", "school membership ID"]) {
    expect(html).toContain(value);
  }
  expect(filters).toEqual([
    ["profiles", "user_id", "user"],
    ["school_memberships", "school_id", "school"],
    ["school_memberships", "user_id", "user"],
    ["school_memberships", "status", "active"],
  ]);
});

it("does not read admin data for other roles and rejects an identity mismatch", async () => {
  mocks.context.mockResolvedValueOnce({ status: "ready", roles: ["teacher"] });
  expect(await loadAdminProfile()).toEqual({ status: "forbidden" });
  expect(mocks.from).not.toHaveBeenCalled();
  mocks.user.mockResolvedValueOnce({ data: { user: { id: "other" } }, error: null });
  expect(await loadAdminProfile()).toEqual({ status: "unavailable" });
});

it("shows only the guardian's granted learners without selecting a child automatically", () => {
  const html = renderToStaticMarkup(createElement(RoleOverview, {
    schoolName: "Fictional School", availableModes: ["guardian"],
    actor: {
      status: "ready", mode: "guardian", schoolId: "school",
      person: { id, fullName: "Fictional Guardian", reference: "PRIVATE-GU-REF" },
      children: [{ id, fullName: "Granted Student", reference: "ST-003", relationship: "Parent" }],
      selectedChild: null,
    },
  }));
  for (const value of ["Welcome back, Fictional", "Fictional School", "My children", "Granted Student", "Select a learner to continue"]) {
    expect(html).toContain(value);
  }
  expect(html).not.toContain("PRIVATE-GU-REF");
  expect(html).not.toContain('aria-label="Selected learner"');
  expect(html).not.toContain("view=attendance");
});

it("explains missing guardian grants without offering an impossible learner selection", () => {
  const html = renderToStaticMarkup(createElement(RoleOverview, {
    schoolName: "Fictional School", availableModes: ["guardian"],
    actor: {
      status: "ready", mode: "guardian", schoolId: "school",
      person: { id, fullName: "Fictional Guardian", reference: "PRIVATE-GU-REF" },
      children: [], selectedChild: null,
    },
  }));
  expect(html).toContain("No learner access yet");
  expect(html).toContain("Contact your School Admin");
  expect(html).not.toContain("<select");
  expect(html).not.toContain("Select a learner to continue");
  expect(html).not.toContain("view=attendance");
  expect(html).not.toContain("PRIVATE-GU-REF");
});

it("keeps the selected learner and guardian workspace in the picker", () => {
  const learner = { id, fullName: "Granted Student", reference: "ST-003", relationship: "Parent" };
  const html = renderToStaticMarkup(createElement(RoleOverview, {
    schoolName: "Fictional School", availableModes: ["guardian"],
    actor: {
      status: "ready", mode: "guardian", schoolId: "school",
      person: { id, fullName: "Fictional Guardian", reference: "PRIVATE-GU-REF" },
      children: [learner], selectedChild: learner,
    },
  }));
  expect(html).toContain('aria-label="Selected learner"');
  expect(html).toContain("CURRENTLY VIEWING");
  expect(html).toContain('name="mode" value="guardian"');
  expect(html).toContain('name="view" value="overview"');
  expect(html).toContain(`value="${id}" selected=""`);
  expect(html).not.toContain("Select a learner to continue");
  expect(html).not.toContain("PRIVATE-GU-REF");
});
