import "server-only";
import { createClient } from "@/lib/supabase/server";
import { homeworkRow } from "@/lib/homework-validation";
import { listPage, listPageSize } from "@/lib/list-pagination";

export async function loadHomework(
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
    const { data, error } = await client.rpc("list_homework", {
      target_school: schoolId,
      portal_mode: mode,
      selected_student: options.child ?? null,
      page_number: page,
      target_homework: options.edit ?? null,
    });
    const result = homeworkRow.array().safeParse(data);
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
