import Link from "next/link";
import { z } from "zod";
import { assessmentHref } from "@/lib/assessment-validation";
import { createClient } from "@/lib/supabase/server";
import { ReviewerGrantForm } from "./reviewer-grant-form";

const grants = z.array(z.object({ id: z.uuid(), reviewer: z.string(), scope_label: z.string(),
  starts_on: z.iso.date().nullable(), ends_on: z.iso.date().nullable() })).max(26);

export async function ReviewerGrantList({ school, page }: { school: string; page: number }) {
  const base = assessmentHref("school_admin");
  let rows: z.infer<typeof grants> | undefined;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("list_assessment_reviewer_grants", { target_school: school, page_number: page });
    if (!error) rows = grants.safeParse(data).data;
  } catch { /* Render the unavailable state. */ }
  return <section className="content-panel">
    <Link href={base}>Back to assessments</Link>
    <h2>Assessment reviewer grants</h2>
    <p>Current and upcoming grants. To grant access, open an assessment with the intended year, term, class and subject.</p>
    {!rows && <p role="alert">Could not load reviewer grants. Check your access and try again.</p>}
    {rows?.length === 0 && <p>No grants on this page.</p>}
    {rows?.slice(0,25).map(row => <article key={row.id}>
      <h3>{row.reviewer}</h3><p>{row.scope_label}</p>
      <p>{row.starts_on ?? "No start limit"} · {row.ends_on ?? "No end limit"}</p>
      <ReviewerGrantForm grant={row.id} />
    </article>)}
    <nav aria-label="Reviewer grant pages">
      {page > 1 && <Link href={base+"&reviewersPage="+(page-1)}>Previous grants</Link>}{" "}
      {rows && rows.length > 25 && <Link href={base+"&reviewersPage="+(page+1)}>Next grants</Link>}
    </nav>
  </section>;
}
