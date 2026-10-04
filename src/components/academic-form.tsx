"use client";
import { useActionState } from "react";
import { createAcademicRecord } from "@/app/dashboard/academic/actions";
import { type AcademicKind, type AcademicRow } from "@/lib/academic-validation";

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

export function AcademicForm({
  kind,
  years,
  grades,
}: {
  kind: AcademicKind;
  years: AcademicRow[];
  grades: AcademicRow[];
}) {
  const [state, action, pending] = useActionState(createAcademicRecord, {
    error: "",
    saved: false,
  });
  const copy = formCopy[kind];
  const needsYear = kind === "classes" || kind === "academic_terms";
  const blocked =
    (needsYear && !years.length) || (kind === "classes" && !grades.length);
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
          disabled={pending || blocked}
        />
      </label>
      {kind === "grades" && (
        <p className="small muted">
          Use a label such as Grade 10 or Grade R. Grade10 and Grade 10 count as
          the same grade.
        </p>
      )}
      {needsYear && (
        <label>
          Academic year
          <select
            name="academic_year_id"
            required
            defaultValue=""
            disabled={pending || blocked}
          >
            <option value="" disabled>
              Select a year
            </option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === "classes" && (
        <label>
          Grade
          <select
            name="grade_id"
            required
            defaultValue=""
            disabled={pending || blocked}
          >
            <option value="" disabled>
              Select a grade
            </option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {(kind === "academic_years" || kind === "academic_terms") && (
        <>
          <label>
            Start date
            <input
              type="date"
              name="starts_on"
              required
              disabled={pending || blocked}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              name="ends_on"
              required
              disabled={pending || blocked}
            />
          </label>
        </>
      )}
      {blocked && (
        <p className="muted">
          Create an academic year{kind === "classes" ? " and grade" : ""} first.
        </p>
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
      <button className="button primary" disabled={pending || blocked}>
        {pending ? "Saving…" : copy.button}
      </button>
    </form>
  );
}
