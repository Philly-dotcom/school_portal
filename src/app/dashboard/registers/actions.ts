"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { registerInput } from "@/lib/register-validation";

export async function createRegisterRecord(
  _state: { error: string; saved: boolean },
  form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School administrator access is required.", saved: false };
  const parsed = registerInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Check all required fields and dates. End date must be on or after start date.",
      saved: false,
    };
  const { kind, ...fields } = parsed.data;
  const client = await createClient();
  const { error } = await client
    .from(kind)
    .insert({ ...fields, school_id: context.school.id });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "This reference, guardian link or open student placement for the year already exists."
          : error.code === "23P01"
            ? "These enrollment dates overlap an existing placement for this student and year."
            : "Could not save. Check your school access, selected records and enrollment dates within the class year.",
      saved: false,
    };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
