import { z } from "zod";

export const searchPageSize = 25;
export const recordSearchInput = z
  .object({
    kind: z.enum([
      "academic_years",
      "grades",
      "teachers",
      "students",
      "guardians",
      "subjects",
      "classes",
      "teaching_assignments",
    ]),
    query: z.string().trim().max(80),
    page: z.number().int().min(1).max(100_000),
    excludeId: z.uuid().optional(),
    academicYearId: z.uuid().optional(),
  })
  .strict()
  .refine((input) => !input.academicYearId || input.kind === "classes")
  .refine((input) => input.kind !== "teaching_assignments" || !input.excludeId);
export type RecordSearchInput = z.infer<typeof recordSearchInput>;
export type RecordChoice = {
  id: string;
  label: string;
  disabled?: boolean;
  academicYearId?: string;
  startsOn?: string;
  endsOn?: string;
};
export type RecordSearchResult = {
  choices: RecordChoice[];
  hasNext: boolean;
  error: string;
};
export function literalSearchPattern(query: string) {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}
