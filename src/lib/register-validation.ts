import { z } from "zod";
const person = { full_name: z.string().trim().min(1).max(120), reference: z.string().trim().min(1).max(40) };
export const registerInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("students"), ...person }),
  z.object({ kind: z.literal("teachers"), ...person }),
  z.object({ kind: z.literal("guardians"), ...person }),
  z.object({ kind: z.literal("student_guardians"), student_id: z.uuid(), guardian_id: z.uuid(), relationship: z.string().trim().min(1).max(60) }),
  z.object({ kind: z.literal("enrollments"), student_id: z.uuid(), class_id: z.uuid(), academic_year_id: z.uuid(), starts_on: z.iso.date(), ends_on: z.iso.date() }),
]).refine(v => !("starts_on" in v) || v.starts_on <= v.ends_on, { message: "Check the enrollment dates." });
export type PersonKind = "students" | "teachers" | "guardians";
export type RegisterKind = z.infer<typeof registerInput>["kind"];
export type PersonRow = { id: string; full_name: string; reference: string; record_version?: number; membership_id?: string | null };
export type RegisterOptions = {
  students: PersonRow[]; guardians: PersonRow[];
  classes: { id: string; name: string; academic_year_id: string; grade_id: string }[];
  academic_years: { id: string; name: string; starts_on: string; ends_on: string }[];
  grades: { id: string; name: string }[];
};
export const personLabels: Record<PersonKind, { title: string; singular: string; reference: string; example: string }> = {
  students: { title: "Students", singular: "Student", reference: "Admission number", example: "e.g. ST-001" },
  teachers: { title: "Teachers", singular: "Teacher", reference: "Staff number", example: "e.g. TE-001" },
  guardians: { title: "Parents / guardians", singular: "Guardian", reference: "Guardian reference", example: "e.g. GU-001" },
};
export function classLabel(row: RegisterOptions["classes"][number], options: Pick<RegisterOptions,"grades"|"academic_years">) {
  return `${row.name} · ${options.grades.find(g => g.id === row.grade_id)?.name ?? "Grade unavailable"} · ${options.academic_years.find(y => y.id === row.academic_year_id)?.name ?? "Year unavailable"}`;
}
