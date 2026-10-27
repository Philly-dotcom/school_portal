import { Suspense } from "react";
import { GraduationCap, ShieldCheck, UsersRound } from "lucide-react";

import { ChildSelector } from "@/components/child-selector";
import { DailyOverview } from "@/components/daily-overview";
import { StudentProfile } from "@/components/student-profile";
import type { ReadySchoolContext } from "@/lib/auth-context";
import type { loadStudentProfile } from "@/lib/student-profile-data";
import {
  portalModeLabels as modeLabels,
  type PortalActor,
  type PortalMode,
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
          We could not verify the linked school record. Please reload and try again.
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

  if (actor.status === "empty") {
    return (
      <section className="content-panel">
        <h2>{modeLabels[actor.mode]} workspace</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          {actor.message}
        </p>
      </section>
    );
  }

  if (actor.mode === "guardian") {
    const learner = actor.selectedChild;
    const firstName = actor.person.fullName.trim().split(/\s+/)[0];

    return (
      <div className="guardian-overview">
        <header className="guardian-hero">
          <div>
            <p className="eyebrow">PARENT / GUARDIAN WORKSPACE</p>
            <h1>Welcome back, {firstName}</h1>
            <p className="muted">
              Your connection to school life at {schoolName}.
            </p>
          </div>
          <span className="guardian-role-pill">
            <UsersRound size={17} aria-hidden="true" />
            Parent / Guardian
          </span>
        </header>

        {actor.children.length > 0 && (
          <section className="content-panel guardian-learner-picker">
            <div className="guardian-picker-heading">
              <div>
                <h2>My children</h2>
                <p className="muted">
                  Choose the learner whose school information you want to see.
                </p>
              </div>
              <span className="guardian-child-count">
                {actor.children.length} linked
              </span>
            </div>
            <ChildSelector
              learners={actor.children}
              selectedChildId={learner?.id}
              mode="guardian"
              view="overview"
            />
            {learner ? (
              <div className="guardian-selected-learner" aria-label="Selected learner">
                <span className="guardian-learner-icon">
                  <GraduationCap size={25} aria-hidden="true" />
                </span>
                <div>
                  <p className="guardian-overline">CURRENTLY VIEWING</p>
                  <h3>{learner.fullName}</h3>
                  <p>
                    {learner.reference} · {learner.relationship}
                  </p>
                </div>
              </div>
            ) : (
              <p className="muted guardian-selection-hint">
                Select a learner to continue. Their timetable, homework,
                announcements, documents and attendance links will appear here.
              </p>
            )}
          </section>
        )}

        {learner && context && (
          <DailyOverview
            key={`guardian:${learner.id}`}
            context={context}
            actor={actor}
          />
        )}
        {actor.children.length === 0 && (
          <section className="guardian-no-selection">
            <GraduationCap size={32} aria-hidden="true" />
            <h2>No learner access yet</h2>
            <p className="muted">
              No learner access has been granted to this guardian account.
              Contact your School Admin to check your learner links and access.
            </p>
          </section>
        )}

        <p className="guardian-access-note">
          <ShieldCheck size={17} aria-hidden="true" />
          Only learners with school-approved access are shown here.
        </p>
      </div>
    );
  }

  return (
    <>
      <section
        className={`content-panel daily-profile ${
          actor.mode === "student" ? "student-overview-heading" : ""
        }`}
      >
        <div className="section-heading">
          <div>
            {actor.mode === "student" ? (
              <h1>Welcome back, {actor.person.fullName}</h1>
            ) : (
              <h2>Welcome back, {actor.person.fullName}</h2>
            )}
            <p className="muted" style={{ marginTop: 8 }}>
              {modeLabels[actor.mode]} workspace · {schoolName}
            </p>
          </div>
          <span className="phase-tag">{modeLabels[actor.mode]}</span>
        </div>

        {actor.mode === "student" && (
          <Suspense fallback={<p role="status">Loading your profile and enrolments...</p>}>
            <StudentProfile
              dashboard
              summaryOnly
              profileRead={studentProfileRead}
              read={context ? { context, actor } : undefined}
            />
          </Suspense>
        )}
      </section>
      {context && (
        <DailyOverview
          key={`${actor.mode}:${actor.person.id}`}
          context={context}
          actor={actor}
        />
      )}
    </>
  );
}
