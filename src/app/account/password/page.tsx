import { redirect } from "next/navigation";
import { AccountPage } from "@/components/account-page";
import { PasswordForm } from "@/components/account-forms";
import { isPortalConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Set password" };
export default async function Password({ searchParams }: { searchParams: Promise<{ flow?: string }> }) {
  if (!isPortalConfigured()) redirect("/login");
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const { flow } = await searchParams;
  return <AccountPage title="Set your password"><PasswordForm flow={flow === "invite" ? "invite" : "recovery"} /></AccountPage>;
}
