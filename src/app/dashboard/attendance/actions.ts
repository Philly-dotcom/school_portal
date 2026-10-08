"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { attendanceBatch, type AttendanceState } from "@/lib/attendance-validation";

export async function saveAttendance(_state: AttendanceState, form: FormData): Promise<AttendanceState> {
  const context = await getSchoolContext();
  let entries: unknown;
  const encoded = form.get("entries");
  if (typeof encoded !== "string" || encoded.length > 20000) {
    return { error: "Check the attendance entries.", saved: false };
  }
  try { entries = JSON.parse(encoded); }
  catch { return { error: "Check the attendance entries.", saved: false }; }
  const version = form.get("version");
  const parsed = attendanceBatch.safeParse({
    mode: form.get("mode"), classId: form.get("classId"), date: form.get("date"),
    version: typeof version === "string" && /^\d+$/.test(version) ? Number(version) : null,
    entries, reason: form.get("reason") ?? "",
  });
  if (!parsed.success) return { error: "Check the register and selected marks.", saved: false };
  if (context.status !== "ready" || !context.roles.includes(parsed.data.mode)) {
    return { error: "Attendance staff access is required.", saved: false };
  }
  const value = parsed.data;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("save_attendance", {
      target_school: context.school.id, target_class: value.classId,
      target_date: value.date, staff_mode: value.mode, expected_version: value.version,
      entries: value.entries, correction_reason: value.reason,
    });
    if (error || !data || !Number.isInteger(data.version)) {
      return {
        error: error?.code === "40001"
          ? "This register changed. Reload it and review your marks before saving again."
          : "Could not save attendance. Check your access, the date and correction reason.",
        saved: false,
      };
    }
    revalidatePath("/dashboard");
    return { error: "", saved: true, version: data.version };
  } catch {
    return { error: "Attendance could not be saved. Reload the register before retrying.", saved: false };
  }
}
