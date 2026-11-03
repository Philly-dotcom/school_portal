"use client";
import { useActionState } from "react";
import { amendRoster } from "@/app/dashboard/marks/actions";
import type { RosterDifference } from "@/lib/marks-validation";

function placementLabel(value: RosterDifference["next_placement"]) {
  return value
    ? value[2] + " to " + value[3] + " (placement version " + value[1] + ")"
    : "No eligible placement";
}

export function AmendmentForm({
  id,
  row,
}: {
  id: string;
  row: RosterDifference;
}) {
  const [message, action, pending] = useActionState(
    async (_: string, form: FormData) =>
      amendRoster(id, row, String(form.get("reason") ?? "")),
    "",
  );
  const effect = !row.next_placement
    ? "Remove from the current roster and retain earlier marks in history."
    : !row.previous_placement
      ? "Add to the roster with a Missing mark."
      : "Update placement evidence and keep the current mark.";
  return (
    <form action={action} className="access-form">
      <fieldset disabled={pending}>
        <legend>
          {row.learner_name} ({row.reference})
        </legend>
        <p>Frozen placement: {placementLabel(row.previous_placement)}</p>
        <p>Current evidence: {placementLabel(row.next_placement)}</p>
        <p>{effect}</p>
        <label>
          Reason for this change
          <input name="reason" required maxLength={500} />
        </label>
        <button className="button primary">
          {pending ? "Applying…" : "Apply this change"}
        </button>
        {message && <p role="status">{message}</p>}
      </fieldset>
    </form>
  );
}
