import { CampusOverview } from "@/components/campus-overview";
import type { ReadySchoolContext } from "@/lib/auth-context";
import type { loadStudentProfile } from "@/lib/student-profile-data";
import {
  portalModeLabels,
  type PortalActor,
  type PortalMode,
} from "@/lib/portal-validation";

export function RoleOverview({
  actor,
  context,
  studentProfileRead,
}: {
  actor: PortalActor;
  availableModes: PortalMode[];
  schoolName: string;
  context?: ReadySchoolContext;
  studentProfileRead?: ReturnType<typeof loadStudentProfile>;
}) {
  if (actor.status === "unavailable") {
    return (
      <section className="campus-card campus-empty">
        <h2>Your workspace could not be loaded.</h2>
        <p>
          We could not verify the linked school record. Reload the page and try
          again.
        </p>
      </section>
    );
  }

  if (actor.status === "forbidden") {
    return (
      <section className="campus-card campus-empty">
        <h2>This workspace is not available.</h2>
        <p>
          Your account does not have access to the requested portal view.
          Contact your School Admin if you need help with access.
        </p>
      </section>
    );
  }

  if (actor.status === "unconfigured") {
    return (
      <section className="campus-card campus-empty">
        <h2>The school portal is not configured.</h2>
        <p>Contact your School Admin to finish setting up the portal.</p>
      </section>
    );
  }

  if (actor.status === "empty") {
    return (
      <section className="campus-card campus-empty">
        <p className="campus-overline">{portalModeLabels[actor.mode]}</p>
        <h2>{portalModeLabels[actor.mode]} workspace</h2>
        <p>{actor.message}</p>
      </section>
    );
  }

  if (!context) {
    return (
      <section className="campus-card campus-empty">
        <h2>School information is unavailable.</h2>
        <p>Reload the page to try again.</p>
      </section>
    );
  }

  return (
    <CampusOverview
      actor={actor}
      context={context}
      studentProfileRead={studentProfileRead}
    />
  );
}
