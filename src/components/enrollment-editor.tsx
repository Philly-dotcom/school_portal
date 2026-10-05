"use client";
import { useActionState, useState } from "react";
import { changeEnrollment } from "@/app/dashboard/registers/lifecycle-actions";
import { type EnrollmentRow } from "@/lib/enrollment-validation";
import { RecordSearchSelect } from "./record-search-select";

export function EnrollmentEditor({ row }: { row: EnrollmentRow }) {
  const [kind, setKind] = useState("transfer");
  const [state, action, pending] = useActionState(changeEnrollment, {
    error: "",
    saved: false,
  });
  if (row.record_version === undefined)
    return (
      <p className="small muted">
        Transfers and withdrawals require migration 009.
      </p>
    );
  if (row.closure)
    return (
      <span>
        {row.closure === "transfer"
          ? "Transferred from this class"
          : "Withdrawn from this placement"}{" "}
        · History retained
      </span>
    );
  return (
    <details className="record-editor">
      <summary>Transfer or withdraw</summary>
      <form action={action} className="access-form">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="version" value={row.record_version} />
        <label>
          Enrollment change
          <select
            name="kind"
            value={kind}
            disabled={pending}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="transfer">Transfer to another class</option>
            <option value="withdrawal">Withdraw from this placement</option>
          </select>
        </label>
        {kind === "transfer" && (
          <RecordSearchSelect
            kind="classes"
            name="destination"
            label="Destination class"
            disabled={pending}
            academicYearId={row.academic_year_id}
            excludeId={row.class_id}
          />
        )}
        <label>
          {kind === "transfer"
            ? "First day in the new class"
            : "Last enrolled day"}
          <input
            key={kind}
            type="date"
            name="date"
            required
            min={row.starts_on}
            max={row.ends_on}
            disabled={pending}
          />
        </label>
        <p className="small muted">
          {kind === "transfer"
            ? "Choose a day after this placement starts. The old placement ends the day before; the new placement keeps the existing end date."
            : "The learner remains enrolled through this day. This closes only this placement; their school record and sign-in access stay unchanged."}{" "}
          History is preserved. Reversing this change is not available yet.
        </p>
        <label>
          <input
            key={`confirm-${kind}`}
            type="checkbox"
            name="confirm"
            value="yes"
            required
            disabled={pending}
          />{" "}
          Confirm this enrollment change
        </label>
        {state.error && (
          <p role="alert" className="error-message">
            {state.error}
          </p>
        )}
        {state.saved && (
          <p role="status">Enrollment updated; history retained.</p>
        )}
        <button className="button primary" disabled={pending}>
          {pending ? "Saving…" : "Save enrollment change"}
        </button>
      </form>
    </details>
  );
}
