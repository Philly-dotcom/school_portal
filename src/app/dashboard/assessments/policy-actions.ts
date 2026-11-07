"use server";

import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { gradingPolicyInput } from "@/lib/grading-policy-validation";

export async function saveGradingPolicyDraft(
  _: { error: string; saved: boolean },
  form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School Admin access is required.", saved: false };
  const parsed = gradingPolicyInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Check the policy title, school records and effective dates.",
      saved: false,
    };
  const input = parsed.data;
  try {
    const client = await createClient();
    const { data, error } = await client
      .rpc("save_grading_policy_draft", {
        target_school: context.school.id,
        target_policy: input.id,
        expected_version: input.version,
        target_year: input.year,
        target_grade: input.grade,
        target_subject: input.subject,
        new_title: input.title,
        new_start: input.start,
        new_end: input.end,
        new_source: input.source,
        new_rules: input.rules,
      })
      .abortSignal(AbortSignal.timeout(20000));
    if (error?.code === "PT409")
      return {
        error: "This draft changed. Reload its latest version before saving.",
        saved: false,
      };
    if (error?.code === "22023")
      return {
        error:
          "Check the selected school records and keep both dates within the academic year.",
        saved: false,
      };
    if (error || data !== input.id)
      return {
        error:
          "Could not confirm the save. Check the policy list before retrying.",
        saved: false,
      };
  } catch {
    return {
      error:
        "Could not confirm the save. Check the policy list before retrying.",
      saved: false,
    };
  }
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
