import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  assessmentHref,
  type AssessmentMode,
} from "@/lib/assessment-validation";
import { draftSchema, marksHref } from "@/lib/marks-validation";
import { MarksForm } from "./marks-form";
import { FrozenDefinitionForm } from "./frozen-definition-form";
import { z } from "zod";
import { AssessmentReviewForm, ApprovalInvalidationForm } from "./assessment-review-form";

export async function MarksPanel({
  school,
  mode,
  id,
  page,
}: {
  school: string;
  mode: AssessmentMode;
  id: string;
  page: number;
}) {
  let draft;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("read_assessment_draft", {
      target_school: school,
      target_assessment: id,
      staff_mode: mode,
      page_number: page,
    });
    if (!error) draft = draftSchema.safeParse(data).data;
  } catch {
    /* Render the same unavailable state on transport or permission failure. */
  }
  if (!draft)
    return (
      <p role="alert">
        The assessment roster could not be loaded. Check your access and try
        again.
      </p>
    );
  const frozen = draft.revision !== null;
  let submission;
  if (frozen) {
    try {
      const client = await createClient();
      const { data, error } = await client.rpc("read_assessment_submission_status", {
        target_school: school, target_assessment: id, staff_mode: mode,
      });
      if (!error) submission = z.array(z.object({ package_version: z.number().int().positive(),
        status: z.enum(["pending", "approved", "returned", "superseded", "invalidated"]), reason: z.string().nullable() })).max(1).safeParse(data).data;
    } catch { /* Keep the saved marks visible if submission status is unavailable. */ }
  }
  return (
    <section className="content-panel">
      <Link href={assessmentHref(mode)}>Back to assessments</Link>
      <h2>{draft.title}</h2>
      <p>
        {frozen ? "Frozen roster" : "Roster preview"} · Assessment date{" "}
        {draft.date}
      </p>
      <p>
        Scale {draft.minimum}–{draft.maximum} · {draft.precision} decimal places
      </p>
      {frozen && mode === "school_admin" && (
        <Link href={marksHref(mode,id)+"&grantPage=1"}>Manage historical correction access</Link>
      )}{" "}
      {frozen && mode === "school_admin" && (
        <Link href={marksHref(mode, id) + "&rosterChanges=1"}>
          Review roster changes
        </Link>
      )}
      <MarksForm
        key={id + ":" + page + ":" + draft.definition + ":" + draft.revision}
        id={id}
        mode={mode}
        draft={{ ...draft, entries: draft.entries.slice(0, 25) }}
      />
      {draft.revision !== null && mode === "school_admin" &&
        <FrozenDefinitionForm key={id + ":" + draft.revision} initial={{ id, revision: draft.revision,
          date: draft.date, minimum: draft.minimum, maximum: draft.maximum, precision: draft.precision }} />}
      <nav aria-label="Roster pages">
        {page > 1 && (
          <Link href={marksHref(mode, id, page - 1)}>Previous learners</Link>
        )}{" "}
        {draft.entries.length > 25 && (
          <Link href={marksHref(mode, id, page + 1)}>Next learners</Link>
        )}
      </nav>
      {frozen && !submission && <p role="alert">Submission status could not be loaded. Reload before submitting.</p>}
      {submission && draft.revision !== null && <section>
        <h3>Review status</h3>
        <p>{submission[0] ? `Submission ${submission[0].package_version} · ${submission[0].status}` : "This roster has not been submitted."}</p>
        {submission[0]?.reason && <p>Review status note — {submission[0].reason}</p>}
        <p>Changing saved marks or the frozen roster requires a fresh submission and review.</p>
        {submission[0]?.status === "approved" && mode === "school_admin" &&
          <details><summary>Dispute this approval</summary>
            <ApprovalInvalidationForm key={id+":"+submission[0].package_version} id={id} version={submission[0].package_version} />
          </details>}
        {(!submission[0] || ["returned", "superseded", "invalidated"].includes(submission[0].status)) &&
          <AssessmentReviewForm key={id+":"+draft.revision+":"+(submission[0]?.package_version ?? 0)}
            kind="submit" id={id} mode={mode} version={draft.revision} previous={submission[0]?.package_version ?? 0} />}
      </section>}
    </section>
  );
}
