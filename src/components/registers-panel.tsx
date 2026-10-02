import { createClient } from "@/lib/supabase/server";
import { classLabel, personLabels, type PersonKind, type PersonRow, type RegisterOptions } from "@/lib/register-validation";
import { PersonForm, RelationshipForm } from "./register-forms";
import { RecordEditor } from "./record-editor";
import { LoginLink } from "./login-link";
import { linkRoleFor } from "@/lib/link-validation";
import type { MemberRow } from "./access-management";
import { EnrollmentEditor } from "./enrollment-editor";
import { type EnrollmentRow } from "@/lib/enrollment-validation";

type LinkRow = { id: string; student_id: string; guardian_id: string; relationship: string };
export async function RegistersPanel({ schoolId }: { schoolId: string }) {
  const client = await createClient();
  const queries = [
    ["students", "id,full_name,reference,record_version,membership_id", "full_name"], ["teachers", "id,full_name,reference,record_version,membership_id", "full_name"],
    ["guardians", "id,full_name,reference,record_version,membership_id", "full_name"], ["classes", "id,name,academic_year_id,grade_id", "name"],
    ["academic_years", "id,name,starts_on,ends_on", "name"], ["grades", "id,name", "name"],
    ["student_guardians", "id,student_id,guardian_id,relationship", "id"],
    ["enrollments", "*", "starts_on"],
  ] as const;
  const [memberResult, results] = await Promise.all([client.rpc("list_school_members", { target_school: schoolId }), Promise.all(queries.map(([table,fields,order]) => client.from(table).select(fields).eq("school_id",schoolId).order(order).order("id").limit(501)))]);
  if (memberResult.error || results.some(r => r.error)) return <section className="content-panel"><h2>School registers are unavailable.</h2><p className="muted">If this is your first visit, apply the register migration 004, record correction migration 007 and register-link migration 010 to School Portal. Otherwise check your access and connection, then reload.</p></section>;
  const [students,teachers,guardians,classes,years,grades,links,enrollments] = results.map(r => r.data ?? []) as unknown as [PersonRow[],PersonRow[],PersonRow[],RegisterOptions["classes"],RegisterOptions["academic_years"],RegisterOptions["grades"],LinkRow[],EnrollmentRow[]];
  if (results.some(r => (r.data?.length ?? 0) > 500)) return <section className="content-panel"><h2>This register needs pagination.</h2><p className="muted">One of the school lists exceeds this initial version’s 500-record limit. Contact the maintainer to enable larger registers before continuing. Incomplete lists are not shown.</p></section>;
  const people = { students, teachers, guardians };
  const members = (memberResult.data ?? []) as MemberRow[];
  const linkable = (kind: PersonKind, rowId: string) => {
    const taken = new Set(people[kind].filter(p => p.id !== rowId && p.membership_id).map(p => p.membership_id));
    return members.filter(m => m.status === "active" && m.roles.includes(linkRoleFor[kind]) && !taken.has(m.id)).map(m => ({ id: m.id, name: m.display_name || "School member" }));
  };
  const options = { students,guardians,classes,academic_years:years,grades };
  const personName = (rows: PersonRow[], id: string) => { const row = rows.find(r => r.id === id); return row ? `${row.full_name} · ${row.reference}` : "Record unavailable"; };
  return <><div className="quiet-note"><p>School records are separate from sign-in accounts. Adding a person or relationship here sends no email and grants no portal access; use “Link sign-in” on a record to let that person read their own information. You can correct names and references, and transfer or withdraw enrollments while keeping their history once migration 009 is applied. Guardian relationship changes will follow. Use fictional records while testing.</p></div>
    <div className="academic-grid">{(Object.keys(personLabels) as PersonKind[]).map(kind => <section className="content-panel" key={kind}><h2>{personLabels[kind].title}</h2><ul className="academic-list">{people[kind].map(p => <li key={p.id}><strong>{p.full_name}</strong><span>{personLabels[kind].reference}: {p.reference}</span><RecordEditor kind={kind} id={p.id} version={p.record_version} name={p.full_name} label={`${personLabels[kind].singular} full name`} reference={p.reference} referenceLabel={personLabels[kind].reference} /><LoginLink key={`${p.id}-${p.record_version}`} kind={kind} id={p.id} currentMembershipId={p.membership_id ?? null} members={linkable(kind, p.id)} /></li>)}</ul>{!people[kind].length && <p className="muted">No {personLabels[kind].title.toLowerCase()} added yet.</p>}<PersonForm kind={kind} /></section>)}
      <section className="content-panel"><h2>Guardian links</h2><ul className="academic-list">{links.map(l => <li key={l.id}><strong>{personName(students,l.student_id)}</strong><span>{personName(guardians,l.guardian_id)} · {l.relationship}</span></li>)}</ul>{!links.length && <p className="muted">No guardians linked yet.</p>}<RelationshipForm options={options} enrollment={false} /></section>
      <section className="content-panel"><h2>Class enrollment</h2><ul className="academic-list">{enrollments.map(e => { const c = classes.find(c => c.id === e.class_id); return <li key={e.id}><strong>{personName(students,e.student_id)}</strong><span>{c ? classLabel(c,options) : "Class unavailable"}</span><span>{e.starts_on} – {e.ends_on}</span><EnrollmentEditor key={`${e.id}-${e.record_version}`} row={e} options={options} /></li>; })}</ul>{!enrollments.length && <p className="muted">No students enrolled yet.</p>}<RelationshipForm options={options} enrollment /></section>
    </div></>;
}
