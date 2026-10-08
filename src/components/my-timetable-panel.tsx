import Link from "next/link";
import { ChildSelector } from "@/components/child-selector";
import { loadMyTimetable } from "@/lib/my-timetable-data";
import { portalHref, type PortalActor } from "@/lib/portal-validation";
import { minuteLabel, weekdays } from "@/lib/timetable-validation";
import { maxListPage } from "@/lib/list-pagination";

export async function MyTimetablePanel({
  actor,
  page,
}: {
  actor: Extract<PortalActor, { status: "ready" }>;
  page?: string | string[];
}) {
  const childId = actor.mode === "guardian" ? actor.selectedChild?.id : null;
  const needsChild = actor.mode === "guardian" && !childId;
  const result = needsChild ? null : await loadMyTimetable(actor, page);
  return (
    <section className="content-panel">
      <h2>This week’s lessons</h2>
      <p className="muted" style={{ marginTop: 12 }}>
        Shown in the school’s local time for your current teaching assignment or
        class placement.
      </p>
      {actor.mode === "guardian" && (
        <ChildSelector
          learners={actor.children}
          selectedChildId={childId}
          mode="guardian"
          view="my-timetable"
        />
      )}
      {needsChild ? (
        <p>Select a learner to see their timetable.</p>
      ) : !result ? (
        <p role="alert">
          Your timetable could not be loaded. Please reload or contact your
          school administrator.
        </p>
      ) : (
        <>
          {result.rows.length === 0 ? (
            <p>No lessons were found on this page for the current week.</p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 20 }}>
              <table>
                <caption className="sr-only">
                  Lessons for{" "}
                  {actor.mode === "guardian"
                    ? actor.selectedChild?.fullName
                    : actor.person.fullName}
                </caption>
                <thead>
                  <tr>
                    <th>Day / date</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>
                        {weekdays[lesson.weekday - 1]} · {lesson.lesson_date}
                      </td>
                      <td>
                        {minuteLabel(lesson.start_minute)}–
                        {minuteLabel(lesson.end_minute)}
                      </td>
                      <td>{lesson.subject_name}</td>
                      <td>
                        {lesson.grade_name} · {lesson.class_name}
                      </td>
                      <td>{lesson.teacher_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav
            aria-label="Timetable pages"
            className="flex flex-wrap gap-3"
            style={{ marginTop: 20 }}
          >
            {result.page > 1 && (
              <Link
                href={portalHref(
                  "my-timetable",
                  actor.mode,
                  childId,
                  result.page - 1,
                )}
              >
                Previous
              </Link>
            )}
            <span>Page {result.page}</span>
            {result.hasNext && result.page < maxListPage && (
              <Link
                href={portalHref(
                  "my-timetable",
                  actor.mode,
                  childId,
                  result.page + 1,
                )}
              >
                Next
              </Link>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
