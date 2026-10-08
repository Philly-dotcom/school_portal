"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { homeworkInput, type HomeworkState } from "@/lib/homework-validation";

export async function saveHomework(_state: HomeworkState, form: FormData): Promise<HomeworkState> {
  const context = await getSchoolContext();
  const version = form.get("version");
  const parsed = homeworkInput.safeParse({
    mode: form.get("mode"), id: form.get("id") || null,
    assignmentId: form.get("assignmentId"),
    version: typeof version === "string" && /^\d+$/.test(version) ? Number(version) : null,
    title: form.get("title"), instructions: form.get("instructions"),
    dueDate: form.get("dueDate"), status: form.get("status"),
  });
  if (!parsed.success) return { error: "Choose an assignment and check the title, instructions and due date.", saved: false };
  if (context.status !== "ready" || !context.roles.includes(parsed.data.mode)) {
    return { error: "Homework staff access is required.", saved: false };
  }
  const value = parsed.data;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("save_homework", {
      target_school: context.school.id, staff_mode: value.mode,
      target_homework: value.id, target_assignment: value.assignmentId,
      expected_version: value.version, new_title: value.title,
      new_instructions: value.instructions, new_due_date: value.dueDate, new_status: value.status,
    });
    if (error || typeof data !== "string") return {
      error: error?.code === "40001" ? "This homework changed. Reload before editing again."
        : "Homework could not be saved. Check your assignment access and dates. First publication requires a due date today or later, within the academic year.",
      saved: false,
    };
    revalidatePath("/dashboard");
    return { error: "", saved: true };
  } catch {
    return { error: "The save could not be confirmed. Reload the homework list before retrying.", saved: false };
  }
}
