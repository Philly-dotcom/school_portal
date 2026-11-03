import { z } from "zod";
import { assessmentHref, type AssessmentMode } from "./assessment-validation";

export const markState = z.enum(["missing", "scored", "absent", "exempt"]);
export const markChange = z
  .object({
    id: z.uuid(),
    state: markState,
    score: z
      .string()
      .regex(/^\d{1,10}(\.\d{1,6})?$/)
      .nullable(),
    reason: z.string().trim().max(500),
  })
  .refine((row) => (row.state === "scored") === (row.score !== null))
  .refine((row) => row.state !== "exempt" || row.reason.length > 0);

export const draftSchema = z.object({
  title: z.string(),
  date: z.iso.date(),
  today: z.iso.date(),
  authorised: z.boolean(),
  minimum: z.string(),
  maximum: z.string(),
  precision: z.number().int(),
  definition: z.number().int().positive(),
  revision: z.number().int().positive().nullable(),
  entries: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        reference: z.string(),
        state: markState,
        score: z.string().nullable(),
        reason: z.string(),
      }),
    )
    .max(26),
});
export type DraftRegister = z.infer<typeof draftSchema>;
export type MarkChange = z.infer<typeof markChange>;
const placement = z
  .tuple([z.uuid(), z.number().int().positive(), z.iso.date(), z.iso.date()])
  .nullable();
export const rosterDifference = z.object({
  learner_id: z.uuid(),
  learner_name: z.string(),
  reference: z.string(),
  revision: z.number().int().positive(),
  previous_placement: placement,
  next_placement: placement,
});
export type RosterDifference = z.infer<typeof rosterDifference>;

export function marksHref(mode: AssessmentMode, id: string, page = 1) {
  const query = new URLSearchParams({
    marks: id,
    ...(page > 1 ? { marksPage: String(page) } : {}),
  });
  return assessmentHref(mode) + "&" + query;
}
