"use client";

import { useActionState } from "react";
import { acceptInvitation, revokeOtherSessions, changePassword, confirmEmail, requestRecovery, type AccountState } from "@/app/account/actions";

const initial: AccountState = { error: "", message: "" };
function Feedback({ state }: { state: AccountState }) {
  return <>{state.error && <p className="error-message" role="alert">{state.error}</p>}{state.message && <p className="success-message" role="status">{state.message}</p>}</>;
}
export function RecoveryForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(requestRecovery, initial);
  return <form action={action} className="login-form"><label htmlFor="recovery-email">School account email</label><input id="recovery-email" name="email" type="email" autoComplete="email" required disabled={!enabled || pending} /><Feedback state={state} /><button className="button primary" disabled={!enabled || pending}>{pending ? "Requesting…" : "Request recovery email"}</button></form>;
}
export function ConfirmationForm({ hash, type }: { hash: string; type: "invite" | "recovery" }) {
  const [state, action, pending] = useActionState(confirmEmail, initial);
  return <form action={action} className="login-form"><input type="hidden" name="token_hash" value={hash} /><input type="hidden" name="type" value={type} /><p className="muted">Continue only if you requested this email or expected an invitation from your school. Continuing signs this browser into the account linked to the email.</p><Feedback state={state} /><button className="button primary" disabled={pending}>{pending ? "Verifying…" : "Continue securely"}</button></form>;
}
export function PasswordForm({ flow }: { flow: string }) {
  const [state, action, pending] = useActionState(changePassword, initial);
  if (state.revocationPending) return <><Feedback state={state} /><SessionRetry flow={flow} /></>;
  return <form action={action} className="login-form"><input name="flow" type="hidden" value={flow} /><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} /><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} /><p className="small muted">Use a unique password with at least 12 characters.</p><Feedback state={state} /><button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save password"}</button></form>;
}
export function AcceptanceForm() {
  const [state, action, pending] = useActionState(acceptInvitation, initial);
  return <form action={action} className="login-form"><p className="muted">Your confirmed account email must match an active invitation. Accepting creates your school membership with the roles approved by the School Admin.</p><Feedback state={state} /><button className="button primary" disabled={pending}>{pending ? "Accepting…" : "Accept school invitation"}</button></form>;
}

function SessionRetry({ flow }: { flow: string }) {
  const [state, action, pending] = useActionState(revokeOtherSessions, initial);
  return <form action={action} className="login-form"><input type="hidden" name="flow" value={flow} /><Feedback state={state} /><button className="button primary" disabled={pending}>Retry ending other sessions</button><a href="/login">Return to sign in</a></form>;
}
