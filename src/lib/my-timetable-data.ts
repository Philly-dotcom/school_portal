import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listPage, listPageSize } from "@/lib/list-pagination";
import type { PortalActor } from "@/lib/portal-validation";

const lessonSchema = z.object({
  id: z.uuid(),
  weekday: z.number().int().min(1).max(7),
  start_minute: z.number().int().min(0).max(1439),
  end_minute: z.number().int().min(1).max(1440),
  lesson_date: z.iso.date(),
  subject_name: z.string(),
  class_name: z.string(),
  grade_name: z.string(),
  teacher_name: z.string(),
});

export async function loadMyTimetable(
  actor: Extract<PortalActor, { status: "ready" }>,
  rawPage?: string | string[],
) {
  const page = listPage(rawPage);
  if (actor.mode === "guardian" && !actor.selectedChild) return null;
  try {
    const client = await createClient();
    // SQL independently derives the caller and rechecks the child grant.
    const { data, error } = await client.rpc("list_my_timetable", {
      target_school: actor.schoolId,
      portal_mode: actor.mode,
      selected_student:
        actor.mode === "guardian" ? actor.selectedChild!.id : null,
      page_number: page,
    });
    const result = lessonSchema.array().safeParse(data);
    if (error || !result.success) return null;
    return {
      rows: result.data.slice(0, listPageSize),
      page,
      hasNext: result.data.length > listPageSize,
    };
  } catch {
    return null;
  }
}
