import "server-only";
import { createClient } from "./supabase/server";
import { listPageSize } from "./list-pagination";
import type {
  TeachingOptions,
  TeachingAssignment,
} from "./teaching-validation";
import type { LessonRow } from "./timetable-validation";

const definitions = {
  teachers: ["id,full_name,reference", "full_name"],
  subjects: ["id,name", "name"],
  classes: ["id,name,academic_year_id,grade_id", "name"],
  academic_years: ["id,name,starts_on,ends_on", "name"],
  grades: ["id,name", "name"],
} as const;
type ReferenceKind = keyof typeof definitions;

export async function loadPlanning(
  schoolId: string,
  view: "teaching" | "timetable",
  page: number,
  assignmentId = "",
) {
  const client = await createClient();
  const kinds = Object.keys(definitions) as ReferenceKind[];
  const assignmentQuery = client
    .from("teaching_assignments")
    .select("*")
    .eq("school_id", schoolId)
    .order("starts_on")
    .order("id");
  let lessonQuery = client
    .from("timetable_lessons")
    .select(
      "id,assignment_id,class_id,weekday,start_minute,end_minute,starts_on,ends_on",
    )
    .eq("school_id", schoolId);
  if (assignmentId) lessonQuery = lessonQuery.eq("assignment_id", assignmentId);
  const [assignmentResult, lessonResult] = await Promise.all([
    view === "teaching"
      ? assignmentQuery.range((page - 1) * listPageSize, page * listPageSize)
      : Promise.resolve({ data: [], error: null }),
    view === "timetable"
      ? lessonQuery
          .order("weekday")
          .order("start_minute")
          .order("id")
          .range((page - 1) * listPageSize, page * listPageSize)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (assignmentResult.error || lessonResult.error) return null;
  const options = Object.fromEntries(
    kinds.map((kind) => [kind, []]),
  ) as unknown as TeachingOptions;
  const lessons = (lessonResult.data ?? []).slice(
    0,
    listPageSize,
  ) as LessonRow[];
  const assignments = (assignmentResult.data ?? []).slice(
    0,
    listPageSize,
  ) as TeachingAssignment[];
  let failed = false;
  async function complete<T extends { id: string }>(
    table: ReferenceKind | "teaching_assignments",
    known: T[],
    ids: string[],
  ) {
    const existing = new Set(known.map((row) => row.id));
    const missing = [...new Set(ids)].filter((id) => !existing.has(id));
    const batches: string[][] = [];
    for (let i = 0; i < missing.length; i += 100)
      batches.push(missing.slice(i, i + 100));
    const results = await Promise.all(
      batches.map((batch) =>
        client
          .from(table)
          .select(
            table === "teaching_assignments" ? "*" : definitions[table][0],
          )
          .eq("school_id", schoolId)
          .in("id", batch),
      ),
    );
    if (results.some((result) => result.error)) failed = true;
    return [
      ...known,
      ...results.flatMap((result) => (result.data ?? []) as unknown as T[]),
    ];
  }
  const labeledAssignments = await complete(
    "teaching_assignments",
    assignments,
    [
      ...lessons.map((lesson) => lesson.assignment_id),
      ...(assignmentId ? [assignmentId] : []),
    ],
  );
  const [teachers, subjects, classes] = await Promise.all([
    complete(
      "teachers",
      options.teachers,
      labeledAssignments.map((row) => row.teacher_id),
    ),
    complete(
      "subjects",
      options.subjects,
      labeledAssignments.map((row) => row.subject_id),
    ),
    complete(
      "classes",
      options.classes,
      labeledAssignments.map((row) => row.class_id),
    ),
  ]);
  const referencedClasses = new Set(
    labeledAssignments.map((row) => row.class_id),
  );
  const visibleClasses = classes.filter((row) => referencedClasses.has(row.id));
  const [academic_years, grades] = await Promise.all([
    complete(
      "academic_years",
      options.academic_years,
      visibleClasses.map((row) => row.academic_year_id),
    ),
    complete(
      "grades",
      options.grades,
      visibleClasses.map((row) => row.grade_id),
    ),
  ]);
  if (failed) return null;
  return {
    assignments,
    labeledAssignments,
    lessons,
    labels: { teachers, subjects, classes, academic_years, grades },
    hasNext:
      ((view === "teaching" ? assignmentResult : lessonResult).data?.length ??
        0) > listPageSize,
  };
}
