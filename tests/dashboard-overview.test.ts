import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mock = vi.hoisted(() => ({ homework: vi.fn(), notices: vi.fn(), documents: vi.fn(), lessons: vi.fn(), from: vi.fn(), filters: [] as unknown[][] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/homework-data", () => ({ loadHomework: mock.homework }));
vi.mock("@/lib/announcement-data", () => ({ loadAnnouncement: mock.notices }));
vi.mock("@/lib/document-data", () => ({ loadDocuments: mock.documents }));
vi.mock("@/lib/my-timetable-data", () => ({ loadMyTimetable: mock.lessons }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mock.from }) }));
import type { ReadySchoolContext } from "../src/lib/auth-context";
import { dashboardAccess, loadDashboardCounts, loadDashboardFeed, loadDashboardLessons, type DashboardActor } from "../src/lib/dashboard-data";
import { DashboardFeed, DashboardLessons, DailyOverview, DashboardCounts } from "../src/components/daily-overview";

const context: ReadySchoolContext = { status: "ready", school: { id: "school", name: "Fictional School", timezone: "UTC" }, userId: "user", roles: ["teacher", "guardian"] };
const person = { id: "teacher", fullName: "Fictional Teacher", reference: "T1" };
const child = { id: "child", fullName: "Granted Child", reference: "S1", relationship: "Parent" };
const guardian: DashboardActor = { status: "ready", mode: "guardian", schoolId: "school", person, children: [child], selectedChild: child };
const teacher: DashboardActor = { status: "ready", mode: "teacher", schoolId: "school", person };
const empty = { rows: [], hasNext: false, page: 1 };
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  vi.clearAllMocks(); mock.filters.length = 0;
  mock.homework.mockResolvedValue(empty); mock.notices.mockResolvedValue(empty); mock.documents.mockResolvedValue(empty); mock.lessons.mockResolvedValue(empty);
  mock.from.mockImplementation((table: string) => ({ select: (_: string, options: unknown) => ({ eq: async (key: string, value: string) => {
    mock.filters.push([table, options, key, value]); return { count: 7, error: null };
  } }) }));
});
it("does not read any daily data before explicit Guardian selection", async () => {
  const actor = { ...guardian, selectedChild: null };
  expect(DailyOverview({ context, actor })).toBeNull();
  expect(await loadDashboardFeed("homework", context, actor)).toBeNull();
  expect(await loadDashboardLessons(context, actor)).toBeNull();
  expect(mock.homework).not.toHaveBeenCalled(); expect(mock.lessons).not.toHaveBeenCalled();
});
it("rejects a classroom-only learner and a different school or unassigned role", async () => {
  expect(dashboardAccess(context, { ...guardian, children: [] })).toBe(false);
  expect(dashboardAccess(context, { ...teacher, schoolId: "other" })).toBe(false);
  expect(dashboardAccess({ ...context, roles: ["student"] }, teacher)).toBe(false);
  expect(await loadDashboardCounts(context)).toBeNull(); expect(mock.from).not.toHaveBeenCalled();
});
it.each(["homework", "announcements", "documents"] as const)("passes the explicitly selected learner to the existing %s reader", async (kind) => {
  await loadDashboardFeed(kind, context, guardian);
  const reader = kind === "homework" ? mock.homework : kind === "announcements" ? mock.notices : mock.documents;
  expect(reader).toHaveBeenCalledWith("school", "guardian", { child: "child" });
});
it("keeps teacher and student readers in their own selected role", async () => {
  await loadDashboardFeed("documents", context, teacher);
  expect(mock.documents).toHaveBeenLastCalledWith("school", "teacher", { child: undefined });
  await loadDashboardFeed("homework", { ...context, roles: ["student"] }, { ...teacher, mode: "student" });
  expect(mock.homework).toHaveBeenLastCalledWith("school", "student", { child: undefined });
});
it("counts only school-scoped Admin records and labels classes across years", async () => {
  const admin = { ...context, roles: ["school_admin"] } as ReadySchoolContext;
  const html = renderToStaticMarkup(await DashboardCounts({ context: admin }));
  expect(mock.filters).toHaveLength(3);
  for (const filter of mock.filters) expect(filter.slice(1)).toEqual([{ count: "exact", head: true }, "school_id", "school"]);
  expect(html).toContain("Classes across academic years");
  await loadDashboardFeed("announcements", admin);
  expect(mock.notices).toHaveBeenCalledWith("school", "school_admin", { child: undefined });
});
it("shows unavailable counts rather than treating a failed count as zero", async () => {
  mock.from.mockImplementation(() => ({ select: () => ({ eq: async () => ({ count: null, error: { message: "Denied" } }) }) }));
  const html = renderToStaticMarkup(await DashboardCounts({ context: { ...context, roles: ["school_admin"] } }));
  expect(html).toContain("Unavailable"); expect(html).not.toContain(">0<");
});
it("distinguishes an unavailable feed from an empty or partial preview", async () => {
  mock.documents.mockResolvedValue(null);
  expect(renderToStaticMarkup(await DashboardFeed({ kind: "documents", context, actor: guardian }))).toContain('role="alert"');
  mock.documents.mockResolvedValue({ ...empty, hasNext: true });
  const html = renderToStaticMarkup(await DashboardFeed({ kind: "documents", context, actor: guardian }));
  expect(html).toContain("Open the full page to check more records");
  expect(html).not.toContain("No published items are available");
});
it("shows published PDF links with the guardian mode and child, excluding staff drafts", async () => {
  mock.documents.mockResolvedValue({ ...empty, rows: [
    { id: "pdf", title: "<script>example</script>", status: "published", audience_label: "School", file_size: 1024 },
    { id: "draft", title: "Private draft", status: "draft", audience_label: "School", file_size: 1024 },
  ] });
  const html = renderToStaticMarkup(await DashboardFeed({ kind: "documents", context, actor: guardian }));
  expect(html).toContain("mode=guardian&amp;child=child");
  expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("Private draft");
});
it("does not turn a paginated timetable into an authoritative empty day", async () => {
  mock.lessons.mockResolvedValue({ ...empty, hasNext: true });
  const html = renderToStaticMarkup(await DashboardLessons({ context, actor: teacher }));
  expect(html).toContain("remaining pages"); expect(html).not.toContain("No lessons are scheduled for today");
});
it("preserves learner context in all overview quick links", () => {
  const html = renderToStaticMarkup(DailyOverview({ context, actor: guardian })!);
  expect(html).toContain("view=attendance&amp;mode=guardian&amp;child=child");
  expect(html).toContain("view=my-timetable&amp;mode=guardian&amp;child=child");
  expect(html).not.toContain("Manage school settings"); expect(html).not.toContain("Add another child");
});
it("uses the school-local date for today's lessons without claiming completion", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T23:30:00Z"));
  mock.lessons.mockResolvedValue({ ...empty, rows: [
    { id: "today", lesson_date: "2026-10-25", subject_name: "Today subject", grade_name: "Grade 12", class_name: "12A", teacher_name: "Teacher", start_minute: 480, end_minute: 530 },
    { id: "yesterday", lesson_date: "2026-10-24", subject_name: "Yesterday subject" },
    { id: "future", lesson_date: "2027-01-20", subject_name: "Future planning subject" },
  ] });
  const html = renderToStaticMarkup(await DashboardLessons({ context: { ...context, school: { ...context.school, timezone: "Africa/Johannesburg" } }, actor: teacher }));
  expect(html).toContain("Today subject"); expect(html).not.toContain("Yesterday subject"); expect(html).not.toContain("Future planning subject");
  expect(html).toContain("Scheduled"); expect(html).not.toContain("Completed");
});
it("orders upcoming published homework within the preview and preserves the pagination warning", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T10:00:00Z"));
  mock.homework.mockResolvedValue({ ...empty, hasNext: true, rows: [
    { id: "later", title: "Later homework", status: "published", due_date: "2026-10-30", assignment_label: "Class" },
    { id: "soon", title: "Soon homework", status: "published", due_date: "2026-10-25", assignment_label: "Class" },
    { id: "draft", title: "Draft homework", status: "draft", due_date: "2026-10-25", assignment_label: "Class" },
    { id: "past", title: "Old homework", status: "published", due_date: "2026-10-20", assignment_label: "Class" },
  ] });
  const html = renderToStaticMarkup(await DashboardFeed({ kind: "homework", context, actor: teacher }));
  expect(html.indexOf("Soon homework")).toBeLessThan(html.indexOf("Later homework"));
  expect(html).not.toContain("Draft homework"); expect(html).not.toContain("Old homework");
  expect(html).toContain("Preview from the first page"); expect(html).toContain("no submission or completion tracking");
});
