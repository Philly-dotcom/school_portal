import { createClient } from "@/lib/supabase/server";
import { classLabel } from "@/lib/register-validation";
import type { TeachingOptions } from "@/lib/teaching-validation";
import type { LessonRow } from "@/lib/timetable-validation";
import { Timetable } from "./timetable";
type Assignment = {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  starts_on: string;
  ends_on: string;
};
export async function TimetablePanel({
  schoolId,
  timezone,
}: {
  schoolId: string;
  timezone: string;
}) {
  const client = await createClient();
  const queries = [
    ["teachers", "id,full_name,reference", "full_name"],
    ["subjects", "id,name", "name"],
    ["classes", "id,name,academic_year_id,grade_id", "name"],
    ["academic_years", "id,name,starts_on,ends_on", "name"],
    ["grades", "id,name", "name"],
    [
      "teaching_assignments",
      "id,teacher_id,subject_id,class_id,starts_on,ends_on",
      "starts_on",
    ],
    [
      "timetable_lessons",
      "id,assignment_id,class_id,weekday,start_minute,end_minute,starts_on,ends_on",
      "start_minute",
    ],
  ] as const;
  const results = await Promise.all(
    queries.map(([table, fields, order]) =>
      client
        .from(table)
        .select(fields)
        .eq("school_id", schoolId)
        .order(order)
        .order("id")
        .limit(501),
    ),
  );
  if (results.some((r) => r.error))
    return (
      <section className="content-panel">
        <h2>Timetable unavailable</h2>
        <p className="muted">
          The timetable requires database migration 008. If it is already
          applied, check your access and connection, then reload.
        </p>
      </section>
    );
  if (results.some((r) => (r.data?.length ?? 0) > 500))
    return (
      <section className="content-panel">
        <h2>Timetable capacity reached</h2>
        <p className="muted">
          A related list exceeds 500 records. Pagination is needed before
          continuing; partial selections are not shown.
        </p>
      </section>
    );
  const [
    teachers,
    subjects,
    classes,
    academic_years,
    grades,
    assignments,
    lessons,
  ] = results.map((r) => r.data ?? []) as unknown as [
    TeachingOptions["teachers"],
    TeachingOptions["subjects"],
    TeachingOptions["classes"],
    TeachingOptions["academic_years"],
    TeachingOptions["grades"],
    Assignment[],
    LessonRow[],
  ];
  const options = { academic_years, grades };
  const choices = assignments.map((a) => {
    const teacher = teachers.find((t) => t.id === a.teacher_id);
    const cls = classes.find((c) => c.id === a.class_id);
    return {
      id: a.id,
      class_id: a.class_id,
      starts_on: a.starts_on,
      ends_on: a.ends_on,
      label: `${subjects.find((s) => s.id === a.subject_id)?.name ?? "Subject unavailable"} · ${cls ? classLabel(cls, options) : "Class unavailable"} · ${teacher ? `${teacher.full_name} (${teacher.reference})` : "Teacher unavailable"}`,
    };
  });
  return (
    <Timetable assignments={choices} lessons={lessons} timezone={timezone} />
  );
}
