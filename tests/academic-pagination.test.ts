import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { AcademicKind, AcademicRow } from "../src/lib/academic-validation";

const mock = vi.hoisted(() => ({
  rows: {} as Record<string, (AcademicRow & { school_id: string })[]>,
  calls: [] as {
    table: string;
    school: string;
    order: string[];
    range?: number[];
  }[],
  failedTable: "",
}));
vi.mock("server-only", () => ({}));
vi.mock("../src/components/record-editor", () => ({
  RecordEditor: () => null,
}));
vi.mock("../src/components/academic-form", () => ({
  AcademicForm: ({ kind }: { kind: AcademicKind }) =>
    createElement("form", { "data-kind": kind }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const call = {
        table,
        school: "",
        order: [] as string[],
        range: undefined as number[] | undefined,
      };
      mock.calls.push(call);
      const result = (start: number, end: number, ids?: string[]) => ({
        error:
          mock.failedTable === table
            ? { message: "Private database failure" }
            : null,
        data: (mock.rows[table] ?? [])
          .filter(
            (row) =>
              row.school_id === call.school && (!ids || ids.includes(row.id)),
          )
          .sort(
            (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
          )
          .slice(start, end + 1),
      });
      const query = {
        select: () => query,
        eq: (field: string, value: string) => {
          expect(field).toBe("school_id");
          call.school = value;
          return query;
        },
        order: (field: string) => {
          call.order.push(field);
          return query;
        },
        range: async (start: number, end: number) => {
          call.range = [start, end];
          return result(start, end);
        },
        limit: async (size: number) => result(0, size - 1),
        in: async (field: string, ids: string[]) => {
          expect(field).toBe("id");
          return result(0, 500, ids);
        },
      };
      return query;
    },
  }),
}));
import { AcademicPanel } from "../src/components/academic-panel";
import { academicPage, academicPageHref } from "../src/lib/academic-pagination";

const school = "fictional-school-a";
function rows(count: number, prefix: string) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index.toString().padStart(4, "0")}`,
    name: `${prefix} ${index.toString().padStart(4, "0")}`,
    school_id: school,
  }));
}
beforeEach(() => {
  mock.rows = {};
  mock.calls = [];
  mock.failedTable = "";
});

it("keeps records beyond 500 reachable and creation available with stable school-scoped pages", async () => {
  mock.rows.subjects = [
    ...rows(502, "Subject"),
    {
      id: "other",
      name: "Other school secret",
      school_id: "fictional-school-b",
    },
  ];
  const html = renderToStaticMarkup(
    await AcademicPanel({ schoolId: school, pages: { subjectsPage: "11" } }),
  );
  expect(html).toContain("Subject 0501");
  expect(html).not.toContain("Subject 0499");
  expect(html).not.toContain("Other school secret");
  expect(html).toContain('data-kind="subjects"');
  expect(html).toContain("subjectsPage=10#subjects");
  expect(html).not.toContain("subjectsPage=12");
  expect(mock.calls.find((call) => call.table === "subjects")?.range).toEqual([
    500, 550,
  ]);
  for (const call of mock.calls) {
    expect(call.school).toBe(school);
    if (call.range) expect(call.order).toEqual(["name", "id"]);
  }
});

it("uses a lookahead without displaying it and preserves other lists' pages", async () => {
  mock.rows.subjects = rows(51, "Subject");
  const html = renderToStaticMarkup(
    await AcademicPanel({ schoolId: school, pages: { gradesPage: "2" } }),
  );
  expect(html).toContain("Subject 0049");
  expect(html).not.toContain("Subject 0050");
  expect(html).toContain("gradesPage=2&amp;subjectsPage=2#subjects");
});

it("keeps relationship labels and search-enabled forms independent of the visible reference pages", async () => {
  mock.rows.academic_years = rows(60, "Year");
  mock.rows.grades = rows(60, "Grade");
  mock.rows.classes = [
    {
      ...rows(1, "Class")[0],
      academic_year_id: "Year-0000",
      grade_id: "Grade-0000",
    },
  ];
  const html = renderToStaticMarkup(
    await AcademicPanel({
      schoolId: school,
      pages: { academic_yearsPage: "2", gradesPage: "2" },
    }),
  );
  expect(html).toContain("<span>Year 0000</span>");
  expect(html).toContain("<span>Grade 0000</span>");
  expect(html).toContain('data-kind="classes"');
});

it("keeps search-enabled forms available beyond 500 references and still resolves visible labels", async () => {
  mock.rows.grades = rows(502, "Grade");
  mock.rows.classes = [{ ...rows(1, "Class")[0], grade_id: "Grade-0501" }];
  const html = renderToStaticMarkup(await AcademicPanel({ schoolId: school }));
  expect(html).toContain("<span>Grade 0501</span>");
  expect(html).toContain('data-kind="classes"');
  expect(html).toContain('data-kind="academic_terms"');
  expect(html).toContain('data-kind="grades"');
  expect(html).not.toContain("complete set of year and grade choices");
});

it("gives a way back from stale or empty pages without claiming the register is empty", async () => {
  const html = renderToStaticMarkup(
    await AcademicPanel({ schoolId: school, pages: { subjectsPage: "9" } }),
  );
  expect(html).toContain("No records on this page.");
  expect(html).toContain('href="/dashboard?view=academic#subjects"');
  expect(html).toContain("subjectsPage=8#subjects");
});

it("does not render forms or private error details when a query fails", async () => {
  mock.failedTable = "grades";
  const html = renderToStaticMarkup(await AcademicPanel({ schoolId: school }));
  expect(html).toContain("Academic setup is unavailable.");
  expect(html).not.toContain("Private database failure");
  expect(html).not.toContain("<form");
});

it("rejects malformed or repeated page parameters and keeps URLs allowlisted", () => {
  for (const value of [
    undefined,
    "0",
    "-1",
    "1.5",
    "1e2",
    " 2",
    "100001",
    ["2", "3"],
  ]) {
    expect(academicPage(value)).toBe(1);
  }
  expect(academicPage("11")).toBe(11);
  expect(
    academicPageHref(
      { subjectsPage: "garbage", classesPage: "3" },
      "grades",
      2,
    ),
  ).toBe("/dashboard?view=academic&gradesPage=2&classesPage=3#grades");
});
