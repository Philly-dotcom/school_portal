"use client";

import { useActionState } from "react";
import { MailPlus, ShieldCheck } from "lucide-react";
import { changeInvitation, createInvitation, updateMember, type AccessState } from "@/app/dashboard/people/actions";
import { roles, roleLabels, type Role } from "@/lib/permissions";

export type MemberRow = { id: string; user_id: string; display_name: string; status: "active" | "suspended"; access_version: number; roles: Role[] };
export type InvitationRow = { id: string; email: string; display_name: string; roles: Role[]; status: string; delivery_status: string; expires_at: string };
const initial = { error: "", message: "" };
function Feedback({ state }: { state: AccessState }) {
  return <>{state.error && <p className="error-message" role="alert">{state.error}</p>}{state.message && <p className="success-message" role="status">{state.message}</p>}</>;
}
function RoleChoices({ selected = [], disabled = false }: { selected?: Role[]; disabled?: boolean }) {
  return <fieldset className="role-choices" disabled={disabled}><legend>School roles</legend>{roles.map((role) => <label key={role}><input type="checkbox" name="roles" value={role} defaultChecked={selected.includes(role)} />{roleLabels[role]}</label>)}</fieldset>;
}
export function MemberEditor({ member, ownAccount }: { member: MemberRow; ownAccount: boolean }) {
  const [state, action, pending] = useActionState(updateMember, initial);
  return <details className="member-editor"><summary><span className="member-avatar"><ShieldCheck size={20} /></span><span><strong>{member.display_name || "School member"}{ownAccount && " (you)"}</strong><small>{member.roles.map((role) => roleLabels[role]).join(" · ") || "No roles assigned"}</small></span><span className={`access-badge ${member.status}`}>{member.status}</span></summary>
    <form action={action} className="access-form"><input type="hidden" name="membershipId" value={member.id} /><input type="hidden" name="version" value={member.access_version} />
      <RoleChoices selected={member.roles} disabled={pending} /><label>Access status<select name="status" defaultValue={member.status} disabled={pending}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
      <p className="muted small">Suspension removes this school’s access on the next request. It does not delete the account or affect other schools. At least one active School Admin must remain.</p>
      <Feedback state={state} /><button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save access changes"}</button>
    </form></details>;
}
export function InviteForm() {
  const [state, action, pending] = useActionState(createInvitation, initial);
  return <section className="content-panel"><div className="section-heading"><h2>Prepare an invitation</h2><MailPlus size={21} /></div><p className="muted small">Preparing an invitation does not send email or grant access. Review it below, then send when delivery is enabled.</p>
    <form action={action} className="access-form"><label>Full name<input name="name" autoComplete="off" minLength={1} maxLength={120} required disabled={pending} /></label><label>Email address<input name="email" type="email" autoComplete="off" maxLength={254} required disabled={pending} /></label><RoleChoices disabled={pending} /><Feedback state={state} /><button className="button primary" disabled={pending}>{pending ? "Preparing…" : "Prepare invitation"}</button></form>
  </section>;
}
export function InvitationItem({ invitation, canSend, expired }: { invitation: InvitationRow; canSend: boolean; expired: boolean }) {
  const [state, action, pending] = useActionState(changeInvitation, initial);
  const ready = invitation.status === "pending" && !expired;
  return <article className="invitation-item"><div className="section-heading"><div><h3>{invitation.display_name}</h3><p className="muted small">{invitation.email}</p></div><span className="phase-tag">{invitation.status === "pending" && expired ? "expired" : invitation.status}</span></div><p className="small">{invitation.roles.map((role) => roleLabels[role]).join(" · ")}</p><p className="muted small">Delivery: {invitation.delivery_status === "sent" ? "accepted by provider" : invitation.delivery_status} · Expires {invitation.expires_at.slice(0, 10)}</p>
    {(invitation.delivery_status === "sending" || invitation.delivery_status === "failed") && <p className="small muted">An operator should check delivery before creating a replacement. Automatic resend is disabled.</p>}
    {invitation.status === "pending" && <form action={action} className="invitation-actions"><input type="hidden" name="invitationId" value={invitation.id} /><button className="button primary compact" name="command" value="send" disabled={pending || !canSend || !ready || invitation.delivery_status !== "pending"}>Send invitation email</button><button className="button secondary compact" name="command" value="revoke" disabled={pending}>Revoke invitation</button></form>}<Feedback state={state} />
  </article>;
}
