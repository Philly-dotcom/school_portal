"use client";
import { useActionState } from "react";
import { correctRecord } from "@/app/dashboard/corrections/actions";
import type { CorrectionKind } from "@/lib/correction-validation";

export function RecordEditor({kind,id,version,name,label,reference,referenceLabel}:{
  kind:CorrectionKind;id:string;version?:number;name:string;label:string;reference?:string;referenceLabel?:string;
}) {
  const [state,action,pending]=useActionState(correctRecord,{error:"",saved:false});
  if(!version) return <p className="small muted">Editing requires database update 007.</p>;
  return <details className="record-editor"><summary>Edit {name}</summary>
    <form action={action} className="access-form">
      <input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={id}/>
      <input type="hidden" name="version" value={version}/>
      <label>{label}<input key={`name-${version}`} name="name" defaultValue={name} required maxLength={reference === undefined ? 80 : 120} disabled={pending}/></label>
      {reference !== undefined && <label>{referenceLabel}<input key={`reference-${version}`} name="reference" defaultValue={reference} required maxLength={40} disabled={pending}/></label>}
      <p className="small muted">Correct a typo here. This keeps the same record and its existing links.</p>
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
      {state.saved && <p className="success-message" role="status">Correction saved.</p>}
      <button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save correction"}</button>
    </form>
  </details>;
}
