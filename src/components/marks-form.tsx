"use client";

import { useActionState, useEffect, useState } from "react";
import { updateMarkDraft } from "@/app/dashboard/marks/actions";
import type { AssessmentMode } from "@/lib/assessment-validation";
import { markState, type DraftRegister, type MarkChange } from "@/lib/marks-validation";

function SaveProgress() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);
  return slow ? <p role="status">Still waiting for confirmation. If you reload, check the saved version before retrying.{" "}
    <button type="button" onClick={() => window.location.reload()}>Reload saved roster</button>
  </p> : null;
}

export function MarksForm({ id, mode, draft }: { id: string; mode: AssessmentMode; draft: DraftRegister }) {
  const [edits, setEdits] = useState<Record<string, MarkChange>>({});
  const [feedback, action, pending] = useActionState(async () => {
    const result = draft.revision === null
      ? await updateMarkDraft({ id, mode, version: draft.definition, operation: { kind: "freeze" } })
      : await updateMarkDraft({ id, mode, version: draft.revision, operation: { kind: "save", changes: Object.values(edits) } });
    if (result.error) return result.error;
    setEdits({});
    return "Saved.";
  }, "");
  if (!draft.entries.length) return <p>No eligible learners on this page.</p>;
  if (draft.revision === null) {
    return <form action={action}>
      <ul>{draft.entries.map(row => <li key={row.id}>{row.name} ({row.reference})</li>)}</ul>
      <p>Freezing includes all eligible learners across all pages. It locks the definition and preserves their placements on the assessment date.</p>
      {!draft.authorised && <p>The scale needs School Admin authorisation before capture.</p>}
      {draft.today < draft.date && <p>Capture opens on {draft.date} in the school timezone.</p>}
      <button className="button primary" disabled={pending || !draft.authorised || draft.today < draft.date}>
        {pending ? "Freezing…" : "Freeze eligible roster"}
      </button>
      {feedback && <p role="alert">{feedback}</p>}
      {pending && <SaveProgress />}
    </form>;
  }
  return <form action={action} className="access-form">
    <p role="status">Saved draft version {draft.revision}</p>
    <p>Save your changes before moving to another page.</p>
    {draft.entries.map(row => {
      const current = edits[row.id] ?? row;
      const change = (patch: Partial<MarkChange>) => setEdits(previous => ({
        ...previous, [row.id]: { id: row.id, score: current.score, state: current.state, reason: current.reason, ...patch },
      }));
      return <fieldset key={row.id} disabled={pending}>
        <legend>{row.name} ({row.reference})</legend>
        <label>Mark status
          <select value={current.state} onChange={event => {
            const state = markState.parse(event.target.value);
            change({ state, score: state === "scored" ? current.score : null });
          }}>
            <option value="missing">Missing</option><option value="scored">Scored</option>
            <option value="absent">Absent</option><option value="exempt">Exempt</option>
          </select>
        </label>
        {current.state === "scored" && <label>Raw score
          <input type="number" required min={draft.minimum} max={draft.maximum} step={10 ** -draft.precision}
            value={current.score ?? ""} onChange={event => change({ score: event.target.value })} />
        </label>}
        <label>{current.state === "exempt" ? "Exemption reason (required)" : "Staff note (optional)"}
          <input value={current.reason} required={current.state === "exempt"} maxLength={500}
            onChange={event => change({ reason: event.target.value })} />
        </label>
      </fieldset>;
    })}
    <button className="button primary" disabled={pending || !Object.keys(edits).length}>
      {pending ? "Saving…" : "Save changed marks"}
    </button>
    {feedback && <p role="alert">{feedback}</p>}
    {pending && <SaveProgress />}
  </form>;
}
