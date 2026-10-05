"use client";
import { useActionState, useState } from "react";
import { createTeachingAssignment } from "@/app/dashboard/teaching/actions";
import { RecordSearchSelect } from "./record-search-select";
import type { RecordChoice } from "@/lib/record-search";
export function TeachingForm() {
  const [state, action, pending] = useActionState(createTeachingAssignment, {
    error: "",
    saved: false,
  });
  const [selected, setSelected] = useState<RecordChoice | null>(null);
  return (
    <form action={action} className="access-form">
      <RecordSearchSelect
        kind="teachers"
        name="teacher_id"
        label="Teacher"
        disabled={pending}
      />
      <RecordSearchSelect
        kind="subjects"
        name="subject_id"
        label="Subject"
        disabled={pending}
      />
      <RecordSearchSelect
        kind="classes"
        name="class_id"
        label="Class and academic year"
        disabled={pending}
        onChange={setSelected}
      />
      <input
        name="academic_year_id"
        type="hidden"
        value={selected?.academicYearId ?? ""}
      />
      <label>
        Assignment start date
        <input
          type="date"
          name="starts_on"
          required
          min={selected?.startsOn}
          max={selected?.endsOn}
          disabled={pending || !selected}
        />
      </label>
      <label>
        Assignment end date
        <input
          type="date"
          name="ends_on"
          required
          min={selected?.startsOn}
          max={selected?.endsOn}
          disabled={pending || !selected}
        />
      </label>
      {selected && (
        <p className="small muted">
          Dates must be within {selected.startsOn} – {selected.endsOn}.
        </p>
      )}
      {state.error && (
        <p role="alert" className="error-message">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="success-message">
          Teaching assignment created.
        </p>
      )}
      <button className="button primary" disabled={pending || !selected}>
        {pending ? "Saving…" : "Assign teacher"}
      </button>
    </form>
  );
}
