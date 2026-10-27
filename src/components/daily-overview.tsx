import Link from "next/link";
import { Suspense } from "react";
import {
  BookOpen,
  CalendarDays,
  FileText,
  Megaphone,
  Users,
  GraduationCap,
  Layers3,
  ClipboardCheck,
} from "lucide-react";
import type { ReadySchoolContext } from "@/lib/auth-context";
import {
  dashboardAccess,
  loadDashboardCounts,
  loadDashboardFeed,
  loadDashboardLessons,
  type DashboardActor,
} from "@/lib/dashboard-data";
import { portalHref, type PortalView } from "@/lib/portal-validation";
import { documentDownloadHref } from "@/lib/document-validation";
import { schoolDate } from "@/lib/school-date";
import { minuteLabel } from "@/lib/timetable-validation";
import { NavigationPending } from "@/components/navigation-pending";

type Props = { context: ReadySchoolContext; actor?: DashboardActor };
function href(view: PortalView, actor?: DashboardActor) {
  return actor
    ? portalHref(
        view,
        actor.mode,
        actor.mode === "guardian" ? actor.selectedChild?.id : undefined,
      )
    : `/dashboard?view=${view}&mode=school_admin`;
}

function Card({
  title,
  url,
  icon: Icon,
  children,
}: {
  title: string;
  url: string;
  icon: typeof BookOpen;
  children: React.ReactNode;
}) {
  return (
    <section className="daily-card">
      <div className="daily-card-heading">
        <h2>
          <Icon size={20} aria-hidden="true" />
          {title}
        </h2>
        <Link
          href={url}
          className="daily-view-link"
          aria-label={`View all: ${title}`}
        >
          View all <NavigationPending />
        </Link>
      </div>
      {children}
    </section>
  );
}
function Loading() {
  return (
    <p className="daily-message" role="status">
      Loading your school information...
    </p>
  );
}
function Failed() {
  return (
    <p className="daily-message" role="alert">
      This information could not be loaded. Reload to try again, or open the
      full page.
    </p>
  );
}

export async function DashboardCounts({ context }: Props) {
  const counts = await loadDashboardCounts(context);
  if (!counts) return <Failed />;
  const labels = {
    students: "Registered students",
    teachers: "Registered teachers",
    classes: "Classes across academic years",
  };
  const icons = { students: Users, teachers: GraduationCap, classes: Layers3 };
  return (
    <div className="daily-stats">
      {counts.map(({ table, count }) => {
        const Icon = icons[table];
        return (
          <section key={table} className={`daily-stat stat-${table}`}>
            <span className="stat-icon">
              <Icon size={25} aria-hidden="true" />
            </span>
            <div>
              <h2>{labels[table]}</h2>
              <strong>{count === null ? "Unavailable" : count}</strong>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export async function DashboardLessons({ context, actor }: Props) {
  if (!actor) return null;
  const result = await loadDashboardLessons(context, actor);
  if (!result) return <Failed />;
  const today = schoolDate(context.school.timezone);
  const lessons = result.rows
    .filter((row) => row.lesson_date === today)
    .slice(0, 5);
  return (
    <>
      {!lessons.length && (
        <p className="daily-message">
          {result.hasNext
            ? "No lessons for today appear in this preview. Open the full timetable to check the remaining pages."
            : (result.emptyMessage ??
              "No lessons are scheduled for today within your permitted timetable.")}
        </p>
      )}
      <ul className="daily-list">
        {lessons.map((row) => (
          <li key={row.id}>
            <span className="daily-time">
              {minuteLabel(row.start_minute)}–{minuteLabel(row.end_minute)}
            </span>
            <div>
              <strong>{row.subject_name}</strong>
              <p>
                {row.grade_name} · {row.class_name} · {row.teacher_name}
              </p>
            </div>
            <span className="daily-tag">Scheduled</span>
          </li>
        ))}
      </ul>
      {(result.hasNext ||
        result.rows.filter((row) => row.lesson_date === today).length > 5) && (
        <p className="daily-message">
          Preview only. Open the full timetable for all permitted lessons.
        </p>
      )}
    </>
  );
}

export async function DashboardFeed({
  kind,
  context,
  actor,
}: Props & { kind: "homework" | "announcements" | "documents" }) {
  const result = await loadDashboardFeed(kind, context, actor);
  if (!result) return <Failed />;
  const today = schoolDate(context.school.timezone);
  const published = result.rows.filter((row) => row.status === "published");
  const rows =
    kind === "homework"
      ? published
          .filter((row) => "due_date" in row && row.due_date >= today)
          .sort((a, b) =>
            ("due_date" in a ? a.due_date : "").localeCompare(
              "due_date" in b ? b.due_date : "",
            ),
          )
      : published;
  const mode = actor?.mode ?? "school_admin";
  const child =
    actor?.mode === "guardian" ? actor.selectedChild?.id : undefined;
  return (
    <>
      {!rows.length && (
        <p className="daily-message">
          {result.hasNext
            ? "No matching published items appear in this preview. Open the full page to check more records."
            : kind === "homework"
              ? "No published homework with an upcoming due date was found. Open Homework for earlier work."
              : "No published items are available to this workspace."}
        </p>
      )}
      <ul className="daily-list">
        {rows.slice(0, 4).map((row) => (
          <li key={row.id}>
            <div>
              <Link
                className="daily-item-link"
                href={
                  kind === "documents"
                    ? documentDownloadHref(row.id, mode, child)
                    : href(kind, actor)
                }
              >
                {row.title}
              </Link>
              <p>
                {"assignment_label" in row
                  ? row.assignment_label
                  : row.audience_label}
              </p>
            </div>
            <span className="daily-tag">
              {"due_date" in row
                ? `Due ${row.due_date}`
                : "file_size" in row
                  ? `PDF · ${Math.ceil(row.file_size / 1024)} KiB`
                  : "Published"}
            </span>
          </li>
        ))}
      </ul>
      <p className="daily-message">
        {kind === "homework"
          ? "Due dates only; homework has no submission or completion tracking. "
          : ""}
        {result.hasNext
          ? "Preview from the first page. Open the full page for more."
          : "Open the full page for details and available actions."}
      </p>
    </>
  );
}

export function DailyOverview({ context, actor }: Props) {
  if (!dashboardAccess(context, actor)) return null;
  const admin = !actor;
  return (
    <div
    className={`daily-overview ${
  admin
    ? "admin-daily-layout"
    : actor.mode === "student"
      ? "student-daily-layout"
      : actor.mode === "guardian"
        ? "guardian-daily-layout"
        : ""
}`}
    >
      <div className="daily-date">
        <CalendarDays size={18} aria-hidden="true" />
        <span>
          School day:{" "}
          <time dateTime={schoolDate(context.school.timezone)}>
            {schoolDate(context.school.timezone)}
          </time>{" "}
          · {context.school.timezone}
        </span>
        <span>
          Daily activities follow current enrolment and assignment dates.
        </span>
      </div>
      {admin && (
        <Suspense fallback={<Loading />}>
          <DashboardCounts context={context} />
        </Suspense>
      )}
      <nav className="daily-actions" aria-label="Daily quick actions">
        {admin && <h2 className="quick-actions-title">Quick actions</h2>}
        <Link href={href("attendance", actor)}>
          <ClipboardCheck size={21} aria-hidden="true" />
          {admin
            ? "Review attendance"
            : actor.mode === "teacher"
              ? "Mark today's attendance"
              : "View attendance history"}
          <NavigationPending />
        </Link>
        <Link
          href={
            admin ? "/dashboard?view=timetable&mode=school_admin" : href("my-timetable", actor)
          }
        >
          <CalendarDays size={21} aria-hidden="true" />
          {admin ? "Plan the timetable" : "My timetable"}
          <NavigationPending />
        </Link>
        {admin ? (
          <>
            <Link href="/dashboard?view=registers&mode=school_admin">
              <Users size={21} aria-hidden="true" />
              Manage students and teachers
              <NavigationPending />
            </Link>
            <Link href="/dashboard?view=academic&mode=school_admin">
              <BookOpen size={21} aria-hidden="true" />
              Manage years and classes
              <NavigationPending />
            </Link>
            <Link href="/dashboard?view=announcements&mode=school_admin&announcementEdit=new">
              <Megaphone size={21} aria-hidden="true" />
              Create announcement
              <NavigationPending />
            </Link>
            <Link href="/dashboard?view=settings&mode=school_admin">
              Manage school settings
              <NavigationPending />
            </Link>
          </>
        ) : (
          <Link href={href("homework", actor)}>
            <BookOpen size={21} aria-hidden="true" />
            {actor.mode === "teacher" ? "Manage homework" : "View homework"}
            <NavigationPending />
          </Link>
        )}
      </nav>
      <div className="daily-grid">
        {actor && (
          <Card
            title="Today's scheduled lessons"
            url={href("my-timetable", actor)}
            icon={CalendarDays}
          >
            <Suspense fallback={<Loading />}>
              <DashboardLessons context={context} actor={actor} />
            </Suspense>
          </Card>
        )}
        <Card
          title="Homework due soon"
          url={href("homework", actor)}
          icon={BookOpen}
        >
          <Suspense fallback={<Loading />}>
            <DashboardFeed kind="homework" context={context} actor={actor} />
          </Suspense>
        </Card>
        <Card
          title="Published announcements"
          url={href("announcements", actor)}
          icon={Megaphone}
        >
          <Suspense fallback={<Loading />}>
            <DashboardFeed
              kind="announcements"
              context={context}
              actor={actor}
            />
          </Suspense>
        </Card>
        <Card
          title="Available PDFs"
          url={href("documents", actor)}
          icon={FileText}
        >
          <Suspense fallback={<Loading />}>
            <DashboardFeed kind="documents" context={context} actor={actor} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
