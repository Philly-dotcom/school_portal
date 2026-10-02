"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { invitationSchema, membershipSchema } from "@/lib/account-validation";
import { invitationDeliveryEnabled } from "@/lib/account-config";
import { parseBulkInvitations } from "@/lib/bulk-invitation";

export type AccessState = { error: string; message: string };
const denied = { error: "Active School Admin access is required.", message: "" };

export async function updateMember(_state: AccessState, form: FormData): Promise<AccessState> {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return denied;
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
  if (!isSchoolAdminContext(context)) return denied;
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
  if (!isSchoolAdminContext(context)) return denied;
  const id = z.uuid().safeParse(form.get("invitationId"));
  const command = z.enum(["send", "revoke", "reset"]).safeParse(form.get("command"));
  if (!id.success || !command.success) return { error: "Invalid invitation action.", message: "" };
  const client = await createClient();
  if (command.data === "revoke") {
    const { error } = await client.rpc("revoke_school_invitation", { target_school: context.school.id, target_invitation: id.data });
    revalidatePath("/dashboard");
    return error ? { error: "Invitation could not be revoked. Reload and check its status.", message: "" } : { error: "", message: "Invitation revoked. It cannot grant school access." };
  }
  if (command.data === "reset") {
    const { error } = await client.rpc("reset_invitation_delivery", { target_school: context.school.id, target_invitation: id.data });
    revalidatePath("/dashboard");
    return error
      ? { error: error.code === "22023" ? "Delivery cannot be reset yet. A send started in the last 10 minutes may still be in progress, and delivered invitations cannot be resent." : "Delivery could not be reset. Reload and check the invitation status.", message: "" }
      : { error: "", message: "Delivery reset. Check the recipient and roles, then send again." };
  }
  if (!invitationDeliveryEnabled()) return { error: "Email invitations are not enabled. Complete the account setup guide first.", message: "" };
  const { error } = await client.functions.invoke("invite-school-user", { body: { schoolId: context.school.id, invitationId: id.data } });
  revalidatePath("/dashboard");
  return error ? { error: "Sending was not confirmed. Check the recorded delivery status and function/email configuration before retrying.", message: "" }
    : { error: "", message: "The provider accepted the invitation. Check the recipient inbox to verify delivery." };
}

export async function bulkInvite(_state: AccessState, form: FormData): Promise<AccessState> {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return denied;
  const parsed = parseBulkInvitations(form.get("list"));
  if (!parsed.ok) return { error: parsed.error, message: "" };
  const client = await createClient();
  const { data, error } = await client.rpc("create_school_invitations_bulk", { target_school: context.school.id, invites: parsed.rows });
  if (error) {
    // Messages for 22023 are written by our SQL ("Row 3: invalid email") and contain no secrets.
    if (error.code === "22023" && /^(Row \d+:|Provide between)/.test(error.message)) return { error: `${error.message}. Nothing was prepared.`, message: "" };
    return { error: error.code === "P0001" ? "Daily bulk limit reached (500 per school per day). Try again tomorrow." : error.code === "42501" ? "Active School Admin access is required." : "The list could not be prepared. Check access and that the bulk-invitation migration is applied.", message: "" };
  }
  const result = Array.isArray(data) ? data[0] as { created_count?: number; skipped_count?: number } | undefined : undefined;
  revalidatePath("/dashboard");
  return { error: "", message: `Prepared ${result?.created_count ?? 0} invitation(s); ${result?.skipped_count ?? 0} already pending were skipped. No email has been sent.` };
}
