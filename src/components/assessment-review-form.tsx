"use client";

import { useActionState } from "react";
import { changeAssessmentReview } from "@/app/dashboard/marks/review-actions";
import type { AssessmentMode } from "@/lib/assessment-validation";

type Props = { id: string; mode: AssessmentMode; version: number } &
  ({ kind: "submit"; previous: number } | { kind: "decide" });

export function AssessmentReviewForm(props: Props) {
  const [message, action, pending] = useActionState(changeAssessmentReview, "");
  return <form action={action} className="access-form">
    <fieldset disabled={pending}>
      <legend>{props.kind === "submit" ? "Submit saved roster" : "Review this submission"}</legend>
      <input type="hidden" name="kind" value={props.kind} />
      <input type="hidden" name="mode" value={props.mode} />
      <input type="hidden" name="id" value={props.id} />
      <input type="hidden" name="version" value={props.version} />
      {props.kind === "submit" ? <>
        <input type="hidden" name="previous" value={props.previous} />
        <p>Save your marks first. Submission includes every learner across all roster pages. Missing marks must be resolved.</p>
        <button className="button primary">Submit for review</button>
      </> : <>
        <p>Check every page before deciding. Approval applies to this complete submission.</p>
        <label>Decision<select name="decision" required defaultValue="">
          <option value="" disabled>Choose a decision</option>
          <option value="approved">Approve</option>
          <option value="returned">Return for correction</option>
        </select></label>
        <label>Reason (required when returning work)<textarea name="reason" maxLength={500} /></label>
        <button className="button primary">Save review decision</button>
      </>}
    </fieldset>
    <p role="status">{pending ? "Saving review status…" : message}</p>
  </form>;
}

export function ApprovalInvalidationForm({ id, version }: { id: string; version: number }) {
  const [message, action, pending] = useActionState(changeAssessmentReview, "");
  return <form action={action} className="access-form">
    <fieldset disabled={pending}>
      <legend>Invalidate this approval</legend>
      <input type="hidden" name="kind" value="invalidate" />
      <input type="hidden" name="mode" value="school_admin" />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <p>Use this when the approval itself is disputed. Submission {version} will require fresh submission and review. The original decision stays in history.</p>
      <label>Reason<textarea name="reason" required maxLength={500} /></label>
      <button className="button secondary">Invalidate approval and require review</button>
    </fieldset>
    <p role="status">{pending ? "Saving invalidation…" : message}</p>
  </form>;
}
