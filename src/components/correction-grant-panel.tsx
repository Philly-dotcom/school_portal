import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assessmentHref, type AssessmentMode } from "@/lib/assessment-validation";
import { marksHref } from "@/lib/marks-validation";
import { CorrectionGrantForm } from "./correction-grant-form";

const rowsSchema=z.array(z.object({ id:z.uuid(), assessment_id:z.uuid(), title:z.string(), teacher:z.string(),
  learner:z.string().nullable(), starts_on:z.iso.date(), ends_on:z.iso.date() })).max(26);
export async function CorrectionGrantPanel({school,mode,assessment,page}:{
  school:string; mode:AssessmentMode; assessment?:string; page:number;
}) {
  const base=assessment ? marksHref(mode,assessment) : assessmentHref(mode);
  let rows: z.infer<typeof rowsSchema> | undefined;
  try {
    const client=await createClient();
    const {data,error}=await client.rpc("list_correction_grants",{target_school:school,staff_mode:mode,
      target_assessment:assessment ?? null,page_number:page});
    if (!error) rows=rowsSchema.safeParse(data).data;
  } catch { /* Keep permission and transport failures private. */ }
  return <section className="content-panel">
    <Link href={base}>{assessment ? "Back to draft marks" : "Back to assessments"}</Link>
    <h2>Historical correction access</h2>
    {assessment && mode==="school_admin" && <CorrectionGrantForm assessment={assessment} />}
    {!rows && <p role="alert">Could not load correction access.</p>}
    {rows?.length===0 && <p>No grants on this page.</p>}
    {rows?.slice(0,25).map(row=><article key={row.id}><h3>{row.title}</h3>
      <p>{row.teacher} · {row.learner ?? "Entire assessment"} · {row.starts_on} to {row.ends_on}</p>
      {mode==="teacher" ? <Link href={marksHref(mode,row.assessment_id)}>Open permitted draft marks</Link> : <CorrectionGrantForm grant={row.id} />}
    </article>)}
    <nav aria-label="Correction access pages">
      {page>1 && <Link href={base+"&grantPage="+(page-1)}>Previous grants</Link>}{" "}
      {rows && rows.length>25 && <Link href={base+"&grantPage="+(page+1)}>Next grants</Link>}
    </nav>
  </section>;
}
