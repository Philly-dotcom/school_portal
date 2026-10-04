"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { correctionInput } from "@/lib/correction-validation";

export async function correctRecord(
  _state: { error: string; saved: boolean },
  form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School administrator access is required.", saved: false };
  const parsed = correctionInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Check the name and reference, then try again. Reload if this form is outdated.",
      saved: false,
    };
  const value = parsed.data;
  const client = await createClient();
  const { data, error } = await client.rpc("correct_school_record", {
    target_school: context.school.id,
    record_kind: value.kind,
    target_record: value.id,
    expected_version: value.version,
    corrected_name: value.name,
    corrected_reference: value.reference ?? null,
  });
  if (error || typeof data !== "number")
    return {
      error:
        error?.code === "40001"
          ? "This record changed or is no longer available. Reload the page and review the latest values before saving."
          : error?.code === "23505"
            ? "That name or reference already exists. Choose a different value."
            : "Could not save this correction. Check your access and that database migration 007 is applied.",
      saved: false,
    };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
