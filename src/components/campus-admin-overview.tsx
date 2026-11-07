import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Megaphone,
  Users,
} from "lucide-react";
import { DashboardCounts, DashboardFeed } from "@/components/daily-overview";
import { NavigationPending } from "@/components/navigation-pending";
import type { ReadySchoolContext } from "@/lib/auth-context";
import { loadAdminProfile } from "@/lib/staff-profile-data";
import { schoolDate } from "@/lib/school-date";

function url(view: string) {
  return `/dashboard?${new URLSearchParams({ view, mode: "school_admin" })}`;
}

function Loading() {
  return <p role="status">Loading school information…</p>;
}

function Card({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section className="ca-card">
      <header className="ca-card-heading">
        <h2>{title}</h2>
        <Link href={href} aria-label={`View all: ${title}`}>
          View all <NavigationPending />
        </Link>
      </header>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </section>
  );
}

export async function CampusAdminOverview({
  context,
  profileRead,
}: {
  context: ReadySchoolContext;
  profileRead?: ReturnType<typeof loadAdminProfile>;
}) {
  if (!context.roles.includes("school_admin")) return null;
  const profile = await (profileRead ?? loadAdminProfile(context));
  const greeting =
    profile.status === "ready" && profile.fullName !== "Name not recorded"
      ? `Hello, ${profile.fullName}`
      : "Your school overview";
  const today = schoolDate(context.school.timezone);
  const dayLabel = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${today}T12:00:00Z`));
  const actions = [
    {
      label: "Review attendance",
      href: url("attendance"),
      Icon: ClipboardCheck,
      colour: "green",
    },
    {
      label: "Plan the timetable",
      href: url("timetable"),
      Icon: CalendarDays,
      colour: "blue",
    },
    {
      label: "School registers",
      href: url("registers"),
      Icon: Users,
      colour: "orange",
    },
    {
      label: "Create announcement",
      href: `${url("announcements")}&announcementEdit=new`,
      Icon: Megaphone,
      colour: "purple",
    },
  ];

  return (
    <div className="ca-overview">
      <section className="ca-hero">
        <div>
          <time dateTime={today}>{dayLabel}</time>
          <h1>{greeting}</h1>
          <p>{context.school.name} · Your school at a glance</p>
          {profile.status !== "ready" && (
            <p role="status">Your profile could not be loaded.</p>
          )}
        </div>
        <Link href={url("attendance")} className="ca-primary">
          Review attendance <ArrowRight size={18} aria-hidden="true" />
          <NavigationPending />
        </Link>
      </section>

      <Suspense fallback={<Loading />}>
        <DashboardCounts context={context} />
      </Suspense>

      <section>
        <h2 className="ca-section-title">Quick actions</h2>
        <nav className="ca-actions" aria-label="Administrator quick actions">
          {actions.map(({ label, href, Icon, colour }) => (
            <Link href={href} key={label}>
              <span className={`ca-action-icon ${colour}`}>
                <Icon size={25} aria-hidden="true" />
              </span>
              <strong>{label}</strong>
              <NavigationPending />
            </Link>
          ))}
        </nav>
      </section>

      <div className="ca-feed-grid">
        <Card title="Announcements" href={url("announcements")}>
          <DashboardFeed kind="announcements" context={context} />
        </Card>
        <div className="ca-secondary-feeds">
          <Card title="Homework due soon" href={url("homework")}>
            <DashboardFeed kind="homework" context={context} />
          </Card>
          <Card title="School documents" href={url("documents")}>
            <DashboardFeed kind="documents" context={context} />
          </Card>
        </div>
      </div>
    </div>
  );
}
