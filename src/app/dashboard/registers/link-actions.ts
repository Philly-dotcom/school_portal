"use server";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { linkInput } from "@/lib/link-validation";

export async function linkRegisterMember(_state: { error: string; saved: boolean }, form: FormData) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return { error: "School administrator access is required.", saved: false };
  const parsed = linkInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Choose a valid login, or “No linked login”, and try again.", saved: false };
  const client = await createClient();
  const { error } = await client.rpc("link_register_to_member", {
    target_school: context.school.id, record_kind: parsed.data.kind,
    target_record: parsed.data.id, target_membership: parsed.data.membershipId,
  });
  if (error) return { error: error.code === "23505" ? "That login is already linked to another record of this type. Unlink it first."
    : error.code === "22023" ? "That member must be in this school and hold the matching role (student, teacher or guardian)."
    : error.code === "42501" ? "School administrator access is required."
    : "Could not save the link. Check access and that the register-link migration is applied.", saved: false };
  revalidatePath("/dashboard");
  return { error: "", saved: true };
}
