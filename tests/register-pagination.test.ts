import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { RegisterLoginMember } from "../src/lib/link-validation";

type Row = { id: string; school_id: string; [key: string]: unknown };
const mock = vi.hoisted(() => ({
  rows: {} as Record<string, Row[]>,
  members: [] as RegisterLoginMember[],
  calls: [] as {
    table: string;
    school: string;
    order: string[];
    range?: number[];
    ids?: string[];
  }[],
  logins: [] as { id: string; currentChoice: { id: string; disabled: boolean } | null }[],
  relationships: [] as { enrollment: boolean }[],
  enrollmentRows: [] as { closure?: string }[],
  failed: "",
  failLookup: false,
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../src/components/record-editor", () => ({
  RecordEditor: () => createElement("span", null, "Correct record"),
}));
vi.mock("../src/components/guardian-access", () => ({
  GuardianAccess: () => createElement("span", null, "Guardian grant control"),
}));
vi.mock("../src/components/login-link", () => ({
  LoginLink: (props: {
    id: string;
    currentChoice: { id: string; disabled: boolean } | null;
  }) => {
    mock.logins.push(props);
    return null;
  },
}));
vi.mock("../src/components/enrollment-editor", () => ({
  EnrollmentEditor: ({ row }: { row: { closure?: string } }) => {
    mock.enrollmentRows.push(row);
    return createElement(
      "span",
      null,
      row.closure ? "History retained" : "Enrollment editor",
    );
  },
}));
vi.mock("../src/components/register-forms", () => ({
  PersonForm: ({ kind }: { kind: string }) =>
    createElement("form", { "data-kind": kind }),
  RelationshipForm: (props: {
    enrollment: boolean;
  }) => {
    mock.relationships.push(props);
    return createElement("form", {
      "data-kind": props.enrollment ? "enrollment" : "guardian-link",
    });
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: (name: string, args: unknown) => {
      mock.rpc(name, args);
      return {
        in: async (_field: string, ids: string[]) => ({
          data: mock.members.filter((member) => ids.includes(member.id)),
          error: mock.failed === "rpc" ? { message: "Private error" } : null,
        }),
      };
    },
    from: (table: string) => {
      const call: (typeof mock.calls)[number] = {
        table,
        school: "",
        order: [],
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
              row.school_id === call.school &&
              (!call.ids || call.ids.includes(row.id)),
          )
          .sort((a, b) => {
            for (const key of call.order) {
              const diff = String(a[key]).localeCompare(String(b[key]));
              if (diff) return diff;
            }
            return 0;
          })
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
          call.ids = ids;
          return result(0, 999);
        },
      };
      return query;
    },
  }),
}));
import { RegistersPanel } from "../src/components/registers-panel";
import { registerPageHref } from "../src/lib/register-pagination";
import { listPage } from "../src/lib/list-pagination";

const school = "fictional-school-a";
const person = (id: string): Row => ({
  id,
  school_id: school,
  full_name: `Fictional ${id}`,
  reference: id,
  record_version: 1,
});
const numbered = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, i) =>
    person(`${prefix}-${String(i).padStart(4, "0")}`),
  );
beforeEach(() => {
  mock.rows = {
    students: [person("student")],
    guardians: [person("guardian")],
    teachers: [person("teacher")],
    classes: [
      {
        id: "class",
        name: "Class A",
        school_id: school,
        grade_id: "grade",
        academic_year_id: "year",
      },
    ],
    academic_years: [
      {
        id: "year",
        name: "2027",
        school_id: school,
        starts_on: "2027-01-01",
        ends_on: "2027-12-31",
      },
    ],
    grades: [{ id: "grade", name: "Grade 10", school_id: school }],
    student_guardians: [
      {
        id: "link",
        school_id: school,
        student_id: "student",
        guardian_id: "guardian",
        relationship: "Parent",
        record_version: 1,
        access_enabled: false,
      },
    ],
    enrollments: [
      {
        id: "enrollment",
        school_id: school,
        student_id: "student",
        class_id: "class",
        academic_year_id: "year",
        starts_on: "2027-01-01",
        ends_on: "2027-12-31",
        record_version: 1,
      },
    ],
  };
  mock.members = [];
  mock.calls = [];
  mock.logins = [];
  mock.relationships = [];
  mock.enrollmentRows = [];
  mock.failed = "";
  mock.failLookup = false;
  mock.rpc.mockClear();
});

it("pages all three people lists beyond 500 while preserving correction and creation controls", async () => {
  for (const kind of ["students", "teachers", "guardians"])
    mock.rows[kind] = numbered(502, kind);
  mock.rows.students.push({
    ...person("foreign"),
    school_id: "fictional-school-b",
  });
  const html = renderToStaticMarkup(
    await RegistersPanel({
      schoolId: school,
      pages: { studentsPage: "11", teachersPage: "11", guardiansPage: "11" },
    }),
  );
  for (const kind of ["students", "teachers", "guardians"]) {
    expect(html).toContain(`Fictional ${kind}-0501`);
    expect(html).toContain(`data-kind="${kind}"`);
    expect(
      mock.calls.find((call) => call.table === kind && call.range)?.range,
    ).toEqual([500, 550]);
  }
  expect(html).toContain("Correct record");
  expect(html).not.toContain("Fictional foreign");
  expect(mock.logins.length).toBeGreaterThan(0);
  expect(mock.relationships).toHaveLength(2);
  expect(html).not.toContain("This register needs pagination");
  for (const call of mock.calls) {
    expect(call.school).toBe(school);
    if (
      call.range &&
      ["students", "teachers", "guardians"].includes(call.table)
    )
      expect(call.order).toEqual(["full_name", "id"]);
  }
  expect(mock.rpc).not.toHaveBeenCalled();
});

it("pages large guardian and enrollment histories without blocking forms or dropping closure state", async () => {
  mock.rows.student_guardians = Array.from({ length: 502 }, (_, i) => ({
    ...mock.rows.student_guardians[0],
    id: `link-${String(i).padStart(4, "0")}`,
    relationship: `Relationship ${i}`,
  }));
  mock.rows.enrollments = Array.from({ length: 502 }, (_, i) => ({
    ...mock.rows.enrollments[0],
    id: `enrollment-${String(i).padStart(4, "0")}`,
    closure: "transfer",
  }));
  const html = renderToStaticMarkup(
    await RegistersPanel({
      schoolId: school,
      pages: { student_guardiansPage: "11", enrollmentsPage: "11" },
    }),
  );
  expect(html).toContain("Relationship 501");
  expect(html).not.toContain("Relationship 499");
  expect(html).toContain("History retained");
  expect(html).toContain("Guardian grant control");
  expect(mock.relationships).toHaveLength(2);
  expect(html).toContain("enrollmentsPage=10#enrollments");
  expect(html).not.toContain("enrollmentsPage=12");
});

it("loads only the existing link for a visible person, including suspended accounts", async () => {
  mock.rows.students = numbered(60, "student");
  mock.rows.students[0].membership_id = "taken";
  mock.rows.students[50].membership_id = "current";
  mock.members = [
    {
      id: "taken",
      display_name: "Taken",
      roles: ["student"],
      status: "active",
      verified_email: null,
    },
    {
      id: "free",
      display_name: "Free",
      roles: ["student"],
      status: "active",
      verified_email: null,
    },
    {
      id: "current",
      display_name: "Current",
      roles: ["student"],
      status: "suspended",
      verified_email: null,
    },
    {
      id: "wrong-role",
      display_name: "Teacher",
      roles: ["teacher"],
      status: "active",
      verified_email: null,
    },
  ];
  await RegistersPanel({ schoolId: school, pages: { studentsPage: "2" } }).then(
    renderToStaticMarkup,
  );
  const login = mock.logins.find((row) => row.id === "student-0050");
  expect(login?.currentChoice?.id).toBe("current");
  expect(login?.currentChoice?.disabled).toBe(true);
  expect(mock.relationships).toEqual([
    { enrollment: false },
    { enrollment: true },
  ]);
});

it("resolves off-limit people, class, grade and year labels using school-scoped ID lookups", async () => {
  mock.rows.students = numbered(502, "student");
  mock.rows.guardians = numbered(502, "guardian");
  for (const kind of ["classes", "academic_years", "grades"]) {
    mock.rows[kind] = Array.from({ length: 502 }, (_, i) => ({
      ...mock.rows[kind][0],
      id: `${kind}-${i}`,
      name: `${kind} ${String(i).padStart(4, "0")}`,
      academic_year_id: "academic_years-501",
      grade_id: "grades-501",
    }));
  }
  mock.rows.student_guardians[0].student_id = "student-0501";
  mock.rows.student_guardians[0].guardian_id = "guardian-0501";
  mock.rows.enrollments[0].student_id = "student-0501";
  mock.rows.enrollments[0].class_id = "classes-501";
  const html = renderToStaticMarkup(await RegistersPanel({ schoolId: school }));
  expect(html).toContain("Fictional student-0501");
  expect(html).toContain("Fictional guardian-0501");
  expect(html).toContain("classes 0501 · grades 0501 · academic_years 0501");
  expect(html).toContain("Guardian grant control");
  expect(mock.enrollmentRows).toHaveLength(1);
  expect(
    mock.calls
      .filter((call) => call.ids)
      .every((call) => call.school === school),
  ).toBe(true);
});

it("keeps login search available without preloading oversized member lists", async () => {
  mock.members = Array.from({ length: 501 }, (_, i) => ({
    id: String(i),
    display_name: "Fictional",
    roles: ["student"],
    status: "active",
    verified_email: null,
  }));
  const html = renderToStaticMarkup(await RegistersPanel({ schoolId: school }));
  expect(mock.logins.length).toBeGreaterThan(0);
  expect(mock.relationships).toHaveLength(2);
  expect(html).toContain('data-kind="students"');
});

it("allows exactly 500 reference choices without mistaking the boundary for overflow", async () => {
  mock.rows.students = numbered(500, "student");
  renderToStaticMarkup(await RegistersPanel({ schoolId: school }));
  expect(mock.relationships).toHaveLength(2);
  expect(
    mock.logins.filter((login) => login.id.startsWith("student-")),
  ).toHaveLength(50);
});

it("shows only 50 rows, preserves other page positions, and offers a path back from empty pages", async () => {
  mock.rows.students = numbered(51, "student");
  const html = renderToStaticMarkup(
    await RegistersPanel({ schoolId: school, pages: { teachersPage: "9" } }),
  );
  expect(html).toContain("Fictional student-0049");
  expect(html).not.toContain("Fictional student-0050");
  expect(html).toContain("studentsPage=2&amp;teachersPage=9#students");
  expect(html).toContain("No records on this page.");
  expect(html).toContain('href="/dashboard?view=registers#teachers"');
  expect(listPage(["2", "3"])).toBe(1);
  expect(
    registerPageHref(
      { studentsPage: "bad", teachersPage: "2" },
      "enrollments",
      3,
    ),
  ).toBe(
    "/dashboard?view=registers&teachersPage=2&enrollmentsPage=3#enrollments",
  );
});

it.each(["students", "enrollments", "rpc", "lookup"])(
  "fails safely when %s cannot load",
  async (failure) => {
    if (failure === "lookup") {
      mock.failLookup = true;
      mock.rows.enrollments[0].student_id = "missing";
    } else {
      mock.failed = failure;
      if (failure === "rpc") mock.rows.students[0].membership_id = "linked";
    }
    const html = renderToStaticMarkup(
      await RegistersPanel({ schoolId: school }),
    );
    expect(html).toContain("School registers are unavailable.");
    expect(html).not.toContain("Private error");
    expect(html).not.toContain("<form");
  },
);
