import "server-only";
import { createClient } from "@/lib/supabase/server";
import { announcementRow } from "@/lib/announcement-validation";
import { listPage, listPageSize } from "@/lib/list-pagination";

export async function loadAnnouncement(
  schoolId: string,
  mode: string,
  options: {
    child?: string;
    page?: string | string[];
    edit?: string;
  } = {},
) {
  const page = options.edit ? 1 : listPage(options.page);
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("list_announcements", {
      target_school: schoolId,
      portal_mode: mode,
      selected_student: options.child ?? null,
      page_number: page,
      target_announcement: options.edit ?? null,
    });
    const result = announcementRow.array().safeParse(data);
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
