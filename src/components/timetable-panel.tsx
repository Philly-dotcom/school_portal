import Link from "next/link";
import { classLabel } from "@/lib/register-validation";
import { loadPlanning } from "@/lib/planning-data";
import { listPage } from "@/lib/list-pagination";
import { timetableFilter } from "@/lib/planning-pagination";
import { Timetable } from "./timetable";

export async function TimetablePanel({
  schoolId,
  timezone,
  page: requestedPage,
  assignment,
}: {
  schoolId: string;
  timezone: string;
  page?: string | string[];
  assignment?: string | string[];
}) {
  const page = listPage(requestedPage);
  const filter = timetableFilter(assignment);
  if (!filter.valid)
    return (
      <section className="content-panel">
        <h2>Invalid timetable filter</h2>
        <p>Choose a teaching assignment from the timetable.</p>
        <Link href="/dashboard?view=timetable">Reset filter</Link>
      </section>
    );
  const data = await loadPlanning(schoolId, "timetable", page, filter.id);
  if (!data)
    return (
      <section className="content-panel">
        <h2>Timetable unavailable</h2>
        <p className="muted">
          The timetable requires database migration 008. If it is already
          applied, check your access and connection, then reload.
        </p>
      </section>
    );
  const choices = data.labeledAssignments.map((a) => {
    const teacher = data.labels.teachers.find((row) => row.id === a.teacher_id);
    const cls = data.labels.classes.find((row) => row.id === a.class_id);
    return {
      id: a.id,
      class_id: a.class_id,
      starts_on: a.starts_on,
      ends_on: a.ends_on,
      label:
        (data.labels.subjects.find((row) => row.id === a.subject_id)?.name ??
          "Subject unavailable") +
        " · " +
        (cls ? classLabel(cls, data.labels) : "Class unavailable") +
        " · " +
        (teacher
          ? teacher.full_name + " (" + teacher.reference + ")"
          : "Teacher unavailable") + ` · ${a.starts_on} – ${a.ends_on}`,
    };
  });
  return (
    <Timetable
      key={page + ":" + filter.id}
      assignments={choices}
      lessons={data.lessons}
      timezone={timezone}
      page={page}
      hasNext={data.hasNext}
      filter={filter.id}
    />
  );
}
