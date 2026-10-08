import { z } from "zod";

export const homeworkStaffMode = z.enum(["school_admin", "teacher"]);
export type HomeworkStaffMode = z.infer<typeof homeworkStaffMode>;
export const homeworkStatus = z.enum(["draft", "published", "withdrawn"]);
export const homeworkInput = z
  .object({
    mode: homeworkStaffMode,
    id: z.uuid().nullable(),
    assignmentId: z.uuid(),
    version: z.number().int().min(0).max(2147483646),
    title: z.string().trim().min(1).max(160),
    instructions: z.string().trim().min(1).max(10000),
    dueDate: z.iso.date(),
    status: homeworkStatus,
  })
  .strict()
  .refine((value) => (value.id ? value.version > 0 : value.version === 0));

export const homeworkRow = z.object({
  id: z.uuid(),
  assignment_id: z.uuid(),
  assignment_label: z.string(),
  title: z.string(),
  instructions: z.string(),
  due_date: z.iso.date(),
  status: homeworkStatus,
  audience_date: z.iso.date().nullable(),
  record_version: z.number().int().positive(),
  can_edit: z.boolean(),
});
export type HomeworkItem = z.infer<typeof homeworkRow>;
export type HomeworkState = { error: string; saved: boolean };

export function homeworkHref(
  mode: string,
  options: {
    child?: string;
    page?: number;
    edit?: string;
  } = {},
) {
  const params = new URLSearchParams({ view: "homework", mode });
  if (options.child) params.set("child", options.child);
  if (options.page && options.page > 1)
    params.set("homeworkPage", String(options.page));
  if (options.edit) params.set("homeworkEdit", options.edit);
  return `/dashboard?${params}`;
}
