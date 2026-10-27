import { Suspense } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { AdminProfile } from "@/components/staff-profile";
import { WorkspaceSelector } from "@/components/workspace-selector";
import type { ReadySchoolContext } from "@/lib/auth-context";
import { roleLabels, type Role } from "@/lib/permissions";
import type { PortalActor } from "@/lib/portal-validation";
import type { loadAdminProfile } from "@/lib/staff-profile-data";
import { createClient } from "@/lib/supabase/server";

export async function ProfileMenu({
  context,
  activeRole,
  actor,
  adminProfileRead,
}: {
  context: ReadySchoolContext;
  activeRole?: Role;
  actor?: PortalActor;
  adminProfileRead?: ReturnType<typeof loadAdminProfile>;
}) {
  const admin = adminProfileRead ? await adminProfileRead : undefined;
  let name: string =
    admin?.status === "ready"
      ? admin.fullName
      : actor?.status === "ready"
        ? actor.person.fullName
        : "Your account";
  // The chooser and unlinked accounts still get their own saved account name.
  if (
    !activeRole ||
    (activeRole !== "school_admin" && actor?.status !== "ready")
  ) {
    try {
      const client = await createClient();
      const { data, error } = await client
        .from("profiles")
        .select("display_name")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (
        !error &&
        typeof data?.display_name === "string" &&
        data.display_name.trim()
      )
        name = data.display_name.trim();
    } catch {
      /* Keep the account control and sign-out available on read failure. */
    }
  }
  const label = activeRole ? roleLabels[activeRole] : "Choose a workspace";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <details className="header-profile" key={activeRole ?? "choose"}>
      <summary aria-label={`${label} profile`}>
        <span className="header-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="header-profile-name">
          <strong>{name}</strong>
          <small>{label}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="header-profile-popover">
        <h2>My profile</h2>
        <p className="small">
          Active role: <strong>{activeRole ? label : "Not selected"}</strong>
        </p>
        <Suspense fallback={<p role="status">Loading profile details...</p>}>
          {activeRole === "school_admin" && adminProfileRead ? (
            <AdminProfile
              detailsOnly
              context={context}
              profileRead={adminProfileRead}
            />
          ) : (
            <dl className="admin-profile-fields">
              <div>
                <dt>Full name</dt>
                <dd>{name}</dd>
              </div>
              <div>
                <dt>School</dt>
                <dd>{context.school.name}</dd>
              </div>
              {actor?.status === "ready" &&
                (actor.mode === "teacher" || actor.mode === "student") && (
                  <div>
                    <dt>{actor.mode === "teacher" ? "Teacher" : "Student"} reference</dt>
                    <dd>{actor.person.reference}</dd>
                  </div>
                )}
              {actor?.status === "ready" && actor.mode === "guardian" && (
                <div>
                  <dt>Linked students</dt>
                  <dd>
                    {actor.children.length ? (
                      <ul>
                        {actor.children.map((child) => (
                          <li key={child.id}>{child.fullName}</li>
                        ))}
                      </ul>
                    ) : (
                      "No learners have been granted portal access."
                    )}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </Suspense>
        {actor?.status === "ready" &&
          (actor.mode === "teacher" || actor.mode === "student") && (
            <Link
              href={`/dashboard?view=profile&mode=${actor.mode}`}
              prefetch={false}
              className="button secondary compact"
            >
              {actor.mode === "teacher" ? "View linked subjects" : "View enrolment history"}
            </Link>
          )}
        {actor && actor.status !== "ready" && (
          <p role="status" className="quiet-note">
            {actor.status === "empty"
              ? actor.message
              : "Linked profile details could not be loaded. Please try again."}
          </p>
        )}
        {context.roles.length > 1 && (
          <WorkspaceSelector
            roles={context.roles}
            activeRole={activeRole}
            compact
          />
        )}
        <form action={signOut}>
          <button className="button secondary compact">Sign Out</button>
        </form>
      </div>
    </details>
  );
}
