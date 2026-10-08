import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/app/dashboard/attendance/actions", () => ({
  saveAttendance: vi.fn(),
}));
import { AttendanceForm } from "../src/components/attendance-form";
import type { AttendanceRegister } from "../src/lib/attendance-validation";
const register: AttendanceRegister = {
  class_id: "class",
  class_label: "Fictional 8A",
  date: "2026-10-08",
  today: "2026-10-08",
  version: 3,
  can_edit: true,
  page: 1,
  has_next: false,
  rows: [
    {
      student_id: "one",
      full_name: "Fictional One",
      reference: "S1",
      status: null,
    },
    {
      student_id: "two",
      full_name: "Fictional Two",
      reference: "S2",
      status: "late",
    },
  ],
};
it("starts with no pending marks and preserves unmarked versus recorded status", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceForm, { register, mode: "teacher" }),
  );
  expect(html).toContain('name="entries" value="[]"');
  expect(html).toContain('name="version" value="3"');
  expect(html).toContain('<option value="" selected="">Unmarked</option>');
  expect(html).toContain('<option value="late" selected="">Late</option>');
  expect(html).toContain('disabled="">Save changed marks');
});
it("renders teacher history without editing or saving controls", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceForm, {
      register: { ...register, can_edit: false },
      mode: "teacher",
    }),
  );
  expect(html).not.toContain("<select");
  expect(html).not.toContain("Save changed marks");
  expect(html).toContain("read-only register");
});
it("requires the admin correction reason for earlier days", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceForm, {
      register: { ...register, date: "2026-10-07" },
      mode: "school_admin",
    }),
  );
  expect(html).toContain('name="reason" maxLength="500" required=""');
});
