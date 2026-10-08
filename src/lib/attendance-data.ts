import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceHistorySchema,
  attendanceRegisterSchema,
  type AttendanceStaffMode,
} from "@/lib/attendance-validation";
import { listPage, listPageSize } from "@/lib/list-pagination";
import type { PortalActor } from "@/lib/portal-validation";

export async function loadAttendanceRegister(
  schoolId: string,
  mode: AttendanceStaffMode,
  classId: string,
  date: string,
  rawPage?: string | string[],
) {
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("get_attendance_register", {
      target_school: schoolId,
      target_class: classId,
      target_date: date,
      staff_mode: mode,
      page_number: listPage(rawPage),
    });
    const result = attendanceRegisterSchema.safeParse(data);
    return error || !result.success ? null : result.data;
  } catch {
    return null;
  }
}

export async function loadMyAttendance(
  actor: Extract<PortalActor, { status: "ready" }>,
  rawPage?: string | string[],
) {
  if (
    actor.mode === "teacher" ||
    (actor.mode === "guardian" && !actor.selectedChild)
  )
    return null;
  const page = listPage(rawPage);
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("list_my_attendance", {
      target_school: actor.schoolId,
      portal_mode: actor.mode,
      selected_student:
        actor.mode === "guardian" ? actor.selectedChild!.id : null,
      page_number: page,
    });
    const result = attendanceHistorySchema.safeParse(data);
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
