"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error: string; saved: boolean };
export async function saveSchoolSettings(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return { error: "You do not have permission to change school settings.", saved: false };
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    timezone: z.string().refine((value) => {
      try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
    }, "Use a valid timezone."),
  }).safeParse({ name: formData.get("name"), timezone: formData.get("timezone") });
  if (!parsed.success) return { error: "Enter a school name (2–120 characters) and a valid timezone.", saved: false };
  const supabase = await createClient();
  const { data, error } = await supabase.from("schools").update(parsed.data).eq("id", context.school.id).select("id").maybeSingle();
  if (error || !data) return { error: "Settings could not be saved. Check your access and try again.", saved: false };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
