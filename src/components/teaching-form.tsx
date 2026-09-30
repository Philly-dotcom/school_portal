"use client";
import { useActionState, useState } from "react";
import { createTeachingAssignment } from "@/app/dashboard/teaching/actions";
import { classLabel } from "@/lib/register-validation";
import type { TeachingOptions } from "@/lib/teaching-validation";
export function TeachingForm({options}:{options:TeachingOptions}) {
  const [state,action,pending] = useActionState(createTeachingAssignment,{error:"",saved:false});
  const [classId,setClassId] = useState("");
  const selected = options.classes.find(c=>c.id===classId);
  const year = options.academic_years.find(y=>y.id===selected?.academic_year_id);
  const blocked = !options.teachers.length || !options.subjects.length || !options.classes.length;
  return <form action={action} className="access-form">
    <label>Teacher<select name="teacher_id" defaultValue="" required disabled={pending||blocked}><option value="" disabled>Select a teacher</option>{options.teachers.map(t=><option key={t.id} value={t.id}>{t.full_name} · {t.reference}</option>)}</select></label>
    <label>Subject<select name="subject_id" defaultValue="" required disabled={pending||blocked}><option value="" disabled>Select a subject</option>{options.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Class and academic year<select name="class_id" value={classId} onChange={e=>setClassId(e.target.value)} required disabled={pending||blocked}><option value="" disabled>Select a class</option>{options.classes.map(c=><option key={c.id} value={c.id}>{classLabel(c,options)}</option>)}</select></label>
    <input name="academic_year_id" type="hidden" value={selected?.academic_year_id ?? ""} />
    <label>Assignment start date<input type="date" name="starts_on" required min={year?.starts_on} max={year?.ends_on} disabled={pending||!year||blocked} /></label>
    <label>Assignment end date<input type="date" name="ends_on" required min={year?.starts_on} max={year?.ends_on} disabled={pending||!year||blocked} /></label>
    {year && <p className="small muted">Dates must be within {year.starts_on} – {year.ends_on}.</p>}
    {blocked && <p className="muted">Add a teacher in School registers and a subject and class in Academic setup first.</p>}
    {state.error && <p role="alert" className="error-message">{state.error}</p>}
    {state.saved && <p role="status" className="success-message">Teaching assignment created.</p>}
    <button className="button primary" disabled={pending||blocked||!year}>{pending ? "Saving…" : "Assign teacher"}</button>
  </form>;
}
