"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { registerInput } from "@/lib/register-validation";

export async function createRegisterRecord(_state: { error: string; saved: boolean }, form: FormData) {
  const context = await getSchoolContext();
  if (context.status !== "ready" || !context.roles.includes("school_admin"))
    return { error: "School administrator access is required.", saved: false };
  const parsed = registerInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check all required fields and dates. End date must be on or after start date.", saved: false };
  const { kind, ...fields } = parsed.data;
  const client = await createClient();
  const { error } = await client.from(kind).insert({ ...fields, school_id: context.school.id });
  if (error) return { error: error.code === "23505"
    ? "This reference, guardian link or student placement for the year already exists."
    : "Could not save. Check your school access, selected records and enrollment dates within the class year.", saved: false };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
