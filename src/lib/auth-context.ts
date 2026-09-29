import "server-only";
import { redirect } from "next/navigation";
import { getSchoolId, isPortalConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { parseRoles } from "@/lib/permissions";

export async function getSchoolContext() {
  if (!isPortalConfigured()) return { status: "unconfigured" as const };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const schoolId = getSchoolId()!;
  const { data: membership, error } = await supabase.from("school_memberships")
    .select("id, user_id, school_id, status, membership_roles(role)")
    .eq("user_id", user.id).eq("school_id", schoolId).eq("status", "active").maybeSingle();
  if (error) return { status: "unavailable" as const };
  if (!membership) return { status: "forbidden" as const };
  const userRoles = parseRoles(membership.membership_roles.map((row) => row.role));
  if (!userRoles.length) return { status: "forbidden" as const };
  const { data: school, error: schoolError } = await supabase.from("schools")
    .select("id, name, timezone").eq("id", schoolId).eq("active", true).maybeSingle();
  if (schoolError) return { status: "unavailable" as const };
  if (!school) return { status: "forbidden" as const };
  return { status: "ready" as const, school, userId: user.id, roles: userRoles };
}
