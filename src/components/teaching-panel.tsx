import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { classLabel } from "@/lib/register-validation";
import type { TeachingOptions } from "@/lib/teaching-validation";
import { TeachingForm } from "./teaching-form";
type Assignment = { id:string; teacher_id:string; subject_id:string; class_id:string; starts_on:string; ends_on:string };
export async function TeachingPanel({schoolId}:{schoolId:string}) {
  const client = await createClient();
  const queries = [
    ["teachers","id,full_name,reference","full_name"], ["subjects","id,name","name"],
    ["classes","id,name,academic_year_id,grade_id","name"], ["academic_years","id,name,starts_on,ends_on","name"],
    ["grades","id,name","name"], ["teaching_assignments","id,teacher_id,subject_id,class_id,starts_on,ends_on","starts_on"],
  ] as const;
  const results = await Promise.all(queries.map(([table,fields,order])=>client.from(table).select(fields).eq("school_id",schoolId).order(order).order("id").limit(501)));
  if(results.some(r=>r.error)) return <section className="content-panel"><h2>Teaching assignments are unavailable.</h2><p className="muted">For first-time setup, apply migration 202610010005_teaching_assignments.sql to School Portal. Otherwise check your access and connection, then reload.</p></section>;
  if(results.some(r=>(r.data?.length ?? 0)>500)) return <section className="content-panel"><h2>This list needs pagination.</h2><p className="muted">A related list exceeds the initial 500-record limit. Contact the maintainer before continuing; incomplete lists are not shown.</p></section>;
  const [teachers,subjects,classes,academic_years,grades,assignments] = results.map(r=>r.data ?? []) as unknown as [TeachingOptions["teachers"],TeachingOptions["subjects"],TeachingOptions["classes"],TeachingOptions["academic_years"],TeachingOptions["grades"],Assignment[]];
  const options = {teachers,subjects,classes,academic_years,grades};
  return <><div className="quiet-note"><p>Assign a teacher to a subject and class for a dated period. This records teaching responsibility. Once a teacher has an explicitly linked active login, current assignments determine their class and learner access. Lessons are scheduled separately in Weekly timetable. Multiple teachers may share a class and subject.</p></div><div className="academic-grid">
    <section className="content-panel"><h2>Teaching assignments</h2>{!assignments.length && <p className="muted">No teachers assigned yet.</p>}<ul className="academic-list">{assignments.map(a=>{const t=teachers.find(t=>t.id===a.teacher_id);const c=classes.find(c=>c.id===a.class_id);return <li key={a.id}><strong>{subjects.find(s=>s.id===a.subject_id)?.name ?? "Subject unavailable"}</strong><span>{t ? `${t.full_name} · ${t.reference}` : "Teacher unavailable"}</span><span>{c ? classLabel(c,options) : "Class unavailable"}</span><span>{a.starts_on} – {a.ends_on}</span></li>;})}</ul><p className="small muted">Creation and viewing are available. Schedule lessons in Weekly timetable. Assignment corrections and replacement periods are not available yet.</p></section>
    <section className="content-panel"><h2>Assign a teacher</h2><TeachingForm options={options}/><div className="invitation-actions"><Link className="button secondary" href="/dashboard?view=registers">School registers</Link><Link className="button secondary" href="/dashboard?view=academic">Academic setup</Link></div></section>
  </div></>;
}
