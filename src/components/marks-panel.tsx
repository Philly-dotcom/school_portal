import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assessmentHref, type AssessmentMode } from "@/lib/assessment-validation";
import { draftSchema, marksHref } from "@/lib/marks-validation";
import { MarksForm } from "./marks-form";

export async function MarksPanel({ school, mode, id, page }: {
  school: string; mode: AssessmentMode; id: string; page: number;
}) {
  let draft;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("read_assessment_draft", {
      target_school: school, target_assessment: id, staff_mode: mode, page_number: page,
    });
    if (!error) draft = draftSchema.safeParse(data).data;
  } catch { /* Render the same unavailable state on transport or permission failure. */ }
  if (!draft) return <p role="alert">The assessment roster could not be loaded. Check your access and try again.</p>;
  const frozen = draft.revision !== null;
  return <section className="content-panel">
    <Link href={assessmentHref(mode)}>Back to assessments</Link>
    <h2>{draft.title}</h2>
    <p>{frozen ? "Frozen roster" : "Roster preview"} · Assessment date {draft.date}</p>
    <p>Scale {draft.minimum}–{draft.maximum} · {draft.precision} decimal places</p>
    <MarksForm key={id + ":" + page + ":" + draft.definition + ":" + draft.revision}
      id={id} mode={mode} draft={{...draft, entries: draft.entries.slice(0, 25)}} />
    <nav aria-label="Roster pages">
      {page > 1 && <Link href={marksHref(mode, id, page - 1)}>Previous learners</Link>}{" "}
      {draft.entries.length > 25 && <Link href={marksHref(mode, id, page + 1)}>Next learners</Link>}
    </nav>
  </section>;
}
