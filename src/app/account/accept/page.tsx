import { redirect } from "next/navigation";
import { AccountPage } from "@/components/account-page";
import { AcceptanceForm } from "@/components/account-forms";
import { isPortalConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Join your school" };
export default async function Accept() {
  if (!isPortalConfigured()) redirect("/login");
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  return <AccountPage title="Join your school"><AcceptanceForm /></AccountPage>;
}
