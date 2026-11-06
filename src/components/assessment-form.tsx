"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { RecordSearchSelect } from "@/components/record-search-select";
import {
  authoriseAssessmentScale,
  saveAssessment,
  searchAssessmentChoices,
} from "@/app/dashboard/assessments/actions";
import {
  assessmentHref,
  type AssessmentItem,
  type AssessmentMode,
} from "@/lib/assessment-validation";
export function AssessmentForm({
  mode,
  item,
}: {
  mode: AssessmentMode;
  item?: AssessmentItem;
}) {
  const [state, action, pending] = useActionState(saveAssessment, {
    error: "",
    saved: false,
  });
  const [assignment, setAssignment] = useState(item?.assignment_id ?? "");
  if (state.saved)
    return (
      <>
        <p role="status">
          Assessment definition saved. Open the assessment list to see its current scale and roster.
        </p>
        <Link href={assessmentHref(mode)}>Back to assessments</Link>
      </>
    );
  return (
    <form action={action} className="access-form">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="version" value={item?.record_version ?? 0} />
      {item ? (
        <>
          <p>{item.assignment_label}</p>
          <input type="hidden" name="assignmentId" value={item.assignment_id} />
        </>
      ) : (
        <RecordSearchSelect
          kind="teaching_assignments"
          name="assignmentId"
          label="Teaching assignment"
          disabled={pending}
          onChange={(choice) => setAssignment(choice?.id ?? "")}
          searchAction={(q, p) =>
            searchAssessmentChoices(mode, "assignment", null, q, p)
          }
        />
      )}
      {assignment ? (
        <RecordSearchSelect
          key={assignment}
          kind="academic_years"
          name="termId"
          label="Academic term"
          disabled={pending}
          initialChoice={
            item ? { id: item.term_id, label: item.term_label } : undefined
          }
          searchAction={(q, p) =>
            searchAssessmentChoices(mode, "term", assignment, q, p)
          }
        />
      ) : (
        <p>Choose an assignment first, then its academic term.</p>
      )}
      <label>
        Assessment title
        <input
          name="title"
          defaultValue={item?.title ?? ""}
          maxLength={160}
          required
          disabled={pending}
        />
      </label>
      <label>
        Instructions
        <textarea
          name="instructions"
          defaultValue={item?.instructions ?? ""}
          maxLength={10000}
          required
          disabled={pending}
        />
      </label>
      <label>
        Effective eligibility date
        <input
          name="effectiveDate"
          type="date"
          defaultValue={item?.effective_date ?? ""}
          required
          disabled={pending}
        />
      </label>
      <p>
        The date must fall within the term and assignment. Future planning is
        allowed.
      </p>
      <label>
        Minimum score
        <input
          name="minimum"
          type="number"
          min="0"
          max="1000000000"
          step="any"
          defaultValue={item?.minimum ?? ""}
          required
          disabled={pending}
        />
      </label>
      <label>
        Maximum score
        <input
          name="maximum"
          type="number"
          min="0"
          max="1000000000"
          step="any"
          defaultValue={item?.maximum ?? ""}
          required
          disabled={pending}
        />
      </label>
      <label>
        Allowed decimal places (0–6)
        <input
          name="precision"
          type="number"
          min="0"
          max="6"
          step="1"
          defaultValue={item?.decimal_places ?? ""}
          required
          disabled={pending}
        />
      </label>
      {mode === "school_admin" && (
        <label>
          <input type="checkbox" name="authorise" disabled={pending} />I
          authorise this definition’s assessment scale.
        </label>
      )}
      {/* <p>
        Each save retains a new definition version. Its scale needs explicit
        Admin authorisation; previous authorisation is not carried into a new
        version. This is not grading-policy approval.
      </p> */}
      {state.error && <p role="alert">{state.error}</p>}
      <button className="button primary" disabled={pending || !assignment}>
        {pending ? "Saving…" : "Save definition"}
      </button>
      <Link href={assessmentHref(mode)} className="button secondary">
        Return to assessments
      </Link>
      {state.error && (
        <button
          type="button"
          className="button secondary"
          onClick={() => window.location.reload()}
        >
          Reload (discard unsaved edits)
        </button>
      )}
    </form>
  );
}

export function AuthoriseScaleButton({ item }: { item: Pick<AssessmentItem, "id" | "title" | "record_version"> }) {
  const [state, action, pending] = useActionState(
    authoriseAssessmentScale.bind(null, item.id, item.record_version),
    { error: "", saved: false },
  );

  return (
    <form action={action}>
      <button
        type="submit"
        className="button secondary"
        aria-label={`Authorise scale for ${item.title}, version ${item.record_version}`}
        disabled={pending || state.saved}
      >
        {pending ? "Authorising…" : "Authorise scale"}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.saved && <p role="status">Scale authorised.</p>}
    </form>
  );
}
