"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { announcementInput, type AnnouncementState } from "@/lib/announcement-validation";

export async function saveAnnouncement(_state: AnnouncementState, form: FormData): Promise<AnnouncementState> {
  const context = await getSchoolContext();
  const version = form.get("version");
  const parsed = announcementInput.safeParse({
    mode: form.get("mode"), id: form.get("id") || null,
    classId: form.get("classId") || null,
    scope: form.get("scope"),
    version: typeof version === "string" && /^\d+$/.test(version) ? Number(version) : null,
    title: form.get("title"), body: form.get("body"),
    status: form.get("status"),
  });
  if (!parsed.success) return { error: "Choose an audience and enter a title and message.", saved: false };
  if (context.status !== "ready" || !context.roles.includes(parsed.data.mode)) {
    return { error: "Announcement staff access is required.", saved: false };
  }
  const value = parsed.data;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("save_announcement", {
      target_school: context.school.id, staff_mode: value.mode,
      target_announcement: value.id, target_class: value.classId,
      expected_version: value.version, new_title: value.title,
      new_body: value.body, new_status: value.status,
    });
    if (error || typeof data !== "string") return {
      error: error?.code === "40001" ? "This announcement changed. Reload before editing again."
        : "Announcement could not be saved. Check your class access. The audience cannot be changed on an existing notice.",
      saved: false,
    };
    revalidatePath("/dashboard");
    return { error: "", saved: true };
  } catch {
    return { error: "The save could not be confirmed. Reload the announcement list before retrying.", saved: false };
  }
}
