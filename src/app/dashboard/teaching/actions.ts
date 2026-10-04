"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { teachingInput } from "@/lib/teaching-validation";
export async function createTeachingAssignment(
  _state: { error: string; saved: boolean },
  form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School administrator access is required.", saved: false };
  const parsed = teachingInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Select a teacher, subject and class, and enter valid start and end dates.",
      saved: false,
    };
  const client = await createClient();
  const { error } = await client
    .from("teaching_assignments")
    .insert({ ...parsed.data, school_id: context.school.id });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "This teacher is already assigned to this subject and class."
          : "Could not save. Check your access, school records and dates within the class year.",
      saved: false,
    };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
