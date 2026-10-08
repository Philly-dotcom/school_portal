import { z } from "zod";

export const attendanceStatus = z.enum([
  "present",
  "absent",
  "late",
  "excused",
]);
export const attendanceStaffMode = z.enum(["school_admin", "teacher"]);
export type AttendanceStaffMode = z.infer<typeof attendanceStaffMode>;
export type AttendanceStatus = z.infer<typeof attendanceStatus>;

export const attendanceBatch = z
  .object({
    mode: attendanceStaffMode,
    classId: z.uuid(),
    date: z.iso.date(),
    version: z.number().int().min(0).max(2147483646),
    entries: z
      .array(
        z
          .object({
            studentId: z.uuid(),
            // Explicit null clears a mistaken mark. Omitted learners are unchanged.
            status: attendanceStatus.nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    reason: z.string().trim().max(500),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.entries.map((entry) => entry.studentId)).size ===
      value.entries.length,
    { message: "A learner can only appear once in a save." },
  );

export const attendanceRegisterSchema = z.object({
  class_id: z.uuid(),
  class_label: z.string(),
  date: z.iso.date(),
  today: z.iso.date(),
  version: z.number().int().nonnegative(),
  can_edit: z.boolean(),
  page: z.number().int().positive(),
  has_next: z.boolean(),
  rows: z.array(
    z.object({
      student_id: z.uuid(),
      full_name: z.string(),
      reference: z.string(),
      status: attendanceStatus.nullable(),
    }),
  ),
});
export type AttendanceRegister = z.infer<typeof attendanceRegisterSchema>;
export type AttendanceState = {
  error: string;
  saved: boolean;
  version?: number;
};

export const attendanceHistorySchema = z.array(
  z.object({
    id: z.uuid(),
    attendance_date: z.iso.date(),
    class_name: z.string(),
    status: attendanceStatus,
  }),
);

export function attendanceHref(
  mode: string,
  params: {
    child?: string;
    classId?: string;
    date?: string;
    page?: number;
  } = {},
) {
  const query = new URLSearchParams({ view: "attendance", mode });
  if (params.child) query.set("child", params.child);
  if (params.classId) query.set("attendanceClass", params.classId);
  if (params.date) query.set("attendanceDate", params.date);
  if (params.page && params.page > 1)
    query.set("attendancePage", String(params.page));
  return `/dashboard?${query}`;
}
