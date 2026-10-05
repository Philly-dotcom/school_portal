"use client";
import { useActionState } from "react";
import { createAcademicRecord } from "@/app/dashboard/academic/actions";
import { type AcademicKind } from "@/lib/academic-validation";
import { RecordSearchSelect } from "./record-search-select";

const formCopy: Record<
  AcademicKind,
  { label: string; example: string; button: string; success: string }
> = {
  academic_years: {
    label: "Academic year name",
    example: "e.g. 2027",
    button: "Create academic year",
    success: "Academic year created.",
  },
  academic_terms: {
    label: "Term name",
    example: "e.g. Term 1",
    button: "Create term",
    success: "Term created.",
  },
  grades: {
    label: "Grade name",
    example: "e.g. Grade 8",
    button: "Create grade",
    success: "Grade created.",
  },
  subjects: {
    label: "Subject name",
    example: "e.g. Mathematics",
    button: "Create subject",
    success: "Subject created.",
  },
  classes: {
    label: "Class name",
    example: "e.g. 8A",
    button: "Create class",
    success: "Class created.",
  },
};

export function AcademicForm({ kind }: { kind: AcademicKind }) {
  const [state, action, pending] = useActionState(createAcademicRecord, {
    error: "",
    saved: false,
  });
  const copy = formCopy[kind];
  const needsYear = kind === "classes" || kind === "academic_terms";
  return (
    <form action={action} className="access-form">
      <input type="hidden" name="kind" value={kind} />
      <label>
        {copy.label}
        <input
          name="name"
          placeholder={copy.example}
          maxLength={80}
          required
          disabled={pending}
        />
      </label>
      {kind === "grades" && (
        <p className="small muted">Use a label such as Grade 10 or Grade R.</p>
      )}
      {needsYear && (
        <RecordSearchSelect
          kind="academic_years"
          name="academic_year_id"
          label="Academic year"
          disabled={pending}
        />
      )}
      {kind === "classes" && (
        <RecordSearchSelect
          kind="grades"
          name="grade_id"
          label="Grade"
          disabled={pending}
        />
      )}
      {(kind === "academic_years" || kind === "academic_terms") && (
        <>
          <label>
            Start date
            <input type="date" name="starts_on" required disabled={pending} />
          </label>
          <label>
            End date
            <input type="date" name="ends_on" required disabled={pending} />
          </label>
        </>
      )}
      {state.error && (
        <p role="alert" className="error-message">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="success-message">
          {copy.success}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending ? "Saving…" : copy.button}
      </button>
    </form>
  );
}
