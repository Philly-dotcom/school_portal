"use client";
import { useActionState } from "react";
import { linkRegisterMember } from "@/app/dashboard/registers/link-actions";
import type { LinkKind } from "@/lib/link-validation";

export type LinkableMember = { id: string; name: string };
// `members` must already be limited to active members holding the matching role and not
// linked to a different record of this type (the database enforces all of this again).
export function LoginLink({ kind, id, currentMembershipId, members }: { kind: LinkKind; id: string; currentMembershipId: string | null; members: LinkableMember[] }) {
  const [state, action, pending] = useActionState(linkRegisterMember, { error: "", saved: false });
  return <details className="record-editor"><summary>{currentMembershipId ? "Sign-in linked" : "Link sign-in"}</summary>
    <form action={action} className="access-form"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
      <label>Portal login<select name="membershipId" defaultValue={currentMembershipId ?? ""} disabled={pending}><option value="">No linked login</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <p className="small muted">Once linked, this person can read only their own records after signing in: students see themselves, guardians see their linked children, teachers see the classes they currently teach. Linking sends no email and grants no editing rights. Only members with the matching role are listed.</p>
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
      {state.saved && <p className="success-message" role="status">Saved.</p>}
      <button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save link"}</button>
    </form></details>;
}
