"use client";
import { useActionState, useState } from "react";
import { changeTeachingAssignment } from "@/app/dashboard/teaching/actions";
import type { TeachingAssignment, TeachingOptions } from "@/lib/teaching-validation";

export function TeachingEditor({ row, teachers }: { row: TeachingAssignment; teachers: TeachingOptions["teachers"] }) {
  const [kind, setKind] = useState("end");
  const [state, action, pending] = useActionState(changeTeachingAssignment, { error: "", saved: false });
  if (!row.record_version) return <p className="small muted">Assignment changes are not enabled yet.</p>;
  if (row.closure) return <p className="small muted">{row.closure === "replace" ? "Replaced" : "Ended"} · history retained</p>;
  return <details className="record-editor"><summary>End or replace teacher</summary>
    <form action={action} className="access-form">
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="version" value={row.record_version} />
      <label>Change<select name="kind" value={kind} onChange={e => setKind(e.target.value)} disabled={pending}>
        <option value="end">End assignment</option><option value="replace">Replace teacher</option>
      </select></label>
      <label>{kind === "replace" ? "Replacement teacher’s first day" : "Last teaching day"}
        <input type="date" name="date" min={row.starts_on} max={row.ends_on} required disabled={pending} />
      </label>
      {kind === "replace" && <label>Replacement teacher<select name="teacher" defaultValue="" required disabled={pending}>
        <option value="" disabled>Select another teacher</option>
        {teachers.filter(t => t.id !== row.teacher_id).map(t => <option key={t.id} value={t.id}>{t.full_name} · {t.reference}</option>)}
      </select></label>}
      <p className="small muted">The previous assignment stays in history. A replacement keeps the subject, class and original end date. Existing lessons are not moved: review any lessons extending past the old teacher’s last day in Timetable before saving.</p>
      <label className="checkbox-label"><input type="checkbox" name="confirmed" value="yes" required disabled={pending} />I have reviewed this change and its timetable dates.</label>
      {state.error && <p role="alert" className="error-message">{state.error}</p>}
      {state.saved && <p role="status" className="success-message">Assignment updated; history retained.</p>}
      <button className="button primary" disabled={pending}>{pending ? "Saving…" : "Confirm assignment change"}</button>
    </form>
  </details>;
}
