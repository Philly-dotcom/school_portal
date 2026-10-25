import "server-only";

import type { ReadySchoolContext } from "@/lib/auth-context";
import type { PortalActor } from "@/lib/portal-validation";
import { createClient } from "@/lib/supabase/server";
import { loadHomework } from "@/lib/homework-data";
import { loadAnnouncement } from "@/lib/announcement-data";
import { loadDocuments } from "@/lib/document-data";
import { loadMyTimetable } from "@/lib/my-timetable-data";

export type DashboardActor = Extract<PortalActor, { status: "ready" }>;

// These arguments originate in the verified server render, never in a form.
// A combined teacher/guardian membership does not make a classroom child a grant.
export function dashboardAccess(context: ReadySchoolContext, actor?: DashboardActor) {
  if (!actor) return context.roles.includes("school_admin");
  if (actor.schoolId !== context.school.id || !context.roles.includes(actor.mode)) return false;
  return actor.mode !== "guardian" || !!actor.selectedChild &&
    actor.children.some((child) => child.id === actor.selectedChild?.id);
}

export async function loadDashboardFeed(
  kind: "homework" | "announcements" | "documents",
  context: ReadySchoolContext,
  actor?: DashboardActor,
) {
  if (!dashboardAccess(context, actor)) return null;
  const mode = actor?.mode ?? "school_admin";
  const child = actor?.mode === "guardian" ? actor.selectedChild?.id : undefined;
  // Existing RPCs independently recheck the caller, role and selected learner.
  if (kind === "homework") return loadHomework(context.school.id, mode, { child });
  if (kind === "announcements") return loadAnnouncement(context.school.id, mode, { child });
  return loadDocuments(context.school.id, mode, { child });
}

export async function loadDashboardLessons(context: ReadySchoolContext, actor: DashboardActor) {
  if (!dashboardAccess(context, actor)) return null;
  return loadMyTimetable(actor, undefined, context);
}

export async function loadDashboardCounts(context: ReadySchoolContext) {
  if (!context.roles.includes("school_admin")) return null;
  try {
    const client = await createClient();
    const tables = ["students", "teachers", "classes"] as const;
    const results = await Promise.all(tables.map(async (table) => {
      const { count, error } = await client.from(table)
        .select("id", { count: "exact", head: true }).eq("school_id", context.school.id);
      return { table, count: error ? null : count };
    }));
    return results;
  } catch {
    return null;
  }
}
