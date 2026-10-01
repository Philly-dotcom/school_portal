"use client";
import { useActionState, useState } from "react";
import { createRegisterRecord } from "@/app/dashboard/registers/actions";
import { classLabel, personLabels, type PersonKind, type RegisterOptions } from "@/lib/register-validation";

function Feedback({ error, saved, message }: { error: string; saved: boolean; message: string }) {
  return <>{error && <p role="alert" className="error-message">{error}</p>}{saved && <p role="status" className="success-message">{message}</p>}</>;
}
export function PersonForm({ kind }: { kind: PersonKind }) {
  const [state, action, pending] = useActionState(createRegisterRecord, { error: "", saved: false });
  const copy = personLabels[kind];
  return <form action={action} className="access-form"><input type="hidden" name="kind" value={kind} />
    <label>{copy.singular} full name<input name="full_name" required maxLength={120} disabled={pending} autoComplete="off" /></label>
    <label>{copy.reference}<input name="reference" required maxLength={40} placeholder={copy.example} disabled={pending} autoComplete="off" /></label>
    <p className="small muted">Use a school reference, not a national identity number.</p>
    <Feedback {...state} message={`${copy.singular} added.`} />
    <button className="button primary" disabled={pending}>{pending ? "Saving…" : `Add ${copy.singular.toLowerCase()}`}</button>
  </form>;
}
export function RelationshipForm({ options, enrollment }: { options: RegisterOptions; enrollment: boolean }) {
  const [state, action, pending] = useActionState(createRegisterRecord, { error: "", saved: false });
  const [classId, setClassId] = useState("");
  const selected = options.classes.find(c => c.id === classId);
  const year = options.academic_years.find(y => y.id === selected?.academic_year_id);
  const blocked = !options.students.length || (enrollment ? !options.classes.length : !options.guardians.length);
  return <form action={action} className="access-form"><input type="hidden" name="kind" value={enrollment ? "enrollments" : "student_guardians"} />
    <label>Student<select name="student_id" required defaultValue="" disabled={pending || blocked}><option value="" disabled>Select a student</option>{options.students.map(s => <option key={s.id} value={s.id}>{s.full_name} · {s.reference}</option>)}</select></label>
    {enrollment ? <>
      <label>Class and academic year<select name="class_id" required value={classId} onChange={e => setClassId(e.target.value)} disabled={pending || blocked}><option value="" disabled>Select a class</option>{options.classes.map(c => <option key={c.id} value={c.id}>{classLabel(c,options)}</option>)}</select></label>
      <input type="hidden" name="academic_year_id" value={selected?.academic_year_id ?? ""} />
      <label>Enrollment start date<input name="starts_on" type="date" min={year?.starts_on} max={year?.ends_on} required disabled={pending || blocked || !year} /></label>
      <label>Enrollment end date<input name="ends_on" type="date" min={year?.starts_on} max={year?.ends_on} required disabled={pending || blocked || !year} /></label>
      <p className="small muted">Dates must fit within the class year. Use the existing placement’s transfer control to change class. With lifecycle support enabled, a new placement after withdrawal must start after the previous placement ends.</p>
    </> : <>
      <label>Parent / guardian<select name="guardian_id" required defaultValue="" disabled={pending || blocked}><option value="" disabled>Select a guardian</option>{options.guardians.map(g => <option key={g.id} value={g.id}>{g.full_name} · {g.reference}</option>)}</select></label>
      <label>Relationship to student<input name="relationship" required maxLength={60} placeholder="e.g. Parent or legal guardian" disabled={pending || blocked} /></label>
      <p className="small muted">This records the relationship only. It does not grant portal access or establish legal authorization.</p>
    </>}
    {blocked && <p className="muted">Add a student and {enrollment ? "a class in Academic setup" : "a guardian"} first.</p>}
    <Feedback {...state} message={enrollment ? "Student enrolled." : "Guardian linked."} />
    <button className="button primary" disabled={pending || blocked || (enrollment && !year)}>{pending ? "Saving…" : enrollment ? "Enroll student" : "Link guardian"}</button>
  </form>;
}
