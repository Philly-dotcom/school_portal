"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { invitationSchema, membershipSchema } from "@/lib/account-validation";
import { invitationDeliveryEnabled } from "@/lib/account-config";

export type AccessState = { error: string; message: string };
const denied = { error: "Active School Admin access is required.", message: "" };

export async function updateMember(_state: AccessState, form: FormData): Promise<AccessState> {
  const context = await getSchoolContext();
  if (context.status !== "ready" || !context.roles.includes("school_admin")) return denied;
  const parsed = membershipSchema.safeParse({ membershipId: form.get("membershipId"), version: form.get("version"), status: form.get("status"), roles: form.getAll("roles") });
  if (!parsed.success) return { error: "Select an access status and at least one role.", message: "" };
  const client = await createClient();
  const { error } = await client.rpc("manage_school_member", { target_school: context.school.id, target_membership: parsed.data.membershipId, new_status: parsed.data.status, new_roles: parsed.data.roles, expected_version: parsed.data.version });
  if (error) return { error: error.code === "23514" ? "Keep at least one active School Admin." : error.code === "40001" ? "This member changed since you opened the page. Reload before saving." : "Access could not be changed. Check your permissions and the account-management migration.", message: "" };
  revalidatePath("/dashboard");
  return { error: "", message: "Access updated and recorded in the audit history." };
}

export async function createInvitation(_state: AccessState, form: FormData): Promise<AccessState> {
  const context = await getSchoolContext();
  if (context.status !== "ready" || !context.roles.includes("school_admin")) return denied;
  const parsed = invitationSchema.safeParse({ email: form.get("email"), name: form.get("name"), roles: form.getAll("roles") });
  if (!parsed.success) return { error: "Enter a valid name, email and at least one role.", message: "" };
  const client = await createClient();
  const { error } = await client.rpc("create_school_invitation", { target_school: context.school.id, invite_email: parsed.data.email, invite_name: parsed.data.name, invite_roles: parsed.data.roles });
  if (error) return { error: error.code === "23505" ? "A pending invitation already exists. Revoke it before replacing it." : error.code === "P0001" ? "Invitation limit reached. Wait a minute and try again; the daily maximum is 50." : "Invitation could not be prepared. Check access and the account-management migration.", message: "" };
  revalidatePath("/dashboard");
  return { error: "", message: "Invitation prepared. No email has been sent. Review the pending invitation before sending." };
}

export async function changeInvitation(_state: AccessState, form: FormData): Promise<AccessState> {
  const context = await getSchoolContext();
  if (context.status !== "ready" || !context.roles.includes("school_admin")) return denied;
  const id = z.uuid().safeParse(form.get("invitationId"));
  const command = z.enum(["send", "revoke"]).safeParse(form.get("command"));
  if (!id.success || !command.success) return { error: "Invalid invitation action.", message: "" };
  const client = await createClient();
  if (command.data === "revoke") {
    const { error } = await client.rpc("revoke_school_invitation", { target_school: context.school.id, target_invitation: id.data });
    revalidatePath("/dashboard");
    return error ? { error: "Invitation could not be revoked. Reload and check its status.", message: "" } : { error: "", message: "Invitation revoked. It cannot grant school access." };
  }
  if (!invitationDeliveryEnabled()) return { error: "Email invitations are not enabled. Complete the account setup guide first.", message: "" };
  const { error } = await client.functions.invoke("invite-school-user", { body: { schoolId: context.school.id, invitationId: id.data } });
  revalidatePath("/dashboard");
  return error ? { error: "Sending was not confirmed. Check the recorded delivery status and function/email configuration before retrying.", message: "" }
    : { error: "", message: "The provider accepted the invitation. Check the recipient inbox to verify delivery." };
}
