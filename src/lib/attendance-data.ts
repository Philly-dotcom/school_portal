import "server-only";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { schoolDate } from "@/lib/school-date";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceHistorySchema,
  attendanceRegisterSchema,
  type AttendanceStaffMode,
} from "@/lib/attendance-validation";
import { listPage, listPageSize } from "@/lib/list-pagination";
import type { PortalActor } from "@/lib/portal-validation";

const classDetailsSchema = z.object({
  name: z.string(),
  academic_years: z.object({ name: z.string(), starts_on: z.iso.date(), ends_on: z.iso.date() }),
});

export async function loadAttendanceRegister(
  schoolId: string,
  mode: AttendanceStaffMode,
  classId: string,
  date: string,
  rawPage?: string | string[],
) {
  const fallbackChoice = { id: classId, label: "Previously selected class (access not verified)" };
  const failed = { status: "error" as const, register: null, choice: fallbackChoice,
    message: "The register could not be loaded. Please try again. This does not mean the class has no learners." };
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
    if (!error && result.success) return { status: "ready" as const, register: result.data,
      choice: { id: result.data.class_id, label: result.data.class_label }, message: "" };

    // Diagnostic reads never replace the register RPC's authorization decision.
    // Only a verified admin gets class/year details after a failed register read.
    const context = await getSchoolContext();
    if (context.status !== "ready" || context.school.id !== schoolId || !context.roles.includes(mode)) return failed;
    let choice = fallbackChoice;
    let year: z.infer<typeof classDetailsSchema>["academic_years"] | undefined;
    if (mode === "school_admin") {
      const details = await client.from("classes")
        .select("name, academic_years(name, starts_on, ends_on)")
        .eq("school_id", schoolId).eq("id", classId).maybeSingle();
      const parsed = classDetailsSchema.safeParse(details.data);
      if (!details.error && parsed.success) {
        year = parsed.data.academic_years;
        choice = { id: classId, label: `${parsed.data.name} · ${year.name}` };
      }
    }
    if (error?.code !== "42501") return { ...failed, choice };
    const today = schoolDate(context.school.timezone);
    let message = "This register is unavailable for your current access and the selected date.";
    if (year && today < year.starts_on) {
      message = `This class belongs to academic year ${year.name}, which starts on ${year.starts_on}. You can prepare it now; attendance cannot be recorded before that year begins.`;
    } else if (year && (date < year.starts_on || date > year.ends_on)) {
      message = `Choose a register date within this class's academic year: ${year.starts_on} to ${year.ends_on}.`;
    } else if (date > today) {
      message = "Future attendance registers are unavailable. Choose today or an eligible past date.";
    } else if (mode === "teacher") {
      message = "This register is unavailable. Your teaching assignment must cover both today and the register date. Future assignments do not grant current attendance access.";
    }
    return { status: "unavailable" as const, register: null, choice, message };
  } catch {
    return failed;
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
