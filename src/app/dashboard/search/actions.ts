"use server";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  literalSearchPattern,
  recordSearchInput,
  searchPageSize,
  type RecordSearchResult,
} from "@/lib/record-search";

export async function searchSchoolRecords(
  input: unknown,
): Promise<RecordSearchResult> {
  const context = await getSchoolContext();
  const failure = (error: string): RecordSearchResult => ({
    choices: [],
    hasNext: false,
    error,
  });
  if (!isSchoolAdminContext(context))
    return failure("School administrator access is required.");
  const parsed = recordSearchInput.safeParse(input);
  if (!parsed.success)
    return failure("Check the search text and page, then try again.");
  const { kind, query, page, excludeId, academicYearId } = parsed.data;
  const definitions = {
    academic_years: ["id,name,starts_on,ends_on", "name"],
    grades: ["id,name", "name"],
    teachers: ["id,full_name,reference", "full_name"],
    students: ["id,full_name,reference", "full_name"],
    guardians: ["id,full_name,reference", "full_name"],
    subjects: ["id,name", "name"],
    classes: ["id,name,academic_year_id,grade_id", "name"],
  } as const;
  try {
    const client = await createClient();
    if (kind === "teaching_assignments") {
      const { data, error } = await client.rpc("search_timetable_assignments", {
        target_school: context.school.id,
        search_text: query,
        page_number: page,
      });
      if (error)
        return failure("Assignment search is unavailable. Check migration 016 and your access, then retry.");
      const rows = (data ?? []) as {
        id: string; label: string; starts_on: string; ends_on: string;
      }[];
      return {
        choices: rows.slice(0, searchPageSize).map((row) => ({
          id: row.id, label: row.label, startsOn: row.starts_on, endsOn: row.ends_on,
        })),
        hasNext: rows.length > searchPageSize,
        error: "",
      };
    }
    let request = client
      .from(kind)
      .select(definitions[kind][0])
      .eq("school_id", context.school.id);
    if (query)
      request = request.ilike(
        definitions[kind][1],
        literalSearchPattern(query),
      );
    if (excludeId) request = request.neq("id", excludeId);
    if (academicYearId)
      request = request.eq("academic_year_id", academicYearId);
    const result = await request
      .order(definitions[kind][1])
      .order("id")
      .range((page - 1) * searchPageSize, page * searchPageSize);
    if (result.error)
      return failure(
        "Could not load choices. Check your access and try again.",
      );
    type SearchRow = {
      id: string;
      name?: string;
      full_name?: string;
      reference?: string;
      starts_on?: string;
      ends_on?: string;
      academic_year_id?: string;
      grade_id?: string;
    };
    const rows = ((result.data ?? []) as unknown as SearchRow[]).slice(
      0,
      searchPageSize,
    );
    if (kind !== "classes")
      return {
        choices: rows.map((row) => ({
          id: row.id,
          label:
            kind === "teachers" || kind === "students" || kind === "guardians"
              ? `${row.full_name} · ${row.reference}`
              : row.name!,
          ...(kind === "academic_years"
            ? { startsOn: row.starts_on, endsOn: row.ends_on }
            : {}),
        })),
        hasNext: (result.data?.length ?? 0) > searchPageSize,
        error: "",
      };
    if (!rows.length) return { choices: [], hasNext: false, error: "" };
    const [years, grades] = await Promise.all([
      client
        .from("academic_years")
        .select("id,name,starts_on,ends_on")
        .eq("school_id", context.school.id)
        .in("id", [...new Set(rows.map((row) => row.academic_year_id!))]),
      client
        .from("grades")
        .select("id,name")
        .eq("school_id", context.school.id)
        .in("id", [...new Set(rows.map((row) => row.grade_id!))]),
    ]);
    if (years.error || grades.error)
      return failure("Could not load class details. Try again.");
    const choices = rows.map((row) => {
      const year = years.data?.find((item) => item.id === row.academic_year_id);
      const grade = grades.data?.find((item) => item.id === row.grade_id);
      if (!year || !grade) return null;
      return {
        id: row.id,
        label: `${row.name} · ${grade.name} · ${year.name}`,
        academicYearId: year.id,
        startsOn: year.starts_on,
        endsOn: year.ends_on,
      };
    });
    if (choices.some((choice) => !choice))
      return failure(
        "Class details are unavailable. Reload and check your access.",
      );
    return {
      choices: choices.filter((choice) => choice !== null),
      hasNext: (result.data?.length ?? 0) > searchPageSize,
      error: "",
    };
  } catch {
    return failure("Could not load choices. Please try again.");
  }
}
