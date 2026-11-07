import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Megaphone,
} from "lucide-react";
import { ChildSelector } from "@/components/child-selector";
import { DashboardFeed, DashboardLessons } from "@/components/daily-overview";
import { NavigationPending } from "@/components/navigation-pending";
import { StudentProfile } from "@/components/student-profile";
import type { ReadySchoolContext } from "@/lib/auth-context";
import { dashboardAccess, type DashboardActor } from "@/lib/dashboard-data";
import { portalHref, type PortalView } from "@/lib/portal-validation";
import { assessmentHref } from "@/lib/assessment-validation";
import { schoolDate } from "@/lib/school-date";
import type { loadStudentProfile } from "@/lib/student-profile-data";

function Loading() {
  return (
    <p className="campus-loading" role="status">
      Loading school information…
    </p>
  );
}

function Card({
  title,
  href,
  action = "View all",
  children,
}: {
  title: string;
  href: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <section className="campus-card">
      <div className="campus-card-heading">
        <h2>{title}</h2>
        <Link href={href} aria-label={`${action}: ${title}`}>
          {action}
          <NavigationPending />
        </Link>
      </div>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </section>
  );
}

export function CampusOverview({
  actor,
  context,
  studentProfileRead,
}: {
  actor: DashboardActor;
  context: ReadySchoolContext;
  studentProfileRead?: ReturnType<typeof loadStudentProfile>;
}) {
  const guardian = actor.mode === "guardian";
  const children = actor.mode === "guardian" ? actor.children : [];
  const learner = actor.mode === "guardian" ? actor.selectedChild : null;
  const teacher = actor.mode === "teacher";
  const student = actor.mode === "student";
  const canShowData = dashboardAccess(context, actor);
  const url = (view: PortalView) =>
    portalHref(view, actor.mode, learner?.id);
  const name = actor.person.fullName.trim() || "there";
  const today = schoolDate(context.school.timezone);
  // The date-only value is already school-local; noon UTC avoids a day shift.
  const dayLabel = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${today}T12:00:00Z`));
  const subtitle = teacher
    ? "Here is what is happening in your classes today."
    : student
      ? "Here is your school day and what is coming up."
      : learner
        ? `Here is ${learner.fullName}’s school update.`
        : "Choose a learner to see their school update.";

  const primary = teacher
    ? { href: url("attendance"), label: "Mark today’s attendance" }
    : student
      ? { href: url("my-timetable"), label: "My timetable" }
      : learner
        ? { href: url("attendance"), label: "View attendance" }
        : null;

  const shortcuts = guardian
    ? [
        {
          key: "attendance",
          label: "Attendance",
          href: url("attendance"),
          Icon: ClipboardCheck,
        },
        {
          key: "homework",
          label: "Homework",
          href: url("homework"),
          Icon: BookOpen,
        },
        {
          key: "timetable",
          label: "Timetable",
          href: url("my-timetable"),
          Icon: CalendarDays,
        },
        {
          key: "announcements",
          label: "Announcements",
          href: url("announcements"),
          Icon: Megaphone,
        },
        {
          key: "documents",
          label: "Documents",
          href: url("documents"),
          Icon: FileText,
        },
      ]
    : student
      ? [
          {
            key: "timetable",
            label: "My timetable",
            href: url("my-timetable"),
            Icon: CalendarDays,
          },
          {
            key: "homework",
            label: "Homework",
            href: url("homework"),
            Icon: BookOpen,
          },
          {
            key: "attendance",
            label: "Attendance",
            href: url("attendance"),
            Icon: ClipboardCheck,
          },
          {
            key: "announcements",
            label: "Announcements",
            href: url("announcements"),
            Icon: Megaphone,
          },
          {
            key: "documents",
            label: "Documents",
            href: url("documents"),
            Icon: FileText,
          },
        ]
      : [
          {
            key: "timetable",
            label: "My timetable",
            href: url("my-timetable"),
            Icon: CalendarDays,
          },
          {
            key: "attendance",
            label: "Attendance",
            href: url("attendance"),
            Icon: ClipboardCheck,
          },
          {
            key: "assessments",
            label: "Assessments",
            href: assessmentHref("teacher"),
            Icon: ClipboardList,
          },
          {
            key: "homework",
            label: "Homework",
            href: url("homework"),
            Icon: BookOpen,
          },
          {
            key: "announcements",
            label: "Announcements",
            href: url("announcements"),
            Icon: Megaphone,
          },
          {
            key: "documents",
            label: "Documents",
            href: url("documents"),
            Icon: FileText,
          },
        ];

  return (
    <div className="campus-overview">
      {guardian && children.length > 0 && (
        <section
          className="campus-card campus-learner-selection"
          aria-label="Learner selection"
        >
          <div className="campus-section-heading">
            <div>
              <p className="campus-overline">Family</p>
              <h2>My children</h2>
            </div>
            {learner && <span className="campus-pill">{learner.fullName}</span>}
          </div>
          <ChildSelector
            learners={children}
            selectedChildId={learner?.id}
            mode="guardian"
            view="overview"
          />
          {learner ? (
            <div
              className="campus-selected-child"
              role="group"
              aria-label="Selected learner"
            >
              <p className="campus-overline">CURRENTLY VIEWING</p>
              <p>
                <strong>{learner.fullName}</strong> · {learner.reference} ·{" "}
                {learner.relationship}
              </p>
            </div>
          ) : (
            <p className="campus-muted">
              Select a learner to see their timetable, homework and notices.
            </p>
          )}
        </section>
      )}

      {guardian && children.length === 0 && (
        <section className="campus-card campus-empty">
          <p className="campus-overline">Family</p>
          <h2>No learner access yet</h2>
          <p>
            No learner access has been granted to this account. Contact your
            School Admin to check your learner links.
          </p>
        </section>
      )}

      <section className="campus-hero">
        <div className="campus-hero-copy">
          <time dateTime={today}>{dayLabel}</time>
          <h1>Hello, {name}</h1>
          <p>{subtitle}</p>
        </div>
        {primary && (
          <Link className="campus-primary" href={primary.href}>
            {primary.label}
            <ArrowRight size={18} aria-hidden="true" />
            <NavigationPending />
          </Link>
        )}
      </section>

      {student && (
        <Suspense fallback={<Loading />}>
          <div className="campus-student-context">
            <StudentProfile
              dashboard
              summaryOnly
              profileRead={studentProfileRead}
              read={{ context, actor }}
            />
          </div>
        </Suspense>
      )}

      {canShowData ? (
        <>
          <section className="campus-shortcuts" aria-labelledby="campus-shortcuts-title">
            <h2 id="campus-shortcuts-title">Go to</h2>
            <nav className="campus-shortcut-grid" aria-label="School features">
              {shortcuts.map(({ key, label, href, Icon }) => (
                <Link className="campus-shortcut" href={href} key={key}>
                  <span className={`campus-tile ${key}`}>
                    <Icon size={28} aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                  <NavigationPending />
                </Link>
              ))}
            </nav>
          </section>

          <div className="campus-content-grid">
            {teacher ? (
              <>
                <Card title="Today’s lessons" href={url("my-timetable")}>
                  <DashboardLessons context={context} actor={actor} />
                </Card>
                <Card
                  title="Published homework"
                  href={url("homework")}
                  action="Manage homework"
                >
                  <DashboardFeed
                    kind="homework"
                    context={context}
                    actor={actor}
                  />
                </Card>
              </>
            ) : (
              <>
                <Card title="Homework due soon" href={url("homework")}>
                  <DashboardFeed
                    kind="homework"
                    context={context}
                    actor={actor}
                  />
                </Card>
                <Card
                  title={guardian ? "Today at school" : "Today’s lessons"}
                  href={url("my-timetable")}
                >
                  <DashboardLessons context={context} actor={actor} />
                </Card>
              </>
            )}
            <Card title="Announcements" href={url("announcements")}>
              <DashboardFeed
                kind="announcements"
                context={context}
                actor={actor}
              />
            </Card>
            <Card title="School documents" href={url("documents")}>
              <DashboardFeed
                kind="documents"
                context={context}
                actor={actor}
              />
            </Card>
          </div>
        </>
      ) : (
        !guardian && (
          <section className="campus-card campus-empty">
            <h2>School information is unavailable</h2>
            <p>
              Reload the page to try again. If the problem continues, contact
              your School Admin.
            </p>
          </section>
        )
      )}
    </div>
  );
}
