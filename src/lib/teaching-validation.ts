import { z } from "zod";
import type { PersonRow, RegisterOptions } from "./register-validation";
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
