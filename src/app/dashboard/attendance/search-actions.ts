"use server";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { attendanceStaffMode } from "@/lib/attendance-validation";
import { searchPageSize, type RecordSearchResult } from "@/lib/record-search";

export async function searchAttendanceClasses(mode: string, query: string, page: number): Promise<RecordSearchResult> {
  const context = await getSchoolContext();
  const input = z.object({ mode: attendanceStaffMode, query: z.string().trim().max(80),
    page: z.number().int().min(1).max(100000) }).safeParse({ mode, query, page });
  const failed = { choices: [], hasNext: false, error: "Classes could not be loaded. Check your access and try again." };
  if (!input.success || context.status !== "ready" || !context.roles.includes(input.data.mode)) return failed;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("list_attendance_classes", {
      target_school: context.school.id, staff_mode: input.data.mode,
      search_text: input.data.query, page_number: input.data.page,
    });
    const result = z.array(z.object({ id: z.uuid(), label: z.string() })).safeParse(data);
    if (error || !result.success) return failed;
    return { choices: result.data.slice(0, searchPageSize), hasNext: result.data.length > searchPageSize, error: "" };
  } catch { return failed; }
}
