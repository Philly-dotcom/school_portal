import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mock = vi.hoisted(() => ({ context: vi.fn(), actor: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/portal-data", () => ({ loadPortalActor: mock.actor }));
vi.mock("@/app/login/actions", () => ({ signOut: vi.fn() }));
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
  mock.actor.mockResolvedValue({
    status: "ready",
    mode: "teacher",
    schoolId: "school",
    person: { id: "teacher", fullName: "Fictional Teacher", reference: "T1" },
  });
});
it("opens the assigned non-admin workspace by default", async () => {
  expect(await render()).toContain("Fictional Teacher");
  expect(mock.actor).toHaveBeenCalledWith("teacher", undefined);
});
it.each([
  { mode: "school_admin" },
  { mode: "guardian" },
  { mode: ["teacher", "guardian"] },
  { child: "bad" },
  { child: ["x", "y"] },
])("denies forged or ambiguous role/child requests", async (params) => {
  expect(await render(params)).toContain("This workspace is not available");
  expect(mock.actor).not.toHaveBeenCalled();
});
it("keeps admin overview and exposes an explicitly assigned second role", async () => {
  context(["school_admin", "teacher"]);
  expect(await render()).toContain("Manage school settings");
  expect(mock.actor).not.toHaveBeenCalled();
  expect(await render({ mode: "teacher" })).toContain("Fictional Teacher");
});
it("does not turn role workspace routing into admin access", async () => {
  expect(await render({ view: "timetable", mode: "teacher" })).toContain(
    "Administrator access required",
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
