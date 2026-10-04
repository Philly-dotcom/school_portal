"use client";
import { useActionState, useState } from "react";
import { changeEnrollment } from "@/app/dashboard/registers/lifecycle-actions";
import { type EnrollmentRow } from "@/lib/enrollment-validation";
import { classLabel, type RegisterOptions } from "@/lib/register-validation";

export function EnrollmentEditor({
  row,
  options,
}: {
  row: EnrollmentRow;
  options: RegisterOptions;
}) {
  const [kind, setKind] = useState("transfer");
  const [state, action, pending] = useActionState(changeEnrollment, {
    error: "",
    saved: false,
  });
  const destinations = options.classes.filter(
    (c) => c.academic_year_id === row.academic_year_id && c.id !== row.class_id,
  );
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
          <label>
            Destination class
            <select
              name="destination"
              defaultValue=""
              required
              disabled={pending}
            >
              <option value="" disabled>
                Select a class in the same year
              </option>
              {destinations.map((c) => (
                <option key={c.id} value={c.id}>
                  {classLabel(c, options)}
                </option>
              ))}
            </select>
          </label>
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
        {kind === "transfer" && !destinations.length && (
          <p className="muted">
            Create another class in the same academic year first.
          </p>
        )}
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
        <button
          className="button primary"
          disabled={pending || (kind === "transfer" && !destinations.length)}
        >
          {pending ? "Saving…" : "Save enrollment change"}
        </button>
      </form>
    </details>
  );
}
