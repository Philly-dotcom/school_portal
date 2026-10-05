import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
type Row = { id: string; school_id: string; [key: string]: unknown };
const mock = vi.hoisted(() => ({
  rows: {} as Record<string, Row[]>,
  calls: [] as {
    table: string;
    filters: Record<string, string>;
    order: string[];
    range?: number[];
    ids?: string[];
    events: string[];
  }[],
  failed: "",
  failLookup: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/app/dashboard/search/actions", () => ({ searchSchoolRecords: vi.fn() }));
vi.mock("../src/components/teaching-form", () => ({
  TeachingForm: () => createElement("form", { "data-form": "assignment" }),
}));
vi.mock("../src/components/teaching-editor", () => ({
  TeachingEditor: ({ row }: { row: { closure?: string } }) =>
    createElement(
      "span",
      null,
      row.closure ? "History retained" : "End or replace teacher",
    ),
}));
vi.mock("@/app/dashboard/timetable/actions", () => ({
  saveLesson: vi.fn(),
  removeLesson: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const call: (typeof mock.calls)[number] = {
        table,
        filters: {},
        order: [],
        events: [],
      };
      mock.calls.push(call);
      const result = (start: number, end: number) => ({
        error:
          mock.failed === table || (mock.failLookup && call.ids)
            ? { message: "Private error" }
            : null,
        data: (mock.rows[table] ?? [])
          .filter(
            (row) =>
              Object.entries(call.filters).every(
                ([key, value]) => row[key] === value,
              ) &&
              (!call.ids || call.ids.includes(row.id)),
          )
          .sort((a, b) => {
            for (const key of call.order) {
              const diff =
                typeof a[key] === "number" && typeof b[key] === "number"
                  ? Number(a[key]) - Number(b[key])
                  : String(a[key]).localeCompare(String(b[key]));
              if (diff) return diff;
            }
            return 0;
          })
          .slice(start, end + 1),
      });
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          call.filters[key] = value;
          call.events.push(key);
          return query;
        },
        order: (key: string) => {
          call.order.push(key);
          return query;
        },
        range: async (start: number, end: number) => {
          call.range = [start, end];
          call.events.push("range");
          return result(start, end);
        },
        limit: async (size: number) => result(0, size - 1),
        in: async (key: string, ids: string[]) => {
          expect(key).toBe("id");
          call.ids = ids;
          return result(0, 999);
        },
      };
      return query;
    },
  }),
}));
import { TeachingPanel } from "../src/components/teaching-panel";
import { TimetablePanel } from "../src/components/timetable-panel";
import { loadPlanning } from "../src/lib/planning-data";
import {
  planningPageHref,
  timetableFilter,
} from "../src/lib/planning-pagination";
const school = "fictional-school-a";
const assignmentA = "11111111-1111-4111-8111-111111111111";
const assignmentB = "22222222-2222-4222-8222-222222222222";
const assignment = (id = assignmentA): Row => ({
  id,
  school_id: school,
  teacher_id: "teacher",
  subject_id: "subject",
  class_id: "class",
  starts_on: "2027-01-01",
  ends_on: "2027-12-31",
  record_version: 1,
});
const lesson = (id: string, assignment_id = assignmentA): Row => ({
  id,
  assignment_id,
  class_id: "class",
  school_id: school,
  weekday: 1,
  start_minute: 480,
  end_minute: 540,
  starts_on: "2027-01-01",
  ends_on: "2027-12-31",
});
beforeEach(() => {
  mock.calls = [];
  mock.failed = "";
  mock.failLookup = false;
  mock.rows = {
    teachers: [
      {
        id: "teacher",
        school_id: school,
        full_name: "Fictional Teacher",
        reference: "T-01",
      },
    ],
    subjects: [{ id: "subject", school_id: school, name: "Mathematics" }],
    classes: [
      {
        id: "class",
        school_id: school,
        name: "10A",
        grade_id: "grade",
        academic_year_id: "year",
      },
    ],
    academic_years: [
      {
        id: "year",
        school_id: school,
        name: "2027",
        starts_on: "2027-01-01",
        ends_on: "2027-12-31",
      },
    ],
    grades: [{ id: "grade", school_id: school, name: "Grade 10" }],
    teaching_assignments: [assignment()],
    timetable_lessons: [lesson("lesson")],
  };
});

it("keeps assignment history beyond 500 reachable and creation available", async () => {
  mock.rows.teaching_assignments = Array.from({ length: 502 }, (_, i) => ({
    ...assignment(`a-${String(i).padStart(4, "0")}`),
    closure: "end",
  }));
  const data = await loadPlanning(school, "teaching", 11);
  expect(data?.assignments.map((a) => a.id)).toEqual(["a-0500", "a-0501"]);
  const html = renderToStaticMarkup(
    await TeachingPanel({ schoolId: school, page: "11" }),
  );
  expect(html).toContain("History retained");
  expect(html).toContain('data-form="assignment"');
  expect(html).toContain("teachingPage=10#teaching");
  expect(html).not.toContain("teachingPage=12");
  expect(
    mock.calls.find((c) => c.table === "teaching_assignments")?.order,
  ).toEqual(["starts_on", "id"]);
});

it("pages lessons past 500 without disabling creation and never implies an empty day is free", async () => {
  mock.rows.timetable_lessons = Array.from({ length: 502 }, (_, i) =>
    lesson(`lesson-${String(i).padStart(4, "0")}`),
  );
  const data = await loadPlanning(school, "timetable", 11);
  expect(data?.lessons.map((row) => row.id)).toEqual([
    "lesson-0500",
    "lesson-0501",
  ]);
  const html = renderToStaticMarkup(
    await TimetablePanel({
      schoolId: school,
      timezone: "Africa/Johannesburg",
      page: "11",
    }),
  );
  expect(html).toContain("Add weekly lesson");
  expect(html).toContain("Remove recurring lesson");
  expect(html).toContain("not the complete weekly schedule");
  expect(html).toContain("No lessons on this page.");
  expect(html).not.toContain("No lessons scheduled.");
  expect(
    mock.calls.find((c) => c.table === "timetable_lessons")?.order,
  ).toEqual(["weekday", "start_minute", "id"]);
});

it("filters at the database before paging and preserves the filter in navigation", async () => {
  mock.rows.teaching_assignments.push(assignment(assignmentB));
  mock.rows.timetable_lessons = [
    ...Array.from({ length: 100 }, (_, i) => lesson(`a-${i}`)),
    ...Array.from({ length: 51 }, (_, i) => ({
      ...lesson(`b-${String(i).padStart(2, "0")}`, assignmentB),
      start_minute: 900,
      end_minute: 960,
    })),
  ];
  const html = renderToStaticMarkup(
    await TimetablePanel({
      schoolId: school,
      timezone: "UTC",
      assignment: assignmentB,
    }),
  );
  expect(html).toContain("15:00");
  expect(html).not.toContain("08:00");
  expect(html).toContain(
    `timetablePage=2&amp;assignment=${assignmentB}#timetable`,
  );
  expect(html).toContain('method="get"');
  expect(html).toContain('name="assignment"');
  expect(html).not.toContain('name="timetablePage"'); // Applying a new filter starts at page one.
  const query = mock.calls.find((c) => c.table === "timetable_lessons");
  expect(query?.events).toEqual(["school_id", "assignment_id", "range"]);
  expect(query?.range).toEqual([0, 50]);
});

it("retains lesson labels and removal when assignment choices exceed 500", async () => {
  mock.rows.teaching_assignments = Array.from({ length: 502 }, (_, i) =>
    assignment(`a-${String(i).padStart(4, "0")}`),
  );
  mock.rows.timetable_lessons = [lesson("last", "a-0501")];
  const html = renderToStaticMarkup(
    await TimetablePanel({ schoolId: school, timezone: "UTC" }),
  );
  expect(html).toContain(
    "Mathematics · 10A · Grade 10 · 2027 · Fictional Teacher (T-01)",
  );
  expect(html).toContain("Remove recurring lesson");
  expect(html).toContain("Add weekly lesson</button>");
  expect(html).toContain("Apply filter</button>");
  expect(
    mock.calls.some(
      (c) => c.table === "teaching_assignments" && c.ids?.includes("a-0501"),
    ),
  ).toBe(true);
});

it("resolves labels outside capped references and retains closed assignment history", async () => {
  for (const kind of [
    "teachers",
    "subjects",
    "classes",
    "academic_years",
    "grades",
  ]) {
    mock.rows[kind] = Array.from({ length: 502 }, (_, i) => ({
      ...mock.rows[kind][0],
      id: `${kind}-${i}`,
      name: `${kind} ${String(i).padStart(4, "0")}`,
      full_name: `Teacher ${String(i).padStart(4, "0")}`,
      academic_year_id: "academic_years-501",
      grade_id: "grades-501",
    }));
  }
  mock.rows.teaching_assignments[0] = {
    ...assignment(),
    teacher_id: "teachers-501",
    subject_id: "subjects-501",
    class_id: "classes-501",
    closure: "end",
  };
  const html = renderToStaticMarkup(await TeachingPanel({ schoolId: school }));
  expect(html).toContain("Teacher 0501");
  expect(html).toContain("subjects 0501");
  expect(html).toContain("classes 0501 · grades 0501 · academic_years 0501");
  expect(html).toContain("History retained");
  expect(html).toContain('data-form="assignment"');
  for (const call of mock.calls) {
    expect(call.filters.school_id).toBe(school);
    if (call.ids) expect(call.ids.length).toBeLessThanOrEqual(100);
  }
});

it("loads only referenced assignment labels and 50 visible lessons plus a lookahead", async () => {
  mock.rows.teaching_assignments = Array.from({ length: 500 }, (_, i) =>
    assignment(`a-${i}`),
  );
  mock.rows.timetable_lessons = Array.from({ length: 51 }, (_, i) =>
    lesson(`l-${String(i).padStart(2, "0")}`, "a-0"),
  );
  const data = await loadPlanning(school, "timetable", 1);
  expect(data?.labeledAssignments).toHaveLength(1);
  expect(data?.lessons).toHaveLength(50);
  expect(data?.hasNext).toBe(true);
});

it("keeps foreign-school lessons and assignment labels out of filtered reads", async () => {
  mock.rows.teaching_assignments.push({
    ...assignment(assignmentB),
    school_id: "fictional-school-b",
  });
  mock.rows.timetable_lessons.push({
    ...lesson("foreign", assignmentB),
    school_id: "fictional-school-b",
  });
  const data = await loadPlanning(school, "timetable", 1, assignmentB);
  expect(data?.lessons).toHaveLength(0);
  expect(data?.labeledAssignments.some((row) => row.id === assignmentB)).toBe(
    false,
  );
  expect(mock.calls.every((c) => c.filters.school_id === school)).toBe(true);
});

it("rejects malformed/repeated filter values and provides recovery for stale pages", async () => {
  for (const value of ["bad", [assignmentA, assignmentB]])
    expect(timetableFilter(value).valid).toBe(false);
  expect(timetableFilter("").valid).toBe(true);
  const invalid = renderToStaticMarkup(
    await TimetablePanel({
      schoolId: school,
      timezone: "UTC",
      assignment: "bad",
    }),
  );
  expect(invalid).toContain("Invalid timetable filter");
  expect(mock.calls).toHaveLength(0);
  const empty = renderToStaticMarkup(
    await TeachingPanel({ schoolId: school, page: "99" }),
  );
  expect(empty).toContain("No assignments on this page.");
  expect(empty).toContain('href="/dashboard?view=teaching#teaching"');
  expect(planningPageHref("timetable", 2, "bad")).toBe(
    "/dashboard?view=timetable&timetablePage=2#timetable",
  );
});

it.each(["teaching_assignments", "timetable_lessons", "teachers", "lookup"])(
  "fails safely when %s cannot load",
  async (failure) => {
    if (failure === "lookup") {
      mock.failLookup = true;
      mock.rows.timetable_lessons[0].assignment_id = "missing";
    } else mock.failed = failure;
    const html = renderToStaticMarkup(
      await TimetablePanel({ schoolId: school, timezone: "UTC" }),
    );
    expect(html).toContain("Timetable unavailable");
    expect(html).not.toContain("Private error");
    expect(html).not.toContain("Remove recurring lesson");
  },
);
