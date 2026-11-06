"use client";

import { useActionState, useState } from "react";
import { reviewFrozenDefinition, type DefinitionPreview, type Proposal } from "@/app/dashboard/marks/definition-actions";

const effects = { keep: "Retain placement", add: "Add with Missing mark", remove: "Remove and retain mark history", update: "Update placement evidence" };
type Review = { preview: DefinitionPreview; proposal: Proposal; page: number };

export function FrozenDefinitionForm({ initial }: { initial: Proposal }) {
  const [review,setReview] = useState<Review | null>(null);
  const [message,action,pending] = useActionState(async (_:string, form:FormData) => {
    const intent=form.get("intent");
    if (intent==="edit") { setReview(null); return ""; }
    const proposal=review?.proposal ?? {...initial,date:String(form.get("date")),minimum:String(form.get("minimum")),
      maximum:String(form.get("maximum")),precision:Number(form.get("precision"))};
    const page=review ? review.page+(intent==="next"?1:intent==="previous"?-1:0) : 1;
    const result=await reviewFrozenDefinition(proposal,page,intent==="apply" && review
      ? {token:review.preview.token, reason:String(form.get("reason") ?? "")} : undefined);
    if ("error" in result) return result.error;
    if ("saved" in result) {setReview(null); return "Amendment saved. The new definition and roster are active.";}
    if (review && review.preview.token!==result.preview.token) {setReview(null); return "The impact changed. Start a fresh preview.";}
    setReview({proposal,preview:result.preview,page});
    return "";
  },"");
  return <details><summary>Amend frozen date or scale</summary>
    <form action={action} className="access-form"><fieldset disabled={pending}>
      {!review ? <>
        <legend>Proposed definition</legend>
        <label>Assessment date<input type="date" name="date" required defaultValue={initial.date}/></label>
        <label>Minimum<input name="minimum" type="number" min="0" step="any" required defaultValue={initial.minimum}/></label>
        <label>Maximum<input name="maximum" type="number" min="0" step="any" required defaultValue={initial.maximum}/></label>
        <label>Decimal places<input name="precision" type="number" min="0" max="6" required defaultValue={initial.precision}/></label>
        <button className="button secondary" name="intent" value="preview">Preview impact</button>
      </> : <>
        <legend>Review the proposed amendment</legend>
        <p>{initial.date} → {review.proposal.date}. Scale {initial.minimum}–{initial.maximum} ({initial.precision} decimal places) → {review.proposal.minimum}–{review.proposal.maximum} ({review.proposal.precision} decimal places).</p>
        <p>{review.preview.eligible} eligible after amendment. {review.preview.blocked} incompatible retained scores.</p>
        <ul>{review.preview.rows.map(row=><li key={row.id}>{row.full_name} ({row.reference}) · {effects[row.effect]}
          {row.score!==null && " · Raw score "+row.score}{row.incompatible && " · Outside proposed scale or precision"}</li>)}</ul>
        {review.page>1 && <button formNoValidate name="intent" value="previous">Previous learners</button>}
        {review.page*25<review.preview.total && <button formNoValidate name="intent" value="next">Next learners</button>}
        <button formNoValidate name="intent" value="edit">Change proposal</button>
        {review.preview.blocked || !review.preview.eligible ? <p>Resolve the eligibility or score conflicts before applying.</p> : <>
          <label>Reason for amendment<input name="reason" required maxLength={500}/></label>
          <button className="button primary" name="intent" value="apply">Authorise scale and apply amendment</button>
        </>}
      </>}
    </fieldset><p role="status">{pending ? "Working…" : message}</p></form>
  </details>;
}
