import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReadySchoolContext } from "../src/lib/auth-context";

const mock = vi.hoisted(() => ({
  client: vi.fn(),
  teacher: vi.fn(),
  student: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/app/login/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mock.client }));
vi.mock("@/lib/staff-profile-data", () => ({
  loadTeacherProfile: mock.teacher,
  loadAdminProfile: vi.fn(),
}));
vi.mock("@/lib/student-profile-data", () => ({
  loadStudentProfile: mock.student,
}));
import { ProfileMenu } from "../src/components/profile-menu";

const context: ReadySchoolContext = {
  status: "ready",
  userId: "user",
  school: { id: "school", name: "Fictional School", timezone: "UTC" },
  roles: ["teacher", "student"],
};
beforeEach(() => vi.clearAllMocks());

it.each(["teacher", "student"] as const)(
  "renders %s identity without any extra profile reads",
  async (mode) => {
    const html = renderToStaticMarkup(
      await ProfileMenu({
        context,
        activeRole: mode,
        actor: {
          status: "ready",
          mode,
          schoolId: "school",
          person: {
            id: "person",
            fullName: "Fictional Person",
            reference: "REF-1",
          },
        },
      }),
    );
    expect(html).toContain("Fictional Person");
    expect(html).toContain("REF-1");
    expect(html).toContain("Fictional School");
    expect(html).toContain(`href="/dashboard?view=profile&amp;mode=${mode}"`);
    expect(html).toContain(
      mode === "teacher" ? "View linked subjects" : "View enrolment history",
    );
    expect(html).toContain("Switch Workspace");
    expect(mock.client).not.toHaveBeenCalled();
    expect(mock.teacher).not.toHaveBeenCalled();
    expect(mock.student).not.toHaveBeenCalled();
  },
);
