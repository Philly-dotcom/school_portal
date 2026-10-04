"use client";
import { useActionState } from "react";
import { setGuardianAccess } from "@/app/dashboard/registers/link-actions";

export function GuardianAccess({
  id,
  version,
  enabled,
}: {
  id: string;
  version: number;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(setGuardianAccess, {
    error: "",
    saved: false,
  });
  return (
    <form action={action} className="access-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <p className="small">
        Child portal access: {enabled ? "Granted" : "Not granted"}. The guardian
        also needs an active linked login.
      </p>
      <label>
        <input type="checkbox" name="confirmed" value="yes" required /> I
        verified this guardian’s authority to access this child.
      </label>
      {state.error && (
        <p role="alert" className="error-message">
          {state.error}
        </p>
      )}
      {state.saved && <p role="status">Access updated.</p>}
      <button className="button secondary" disabled={pending}>
        {enabled ? "Revoke child access" : "Grant child access"}
      </button>
    </form>
  );
}
