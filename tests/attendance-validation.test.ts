import { expect, it } from "vitest";
import { attendanceBatch } from "../src/lib/attendance-validation";
import { schoolDate } from "../src/lib/school-date";
const id = "00000000-0000-4000-8000-000000000001";
const input = {
  mode: "teacher",
  classId: id,
  date: "2026-10-08",
  version: 0,
  entries: [{ studentId: id, status: "present" }],
  reason: "",
};
it("accepts explicit marks and clearing, never supplies default marks", () => {
  expect(attendanceBatch.safeParse(input).success).toBe(true);
  expect(
    attendanceBatch.safeParse({
      ...input,
      entries: [{ studentId: id, status: null }],
    }).success,
  ).toBe(true);
  expect(attendanceBatch.safeParse({ ...input, entries: [] }).success).toBe(
    false,
  );
});
it.each([
  { date: "2026-02-30" },
  { date: "infinity" },
  { version: -1 },
  { version: "" },
  { mode: "student" },
  { schoolId: id },
  {
    entries: [
      { studentId: id, status: "present" },
      { studentId: id, status: "late" },
    ],
  },
  { entries: [{ studentId: id, status: "holiday" }] },
  { entries: [{ studentId: id, status: "present", enrollmentId: id }] },
  { entries: Array(101).fill({ studentId: id, status: "present" }) },
  { reason: "x".repeat(501) },
])("rejects invalid input %#", (change) => {
  expect(attendanceBatch.safeParse({ ...input, ...change }).success).toBe(
    false,
  );
});
it("uses the school day across UTC midnight and daylight saving, falling back like SQL", () => {
  const instant = new Date("2026-10-07T22:30:00Z");
  expect(schoolDate("Africa/Johannesburg", instant)).toBe("2026-10-08");
  expect(schoolDate("America/New_York", instant)).toBe("2026-10-07");
  expect(schoolDate("invalid", instant)).toBe("2026-10-07");
  expect(schoolDate("Europe/London", new Date("2026-07-01T23:30:00Z"))).toBe(
    "2026-07-02",
  );
});
