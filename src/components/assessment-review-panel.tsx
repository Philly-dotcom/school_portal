import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assessmentHref, type AssessmentMode } from "@/lib/assessment-validation";
import { AssessmentReviewForm } from "./assessment-review-form";

const reviewStatus = z.enum(["pending", "approved", "returned", "superseded", "invalidated"]);
const listing = z.array(z.object({ id: z.uuid(), title: z.string(), package_version: z.number(), status: reviewStatus })).max(26);
const details = z.object({
  id: z.uuid(), title: z.string(), instructions: z.string(), scope: z.string(), package: z.number(), status: reviewStatus,
  definition: z.number(), draft: z.number(), date: z.string(), minimum: z.string(), maximum: z.string(), precision: z.number(),
  reason: z.string().nullable(), invalidationReason: z.string().nullable().optional(), definitionChanged: z.boolean(),
  changes: z.object({ added: z.number(), removed: z.number(), changed: z.number() }),
  entries: z.array(z.object({ id: z.uuid(), name: z.string(), reference: z.string(),
    state: z.enum(["scored", "absent", "exempt"]), score: z.string().nullable(), reason: z.string(),
    mark_version: z.number(), changed: z.boolean(),
    placement: z.tuple([z.uuid(), z.number(), z.iso.date(), z.iso.date()]),
  })).max(26),
});

export async function AssessmentReviewPanel({ school, mode, id, page }: {
  school: string; mode: AssessmentMode; id?: string; page: number;
}) {
  const base = assessmentHref(mode);
  let rows: z.infer<typeof listing> | undefined;
  let item: z.infer<typeof details> | undefined;
  try {
    const client = await createClient();
    if (!id) {
      const { data, error } = await client.rpc("list_assessment_reviews", { target_school: school, staff_mode: mode, page_number: page });
      if (!error) rows = listing.safeParse(data).data;
    } else {
      const { data, error } = await client.rpc("read_assessment_review", {
        target_school: school, target_submission: id, staff_mode: mode, page_number: page,
      });
      if (!error) item = details.safeParse(data).data;
    }
  } catch { /* Show the same unavailable state for failed or denied reads. */ }
  if (rows) {
      return <section className="content-panel">
        <Link href={base}>Back to assessments</Link><h2>Assessment reviews</h2>
        <p>Submissions within your current reviewer grants appear here.</p>
        {!rows.length && <p>No submissions match your current reviewer access.</p>}
        <ul>{rows.slice(0, 25).map(row => <li key={row.id}>
          <Link href={base + "&review=" + row.id}>{row.title} · Submission {row.package_version} · {row.status}</Link>
        </li>)}</ul>
        <nav aria-label="Review pages">
          {page > 1 && <Link href={base + "&reviewPage=" + (page - 1)}>Previous reviews</Link>}{" "}
          {rows.length > 25 && <Link href={base + "&reviewPage=" + (page + 1)}>Next reviews</Link>}
        </nav>
      </section>;
    }
  if (item && id) {
    const pageHref = base + "&review=" + id + "&reviewPage=";
    return <section className="content-panel">
      <Link href={base + "&reviewPage=1"}>Back to assessment reviews</Link>
      <h2>{item.title}</h2><p>Submission {item.package} · {item.status}</p>
      <p>{item.scope}</p>
      <p>{item.instructions}</p>
      <p>Assessment date {item.date} · Scale {item.minimum}–{item.maximum} · {item.precision} decimal places</p>
      <p>Definition version {item.definition} · Saved roster version {item.draft}</p>
      {item.package === 1
        ? <p>First submission · {item.changes.added} learners on the original review roster.</p>
        : <p>Compared with submission {item.package - 1}, {item.changes.added} learners added, {item.changes.removed} removed and {item.changes.changed} changed.</p>}
      {item.definitionChanged && <p>The assessment definition or scale has changed. Review the whole roster against this scale.</p>}
      {item.reason && <p>Original review reason — {item.reason}</p>}
      {item.invalidationReason && <p>Approval invalidated — {item.invalidationReason}</p>}
      <ul>{item.entries.slice(0, 25).map(row => <li key={row.id}>
        <strong>{row.name} ({row.reference})</strong> — {row.state === "scored" ? row.score : row.state}
        {item.package > 1 && row.changed && " · Added or changed"}{row.reason && <p>{row.reason}</p>}
        <details>
          <summary>Submitted mark and enrolment details</summary>
          <p>Mark version {row.mark_version} · Enrolment version {row.placement[1]}</p>
          <p>Enrolment dates at submission: {row.placement[2]} to {row.placement[3]}</p>
        </details>
      </li>)}</ul>
      <nav aria-label="Submitted roster pages">
        {page > 1 && <Link href={pageHref + (page - 1)}>Previous learners</Link>}{" "}
        {item.entries.length > 25 && <Link href={pageHref + (page + 1)}>Next learners</Link>}
      </nav>
      {item.status === "pending" && <AssessmentReviewForm key={id} kind="decide" id={id} mode={mode} version={item.package} />}
      <p>Approval records the review decision. Learner results require separate School Admin publication.</p>
    </section>;
  }
  return <p role="alert">Reviews could not be loaded. Check your reviewer access and try again.</p>;
}
