import { z } from "zod";
export const enrollmentChange = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  kind: z.enum(["transfer", "withdrawal"]),
  date: z.iso.date(),
  destination: z.union([z.uuid(), z.literal("")]).optional(),
  confirm: z.literal("yes"),
}).refine(v => v.kind === "transfer" ? !!v.destination : !v.destination);
export type EnrollmentRow = {
  id: string; student_id: string; class_id: string; academic_year_id: string;
  starts_on: string; ends_on: string; record_version?: number;
  closure?: "transfer" | "withdrawal" | null;
};
