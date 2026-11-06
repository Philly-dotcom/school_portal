"use client";
import { useActionState, useState } from "react";
import { manageCorrectionGrant } from "@/app/dashboard/marks/grant-actions";
import { RecordSearchSelect } from "./record-search-select";

export function CorrectionGrantForm({assessment, grant}: {assessment?:string; grant?:string}) {
  const [message, action, pending] = useActionState(manageCorrectionGrant,"");
  const [scope,setScope] = useState("learner");
  return <form action={action} className="access-form"><fieldset disabled={pending}>
    <legend>{grant ? "Revoke this access" : "Grant historical draft access"}</legend>
    <input type="hidden" name="operation" value={grant ? "revoke" : "issue"} />
    {grant ? <input type="hidden" name="grant" value={grant} /> : <>
      <input type="hidden" name="assessment" value={assessment} />
      <RecordSearchSelect kind="teachers" name="teacher" label="Linked teacher" />
      <label>Access scope<select name="scope" value={scope} onChange={e=>setScope(e.target.value)}>
        <option value="learner">One learner</option><option value="assessment">Entire frozen assessment</option>
      </select></label>
      {scope==="learner" && <RecordSearchSelect kind="students" name="student" label="Learner on the frozen roster" />}
      <label>First day<input type="date" required name="start" /></label>
      <label>Last day<input type="date" required name="end" /></label>
      <label>Reason<input name="reason" maxLength={500} required /></label>
    </>}
    <button className="button secondary">{pending ? "Saving…" : grant ? "Revoke access" : "Grant access"}</button>
    {message && <p role="status">{message}</p>}
  </fieldset></form>;
}
