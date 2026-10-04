import { z } from "zod";
import type { PersonRow, RegisterOptions } from "./register-validation";
export type TeachingAssignment = {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  starts_on: string;
  ends_on: string;
  record_version?: number;
  closure?: "end" | "replace" | null;
};
export const teachingChangeInput = z.object({
  id: z.uuid(),
  version: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483646)),
  kind: z.enum(["end", "replace"]),
  date: z.iso.date(),
  teacher: z.union([z.uuid(), z.literal("")]).optional(),
  confirmed: z.literal("yes"),
}).refine(v => v.kind === "replace" ? Boolean(v.teacher) : !v.teacher);
export const teachingInput = z
  .object({
    teacher_id: z.uuid(),
    subject_id: z.uuid(),
    class_id: z.uuid(),
    academic_year_id: z.uuid(),
    starts_on: z.iso.date(),
    ends_on: z.iso.date(),
  })
  .refine((v) => v.starts_on <= v.ends_on, {
    message: "Check assignment dates.",
  });
export type TeachingOptions = Pick<
  RegisterOptions,
  "classes" | "academic_years" | "grades"
> & {
  teachers: PersonRow[];
  subjects: { id: string; name: string }[];
};
