import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { RecordChoice } from "../src/lib/record-search";
const mock = vi.hoisted(() => ({ choices: [] as {
  kind: string; name: string; required?: boolean; initialChoice?: RecordChoice | null;
}[] }));
vi.mock("@/app/dashboard/timetable/actions", () => ({ saveLesson: vi.fn(), removeLesson: vi.fn() }));
vi.mock("../src/components/record-search-select", () => ({
  RecordSearchSelect: (props: (typeof mock.choices)[number]) => {
    mock.choices.push(props);
    return createElement("select", { name: props.name, required: props.required ?? true });
  },
}));
import { Timetable } from "../src/components/timetable";
beforeEach(() => { mock.choices = []; });
it("keeps filtering and creation searchable without preloaded assignments", () => {
  const html = renderToStaticMarkup(createElement(Timetable, {
    assignments: [], lessons: [], timezone: "UTC", page: 1, hasNext: false, filter: "",
  }));
  expect(mock.choices.map(row => row.kind)).toEqual(["teaching_assignments", "teaching_assignments"]);
  expect(mock.choices[0].required).toBe(false);
  expect(html).toContain("Apply filter");
  expect(html).toContain("Add weekly lesson");
  expect(html).not.toContain("Create a teaching assignment first");
  expect(html).not.toContain("500");
});
it("retains the selected filter even with no matching lessons and resets pagination on apply", () => {
  const html = renderToStaticMarkup(createElement(Timetable, {
    assignments: [{ id: "selected", label: "Maths · 10A · 2027 · Fictional teacher", starts_on: "2027-01-01", ends_on: "2027-12-31", class_id: "class" }],
    lessons: [], timezone: "UTC", page: 2, hasNext: false, filter: "selected",
  }));
  expect(mock.choices[0].initialChoice?.id).toBe("selected");
  expect(html).toContain('name="assignment" value="selected"');
  expect(html).not.toContain('name="timetablePage"');
  expect(html).toContain("Clear filter");
  expect(html).toContain("No lessons on this page");
});
