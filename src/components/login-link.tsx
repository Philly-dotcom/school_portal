"use client";
import { useActionState, useState } from "react";
import { linkRegisterMember } from "@/app/dashboard/registers/link-actions";
import type { LinkKind } from "@/lib/link-validation";
import { searchRegisterMembers } from "@/app/dashboard/search/member-actions";
import { RecordSearchSelect } from "./record-search-select";
import type { RecordChoice } from "@/lib/record-search";

export function LoginLink({
  kind,
  id,
  version,
  currentMembershipId,
  currentChoice,
}: {
  kind: LinkKind;
  id: string;
  version: number;
  currentMembershipId: string | null;
  currentChoice: RecordChoice | null;
}) {
  const [membershipId, setMembershipId] = useState(currentMembershipId ?? "");
  const [state, action, pending] = useActionState(linkRegisterMember, {
    error: "",
    saved: false,
  });
  return (
    <details className="record-editor">
      <summary>
        {currentMembershipId ? "Sign-in linked" : "Link sign-in"}
      </summary>
      <form action={action} className="access-form">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        {/* Keep the existing link in the payload even while search disables its select. */}
        <input type="hidden" name="membershipId" value={membershipId} />
        <RecordSearchSelect
          kind={kind}
          name="accountChoice"
          label="Portal login"
          required={false}
          emptyLabel="No linked login"
          disabled={pending}
          initialChoice={currentChoice}
          onChange={(choice) => setMembershipId(choice?.id ?? "")}
          searchAction={(query, page) => searchRegisterMembers({ kind, recordId: id, query, page })}
        />
        <label>
          <input type="checkbox" name="confirmed" value="yes" required /> I
          verified the account identity and intend to change this register link.
        </label>
        <p className="small muted">
          Linking enables role-scoped reading, sends no email and grants no
          editing rights. Guardians also need an explicit child access grant
          below. Only active members with the matching role can be selected; an
          existing inactive link remains visible for removal. Search by name or verified email.
        </p>
        {state.error && (
          <p className="error-message" role="alert">
            {state.error}
          </p>
        )}
        {state.saved && (
          <p className="success-message" role="status">
            Saved.
          </p>
        )}
        <button className="button primary" disabled={pending}>
          {pending ? "Saving…" : "Save link"}
        </button>
      </form>
    </details>
  );
}
