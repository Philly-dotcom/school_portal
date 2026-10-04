"use client";
import { useActionState } from "react";
import { linkRegisterMember } from "@/app/dashboard/registers/link-actions";
import type { LinkKind } from "@/lib/link-validation";

export type LinkableMember = { id: string; name: string; disabled?: boolean };
// `members` must already be limited to active members holding the matching role and not
// linked to a different record of this type (the database enforces all of this again).
export function LoginLink({ kind, id, version, currentMembershipId, members }: { kind: LinkKind; id: string; version: number; currentMembershipId: string | null; members: LinkableMember[] }) {
  const [state, action, pending] = useActionState(linkRegisterMember, { error: "", saved: false });
  return <details className="record-editor"><summary>{currentMembershipId ? "Sign-in linked" : "Link sign-in"}</summary>
    <form action={action} className="access-form"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <label>Portal login<select name="membershipId" defaultValue={currentMembershipId ?? ""} disabled={pending}><option value="">No linked login</option>{members.map((m) => <option key={m.id} value={m.id} disabled={m.disabled}>{m.name}</option>)}</select></label>
      <label><input type="checkbox" name="confirmed" value="yes" required /> I verified the account identity and intend to change this register link.</label>
      <p className="small muted">Linking enables role-scoped reading, sends no email and grants no editing rights. Guardians also need an explicit child access grant below. Only active members with the matching role can be selected; an existing inactive link remains visible for removal.</p>
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
      {state.saved && <p className="success-message" role="status">Saved.</p>}
      <button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save link"}</button>
    </form></details>;
}
