"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { teachingInput, teachingChangeInput } from "@/lib/teaching-validation";
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
        error.code === "23505" || error.code === "23P01"
          ? "This teacher is already assigned to this subject and class for overlapping dates."
          : "Could not save. Check your access, school records and dates within the class year.",
      saved: false,
    };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}

export async function changeTeachingAssignment(
  _state: { error: string; saved: boolean }, form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return { error: "School administrator access is required.", saved: false };
  const parsed = teachingChangeInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Choose a valid change, date and replacement teacher where needed, then confirm.", saved: false };
  const input = parsed.data;
  const client = await createClient();
  const { error } = await client.rpc("change_teaching_assignment", {
    target_school: context.school.id, target_assignment: input.id,
    expected_version: input.version, change_kind: input.kind,
    change_date: input.date, replacement_teacher: input.teacher || null,
  });
  if (error) {
    const messages: Record<string, string> = {
      "40001": "This assignment has changed or is already closed. Reload before trying again.",
      "23P01": "The replacement teacher already has this subject and class for overlapping dates.",
      "23514": "Check the dates and existing timetable lessons. Lessons must fit entirely within the shortened assignment; review them in Timetable first.",
      "22023": "Choose a date within this assignment. A replacement must be another teacher and start after the original first day.",
    };
    return { error: messages[error.code] ?? "Could not change the assignment. Check your access and reload.", saved: false };
  }
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
