import { z } from "zod";
import { normalizeGradeName } from "./grade-name";

const name = z.string().trim().min(1).max(80);
const dates = { starts_on: z.iso.date(), ends_on: z.iso.date() };
export const academicInput = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("academic_years"), name, ...dates }),
    z.object({
      kind: z.literal("academic_terms"),
      name,
      academic_year_id: z.uuid(),
      ...dates,
    }),
    z.object({
      kind: z.literal("grades"),
      name: z.string().transform(normalizeGradeName).pipe(name),
    }),
    z.object({ kind: z.literal("subjects"), name }),
    z.object({
      kind: z.literal("classes"),
      name,
      academic_year_id: z.uuid(),
      grade_id: z.uuid(),
    }),
  ])
  .refine(
    (value) => !("starts_on" in value) || value.starts_on <= value.ends_on,
    { message: "End date must be on or after the start date." },
  );
export type AcademicKind = z.infer<typeof academicInput>["kind"];
export type AcademicRow = {
  id: string;
  name: string;
  record_version?: number;
  starts_on?: string;
  ends_on?: string;
  academic_year_id?: string;
  grade_id?: string;
};
export const academicLabels: Record<AcademicKind, string> = {
  academic_years: "Academic years",
  academic_terms: "Terms",
  grades: "Grades",
  subjects: "Subjects",
  classes: "Classes",
};
