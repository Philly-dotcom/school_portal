import { AccountPage } from "@/components/account-page";
import { ConfirmationForm } from "@/components/account-forms";
import { confirmationSchema } from "@/lib/account-validation";
import { isPortalConfigured } from "@/lib/config";
export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm your email link", referrer: "no-referrer" as const };
export default async function Confirm({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const parsed = confirmationSchema.safeParse(await searchParams);
  return <AccountPage title="Confirm your email link">{parsed.success && isPortalConfigured() ? <ConfirmationForm hash={parsed.data.token_hash} type={parsed.data.type} /> : <p className="error-message" style={{ marginTop: 24 }}>This link is incomplete or the school is not configured. Request a new email or contact your administrator.</p>}</AccountPage>;
}
