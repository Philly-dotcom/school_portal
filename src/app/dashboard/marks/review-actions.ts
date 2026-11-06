"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { assessmentMode } from "@/lib/assessment-validation";
import { createClient } from "@/lib/supabase/server";

const request = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("submit"), mode: assessmentMode, id: z.uuid(),
    version: z.coerce.number().int().positive(), previous: z.coerce.number().int().min(0),
  }),
  z.object({
    kind: z.literal("decide"), mode: assessmentMode, id: z.uuid(),
    version: z.coerce.number().int().positive(),
    decision: z.enum(["approved", "returned"]), reason: z.string().trim().max(500),
  }).refine(value => value.decision !== "returned" || value.reason.length > 0),
  z.object({
    kind: z.literal("invalidate"), mode: z.literal("school_admin"), id: z.uuid(),
    version: z.coerce.number().int().positive(), reason: z.string().trim().min(1).max(500),
  }),
]);

export async function changeAssessmentReview(_: string, form: FormData) {
  const context = await getSchoolContext();
  const parsed = request.safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Check your selection and give a reason when returning work or invalidating approval.";
  const input = parsed.data;
  if (context.status !== "ready" || !context.roles.includes(input.mode))
    return "Staff assessment access is required.";
  try {
    const client = await createClient();
    const scope = { target_school: context.school.id, staff_mode: input.mode };
    let operation;
    if (input.kind === "submit") {
      operation = client.rpc("submit_assessment", { ...scope, target_assessment: input.id,
        expected_revision: input.version, expected_previous: input.previous });
    } else if (input.kind === "decide") {
      operation = client.rpc("decide_assessment_review", { ...scope, target_submission: input.id,
        expected_package: input.version, new_decision: input.decision, decision_reason: input.reason });
    } else {
      operation = client.rpc("invalidate_assessment_approval", { target_school: context.school.id,
        target_assessment: input.id, expected_package: input.version, invalidation_reason: input.reason });
    }
    const { error } = await operation.abortSignal(AbortSignal.timeout(20000));
    if (error?.code === "PT409") return "This assessment or review changed. Reload before trying again.";
    if (error?.code === "22023" && input.kind === "submit") return "Resolve every missing mark across the roster before submitting.";
    if (error) return "Could not confirm the change. Check your access and reload the saved status.";
  } catch {
    return "Could not confirm the change. Reload the saved status before retrying.";
  }
  revalidatePath("/dashboard");
  return { submit: "Submitted for review.", decide: "Review decision saved.",
    invalidate: "Approval invalidated. Submit the roster for fresh review." }[input.kind];
}
