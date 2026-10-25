import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listPage, listPageSize } from "@/lib/list-pagination";
import type { PortalActor } from "@/lib/portal-validation";
import { getSchoolContext, type ReadySchoolContext } from "@/lib/auth-context";
import { schoolDate } from "@/lib/school-date";

async function emptyTimetableMessage(actor: Extract<PortalActor, { status: "ready" }>, verifiedContext?: ReadySchoolContext) {
  const context = verifiedContext ?? await getSchoolContext();
  if (context.status !== "ready" || context.school.id !== actor.schoolId || !context.roles.includes(actor.mode)) {
    return "No lessons were returned. Your current placement could not be checked; please reload.";
  }
  const today = schoolDate(context.school.timezone);
  const client = await createClient();
  const teacher = actor.mode === "teacher";
  const personId = actor.mode === "guardian" ? actor.selectedChild?.id : actor.person.id;
  if (!personId) return "Select a learner to see their timetable.";
  // Query only the verified actor/selected learner through the caller's RLS.
  // Do not derive guardian access from a teacher's classroom roster.
  const periods = () => client.from(teacher ? "teaching_assignments" : "enrollments")
    .select("starts_on, ends_on").eq("school_id", actor.schoolId)
    .eq(teacher ? "teacher_id" : "student_id", personId);
  const schema = z.array(z.object({ starts_on: z.iso.date(), ends_on: z.iso.date() }));
  const current = await periods().lte("starts_on", today).gte("ends_on", today).limit(1);
  const currentRows = schema.safeParse(current.data);
  if (current.error || !currentRows.success) return "No lessons were returned. Assignment or enrolment dates could not be checked; please try again.";
  if (currentRows.data.length) return "No lessons are scheduled for this week within your current assignment or enrolment dates.";
  const future = await periods().gt("starts_on", today).order("starts_on").limit(1);
  const futureRows = schema.safeParse(future.data);
  if (future.error || !futureRows.success) return "No lessons were returned. Upcoming assignment or enrolment dates could not be checked; please try again.";
  const next = futureRows.data[0];
  const kind = teacher ? "teaching assignment" : "enrolment";
  return next
    ? `There is no current ${kind}. The next recorded ${kind} starts on ${next.starts_on}. This view shows the current week, so future lessons are not shown yet.`
    : `No current or upcoming ${kind} was found for this account or selected learner. Ask School Admin to check the dated school records.`;
}

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
  verifiedContext?: ReadySchoolContext,
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
      emptyMessage: result.data.length === 0
        ? page === 1
          ? await emptyTimetableMessage(actor, verifiedContext)
          : "No lessons were found on this page. Return to the previous page."
        : null,
    };
  } catch {
    return null;
  }
}
