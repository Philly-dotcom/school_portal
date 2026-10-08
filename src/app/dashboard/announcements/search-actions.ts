"use server";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { announcementStaffMode } from "@/lib/announcement-validation";
import { searchPageSize, type RecordSearchResult } from "@/lib/record-search";

const searchInput = z.object({
  mode: announcementStaffMode, query: z.string().trim().max(80),
  page: z.number().int().min(1).max(100000),
});
export async function searchAnnouncementClasses(mode: string, query: string, page: number): Promise<RecordSearchResult> {
  const context = await getSchoolContext();
  const parsed = searchInput.safeParse({ mode, query, page });
  const unavailable = { choices: [], hasNext: false, error: "Classes could not be loaded. Check your access and try again." };
  if (!parsed.success || context.status !== "ready" || !context.roles.includes(parsed.data.mode)) return unavailable;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("search_announcement_classes", {
      target_school: context.school.id, staff_mode: parsed.data.mode,
      search_text: parsed.data.query, page_number: parsed.data.page,
    });
    const result = z.array(z.object({ id: z.uuid(), label: z.string() })).safeParse(data);
    if (error || !result.success) return unavailable;
    return { choices: result.data.slice(0, searchPageSize), hasNext: result.data.length > searchPageSize, error: "" };
  } catch { return unavailable; }
}
