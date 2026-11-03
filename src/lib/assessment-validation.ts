import { z } from "zod";
export const assessmentMode = z.enum(["school_admin", "teacher"]);
export type AssessmentMode = z.infer<typeof assessmentMode>;
const decimal = z.string().regex(/^\d{1,10}(\.\d{1,6})?$/);
export const assessmentInput = z
  .object({
    mode: assessmentMode,
    id: z.uuid().nullable(),
    assignmentId: z.uuid(),
    termId: z.uuid(),
    version: z.number().int().min(0).max(2147483646),
    title: z.string().trim().min(1).max(160),
    instructions: z.string().trim().min(1).max(10000),
    effectiveDate: z.iso.date(),
    minimum: decimal,
    maximum: decimal,
    precision: z.number().int().min(0).max(6),
    authorise: z.boolean(),
  })
  .refine((v) => (v.id ? v.version > 0 : v.version === 0))
  .refine((v) => !v.authorise || v.mode === "school_admin")
  .refine(
    (v) =>
      Number(v.minimum) < Number(v.maximum) && Number(v.maximum) <= 1000000000,
  )
  .refine((v) =>
    [v.minimum, v.maximum].every(
      (n) => (n.split(".")[1]?.replace(/0+$/, "").length ?? 0) <= v.precision,
    ),
  );
export const assessmentRow = z.object({
  id: z.uuid(),
  assignment_id: z.uuid(),
  assignment_label: z.string(),
  term_id: z.uuid(),
  term_label: z.string(),
  title: z.string(),
  instructions: z.string(),
  effective_date: z.iso.date(),
  minimum: z.string(),
  maximum: z.string(),
  decimal_places: z.number().int(),
  scale_authorised: z.boolean(),
  record_version: z.number().int().positive(),
});
export type AssessmentItem = z.infer<typeof assessmentRow>;
export type AssessmentState = {
  error: string;
  saved: boolean;
};
export function assessmentHref(mode: AssessmentMode, edit?: string, page = 1) {
  const q = new URLSearchParams({ view: "assessments", mode });
  if (edit) q.set("assessmentEdit", edit);
  if (page > 1) q.set("assessmentPage", String(page));
  return `/dashboard?${q}`;
}
