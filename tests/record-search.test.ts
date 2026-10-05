import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";
type Row = { id: string; school_id: string; [key: string]: unknown };
const mock = vi.hoisted(() => ({
  context: vi.fn(),
  rpc: vi.fn(),
  rows: {} as Record<string, Row[]>,
  calls: [] as {
    table: string;
    fields: string;
    school: string;
    order: string[];
    range?: number[];
    pattern?: string;
    ids?: string[];
    exclude?: string;
    year?: string;
  }[],
  fail: false,
  throws: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mock.rpc,
    from: (table: string) => {
      if (mock.throws) throw new Error("Sensitive connection detail");
      const call: (typeof mock.calls)[number] = {
        table,
        fields: "",
        school: "",
        order: [],
      };
      mock.calls.push(call);
      const result = (start: number, end: number) => ({
        error: mock.fail ? { message: "Private SQL detail" } : null,
        data: (mock.rows[table] ?? [])
          .filter(
            (row) =>
              row.school_id === call.school &&
              (!call.year || row.academic_year_id === call.year) &&
              row.id !== call.exclude &&
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
        select: (fields: string) => {
          call.fields = fields;
          return query;
        },
        eq: (field: string, school: string) => {
          expect(["school_id", "academic_year_id"]).toContain(field);
          if (field === "school_id") call.school = school;
          else call.year = school;
          return query;
        },
        neq: (field: string, id: string) => {
          expect(field).toBe("id");
          call.exclude = id;
          return query;
        },
        ilike: (_field: string, pattern: string) => {
          call.pattern = pattern;
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
        in: async (_field: string, ids: string[]) => {
          call.ids = ids;
          return result(0, 999);
        },
      };
      return query;
    },
  }),
}));
import { searchSchoolRecords } from "../src/app/dashboard/search/actions";
import { literalSearchPattern } from "../src/lib/record-search";
import { RecordSearchSelect } from "../src/components/record-search-select";
const school = "school-a";
const base = { kind: "grades", query: "", page: 1 };
const yearId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  mock.context.mockResolvedValue({
    status: "ready",
    roles: ["school_admin"],
    school: { id: school },
  });
  mock.rpc.mockReset();
  mock.rows = {};
  mock.calls = [];
  mock.fail = false;
  mock.throws = false;
});
it.each(["teacher", "student", "guardian"])(
  "rejects direct %s searches before database reads",
  async (role) => {
    mock.context.mockResolvedValue({
      status: "ready",
      roles: [role],
      school: { id: school },
    });
    expect((await searchSchoolRecords(base)).error).toContain("administrator");
    expect(mock.calls).toHaveLength(0);
  },
);
it.each(["forbidden", "unavailable", "unconfigured"])(
  "rejects %s contexts",
  async (status) => {
    mock.context.mockResolvedValue({ status, roles: ["school_admin"] });
    expect((await searchSchoolRecords(base)).choices).toEqual([]);
    expect(mock.calls).toHaveLength(0);
  },
);
it("rejects arbitrary tables, forged schools and unbounded or malformed requests", async () => {
  for (const input of [
    { ...base, kind: "schools" },
    { ...base, school_id: "forged" },
    { ...base, query: "x".repeat(81) },
    { ...base, page: 0 },
    { ...base, page: 1.5 },
    { ...base, page: 100001 },
    { ...base, excludeId: "bad" },
    null,
  ]) {
    expect((await searchSchoolRecords(input)).error).toBeTruthy();
  }
  expect(mock.calls).toHaveLength(0);
});
it("reaches choices beyond 500 using bounded queries and the verified school", async () => {
  mock.rows.grades = Array.from({ length: 552 }, (_, i) => ({
    id: String(i),
    name: `Grade ${String(i).padStart(4, "0")}`,
    school_id: school,
    private_note: "not returned",
  }));
  mock.rows.grades.push({
    id: "foreign",
    name: "Foreign grade",
    school_id: "school-b",
  });
  const result = await searchSchoolRecords({ ...base, page: 21 });
  expect(result.choices).toHaveLength(25);
  expect(result.choices[0]).toEqual({ id: "500", label: "Grade 0500" });
  expect(result.hasNext).toBe(true);
  expect(mock.calls[0].range).toEqual([500, 525]);
  expect(mock.calls[0].order).toEqual(["name", "id"]);
  expect(mock.calls[0].school).toBe(school);
  expect(JSON.stringify(result)).not.toContain("private_note");
  expect(JSON.stringify(result)).not.toContain("Foreign grade");
});
it("passes search text as a literal ILIKE pattern rather than an OR filter", async () => {
  await searchSchoolRecords({ ...base, query: "  Grade_%\\  " });
  expect(mock.calls[0].pattern).toBe(literalSearchPattern("Grade_%\\"));
});
it("matches percent, underscore and backslash literally in PostgreSQL", async () => {
  const db = new PGlite();
  try {
    for (const value of ["50%", "Grade_A", "Path\\B"]) {
      const result = await db.query<{ matches: boolean }>(
        "select $1::text ilike $2::text as matches",
        [value, literalSearchPattern(value)],
      );
      expect(result.rows[0].matches).toBe(true);
    }
    const result = await db.query<{ matches: boolean }>(
      "select 'GradeXA' ilike $1::text as matches",
      [literalSearchPattern("Grade_A")],
    );
    expect(result.rows[0].matches).toBe(false);
  } finally {
    await db.close();
  }
});
it("returns class labels and year dates from separately school-scoped references", async () => {
  mock.rows.classes = [
    {
      id: "class",
      school_id: school,
      name: "10A",
      academic_year_id: "year",
      grade_id: "grade",
    },
  ];
  mock.rows.academic_years = [
    {
      id: "year",
      school_id: school,
      name: "2027",
      starts_on: "2027-01-01",
      ends_on: "2027-12-31",
    },
  ];
  mock.rows.grades = [{ id: "grade", school_id: school, name: "Grade 10" }];
  expect(
    (await searchSchoolRecords({ ...base, kind: "classes" })).choices,
  ).toEqual([
    {
      id: "class",
      label: "10A · Grade 10 · 2027",
      academicYearId: "year",
      startsOn: "2027-01-01",
      endsOn: "2027-12-31",
    },
  ]);
  expect(mock.calls.every((call) => call.school === school)).toBe(true);
  mock.rows.grades[0].school_id = "school-b";
  expect(
    (await searchSchoolRecords({ ...base, kind: "classes" })).error,
  ).toBeTruthy();
});
it("excludes the current replacement teacher and labels others with their references", async () => {
  const excluded = "11111111-1111-4111-8111-111111111111";
  mock.rows.teachers = [
    {
      id: excluded,
      school_id: school,
      full_name: "Fictional Teacher",
      reference: "T-1",
    },
    {
      id: "other",
      school_id: school,
      full_name: "Fictional Teacher",
      reference: "T-2",
    },
  ];
  expect(
    (
      await searchSchoolRecords({
        ...base,
        kind: "teachers",
        excludeId: excluded,
      })
    ).choices,
  ).toEqual([{ id: "other", label: "Fictional Teacher · T-2" }]);
  expect(mock.calls[0].exclude).toBe(excluded);
});
it("distinguishes empty results from read failures and hides exception details", async () => {
  expect(await searchSchoolRecords(base)).toEqual({
    choices: [],
    hasNext: false,
    error: "",
  });
  mock.fail = true;
  const failed = await searchSchoolRecords(base);
  expect(failed.error).toBeTruthy();
  expect(failed.error).not.toContain("Private SQL detail");
  mock.throws = true;
  expect((await searchSchoolRecords(base)).error).not.toContain("Sensitive");
});
it("renders a required labeled selector and a search button that cannot submit the parent form", () => {
  const html = renderToStaticMarkup(
    createElement(RecordSearchSelect, {
      kind: "grades",
      name: "grade_id",
      label: "Grade",
    }),
  );
  expect(html).toContain('type="button"');
  expect(html).toContain('name="grade_id" required=""');
  expect(html).toContain("Search grade by name");
  expect(html).not.toContain("<form");
});

it.each(["students", "guardians"])(
  "searches %s past 500 with names and references, within the verified school",
  async (kind) => {
    mock.rows[kind] = Array.from({ length: 526 }, (_, i) => ({
      id: String(i),
      school_id: school,
      full_name: `Fictional ${String(i).padStart(4, "0")}`,
      reference: `REF-${i}`,
    }));
    mock.rows[kind].push({
      id: "foreign",
      school_id: "school-b",
      full_name: "Foreign",
      reference: "PRIVATE",
    });
    const result = await searchSchoolRecords({ ...base, kind, page: 21 });
    expect(result.choices).toHaveLength(25);
    expect(result.choices[0]).toEqual({
      id: "500",
      label: "Fictional 0500 · REF-500",
    });
    expect(result.hasNext).toBe(true);
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(mock.calls[0].order).toEqual(["full_name", "id"]);
  },
);

it("narrows transfer choices to the requested school year and excludes the current class before paging", async () => {
  const current = "22222222-2222-4222-8222-222222222222";
  mock.rows.classes = [
    {
      id: current,
      name: "10A",
      school_id: school,
      academic_year_id: yearId,
      grade_id: "grade",
    },
    {
      id: "destination",
      name: "10B",
      school_id: school,
      academic_year_id: yearId,
      grade_id: "grade",
    },
    {
      id: "other-year",
      name: "10C",
      school_id: school,
      academic_year_id: "different-year",
      grade_id: "grade",
    },
    {
      id: "foreign",
      name: "10D",
      school_id: "school-b",
      academic_year_id: yearId,
      grade_id: "grade",
    },
  ];
  mock.rows.academic_years = [
    {
      id: yearId,
      school_id: school,
      name: "2027",
      starts_on: "2027-01-01",
      ends_on: "2027-12-31",
    },
  ];
  mock.rows.grades = [{ id: "grade", school_id: school, name: "Grade 10" }];
  const result = await searchSchoolRecords({
    ...base,
    kind: "classes",
    academicYearId: yearId,
    excludeId: current,
  });
  expect(result.choices.map((choice) => choice.id)).toEqual(["destination"]);
  expect(mock.calls[0].year).toBe(yearId);
  expect(mock.calls[0].exclude).toBe(current);
  expect(mock.calls[0].range).toEqual([0, 25]);
});

it("rejects malformed year filters and year filters for non-class searches", async () => {
  for (const input of [
    { ...base, kind: "classes", academicYearId: "bad" },
    { ...base, academicYearId: yearId },
  ]) {
    expect((await searchSchoolRecords(input)).error).toBeTruthy();
  }
  expect(mock.calls).toHaveLength(0);
});


it("searches timetable assignments through an admin-scoped RPC with dates and lookahead", async () => {
  mock.rpc.mockResolvedValue({ data: Array.from({ length: 26 }, (_, n) => ({
    id: `assignment-${n}`, label: `Maths · Class A · Fictional teacher ${n}`,
    starts_on: "2027-02-01", ends_on: "2027-11-30",
  })), error: null });
  const result = await searchSchoolRecords({ kind: "teaching_assignments", query: " Maths ", page: 21 });
  expect(mock.rpc).toHaveBeenCalledWith("search_timetable_assignments", {
    target_school: school, search_text: "Maths", page_number: 21,
  });
  expect(result.choices).toHaveLength(25);
  expect(result.hasNext).toBe(true);
  expect(result.choices[0]).toMatchObject({ startsOn: "2027-02-01", endsOn: "2027-11-30" });
  expect(mock.calls).toHaveLength(0);
});

it("denies unauthorized or malformed assignment searches before RPC and hides SQL errors", async () => {
  const input = { kind: "teaching_assignments", query: "", page: 1 };
  for (const extra of [{ schoolId: "foreign" }, { excludeId: yearId }, { academicYearId: yearId }, { page: 0 }]) {
    expect((await searchSchoolRecords({ ...input, ...extra })).error).toBeTruthy();
  }
  mock.context.mockResolvedValue({ status: "ready", roles: ["teacher"] });
  expect((await searchSchoolRecords(input)).error).toContain("administrator");
  expect(mock.rpc).not.toHaveBeenCalled();
  mock.context.mockResolvedValue({ status: "ready", school: { id: school }, roles: ["school_admin"] });
  mock.rpc.mockResolvedValue({ data: null, error: { message: "PRIVATE SQL" } });
  const result = await searchSchoolRecords(input);
  expect(result.error).toContain("016");
  expect(result.error).not.toContain("PRIVATE SQL");
});
