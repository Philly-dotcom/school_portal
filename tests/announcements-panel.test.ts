import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  context: vi.fn(),
  actor: vi.fn(),
  load: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/portal-data", () => ({ loadPortalActor: mock.actor }));
vi.mock("@/lib/announcement-data", () => ({ loadAnnouncement: mock.load }));
vi.mock("@/app/dashboard/announcements/actions", () => ({ saveAnnouncement: vi.fn() }));
vi.mock("@/app/dashboard/announcements/search-actions", () => ({
  searchAnnouncementClasses: vi.fn(),
}));
vi.mock("@/components/record-search-select", () => ({
  RecordSearchSelect: () => "Assignment search",
}));
import { AnnouncementPanel } from "../src/components/announcement-panel";
import { AnnouncementForm } from "../src/components/announcement-form";
import type { AnnouncementItem } from "../src/lib/announcement-validation";
const id = "00000000-0000-4000-8000-000000000001";
const item: AnnouncementItem = {
  id,
  class_id: id,
  audience_label: "Mathematics · 8A",
  title: "<script>bad()</script>",
  body: "<img src=x onerror=bad()>\nSecond line",
  status: "published",
  published_at: "2026-10-08",
  record_version: 2,
  can_edit: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.context.mockResolvedValue({
    status: "ready",
    school: { id: "trusted" },
    roles: ["student"],
  });
  mock.actor.mockResolvedValue({
    status: "ready",
    mode: "student",
    schoolId: "trusted",
    person: { id, fullName: "Fictional", reference: "S1" },
  });
  mock.load.mockResolvedValue({ rows: [item], page: 1, hasNext: false });
});
it("renders learner instructions as escaped text with no edit or submission controls", async () => {
  const html = renderToStaticMarkup(await AnnouncementPanel({ params: {} }));
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<img src=x");
  expect(html).toContain("whitespace-pre-wrap");
  expect(html).not.toContain("New announcement");
  expect(html).not.toContain("Edit / change visibility");
  expect(html).not.toContain('type="file"');
  expect(html).not.toContain("Save announcement");
});
it("rejects learner edit requests before fetching an item", async () => {
  const html = renderToStaticMarkup(
    await AnnouncementPanel({ params: { announcementEdit: id } }),
  );
  expect(html).toContain("unavailable");
  expect(mock.load).not.toHaveBeenCalled();
});
it("requires an authorized guardian selection before fetching announcement", async () => {
  mock.context.mockResolvedValue({
    status: "ready",
    school: { id: "trusted" },
    roles: ["guardian"],
  });
  mock.actor.mockResolvedValue({
    status: "ready",
    mode: "guardian",
    schoolId: "trusted",
    person: { id, fullName: "Fictional", reference: "G1" },
    children: [],
    selectedChild: null,
  });
  expect(renderToStaticMarkup(await AnnouncementPanel({ params: {} }))).toContain(
    "Choose a learner",
  );
  expect(mock.load).not.toHaveBeenCalled();
});
it("does not turn a failed read into a no-announcement message", async () => {
  mock.load.mockResolvedValue(null);
  expect(renderToStaticMarkup(await AnnouncementPanel({ params: {} }))).toContain(
    "could not be loaded",
  );
});
it("keeps assignment and version fixed in an existing editor and offers withdrawal, not draft", () => {
  const html = renderToStaticMarkup(
    createElement(AnnouncementForm, {
      mode: "teacher",
      item: { ...item, can_edit: true },
    }),
  );
  expect(html).toContain(`name="classId" value="${id}"`);
  expect(html).toContain('name="version" value="2"');
  expect(html).toContain('value="withdrawn"');
  expect(html).not.toContain('value="draft"');
  expect(html).not.toContain("Assignment search");
});
