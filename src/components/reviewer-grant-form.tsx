"use client";

import { useActionState } from "react";
import { changeReviewerAccess, searchReviewers } from "@/app/dashboard/marks/reviewer-actions";
import { RecordSearchSelect } from "./record-search-select";
import type { AssessmentItem } from "@/lib/assessment-validation";

type Props = { item: AssessmentItem } | { grant: string };
export function ReviewerGrantForm(props: Props) {
  const [message, action, pending] = useActionState(changeReviewerAccess, "");
  return <form action={action} className="access-form">
    <fieldset disabled={pending}>
      {"item" in props ? <>
        <legend>Grant assessment reviewer access</legend>
        <p>This grant covers every assessment matching this year, term, class and subject.</p>
        <p>{props.item.assignment_label} · {props.item.term_label}</p>
        <input type="hidden" name="kind" value="issue" />
        <input type="hidden" name="assessment" value={props.item.id} />
        <input type="hidden" name="version" value={props.item.record_version} />
        <RecordSearchSelect kind="teachers" name="reviewer" label="Teacher or School Admin account" searchAction={searchReviewers} />
        <label>First day (optional)<input name="start" type="date" /></label>
        <label>Last day (optional)<input name="end" type="date" /></label>
        <p>Leave both dates blank for access until revoked.</p>
        <button className="button primary">Grant reviewer access</button>
      </> : <>
        <legend>Remove this grant</legend>
        <input type="hidden" name="kind" value="revoke" />
        <input type="hidden" name="grant" value={props.grant} />
        <button className="button secondary">Revoke reviewer access</button>
      </>}
    </fieldset>
    <p role="status">{pending ? "Saving…" : message}</p>
  </form>;
}
