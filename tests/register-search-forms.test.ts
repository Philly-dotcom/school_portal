import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { EnrollmentRow } from "../src/lib/enrollment-validation";

const mock = vi.hoisted(() => ({
  choices: [] as {
    kind: string;
    name: string;
    academicYearId?: string;
    excludeId?: string;
  }[],
}));
vi.mock("@/app/dashboard/registers/actions", () => ({
  createRegisterRecord: vi.fn(),
}));
vi.mock("@/app/dashboard/registers/lifecycle-actions", () => ({
  changeEnrollment: vi.fn(),
}));
vi.mock("../src/components/record-search-select", () => ({
  RecordSearchSelect: (props: (typeof mock.choices)[number]) => {
    mock.choices.push(props);
    return createElement("select", { name: props.name, required: true });
  },
}));
import { RelationshipForm } from "../src/components/register-forms";
import { EnrollmentEditor } from "../src/components/enrollment-editor";
beforeEach(() => {
  mock.choices = [];
});
const row: EnrollmentRow = {
  id: "enrollment",
  student_id: "student",
  class_id: "class",
  academic_year_id: "year",
  starts_on: "2027-01-01",
  ends_on: "2027-12-31",
  record_version: 2,
};
it("uses student and guardian searches without preloaded lists or automatic access grants", () => {
  const html = renderToStaticMarkup(
    createElement(RelationshipForm, { enrollment: false }),
  );
  expect(mock.choices.map((choice) => choice.kind)).toEqual([
    "students",
    "guardians",
  ]);
  expect(html).toContain("does not grant portal access");
  expect(html).toContain('name="relationship"');
});
it("uses student and class searches for initial placement and retains the year field", () => {
  const html = renderToStaticMarkup(
    createElement(RelationshipForm, { enrollment: true }),
  );
  expect(mock.choices.map((choice) => choice.kind)).toEqual([
    "students",
    "classes",
  ]);
  expect(html).toContain('name="academic_year_id"');
  expect(html).toContain("Dates must fit within the class year");
});
it("passes the enrollment year and current class to transfer search and keeps version/confirmation controls", () => {
  const html = renderToStaticMarkup(createElement(EnrollmentEditor, { row }));
  expect(mock.choices[0]).toMatchObject({
    kind: "classes",
    name: "destination",
    academicYearId: "year",
    excludeId: "class",
  });
  expect(html).toContain('name="version" value="2"');
  expect(html).toContain('name="confirm"');
});
it("keeps closed enrollment history read-only", () => {
  const html = renderToStaticMarkup(
    createElement(EnrollmentEditor, { row: { ...row, closure: "transfer" } }),
  );
  expect(html).toContain("History retained");
  expect(mock.choices).toHaveLength(0);
  expect(html).not.toContain("<form");
});
