"use client";
import Link from "next/link";
import { useActionState } from "react";
import { RecordSearchSelect } from "@/components/record-search-select";
import { saveHomework } from "@/app/dashboard/homework/actions";
import { searchHomeworkAssignments } from "@/app/dashboard/homework/search-actions";
import {
  homeworkHref,
  type HomeworkItem,
  type HomeworkStaffMode,
} from "@/lib/homework-validation";

export function HomeworkForm({
  mode,
  item,
}: {
  mode: HomeworkStaffMode;
  item?: HomeworkItem;
}) {
  const [state, action, pending] = useActionState(saveHomework, {
    error: "",
    saved: false,
  });
  if (state.saved)
    return (
      <section className="content-panel">
        <p role="status" className="success-message">
          Homework saved.
        </p>
        <Link href={homeworkHref(mode)} className="button secondary">
          Back to homework
        </Link>
      </section>
    );
  return (
    <form action={action} className="access-form">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="version" value={item?.record_version ?? 0} />
      {item ? (
        <>
          <input type="hidden" name="assignmentId" value={item.assignment_id} />
          <p>{item.assignment_label}</p>
          <p className="muted">
            The assignment stays fixed. Create a separate item for a different
            class or subject.
          </p>
        </>
      ) : (
        <RecordSearchSelect
          kind="teaching_assignments"
          name="assignmentId"
          label="Teaching assignment"
          disabled={pending}
          searchAction={(query, page) =>
            searchHomeworkAssignments(mode, query, page)
          }
        />
      )}
      <label>
        Homework title
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
          rows={8}
          required
          disabled={pending}
        />
      </label>
      <label>
        Due date (school-local date)
        <input
          type="date"
          name="dueDate"
          defaultValue={item?.due_date ?? ""}
          required
          disabled={pending}
        />
      </label>
      <label>
        Visibility after saving
        <select
          name="status"
          defaultValue={item?.status ?? "draft"}
          disabled={pending}
        >
          {!item?.audience_date && (
            <option value="draft">Draft — staff only</option>
          )}
          <option value="published">
            Published — original recipients can read it
          </option>
          {item && (
            <option value="withdrawn">
              Withdrawn — hidden from learners and guardians
            </option>
          )}
        </select>
      </label>
      <p className="muted">
        Publishing takes effect when you save. Learners read homework here; they
        do not submit work through this portal.
      </p>
      {item?.audience_date && (
        <p className="muted">
          Original audience date: {item.audience_date}. Editing or republishing
          keeps the same date.
        </p>
      )}
      {state.error && (
        <p role="alert" className="error-message">
          {state.error}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending ? "Saving…" : "Save homework"}
      </button>
      <Link className="button secondary" href={homeworkHref(mode)}>
        Cancel / return to list
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
