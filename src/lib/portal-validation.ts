import { z } from "zod";

export const portalModeSchema = z.enum(["teacher", "student", "guardian"]);

export type PortalMode = z.infer<typeof portalModeSchema>;

export const portalModeLabels: Record<PortalMode, string> = {
  teacher: "Teacher",
  student: "Student",
  guardian: "Parent / Guardian",
};

export function availablePortalModes(roles: readonly string[]): PortalMode[] {
  return portalModeSchema.options.filter((mode) => roles.includes(mode));
}

export function portalHref(
  view: "overview" | "my-timetable" | "attendance" | "homework" | "announcements" | "documents",
  mode: PortalMode,
  child?: string | null,
  page = 1,
) {
  const params = new URLSearchParams({ view, mode });
  if (mode === "guardian" && child) params.set("child", child);
  if (page > 1)
    params.set(
      view === "documents" ? "documentPage" : view === "announcements" ? "announcementPage" : view === "homework"
        ? "homeworkPage"
        : view === "attendance"
          ? "attendancePage"
          : "myTimetablePage",
      String(page),
    );
  return `/dashboard?${params}`;
}

export const selectedChildSchema = z.uuid();

export type PortalPerson = {
  id: string;
  fullName: string;
  reference: string;
};

export type PortalChild = PortalPerson & {
  relationship: string;
};

export type PortalActor =
  | { status: "unconfigured" }
  | { status: "unavailable" }
  | { status: "forbidden" }
  | { status: "empty"; mode: PortalMode; message: string }
  | {
      status: "ready";
      mode: "teacher" | "student";
      schoolId: string;
      person: PortalPerson;
    }
  | {
      status: "ready";
      mode: "guardian";
      schoolId: string;
      person: PortalPerson;
      children: PortalChild[];
      selectedChild: PortalChild | null;
    };
