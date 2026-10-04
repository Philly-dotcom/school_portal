"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { lessonInput, lessonRemoval } from "@/lib/timetable-validation";
export async function saveLesson(
  _state: { error: string; saved: boolean },
  form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School administrator access is required.", saved: false };
  const parsed = lessonInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Select an assignment and weekday, and check the dates and start/end times.",
      saved: false,
    };
  const v = parsed.data;
  const client = await createClient();
  const { data, error } = await client.rpc("create_timetable_lesson", {
    target_school: context.school.id,
    target_assignment: v.assignment_id,
    lesson_weekday: v.weekday,
    lesson_start: v.start_time,
    lesson_end: v.end_time,
    first_date: v.starts_on,
    last_date: v.ends_on,
  });
  if (error || !data)
    return {
      error:
        error?.code === "23P01"
          ? "This teacher or class already has a lesson at that time."
          : "Could not save. Dates must fit the assignment and include the selected weekday. Check access and migration 008 if this persists.",
      saved: false,
    };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
export async function removeLesson(
  _state: { error: string; saved: boolean },
  form: FormData,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School administrator access is required.", saved: false };
  const parsed = lessonRemoval.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Confirm that you want to remove this recurring lesson.",
      saved: false,
    };
  const client = await createClient();
  const { data, error } = await client.rpc("remove_timetable_lesson", {
    target_school: context.school.id,
    target_lesson: parsed.data.id,
  });
  if (error || !data)
    return {
      error: "The lesson could not be removed. Reload and check your access.",
      saved: false,
    };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
