import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mock = vi.hoisted(() => ({ context: vi.fn(), actor: vi.fn(), studentProfile: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/portal-data", () => ({ loadPortalActor: mock.actor }));
vi.mock("@/app/login/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/components/profile-menu", () => ({ ProfileMenu: () => "Account menu" }));
vi.mock("@/lib/staff-profile-data", () => ({ loadAdminProfile: vi.fn().mockResolvedValue({ status: "unavailable" }) }));
vi.mock("@/lib/student-profile-data", () => ({ loadStudentProfile: mock.studentProfile }));
vi.mock("@/components/staff-profile", () => ({
  AdminProfile: () => "Admin profile",
  TeacherProfile: () => "Teacher profile",
}));
vi.mock("@/components/settings-form", () => ({
  SettingsForm: () => "Settings",
}));
vi.mock("@/components/people-panel", () => ({ PeoplePanel: () => "People" }));
vi.mock("@/components/academic-panel", () => ({
  AcademicPanel: () => "Academic",
}));
vi.mock("@/components/registers-panel", () => ({
  RegistersPanel: () => "Registers",
}));
vi.mock("@/components/teaching-panel", () => ({
  TeachingPanel: () => "Teaching",
}));
vi.mock("@/components/timetable-panel", () => ({
  TimetablePanel: () => "Admin timetable",
}));
vi.mock("@/components/my-timetable-panel", () => ({
  MyTimetablePanel: () => "Personal timetable",
}));
vi.mock("@/components/student-profile", () => ({ StudentProfile: () => "Student enrolment history" }));
import Dashboard from "../src/app/dashboard/page";
import { PortalShell } from "../src/components/portal-shell";

function context(roles: string[]) {
  mock.context.mockResolvedValue({
    status: "ready",
    school: { id: "school", name: "Fictional School", timezone: "UTC" },
    roles,
  });
}
async function render(
  params: Record<string, string | string[] | undefined> = {},
) {
  return renderToStaticMarkup(
    await Dashboard({ searchParams: Promise.resolve(params) }),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  context(["teacher"]);
  mock.studentProfile.mockResolvedValue({ status: "unavailable" });
  mock.actor.mockResolvedValue({
    status: "ready",
    mode: "teacher",
    schoolId: "school",
    person: { id: "teacher", fullName: "Fictional Teacher", reference: "T1" },
  });
});
it("opens the assigned non-admin workspace by default", async () => {
  expect(await render()).toContain("Fictional Teacher");
  expect(mock.actor).toHaveBeenCalledWith("teacher", undefined, expect.objectContaining({ status: "ready" }));
});
it.each([
  { mode: "school_admin" },
  { mode: "guardian" },
  { mode: ["teacher", "guardian"] },
  { child: "bad" },
  { child: ["x", "y"] },
])("denies forged or ambiguous role/child requests", async (params) => {
  expect(await render(params)).toMatch(/This workspace is not available|That workspace is not available/);
  expect(mock.actor).not.toHaveBeenCalled();
});
it("requires a workspace choice for multiple roles including Admin", async () => {
  context(["school_admin", "teacher"]);
  expect(await render()).toContain("How would you like to continue?");
  expect(await render({ mode: "school_admin" })).toContain("Manage school settings");
  expect(mock.actor).not.toHaveBeenCalled();
  expect(await render({ mode: "teacher" })).toContain("Fictional Teacher");
});
it("does not turn role workspace routing into admin access", async () => {
  expect(await render({ view: "timetable", mode: "teacher" })).toContain(
    "Administrator workspace required",
  );
  expect(await render({ view: "my-timetable", mode: "teacher" })).toContain(
    "Personal timetable",
  );
});
it("keeps the public preview disconnected from role links", () => {
  const html = renderToStaticMarkup(
    PortalShell({
      children: "Preview",
      preview: true,
      modes: ["teacher"],
      mode: "teacher",
    }),
  );
  expect(html).not.toContain("my-timetable");
  expect(html).not.toContain("teacher workspace");
});

it("does not choose Teacher automatically for a Teacher/Guardian account", async () => {
  context(["teacher", "guardian"]);
  const html = await render();
  expect(html).toContain("Continue as Teacher");
  expect(html).toContain("Continue as Parent / Guardian");
  expect(html).not.toContain("Continue as School Admin");
  expect(mock.actor).not.toHaveBeenCalled();
});

it.each(["academic", "registers", "teaching", "people", "settings", "timetable"])(
  "requires explicit workspace choice for legacy %s links with multiple roles",
  async (view) => {
    context(["school_admin", "teacher"]);
    expect(await render({ view })).toContain("How would you like to continue?");
    expect(mock.actor).not.toHaveBeenCalled();
  },
);
it("keeps explicit Admin management navigation available", async () => {
  context(["school_admin", "teacher"]);
  expect(await render({ view: "academic", mode: "school_admin" })).toContain("Academic");
  expect(mock.actor).not.toHaveBeenCalled();
});
it("does not load Student history for a timetable module request", async () => {
  context(["student"]);
  mock.actor.mockResolvedValue({
    status: "ready", mode: "student", schoolId: "school",
    person: { id: "student", fullName: "Fictional Student", reference: "S1" },
  });
  expect(await render({ view: "my-timetable", mode: "student" })).toContain("Personal timetable");
  expect(mock.studentProfile).not.toHaveBeenCalled();
  expect(await render({ view: "profile", mode: "student" })).toContain("Student enrolment history");
  expect(mock.studentProfile).toHaveBeenCalledTimes(1);
});
it("loads Teacher subjects only in the authorised profile view", async () => {
  expect(await render({ view: "profile", mode: "teacher" })).toContain("Teacher profile");
  expect(await render({ view: "profile", mode: "student" })).toContain("That workspace is not available");
});
it("does not render another person's history when the profile actor is unavailable", async () => {
  mock.actor.mockResolvedValue({ status: "empty", mode: "teacher", message: "No linked record" });
  expect(await render({ view: "profile", mode: "teacher" })).toContain("Academic profile details are not available");
});
