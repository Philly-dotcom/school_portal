import "server-only";
import { createClient } from "./supabase/server";
import { listPage, listPageSize } from "./list-pagination";
import { registerLists, type RegisterPageParams } from "./register-pagination";
import type { PersonRow, RegisterOptions } from "./register-validation";
import type { EnrollmentRow } from "./enrollment-validation";
import type { RegisterLoginMember } from "./link-validation";

type GuardianLink = {
  id: string;
  student_id: string;
  guardian_id: string;
  relationship: string;
  access_enabled: boolean;
  record_version: number;
};
const personFields = "id,full_name,reference,record_version,membership_id";
const definitions = {
  students: [personFields, "full_name"],
  teachers: [personFields, "full_name"],
  guardians: [personFields, "full_name"],
  student_guardians: [
    "id,student_id,guardian_id,relationship,access_enabled,record_version",
    "id",
  ],
  enrollments: ["*", "starts_on"],
  classes: ["id,name,academic_year_id,grade_id", "name"],
  academic_years: ["id,name,starts_on,ends_on", "name"],
  grades: ["id,name", "name"],
} as const;
const referenceKinds = [
  "students",
  "teachers",
  "guardians",
  "classes",
  "academic_years",
  "grades",
] as const;

export async function loadRegisters(
  schoolId: string,
  pages: RegisterPageParams,
) {
  const client = await createClient();
  const query = (table: keyof typeof definitions) => {
    const [fields, order] = definitions[table];
    const scoped = client
      .from(table)
      .select(fields)
      .eq("school_id", schoolId)
      .order(order);
    return order === "id" ? scoped : scoped.order("id");
  };
  const paged = await Promise.all(
    registerLists.map((kind) => {
      const page = listPage(pages[`${kind}Page`]);
      return query(kind).range((page - 1) * listPageSize, page * listPageSize);
    }),
  );
  if (paged.some((result) => result.error)) return null;
  type Lists = {
    students: PersonRow[];
    teachers: PersonRow[];
    guardians: PersonRow[];
    student_guardians: GuardianLink[];
    enrollments: EnrollmentRow[];
  };
  type References = RegisterOptions & { teachers: PersonRow[] };
  const records = Object.fromEntries(
    registerLists.map((kind, index) => [
      kind,
      (paged[index].data ?? []).slice(0, listPageSize),
    ]),
  ) as unknown as Lists;
  const options = Object.fromEntries(referenceKinds.map((kind) => [kind, []])) as unknown as References;
  // Only resolve current links on the visible page. Eligibility is searched in SQL.
  const memberIds = [...new Set([ ...records.students, ...records.teachers, ...records.guardians ]
    .flatMap((row) => row.membership_id ? [row.membership_id] : []))];
  const memberResult = memberIds.length
    ? await client.rpc("list_linkable_members", { target_school: schoolId }).in("id", memberIds)
    : { data: [], error: null };
  if (memberResult.error) return null;
  const hasNext = Object.fromEntries(
    registerLists.map((kind, index) => [
      kind,
      (paged[index].data?.length ?? 0) > listPageSize,
    ]),
  );

  // Display labels need only the records referenced by this page. Fetch missing
  // IDs independently; a paged student list must not hide a guardian's child.
  let lookupFailed = false;
  async function withMissing<T extends { id: string }>(
    table: keyof typeof definitions,
    known: T[],
    ids: string[],
  ): Promise<T[]> {
    const existing = new Set(known.map((row) => row.id));
    const missing = [...new Set(ids)].filter((id) => !existing.has(id));
    if (!missing.length) return known;
    const result = await client
      .from(table)
      .select(definitions[table][0])
      .eq("school_id", schoolId)
      .in("id", missing);
    if (result.error) lookupFailed = true;
    return [...known, ...((result.data ?? []) as unknown as T[])];
  }
  const [students, guardians, classes] = await Promise.all([
    withMissing("students", options.students, [
      ...records.student_guardians.map((row) => row.student_id),
      ...records.enrollments.map((row) => row.student_id),
    ]),
    withMissing(
      "guardians",
      options.guardians,
      records.student_guardians.map((row) => row.guardian_id),
    ),
    withMissing(
      "classes",
      options.classes,
      records.enrollments.map((row) => row.class_id),
    ),
  ]);
  const visibleClassIds = new Set(
    records.enrollments.map((row) => row.class_id),
  );
  const visibleClasses = classes.filter((row) => visibleClassIds.has(row.id));
  const [years, grades] = await Promise.all([
    withMissing(
      "academic_years",
      options.academic_years,
      visibleClasses.map((row) => row.academic_year_id),
    ),
    withMissing(
      "grades",
      options.grades,
      visibleClasses.map((row) => row.grade_id),
    ),
  ]);
  if (lookupFailed) return null;
  return {
    records,
    hasNext,
    labels: { students, guardians, classes, academic_years: years, grades },
    members: (memberResult.data ?? []) as RegisterLoginMember[],
  };
}
