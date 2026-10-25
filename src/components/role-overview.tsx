import { DailyOverview } from "@/components/daily-overview";
import { Suspense } from "react";
import type { ReadySchoolContext } from "@/lib/auth-context";

import { ChildSelector } from "@/components/child-selector";
import { StudentProfile } from "@/components/student-profile";
import type { loadStudentProfile } from "@/lib/student-profile-data";
import { portalModeLabels as modeLabels } from "@/lib/portal-validation";
import type {
  PortalActor,
  PortalMode,
} from "@/lib/portal-validation";


export function RoleOverview({
  actor,
  schoolName,
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
      <section className="content-panel">
        <h2>Your workspace could not be loaded.</h2>
        <p className="muted" style={{ marginTop: 12 }}>
          We could not verify the linked school record. Please reload and try
          again.
        </p>
      </section>
    );
  }

  if (actor.status === "forbidden") {
    return (
      <section className="content-panel">
        <h2>This workspace is not available.</h2>
        <p className="muted" style={{ marginTop: 12 }}>
          Your account does not have access to the requested portal view.
        </p>
      </section>
    );
  }

  if (actor.status === "unconfigured") {
    return (
      <section className="content-panel">
        <h2>The school portal is not configured.</h2>
      </section>
    );
  }

  return (
    <>
      {actor.status === "empty" ? (
        <section className="content-panel">
          <div className="section-heading">
            <div>
              <h2>{modeLabels[actor.mode]} workspace</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                {actor.message}
              </p>
            </div>

            <span className="phase-tag">{modeLabels[actor.mode]}</span>
          </div>
        </section>
      ) : (
        <section className={`content-panel daily-profile ${actor.mode === "student" ? "student-overview-heading" : ""}`}>
          <div className="section-heading">
            <div>
              {actor.mode === "student" ? <h1>Welcome back, {actor.person.fullName}</h1> : <h2>Welcome back, {actor.person.fullName}</h2>}
              <p className="muted" style={{ marginTop: 8 }}>
                {modeLabels[actor.mode]} workspace · {schoolName}
              </p>
            </div>

            <span className="phase-tag">{modeLabels[actor.mode]}</span>
          </div>

          {actor.mode === "student" && (
            <Suspense fallback={<p role="status">Loading your profile and enrolments...</p>}>
              <StudentProfile dashboard summaryOnly profileRead={studentProfileRead} read={context ? { context, actor } : undefined} />
            </Suspense>
          )}

          {actor.mode === "guardian" && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 24 }}>Learner access</h3>

              <p className="muted" style={{ marginTop: 8 }}>
                Choose the learner whose school information you want to view.
              </p>

              <div style={{ marginTop: 18 }}>
                <ChildSelector
                  learners={actor.children}
                  selectedChildId={actor.selectedChild?.id}
                  mode="guardian"
                  view="overview"
                />
              </div>

              {actor.selectedChild && (
                <div className="quiet-note" style={{ marginTop: 24 }}>
                  <p>
                    Viewing: <strong>{actor.selectedChild.fullName}</strong> ·{" "}
                    {actor.selectedChild.reference}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {actor.status === "ready" && context && <DailyOverview key={`${actor.mode}:${actor.mode === "guardian" ? actor.selectedChild?.id ?? "" : actor.person.id}`} context={context} actor={actor} />}
    </>
  );
}
