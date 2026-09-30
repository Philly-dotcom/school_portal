import { createClient } from "@/lib/supabase/server";
import { classLabel, personLabels, type PersonKind, type PersonRow, type RegisterOptions } from "@/lib/register-validation";
import { PersonForm, RelationshipForm } from "./register-forms";

type LinkRow = { id: string; student_id: string; guardian_id: string; relationship: string };
type EnrollmentRow = { id: string; student_id: string; class_id: string; starts_on: string; ends_on: string };
export async function RegistersPanel({ schoolId }: { schoolId: string }) {
  const client = await createClient();
  const queries = [
    ["students", "id,full_name,reference", "full_name"], ["teachers", "id,full_name,reference", "full_name"],
    ["guardians", "id,full_name,reference", "full_name"], ["classes", "id,name,academic_year_id,grade_id", "name"],
    ["academic_years", "id,name,starts_on,ends_on", "name"], ["grades", "id,name", "name"],
    ["student_guardians", "id,student_id,guardian_id,relationship", "id"],
    ["enrollments", "id,student_id,class_id,starts_on,ends_on", "starts_on"],
  ] as const;
  const results = await Promise.all(queries.map(([table,fields,order]) => client.from(table).select(fields).eq("school_id",schoolId).order(order).order("id").limit(501)));
  if (results.some(r => r.error)) return <section className="content-panel"><h2>School registers are unavailable.</h2><p className="muted">If this is your first visit, apply migration 202610010004_registers.sql to School Portal. Otherwise check your access and connection, then reload.</p></section>;
  const [students,teachers,guardians,classes,years,grades,links,enrollments] = results.map(r => r.data ?? []) as unknown as [PersonRow[],PersonRow[],PersonRow[],RegisterOptions["classes"],RegisterOptions["academic_years"],RegisterOptions["grades"],LinkRow[],EnrollmentRow[]];
  if (results.some(r => (r.data?.length ?? 0) > 500)) return <section className="content-panel"><h2>This register needs pagination.</h2><p className="muted">One of the school lists exceeds this initial version’s 500-record limit. Contact the maintainer to enable larger registers before continuing. Incomplete lists are not shown.</p></section>;
  const people = { students, teachers, guardians };
  const options = { students,guardians,classes,academic_years:years,grades };
  const personName = (rows: PersonRow[], id: string) => { const row = rows.find(r => r.id === id); return row ? `${row.full_name} · ${row.reference}` : "Record unavailable"; };
  return <><div className="quiet-note"><p>School records are separate from sign-in accounts. Adding a person or relationship here sends no email and grants no portal access. This increment supports adding and viewing records; corrections and transfers will follow. Use fictional records while testing.</p></div>
    <div className="academic-grid">{(Object.keys(personLabels) as PersonKind[]).map(kind => <section className="content-panel" key={kind}><h2>{personLabels[kind].title}</h2><ul className="academic-list">{people[kind].map(p => <li key={p.id}><strong>{p.full_name}</strong><span>{personLabels[kind].reference}: {p.reference}</span></li>)}</ul>{!people[kind].length && <p className="muted">No {personLabels[kind].title.toLowerCase()} added yet.</p>}<PersonForm kind={kind} /></section>)}
      <section className="content-panel"><h2>Guardian links</h2><ul className="academic-list">{links.map(l => <li key={l.id}><strong>{personName(students,l.student_id)}</strong><span>{personName(guardians,l.guardian_id)} · {l.relationship}</span></li>)}</ul>{!links.length && <p className="muted">No guardians linked yet.</p>}<RelationshipForm options={options} enrollment={false} /></section>
      <section className="content-panel"><h2>Class enrollment</h2><ul className="academic-list">{enrollments.map(e => { const c = classes.find(c => c.id === e.class_id); return <li key={e.id}><strong>{personName(students,e.student_id)}</strong><span>{c ? classLabel(c,options) : "Class unavailable"}</span><span>{e.starts_on} – {e.ends_on}</span></li>; })}</ul>{!enrollments.length && <p className="muted">No students enrolled yet.</p>}<RelationshipForm options={options} enrollment /></section>
    </div></>;
}
