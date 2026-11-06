"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveGradingPolicyDraft } from "@/app/dashboard/assessments/policy-actions";
import { gradingPolicyHref, type GradingPolicyRecord } from "@/lib/grading-policy-validation";
import { RecordSearchSelect } from "./record-search-select";

export function GradingPolicyForm({ id, item }: { id: string; item?: GradingPolicyRecord }) {
  const [draftId] = useState(id);
  const [state, action, pending] = useActionState(saveGradingPolicyDraft, { error: "", saved: false });
  if (state.saved) return <>
    <p role="status">Policy draft saved. It still needs supported rule configuration and School Admin approval before use.</p>
    <Link href={gradingPolicyHref(draftId)}>Open saved policy and history</Link>
  </>;

  return <form action={action} className="access-form">
    <fieldset disabled={pending}>
      <legend>{item ? "Edit policy draft" : "Record a policy draft"}</legend>
      <input type="hidden" name="id" value={draftId} />
      <input type="hidden" name="version" value={item?.version ?? 0} />
      {item ? <>
        <p>{item.scope}</p>
        <p>The year, grade and subject stay attached to this draft and its history. Use a separate draft for a different scope.</p>
        <input type="hidden" name="year" value={item.year} />
        <input type="hidden" name="grade" value={item.grade} />
        <input type="hidden" name="subject" value={item.subject} />
      </> : <>
        <RecordSearchSelect kind="academic_years" name="year" label="Academic year" disabled={pending} />
        <RecordSearchSelect kind="grades" name="grade" label="Grade" disabled={pending} />
        <RecordSearchSelect kind="subjects" name="subject" label="Subject" disabled={pending} />
      </>}
      <label>Policy title<input name="title" required maxLength={160} defaultValue={item?.title ?? ""} /></label>
      <label>Effective from<input name="start" type="date" required defaultValue={item?.start ?? ""} /></label>
      <label>Effective until<input name="end" type="date" required defaultValue={item?.end ?? ""} /></label>
      <p>Both dates must fall within the selected academic year. Future-year planning is allowed.</p>
      <label>Source reference (optional while drafting)
        <textarea name="source" maxLength={1000} defaultValue={item?.source ?? ""} />
      </label>
      <p>Record the document title, version or date, and where the school keeps the source.</p>
      <label>School rules and outstanding questions (optional while drafting)
        <textarea name="rules" rows={12} maxLength={12000} defaultValue={item?.rules ?? ""} />
      </label>
      <p>Include the supplied scales, required assessments, weights, rounding, bands and treatment of absent or exempt learners. Mark any undecided details clearly.</p>
      <button className="button primary">{pending ? "Saving…" : "Save policy draft"}</button>
    </fieldset>
    {state.error && <p role="alert">{state.error}</p>}
    <Link href={gradingPolicyHref()}>Back to policy drafts</Link>
  </form>;
}
