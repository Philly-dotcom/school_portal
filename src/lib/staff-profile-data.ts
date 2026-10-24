import "server-only";

import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { loadPortalActor } from "@/lib/portal-data";
import { schoolDate } from "@/lib/school-date";
import { createClient } from "@/lib/supabase/server";

const assignmentSchema = z.object({
  starts_on: z.iso.date(),
  ends_on: z.iso.date(),
  subjects: z.object({ id: z.uuid(), name: z.string() }),
  academic_years: z.object({ id: z.uuid(), name: z.string() }),
});

export async function loadTeacherProfile() {
  const actor = await loadPortalActor("teacher");
  if (actor.status !== "ready") return { status: actor.status } as const;
  const context = await getSchoolContext();
  if (
    context.status !== "ready" ||
    context.school.id !== actor.schoolId ||
    !context.roles.includes("teacher")
  )
    return { status: "unavailable" } as const;

  try {
    const client = await createClient();
    const today = schoolDate(context.school.timezone);
    const subjects = new Map<
      string,
      {
        name: string;
        academicYear: string;
        period: "Current" | "Upcoming" | "Past";
      }
    >();
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client
        .from("teaching_assignments")
        .select("starts_on,ends_on,subjects(id,name),academic_years(id,name)")
        .eq("school_id", actor.schoolId)
        .eq("teacher_id", actor.person.id)
        .order("starts_on", { ascending: false })
        .order("id")
        .range(offset, offset + 99);
      const parsed = z.array(assignmentSchema).safeParse(data);
      if (error || !parsed.success) return { status: "unavailable" } as const;
      for (const assignment of parsed.data) {
        const period =
          assignment.starts_on > today
            ? "Upcoming"
            : assignment.ends_on < today
              ? "Past"
              : "Current";
        // Teaching the same subject in several classes should not duplicate it.
        subjects.set(
          `${assignment.subjects.id}:${assignment.academic_years.id}:${period}`,
          {
            name: assignment.subjects.name,
            academicYear: assignment.academic_years.name,
            period,
          },
        );
      }
      if (parsed.data.length < 100) break;
    }
    return {
      status: "ready",
      person: actor.person,
      schoolName: context.school.name,
      subjects: [...subjects.values()],
    } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
}

export async function loadAdminProfile() {
  const context = await getSchoolContext();
  if (context.status !== "ready" || !context.roles.includes("school_admin")) {
    return { status: "forbidden" } as const;
  }
  try {
    const client = await createClient();
    const [profile, membership, identity] = await Promise.all([
      client
        .from("profiles")
        .select("display_name")
        .eq("user_id", context.userId)
        .maybeSingle(),
      client
        .from("school_memberships")
        .select("id")
        .eq("school_id", context.school.id)
        .eq("user_id", context.userId)
        .eq("status", "active")
        .maybeSingle(),
      client.auth.getUser(),
    ]);
    if (
      profile.error ||
      membership.error ||
      identity.error ||
      !profile.data ||
      !membership.data ||
      identity.data.user?.id !== context.userId
    )
      return { status: "unavailable" } as const;
    return {
      status: "ready",
      fullName: profile.data.display_name.trim() || "Name not recorded",
      reference: membership.data.id,
      email: identity.data.user.email ?? "Email not recorded",
      schoolName: context.school.name,
    } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
}
