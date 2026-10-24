import Link from "next/link";

import { ChildSelector } from "@/components/child-selector";
import { StudentProfile } from "@/components/student-profile";
import { TeacherProfile } from "@/components/staff-profile";
import { portalModeLabels as modeLabels, portalHref } from "@/lib/portal-validation";
import type {
  PortalActor,
  PortalMode,
} from "@/lib/portal-validation";


export function RoleOverview({
  actor,
  availableModes,
  schoolName,
}: {
  actor: PortalActor;
  availableModes: PortalMode[];
  schoolName: string;
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
      {availableModes.length > 1 && (
        <section className="content-panel" style={{ marginBottom: 24 }}>
          <div className="section-heading">
            <div>
              <h2>Choose your workspace</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Your account has more than one role. Choose the view you want
                to use.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3" style={{ marginTop: 18 }}>
            {availableModes.map((mode) => {
              const active =
                actor.mode === mode;

              return (
                <Link
                  key={mode}
                  href={`/dashboard?view=overview&mode=${mode}`}
                  className={`button ${active ? "primary" : "secondary"}`}
                >
                  {modeLabels[mode]}
                </Link>
              );
            })}
          </div>
        </section>
      )}

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
        <section className="content-panel">
          <div className="section-heading">
            <div>
              <h2>{actor.person.fullName}</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                {modeLabels[actor.mode]} workspace
              </p>
            </div>

            <span className="phase-tag">{modeLabels[actor.mode]}</span>
          </div>

          {actor.mode === "teacher" && (
            <TeacherProfile />
          )}

          {actor.mode === "student" && (
            <StudentProfile />
          )}

          {actor.mode === "guardian" && (
            <div style={{ marginTop: 24 }}>
              <h3>My profile</h3>
              <dl className="grid gap-3 sm:grid-cols-2" style={{ marginTop: 12 }}>
                <div><dt className="muted">Full name</dt><dd>{actor.person.fullName}</dd></div>
                <div><dt className="muted">School</dt><dd>{schoolName}</dd></div>
                <div>
                  <dt className="muted">Linked students</dt>
                  <dd>
                    {actor.children.length ? (
                      <ul>{actor.children.map((child) => <li key={child.id}>{child.fullName}</li>)}</ul>
                    ) : "No students are linked with portal access. Contact your School Admin."}
                  </dd>
                </div>
              </dl>

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
          {(actor.mode !== "guardian" || actor.selectedChild) && (
            <Link className="button secondary" style={{ marginTop: 20 }}
              href={portalHref("my-timetable", actor.mode, actor.mode === "guardian" ? actor.selectedChild?.id : null)}>
              My timetable
            </Link>
          )}
          {(actor.mode !== "guardian" || actor.selectedChild) && (
            <Link className="button secondary" style={{ marginTop: 20, marginLeft: 12 }}
              href={portalHref("attendance", actor.mode, actor.mode === "guardian" ? actor.selectedChild?.id : null)}>
              Attendance
            </Link>
          )}
          {(actor.mode !== "guardian" || actor.selectedChild) && (
            <Link className="button secondary" style={{ marginTop: 20, marginLeft: 12 }}
              href={portalHref("homework", actor.mode, actor.mode === "guardian" ? actor.selectedChild?.id : null)}>
              Homework
            </Link>
          )}
          {(actor.mode !== "guardian" || actor.selectedChild) && (
            <Link className="button secondary" style={{ marginTop: 20, marginLeft: 12 }}
              href={portalHref("announcements", actor.mode, actor.mode === "guardian" ? actor.selectedChild?.id : null)}>
              Announcements
            </Link>
          )}
          {(actor.mode !== "guardian" || actor.selectedChild) && (
            <Link className="button secondary" style={{ marginTop: 20, marginLeft: 12 }}
              href={portalHref("documents", actor.mode, actor.mode === "guardian" ? actor.selectedChild?.id : null)}>
              Documents
            </Link>
          )}
        </section>
      )}
    </>
  );
}
