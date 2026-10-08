import { expect, it } from "vitest";
import { homeworkHref, homeworkInput } from "../src/lib/homework-validation";
const id = "00000000-0000-4000-8000-000000000001";
const input = {
  mode: "teacher",
  id: null,
  assignmentId: id,
  version: 0,
  title: "Practice",
  instructions: "Read the chapter.",
  dueDate: "2026-10-09",
  status: "draft",
};
it("distinguishes new drafts from versioned edits", () => {
  expect(homeworkInput.safeParse(input).success).toBe(true);
  expect(homeworkInput.safeParse({ ...input, id, version: 1 }).success).toBe(
    true,
  );
  expect(homeworkInput.safeParse({ ...input, id }).success).toBe(false);
  expect(homeworkInput.safeParse({ ...input, version: 1 }).success).toBe(false);
});
it.each([
  { title: "\t" },
  { instructions: "\n" },
  { title: "x".repeat(161) },
  { instructions: "x".repeat(10001) },
  { dueDate: "2026-02-30" },
  { assignmentId: "bad" },
  { mode: "student" },
  { audienceDate: "2026-01-01" },
  { status: "submitted" },
])("rejects invalid or server-owned fields %#", (change) => {
  expect(homeworkInput.safeParse({ ...input, ...change }).success).toBe(false);
});
it("preserves the selected learner across pages", () => {
  expect(homeworkHref("guardian", { child: id, page: 2 })).toBe(
    `/dashboard?view=homework&mode=guardian&child=${id}&homeworkPage=2`,
  );
});
