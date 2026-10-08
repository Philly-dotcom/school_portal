import "server-only";

import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { portalModeSchema, selectedChildSchema } from "@/lib/portal-validation";
import type {
  PortalActor,
  PortalChild,
  PortalMode,
} from "@/lib/portal-validation";

export async function loadPortalActor(
  mode: PortalMode,
  selectedChildId?: string | null,
): Promise<PortalActor> {
  const context = await getSchoolContext();

  if (
    !portalModeSchema.safeParse(mode).success ||
    (selectedChildId != null &&
      !selectedChildSchema.safeParse(selectedChildId).success) ||
    (selectedChildId != null && mode !== "guardian")
  ) {
    return { status: "forbidden" };
  }

  if (context.status === "unconfigured") {
    return { status: "unconfigured" };
  }

  if (context.status === "unavailable") {
    return { status: "unavailable" };
  }

  if (context.status !== "ready") {
    return { status: "forbidden" };
  }

  // A valid value such as "teacher" in the URL does not grant that role.
  if (!context.roles.includes(mode)) {
    return { status: "forbidden" };
  }

  try {
    const supabase = await createClient();
    const schoolId = context.school.id;

    /*
     * Resolve the caller's own active membership.
     *
     * Never accept a membership ID from a URL or form.
     */
    const { data: membership, error: membershipError } = await supabase
      .from("school_memberships")
      .select("id")
      .eq("school_id", schoolId)
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      return { status: "unavailable" };
    }

    if (!membership) {
      return { status: "forbidden" };
    }

    /*
     * TEACHER
     */
    if (mode === "teacher") {
      const { data: teacher, error } = await supabase
        .from("teachers")
        .select("id, full_name, reference")
        .eq("school_id", schoolId)
        .eq("membership_id", membership.id)
        .maybeSingle();

      if (error) {
        return { status: "unavailable" };
      }

      if (!teacher) {
        return {
          status: "empty",
          mode,
          message: "This account is not linked to a teacher record.",
        };
      }

      return {
        status: "ready",
        mode,
        schoolId,
        person: {
          id: teacher.id,
          fullName: teacher.full_name,
          reference: teacher.reference,
        },
      };
    }

    /*
     * STUDENT
     */
    if (mode === "student") {
      const { data: student, error } = await supabase
        .from("students")
        .select("id, full_name, reference")
        .eq("school_id", schoolId)
        .eq("membership_id", membership.id)
        .maybeSingle();

      if (error) {
        return { status: "unavailable" };
      }

      if (!student) {
        return {
          status: "empty",
          mode,
          message: "This account is not linked to a student record.",
        };
      }

      return {
        status: "ready",
        mode,
        schoolId,
        person: {
          id: student.id,
          fullName: student.full_name,
          reference: student.reference,
        },
      };
    }

    /*
     * GUARDIAN
     */
    const { data: guardian, error: guardianError } = await supabase
      .from("guardians")
      .select("id, full_name, reference")
      .eq("school_id", schoolId)
      .eq("membership_id", membership.id)
      .maybeSingle();

    if (guardianError) {
      return { status: "unavailable" };
    }

    if (!guardian) {
      return {
        status: "empty",
        mode,
        message: "This account is not linked to a guardian record.",
      };
    }

    /*
     * Only explicitly granted guardian relationships count.
     *
     * This is especially important for teacher + guardian accounts.
     * Being allowed to read learners as a teacher must not make those
     * learners appear as guardian children.
     */
    const relationships: { student_id: string; relationship: string }[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase
        .from("student_guardians")
        .select("student_id, relationship")
        .eq("school_id", schoolId)
        .eq("guardian_id", guardian.id)
        .eq("access_enabled", true)
        .order("student_id")
        .range(offset, offset + 99);
      if (error || !data) return { status: "unavailable" };
      relationships.push(...data);
      if (data.length < 100) break;
    }

    if (!relationships.length) {
      if (selectedChildId) return { status: "forbidden" };
      return {
        status: "ready",
        mode,
        schoolId,
        person: {
          id: guardian.id,
          fullName: guardian.full_name,
          reference: guardian.reference,
        },
        children: [],
        selectedChild: null,
      };
    }

    const childIds = [
      ...new Set(relationships.map((relationship) => relationship.student_id)),
    ];

    /*
     * Fetch ONLY students granted through student_guardians.
     *
     * Do not replace this with an unrestricted readable-students query.
     */
    const students: { id: string; full_name: string; reference: string }[] = [];
    for (let offset = 0; offset < childIds.length; offset += 100) {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, reference")
        .eq("school_id", schoolId)
        .in("id", childIds.slice(offset, offset + 100));
      if (error || !data) return { status: "unavailable" };
      students.push(...data);
    }

    /*
     * Every granted relationship should resolve to its student.
     *
     * Foreign keys and RLS should make this true. If it is not true,
     * treat it as unavailable rather than silently hiding part of the
     * guardian's authorized context.
     */
    if (students.length !== childIds.length) {
      return { status: "unavailable" };
    }

    const studentsById = new Map(
      students.map((student) => [student.id, student]),
    );

    const children: PortalChild[] = relationships.map((relationship) => {
      const student = studentsById.get(relationship.student_id)!;

      return {
        id: student.id,
        fullName: student.full_name,
        reference: student.reference,
        relationship: relationship.relationship,
      };
    });

    children.sort(
      (a, b) =>
        a.fullName.localeCompare(b.fullName) ||
        a.reference.localeCompare(b.reference),
    );

    let selectedChild: PortalChild | null = null;

    if (selectedChildId) {
      selectedChild =
        children.find((child) => child.id === selectedChildId) ?? null;

      // A well-formed UUID is not automatically an authorized child.
      if (!selectedChild) {
        return { status: "forbidden" };
      }
    }

    return {
      status: "ready",
      mode,
      schoolId,
      person: {
        id: guardian.id,
        fullName: guardian.full_name,
        reference: guardian.reference,
      },
      children,
      selectedChild,
    };
  } catch {
    // Transport failures must not leak database details into the workspace.
    return { status: "unavailable" };
  }
}
