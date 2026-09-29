import { AccountPage } from "@/components/account-page";
import { RecoveryForm } from "@/components/account-forms";
import { emailFlowsEnabled } from "@/lib/account-config";
export const dynamic = "force-dynamic";
export const metadata = { title: "Password recovery" };
export default function ForgotPassword() {
  const enabled = emailFlowsEnabled();
  return <AccountPage title="Reset your password"><p className="muted" style={{ marginTop: 16 }}>Request a recovery link for your school account.</p>{!enabled && <p className="login-notice" role="status">Recovery email is not enabled yet. Contact your school administrator.</p>}<RecoveryForm enabled={enabled} /></AccountPage>;
}
