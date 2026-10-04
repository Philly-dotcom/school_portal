"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { enrollmentChange } from "@/lib/enrollment-validation";

export async function changeEnrollment(
  _state: { error: string; saved: boolean },
  form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School administrator access is required.", saved: false };
  const parsed = enrollmentChange.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Choose a change, check the date and destination, and confirm the change.",
      saved: false,
    };
  const v = parsed.data;
  const client = await createClient();
  const { data, error } = await client.rpc("change_enrollment", {
    target_school: context.school.id,
    target_enrollment: v.id,
    expected_version: v.version,
    change_kind: v.kind,
    change_date: v.date,
    destination_class: v.destination || null,
  });
  if (error || !data)
    return {
      error:
        error?.code === "40001"
          ? "This placement has changed. Reload the page before trying again."
          : "Could not change the placement. Check the date, school access and destination class in the same academic year. Migration 009 must be applied.",
      saved: false,
    };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
