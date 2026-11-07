import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/components/daily-overview", () => ({
  DashboardCounts: () => createElement("div", null, "Counts placeholder"),
  DashboardFeed: ({ kind }: { kind: string }) =>
    createElement("div", null, "Feed placeholder: ", kind),
}));

import { CampusAdminOverview } from "../src/components/campus-admin-overview";
import type { ReadySchoolContext } from "../src/lib/auth-context";

const context: ReadySchoolContext = {
  status: "ready",
  userId: "user",
  school: {
    id: "school",
    name: "Fictional School",
    timezone: "Africa/Johannesburg",
  },
  roles: ["school_admin"],
};

it("renders the Admin Campus overview with the supplied profile read and existing feeds", async () => {
  const html = renderToStaticMarkup(
    await CampusAdminOverview({
      context,
      profileRead: Promise.resolve({
        status: "ready" as const,
        fullName: "Fictional Admin",
        reference: "MEM-01",
        email: "admin@example.invalid",
        schoolName: "Fictional School",
      }),
    }),
  );

  expect(html).toContain("Hello, Fictional Admin");
  expect(html).toContain("Fictional School · Your school at a glance");
  expect(html).toContain("Review attendance");
  expect(html).toContain("Quick actions");
  expect(html).toContain("Announcements");
  expect(html).toContain("Homework due soon");
  expect(html).toContain("School documents");
  expect(html).toContain(
    "href=\"/dashboard?view=announcements&amp;mode=school_admin&amp;announcementEdit=new\"",
  );
  expect(html).toContain("Feed placeholder: announcements");
});

it("stays out of non-admin contexts", async () => {
  const html = await CampusAdminOverview({
    context: { ...context, roles: ["teacher"] },
  });
  expect(html).toBeNull();
});
