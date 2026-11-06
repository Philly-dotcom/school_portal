"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function manageCorrectionGrant(_: string, form: FormData) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return "School Admin access required.";
  const values = Object.fromEntries(form);
  const request = z.discriminatedUnion("operation", [
    z.object({ operation: z.literal("revoke"), grant: z.uuid() }),
    z.object({ operation: z.literal("issue"), assessment: z.uuid(), teacher: z.uuid(),
      scope: z.enum(["learner","assessment"]), student: z.uuid().optional(), start: z.iso.date(), end: z.iso.date(),
      reason: z.string().trim().min(1).max(500) }),
  ]).safeParse(values);
  if (!request.success) return "Check the teacher, learner scope, dates and reason.";
  const v = request.data;
  if (v.operation === "issue" && (v.start > v.end || (v.scope === "learner") !== Boolean(v.student)))
    return "Check both dates and the learner scope.";
  try {
    const client = await createClient();
    const { error } = v.operation === "revoke"
      ? await client.rpc("revoke_correction_grant", {target_school: context.school.id, target_grant: v.grant})
      : await client.rpc("issue_correction_grant", {target_school: context.school.id, target_assessment: v.assessment,
        target_teacher: v.teacher, target_student: v.student ?? null, valid_from: v.start, valid_until: v.end, grant_reason: v.reason});
    if (error) return "Access change failed. Check active teacher membership, frozen roster, dates and existing grants.";
  } catch { return "Change could not be confirmed. Reload the access list before retrying."; }
  revalidatePath("/dashboard");
  return v.operation === "issue" ? "Correction access granted." : "Correction access revoked.";
}
