"use client";
import { useActionState, useState } from "react";
import { createRegisterRecord } from "@/app/dashboard/registers/actions";
import { personLabels, type PersonKind } from "@/lib/register-validation";

import { RecordSearchSelect } from "./record-search-select";
import type { RecordChoice } from "@/lib/record-search";

function Feedback({
  error,
  saved,
  message,
}: {
  error: string;
  saved: boolean;
  message: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}
    </>
  );
}
export function PersonForm({ kind }: { kind: PersonKind }) {
  const [state, action, pending] = useActionState(createRegisterRecord, {
    error: "",
    saved: false,
  });
  const copy = personLabels[kind];
  return (
    <form action={action} className="access-form">
      <input type="hidden" name="kind" value={kind} />
      <label>
        {copy.singular} full name
        <input
          name="full_name"
          required
          maxLength={120}
          disabled={pending}
          autoComplete="off"
        />
      </label>
      <label>
        {copy.reference}
        <input
          name="reference"
          required
          maxLength={40}
          placeholder={copy.example}
          disabled={pending}
          autoComplete="off"
        />
      </label>
      <p className="small muted">
        Use a school reference, not a national identity number.
      </p>
      <Feedback {...state} message={`${copy.singular} added.`} />
      <button className="button primary" disabled={pending}>
        {pending ? "Saving…" : `Add ${copy.singular.toLowerCase()}`}
      </button>
    </form>
  );
}
export function RelationshipForm({ enrollment }: { enrollment: boolean }) {
  const [state, action, pending] = useActionState(createRegisterRecord, {
    error: "",
    saved: false,
  });
  const [selected, setSelected] = useState<RecordChoice | null>(null);
  return (
    <form action={action} className="access-form">
      <input
        type="hidden"
        name="kind"
        value={enrollment ? "enrollments" : "student_guardians"}
      />
      <RecordSearchSelect
        kind="students"
        name="student_id"
        label="Student"
        disabled={pending}
      />
      {enrollment ? (
        <>
          <RecordSearchSelect
            kind="classes"
            name="class_id"
            label="Class and academic year"
            disabled={pending}
            onChange={setSelected}
          />
          <input
            type="hidden"
            name="academic_year_id"
            value={selected?.academicYearId ?? ""}
          />
          <label>
            Enrollment start date
            <input
              name="starts_on"
              type="date"
              min={selected?.startsOn}
              max={selected?.endsOn}
              required
              disabled={pending || !selected}
            />
          </label>
          <label>
            Enrollment end date
            <input
              name="ends_on"
              type="date"
              min={selected?.startsOn}
              max={selected?.endsOn}
              required
              disabled={pending || !selected}
            />
          </label>
          <p className="small muted">
            Dates must fit within the class year. Use the existing placement’s
            transfer control to change class. With lifecycle support enabled, a
            new placement after withdrawal must start after the previous
            placement ends.
          </p>
        </>
      ) : (
        <>
          <RecordSearchSelect
            kind="guardians"
            name="guardian_id"
            label="Parent / guardian"
            disabled={pending}
          />
          <label>
            Relationship to student
            <input
              name="relationship"
              required
              maxLength={60}
              placeholder="e.g. Parent or legal guardian"
              disabled={pending}
            />
          </label>
          <p className="small muted">
            This records the relationship only. It does not grant portal access
            or establish legal authorization.
          </p>
        </>
      )}
      <Feedback
        {...state}
        message={enrollment ? "Student enrolled." : "Guardian linked."}
      />
      <button
        className="button primary"
        disabled={pending || (enrollment && !selected)}
      >
        {pending ? "Saving…" : enrollment ? "Enroll student" : "Link guardian"}
      </button>
    </form>
  );
}
