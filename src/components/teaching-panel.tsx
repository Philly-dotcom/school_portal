import Link from "next/link";
import { classLabel } from "@/lib/register-validation";
import { loadPlanning } from "@/lib/planning-data";
import { listPage } from "@/lib/list-pagination";
import { TeachingForm } from "./teaching-form";
import { TeachingEditor } from "./teaching-editor";
import { PlanningPagination } from "./planning-pagination";

export async function TeachingPanel({
  schoolId,
  page: requestedPage,
}: {
  schoolId: string;
  page?: string | string[];
}) {
  const page = listPage(requestedPage);
  const data = await loadPlanning(schoolId, "teaching", page);
  if (!data)
    return (
      <section className="content-panel">
        <h2>Teaching assignments are unavailable.</h2>
        <p className="muted">
          Check your access and connection, then reload. For first-time setup,
          apply the teaching-assignment migrations to School Portal.
        </p>
      </section>
    );
  const { assignments, labels } = data;
  return (
    <>
      <div className="quiet-note">
        <p>
          Assign a teacher to a subject and class for a dated period. This
          records teaching responsibility. Once a teacher has an explicitly
          linked active login, current assignments determine their class and
          learner access. Lessons are scheduled separately in Weekly timetable.
          Multiple teachers may share a class and subject.
        </p>
      </div>
      <div className="academic-grid">
        <section className="content-panel" id="teaching">
          <h2>Teaching assignments</h2>
          {!assignments.length && (
            <p className="muted">
              {page === 1
                ? "No teachers assigned yet."
                : "No assignments on this page. Return to an earlier page."}
            </p>
          )}
          <ul className="academic-list">
            {assignments.map((a) => {
              const teacher = labels.teachers.find(
                (row) => row.id === a.teacher_id,
              );
              const cls = labels.classes.find((row) => row.id === a.class_id);
              return (
                <li key={a.id}>
                  <strong>
                    {labels.subjects.find((row) => row.id === a.subject_id)
                      ?.name ?? "Subject unavailable"}
                  </strong>
                  <span>
                    {teacher
                      ? teacher.full_name + " · " + teacher.reference
                      : "Teacher unavailable"}
                  </span>
                  <span>
                    {cls ? classLabel(cls, labels) : "Class unavailable"}
                  </span>
                  <span>
                    {a.starts_on} – {a.ends_on}
                  </span>
                  <TeachingEditor key={a.id + ":" + a.record_version} row={a} />
                </li>
              );
            })}
          </ul>
          <PlanningPagination
            view="teaching"
            page={page}
            hasNext={data.hasNext}
          />
          <p className="small muted">
            End or replace a teacher while keeping the previous assignment.
            Separate periods for the same teacher must not overlap. Subject,
            class and original start-date corrections are not available here.
          </p>
        </section>
        <section className="content-panel">
          <h2>Assign a teacher</h2>
          <TeachingForm />
          <div className="invitation-actions">
            <Link className="button secondary" href="/dashboard?view=registers">
              School registers
            </Link>
            <Link className="button secondary" href="/dashboard?view=academic">
              Academic setup
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
