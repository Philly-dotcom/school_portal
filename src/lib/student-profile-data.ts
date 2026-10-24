import "server-only";

import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { loadPortalActor } from "@/lib/portal-data";
import { schoolDate } from "@/lib/school-date";
import { createClient } from "@/lib/supabase/server";

const enrollmentSchema = z.object({
  id: z.uuid(),
  starts_on: z.iso.date(),
  ends_on: z.iso.date(),
  closure: z.enum(["transfer", "withdrawal"]).nullable(),
  academic_years: z.object({ name: z.string() }),
  classes: z.object({
    name: z.string(),
    grades: z.object({ name: z.string() }),
  }),
});

export type StudentEnrollment = z.infer<typeof enrollmentSchema>;

export async function loadStudentProfile() {
  // Resolve identity on the server; never accept a learner ID from the page URL.
  const actor = await loadPortalActor("student");
  if (actor.status !== "ready") return { status: actor.status } as const;
  const context = await getSchoolContext();
  if (
    context.status !== "ready" ||
    context.school.id !== actor.schoolId ||
    !context.roles.includes("student")
  )
    return { status: "unavailable" } as const;

  try {
    const client = await createClient();
    const enrollments: StudentEnrollment[] = [];
    // Read in batches so a long transfer/history list is not silently truncated.
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client
        .from("enrollments")
        .select(
          "id,starts_on,ends_on,closure,academic_years(name),classes(name,grades(name))",
        )
        .eq("school_id", actor.schoolId)
        .eq("student_id", actor.person.id)
        .order("starts_on", { ascending: false })
        .order("id")
        .range(offset, offset + 99);
      const parsed = z.array(enrollmentSchema).safeParse(data);
      // A missing joined record is an error, not an empty enrolment history.
      if (error || !parsed.success) return { status: "unavailable" } as const;
      enrollments.push(...parsed.data);
      if (parsed.data.length < 100) break;
    }
    return {
      status: "ready",
      person: actor.person,
      schoolName: context.school.name,
      today: schoolDate(context.school.timezone),
      enrollments,
    } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
}
