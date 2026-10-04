"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSchoolId, isPortalConfigured } from "@/lib/config";
import { emailFlowsEnabled, siteOrigin } from "@/lib/account-config";
import { confirmationSchema, passwordSchema } from "@/lib/account-validation";

export type AccountState = { error: string; message: string; revocationPending?: boolean };

export async function requestRecovery(_state: AccountState, form: FormData): Promise<AccountState> {
  if (!emailFlowsEnabled()) return { error: "Password recovery email is not enabled yet. Contact your school administrator.", message: "" };
  const email = z.email().max(254).safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address.", message: "" };
  try {
    const client = await createClient();
    await client.auth.resetPasswordForEmail(email.data, { redirectTo: `${siteOrigin()}/account/password` });
  } catch { /* Keep the response identical for nonexistent accounts and provider failures. */ }
  return { error: "", message: "If the address is eligible and email delivery succeeds, you’ll receive a recovery link. If it doesn’t arrive, contact your school administrator." };
}

export async function confirmEmail(_state: AccountState, form: FormData): Promise<AccountState> {
  if (!isPortalConfigured()) return { error: "Your school is not configured yet.", message: "" };
  const parsed = confirmationSchema.safeParse({ token_hash: form.get("token_hash"), type: form.get("type") });
  if (!parsed.success) return { error: "This link is invalid. Ask for a new email.", message: "" };
  try {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp(parsed.data);
    if (error) return { error: "This link is invalid, expired or already used. Ask for a new email.", message: "" };
  } catch { return { error: "The link could not be verified. Please try again later.", message: "" }; }
  // Fixed destinations: never accept a redirect destination from email parameters.
  redirect(`/account/password?flow=${parsed.data.type}`);
}

export async function changePassword(_state: AccountState, form: FormData): Promise<AccountState> {
  if (!isPortalConfigured()) return { error: "Your school is not configured yet.", message: "" };
  const parsed = passwordSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: "Use a password of 12–128 characters and enter the same password twice.", message: "" };
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { error: "Your session has expired. Open a new recovery link or sign in again.", message: "" };
  let result;
  try { result = await client.auth.updateUser({ password: parsed.data.password }); }
  catch { return { error: "Password update could not be confirmed. Sign in again before retrying.", message: "" }; }
  if (result.error?.code === "reauthentication_needed" || result.error?.code === "reauthentication_not_valid") return { error: "For security, sign out and sign in again before changing your password. If needed, request a fresh recovery link once email is enabled.", message: "" };
  if (result.error) return { error: "The password could not be updated. Use a different password or request a fresh link.", message: "" };
  // Revoke other refresh sessions; existing access JWTs retain their configured lifetime.
  // The current session stays signed in. Report failure without undoing the password change.
  try {
    const revoked = await client.auth.signOut({ scope: "others" });
    if (revoked.error) return revocationWarning;
  } catch { return revocationWarning; }
  if (form.get("flow") === "invite") redirect("/account/accept");
  // A verified session is required for this page, including ordinary signed-in users.
  // Session revocation behaviour is tested separately against the configured Auth project.
  redirect("/dashboard");
}

const revocationWarning: AccountState = { error: "Your password changed, but ending other sessions was not confirmed. Retry below. Existing access tokens may remain valid until their configured expiry.", message: "", revocationPending: true };

export async function revokeOtherSessions(_state: AccountState, form: FormData): Promise<AccountState> {
  if (!isPortalConfigured()) return { error: "Your school is not configured yet.", message: "" };
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { ...revocationWarning, error: "Sign in again before retrying session revocation." };
    const result = await client.auth.signOut({ scope: "others" });
    if (result.error) return revocationWarning;
  } catch { return revocationWarning; }
  redirect(form.get("flow") === "invite" ? "/account/accept" : "/dashboard");
}

export async function acceptInvitation(_state: AccountState): Promise<AccountState> {
  void _state;
  if (!isPortalConfigured()) return { error: "Your school is not configured yet.", message: "" };
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const { error: acceptError } = await client.rpc("accept_school_invitation", { target_school: getSchoolId() });
  if (acceptError) return { error: "No valid invitation could be accepted for this account. It may be expired, revoked, already accepted or awaiting setup. Contact your administrator.", message: "" };
  redirect("/dashboard");
}
