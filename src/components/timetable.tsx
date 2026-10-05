"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { RecordSearchSelect } from "./record-search-select";
import type { RecordChoice } from "@/lib/record-search";
import { PlanningPagination } from "./planning-pagination";
import { saveLesson, removeLesson } from "@/app/dashboard/timetable/actions";
import {
  weekdays,
  minuteLabel,
  type LessonRow,
  type LessonAssignment,
} from "@/lib/timetable-validation";
function RemoveLesson({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeLesson, {
    error: "",
    saved: false,
  });
  return (
    <details className="record-editor">
      <summary>Remove recurring lesson</summary>
      <form action={action} className="access-form">
        <input type="hidden" name="id" value={id} />
        <label>
          <span>
            <input
              type="checkbox"
              name="confirm"
              value="yes"
              required
              disabled={pending}
            />{" "}
            Remove this lesson for its entire date range
          </span>
        </label>
        {state.error && (
          <p role="alert" className="error-message">
            {state.error}
          </p>
        )}
        <button className="button secondary" disabled={pending}>
          {pending ? "Removing…" : "Remove lesson"}
        </button>
      </form>
    </details>
  );
}
export function Timetable({
  assignments,
  lessons,
  timezone,
  page,
  hasNext,
  filter,
}: {
  assignments: LessonAssignment[];
  lessons: LessonRow[];
  timezone: string;
  page: number;
  hasNext: boolean;
  filter: string;
}) {
  const [assignment, setAssignment] = useState<RecordChoice | null>(null);
  const [filterChoice, setFilterChoice] = useState(filter);
  const [state, action, pending] = useActionState(saveLesson, {
    error: "",
    saved: false,
  });
  const currentFilter = assignments.find((a) => a.id === filter);
  return (
    <>
      <div className="quiet-note">
        <p>
          Weekly lessons in {timezone}. This is an administrator planning view.
          Holidays, rotating weeks, rooms and shared co-teaching lessons are not
          included yet.
        </p>
      </div>
      <div className="academic-grid">
        <section className="content-panel" id="timetable">
          <h2>Weekly timetable</h2>
          <p className="small muted">
            Showing up to 50 recurring lessons on this page, not the complete
            weekly schedule. Saving still checks conflicts against all lessons.
          </p>
          {filter && (
            <p className="small muted">
              Filtered assignment:{" "}
              {assignments.find((a) => a.id === filter)?.label ??
                "Unavailable assignment"}
              . <Link href="/dashboard?view=timetable">Clear filter</Link>
            </p>
          )}
          <p className="small muted">Search by teacher name/reference, subject, class, grade or year.</p>
          <form action="/dashboard" method="get" className="access-form">
            <input type="hidden" name="view" value="timetable" />
            <input type="hidden" name="assignment" value={filterChoice} />
            <RecordSearchSelect
              kind="teaching_assignments"
              name="filterChoice"
              label="Filter by teaching assignment"
              required={false}
              emptyLabel="All assignments"
              initialChoice={filter ? {
                id: filter,
                label: currentFilter?.label ?? "Unavailable assignment",
              } : null}
              onChange={(choice) => setFilterChoice(choice?.id ?? "")}
            />
            <button className="button secondary">Apply filter</button>
          </form>
          {weekdays.map((day, i) => (
            <section key={day} style={{ marginTop: 20 }}>
              <h3>{day}</h3>
              <ul className="academic-list">
                {lessons
                  .filter((l) => l.weekday === i + 1)
                  .map((l) => (
                    <li key={l.id}>
                      <strong>
                        {minuteLabel(l.start_minute)}–
                        {minuteLabel(l.end_minute)}
                      </strong>
                      <span>
                        {assignments.find((a) => a.id === l.assignment_id)
                          ?.label ?? "Assignment unavailable"}
                      </span>
                      <span>
                        {l.starts_on} – {l.ends_on}
                      </span>
                      <RemoveLesson id={l.id} />
                    </li>
                  ))}
              </ul>
              {!lessons.some((l) => l.weekday === i + 1) && (
                <p className="small muted">No lessons on this page.</p>
              )}
            </section>
          ))}
          <PlanningPagination
            view="timetable"
            page={page}
            hasNext={hasNext}
            assignment={filter}
          />
        </section>
        <section className="content-panel">
          <h2>Add a weekly lesson</h2>
          <form action={action} className="access-form">
            <input type="hidden" name="assignment_id" value={assignment?.id ?? ""} />
            <RecordSearchSelect
              kind="teaching_assignments"
              name="lessonChoice"
              label="Teaching assignment"
              disabled={pending}
              onChange={setAssignment}
            />
            <label>
              Weekday
              <select name="weekday" defaultValue="1" disabled={pending}>
                {weekdays.map((day, i) => (
                  <option key={day} value={i + 1}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lesson start time
              <input
                type="time"
                name="start_time"
                required
                disabled={pending}
              />
            </label>
            <label>
              Lesson end time
              <input
                type="time"
                name="end_time"
                required
                disabled={pending}
              />
            </label>
            <label>
              Schedule from
              <input
                key={`start-${assignment?.id}`}
                type="date"
                name="starts_on"
                defaultValue={assignment?.startsOn}
                min={assignment?.startsOn}
                max={assignment?.endsOn}
                required
                disabled={pending || !assignment}
              />
            </label>
            <label>
              Schedule until
              <input
                key={`end-${assignment?.id}`}
                type="date"
                name="ends_on"
                defaultValue={assignment?.endsOn}
                min={assignment?.startsOn}
                max={assignment?.endsOn}
                required
                disabled={pending || !assignment}
              />
            </label>
            <p className="small muted">
              Repeats each selected weekday within this inclusive date range.
              Adjacent lessons may share an end/start time.
            </p>
            {state.error && (
              <p role="alert" className="error-message">
                {state.error}
              </p>
            )}
            {state.saved && (
              <p role="status" className="success-message">
                Weekly lesson saved.
              </p>
            )}
            <button
              className="button primary"
              disabled={pending || !assignment}
            >
              {pending ? "Saving…" : "Add weekly lesson"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
