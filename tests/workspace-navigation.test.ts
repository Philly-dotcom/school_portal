import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/app/login/actions", () => ({ signOut: vi.fn() }));
import { PortalShell } from "../src/components/portal-shell";
import { portalHref, portalViews } from "../src/lib/portal-validation";
import { WorkspaceSelector } from "../src/components/workspace-selector";
import DashboardLoading from "../src/app/dashboard/loading";

const child = "00000000-0000-4000-8000-000000000001";
it("groups Admin setup links separately and places the supplied account control in the header", () => {
  const props = { preview: false, admin: true, children: "Dashboard", profileMenu: "Verified account control" };
  const html = renderToStaticMarkup(createElement(PortalShell, props));
  expect(html).toContain('aria-label="School management"');
  const management = html.split('aria-label="School management"')[1].split('</nav>')[0];
  for (const view of ["academic", "registers", "teaching", "people", "settings"]) expect(management).toContain(`view=${view}`);
  expect(management).not.toContain("view=timetable");
  expect(html.split('<header')[1].split('</header>')[0]).toContain("Verified account control");
  expect(shell("teacher")).not.toContain('aria-label="School management"');
});
function shell(mode: "teacher" | "guardian", view = "documents") {
  const props = {
    preview: false, modes: ["teacher", "guardian"] as ("teacher" | "guardian")[], mode, view,
    child: mode === "guardian" ? child : undefined,
    learnerName: mode === "guardian" ? "Fictional Child" : undefined,
    children: "Workspace content",
  };
  return renderToStaticMarkup(createElement(PortalShell, props));
}
it("retains the selected guardian learner on every daily sidebar link and home", () => {
  const html = shell("guardian");
  for (const view of portalViews) {
    expect(html).toContain(`href="${portalHref(view, "guardian", child).replaceAll("&", "&amp;")}"`);
  }
  expect(html).toContain('aria-label="Active workspace"');
  expect(html).toContain("Learner: Fictional Child");
});
it("offers only authorised workspace destinations and drops learner/edit context", () => {
  const html = renderToStaticMarkup(createElement(WorkspaceSelector, {
    roles: ["teacher", "guardian"], activeRole: "guardian", compact: true,
  }));
  expect(html).toContain("Switch Workspace");
  expect(html).toContain('href="/dashboard?view=overview&amp;mode=teacher"');
  expect(html).toContain('href="/dashboard?view=overview&amp;mode=guardian"');
  expect(html).not.toContain("school_admin");
  expect(html).not.toContain("child=");
  expect(html).not.toContain("Edit=");
  expect(html).toContain('aria-current="page"');
});
it("keeps role switching out of the sidebar", () => {
  const html = shell("teacher");
  expect(html).not.toContain('aria-label="Role workspaces"');
  expect(html).not.toContain('mode=guardian');
  expect(html).not.toContain("child=");
});
it("does not put protected identities in the route loading screen", () => {
  const html = renderToStaticMarkup(createElement(DashboardLoading));
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toContain(child);
});
