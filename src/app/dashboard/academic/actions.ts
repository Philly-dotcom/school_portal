"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { academicInput } from "@/lib/academic-validation";

export async function createAcademicRecord(
  _state: { error: string; saved: boolean },
  form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School administrator access is required.", saved: false };
  const parsed = academicInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Check the name, dates and required selections. End date cannot precede start date.",
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
          ? "That name already exists in the selected scope."
          : "Could not save. Check that selections belong to your school and term dates fit within the year, then try again.",
      saved: false,
    };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
