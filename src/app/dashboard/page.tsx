import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { getSchoolContext } from "@/lib/auth-context";
import { PageHeading, PortalShell } from "@/components/portal-shell";
import { SettingsForm } from "@/components/settings-form";
import { roleLabels, type Role } from "@/lib/permissions";
import { ProfileMenu } from "@/components/profile-menu";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { loadStudentProfile } from "@/lib/student-profile-data";
import { signOut } from "@/app/login/actions";
import { invitationPage } from "@/lib/invitation-pagination";
import { PeoplePanel } from "@/components/people-panel";
import { AcademicPanel } from "@/components/academic-panel";
import { type AcademicPageParams } from "@/lib/academic-pagination";
import { RegistersPanel } from "@/components/registers-panel";
import { type RegisterPageParams } from "@/lib/register-pagination";
import { type PlanningPageParams } from "@/lib/planning-pagination";
import { TeachingPanel } from "@/components/teaching-panel";
import { TimetablePanel } from "@/components/timetable-panel";
import {
  availablePortalModes,
  portalModeSchema,
  selectedChildSchema,
} from "@/lib/portal-validation";
import { loadPortalActor } from "@/lib/portal-data";
import { RoleOverview } from "@/components/role-overview";
import { DailyOverview } from "@/components/daily-overview";
import { loadAdminProfile } from "@/lib/staff-profile-data";
import { AdminProfile } from "@/components/staff-profile";
import { MyTimetablePanel } from "@/components/my-timetable-panel";
import {
  AttendancePanel,
  type AttendanceParams,
} from "@/components/attendance-panel";
import {
  HomeworkPanel,
  type HomeworkParams,
} from "@/components/homework-panel";
import {
  AnnouncementPanel,
  type AnnouncementParams,
} from "@/components/announcement-panel";
import {
  DocumentPanel,
  type DocumentParams,
} from "@/components/document-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "School workspace" };

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<
    {
      view?: string;
      invitationPage?: string;
      mode?: string | string[];
      child?: string | string[];
      myTimetablePage?: string | string[];
    } & AcademicPageParams &
      RegisterPageParams &
      AttendanceParams &
      HomeworkParams &
      AnnouncementParams &
      DocumentParams &
      PlanningPageParams
  >;
}) {
  const context = await getSchoolContext();
  if (context.status !== "ready") {
    const messages = {
      unconfigured: [
        "Your school is not connected yet.",
        "This protected workspace needs its dedicated backend and school membership before it can be opened.",
      ],
      forbidden: [
        "School access is not available.",
        "An active membership with an assigned role is required. Please contact your school administrator.",
      ],
      unavailable: [
        "We couldn’t load your school.",
        "School access could not be verified. Please try again or contact your school administrator.",
      ],
    };
    const [title, detail] = messages[context.status];
    return (
      <main className="standalone-state">
        <ShieldCheck size={35} />
        <h1 style={{ marginTop: 20 }}>{title}</h1>
        <p>{detail}</p>
        <Link href="/preview" className="button secondary">
          Explore the public preview
        </Link>
        {context.status === "forbidden" && (
          <Link
            href="/account/accept"
            className="button secondary"
            style={{ marginLeft: 8 }}
          >
            Accept a school invitation
          </Link>
        )}
        {context.status !== "unconfigured" && (
          <form action={signOut} style={{ marginTop: 15 }}>
            <button className="button primary">Sign out</button>
          </form>
        )}
      </main>
    );
  }
  const requested = await searchParams;
  const modes = availablePortalModes(context.roles);
  const managementViews = [
    "academic",
    "registers",
    "teaching",
    "people",
    "settings",
    "timetable",
  ];
  // Old management links already identify an Admin destination. Bare entry and
  // daily views require a deliberate choice when more than one role is available.
  const implicitAdmin =
    requested.mode === undefined &&
    managementViews.includes(requested.view ?? "") &&
    context.roles.includes("school_admin");
  const candidate =
    requested.mode ??
    (implicitAdmin
      ? "school_admin"
      : context.roles.length === 1
        ? context.roles[0]
        : undefined);
  const activeRole =
    typeof candidate === "string" && context.roles.includes(candidate as Role)
      ? (candidate as Role)
      : undefined;
  if (!activeRole) {
    return (
      <PortalShell
        preview={false}
        schoolName={context.school.name}
        view="workspaces"
        profileMenu={
          <Suspense fallback={<p role="status">Loading profile...</p>}>
            <ProfileMenu context={context} />
          </Suspense>
        }
      >
        {requested.mode !== undefined && (
          <p role="alert">
            That workspace is not available to your account. Choose an
            authorised workspace below.
          </p>
        )}
        <WorkspaceSelector roles={context.roles} />
      </PortalShell>
    );
  }
  const admin = activeRole === "school_admin";
  const params = { ...requested, mode: activeRole };
  const childSelection = selectedChildSchema.safeParse(params.child);
  const selectedActor = !admin
    ? params.child !== undefined &&
      (!childSelection.success || activeRole !== "guardian")
      ? { status: "forbidden" as const }
      : await loadPortalActor(
          activeRole as Exclude<Role, "school_admin">,
          childSelection.success ? childSelection.data : undefined,
          context,
        )
    : undefined;
  const adminProfileRead = admin ? loadAdminProfile(context) : undefined;
  const studentProfileRead =
    selectedActor?.status === "ready" && selectedActor.mode === "student"
      ? loadStudentProfile({ context, actor: selectedActor })
      : undefined;
  const profileMenu = (
    <Suspense fallback={<p role="status">Loading profile...</p>}>
      <ProfileMenu
        context={context}
        activeRole={activeRole}
        actor={selectedActor}
        adminProfileRead={adminProfileRead}
        studentProfileRead={studentProfileRead}
      />
    </Suspense>
  );
  if (!admin && managementViews.includes(params.view ?? "")) {
    return (
      <PortalShell
        profileMenu={profileMenu}
        preview={false}
        mode={activeRole as Exclude<Role, "school_admin">}
        schoolName={context.school.name}
      >
        <section className="content-panel">
          <h1>Administrator workspace required</h1>
          <p>
            Use your profile to switch workspaces if your account has School
            Admin access.
          </p>
        </section>
      </PortalShell>
    );
  }
  if (
    params.view === "attendance" ||
    params.view === "homework" ||
    params.view === "announcements" ||
    params.view === "documents"
  ) {
    const parsedMode = portalModeSchema.safeParse(
      params.mode ?? (!admin ? modes[0] : undefined),
    );
    const mode =
      parsedMode.success && modes.includes(parsedMode.data)
        ? parsedMode.data
        : undefined;
    const child = selectedChildSchema.safeParse(params.child);
    const actor = selectedActor;
    return (
      <PortalShell
        profileMenu={profileMenu}
        preview={false}
        admin={admin}
        modes={modes}
        mode={mode}
        child={
          actor?.status === "ready" && actor.mode === "guardian"
            ? actor.selectedChild?.id
            : undefined
        }
        learnerName={
          actor?.status === "ready" && actor.mode === "guardian"
            ? actor.selectedChild?.fullName
            : undefined
        }
        schoolName={context.school.name}
        view={params.view}
      >
        <PageHeading
          eyebrow="DAILY OPERATIONS"
          title={
            params.view === "documents"
              ? "Documents"
              : params.view === "announcements"
                ? "Announcements"
                : params.view === "homework"
                  ? "Homework"
                  : "Attendance"
          }
          description={
            params.view === "documents"
              ? "Private PDFs for your school and current class."
              : params.view === "announcements"
                ? "School notices and updates for your current class."
                : params.view === "homework"
                  ? "Class homework and due dates. Learners read their published work here."
                  : "Daily registers and permitted learner attendance history."
          }
        />
        <Suspense
          key={`${params.view}:${mode}:${child.success ? child.data : ""}:${JSON.stringify(params)}`}
          fallback={<p role="status">Loading this workspace…</p>}
        >
          {params.view === "documents" ? (
            <DocumentPanel
              params={params}
              verifiedContext={context}
              verifiedActor={actor}
            />
          ) : params.view === "announcements" ? (
            <AnnouncementPanel
              params={params}
              verifiedContext={context}
              verifiedActor={actor}
            />
          ) : params.view === "homework" ? (
            <HomeworkPanel
              params={params}
              verifiedContext={context}
              verifiedActor={actor}
            />
          ) : (
            <AttendancePanel
              params={params}
              verifiedContext={context}
              verifiedActor={actor}
            />
          )}
        </Suspense>
      </PortalShell>
    );
  }
  const roleView =
    !params.view ||
    params.view === "overview" ||
    params.view === "my-timetable";
  if (roleView && (!admin || params.view === "my-timetable")) {
    const parsed = portalModeSchema.safeParse(params.mode ?? modes[0]);
    const child =
      params.child === undefined
        ? undefined
        : selectedChildSchema.safeParse(params.child);
    const mode =
      parsed.success && modes.includes(parsed.data) ? parsed.data : undefined;
    const actor = selectedActor ?? { status: "forbidden" as const };
    return (
      <PortalShell
        profileMenu={profileMenu}
        preview={false}
        admin={admin}
        modes={modes}
        mode={mode}
        child={
          actor.status === "ready" && actor.mode === "guardian"
            ? actor.selectedChild?.id
            : undefined
        }
        learnerName={
          actor.status === "ready" && actor.mode === "guardian"
            ? actor.selectedChild?.fullName
            : undefined
        }
        schoolName={context.school.name}
        view={params.view === "my-timetable" ? "my-timetable" : "overview"}
      >
        {!(
          actor.status === "ready" &&
          actor.mode === "student" &&
          params.view !== "my-timetable"
        ) && (
          <PageHeading
            eyebrow="YOUR SCHOOL WORKSPACE"
            title={
              params.view === "my-timetable" ? "My timetable" : "Your workspace"
            }
            description="Access follows your school role and linked school records."
          />
        )}
        {params.view === "my-timetable" && actor.status === "ready" ? (
          <Suspense
            key={`${mode}:${child?.success ? child.data : ""}:${params.myTimetablePage ?? "1"}`}
            fallback={<p role="status">Loading your timetable...</p>}
          >
            <MyTimetablePanel
              actor={actor}
              page={params.myTimetablePage}
              context={context}
            />
          </Suspense>
        ) : (
          <RoleOverview
            actor={actor}
            availableModes={modes}
            schoolName={context.school.name}
            context={context}
            studentProfileRead={studentProfileRead}
          />
        )}
      </PortalShell>
    );
  }
  const settings = params.view === "settings";
  if (params.view === "timetable")
    return (
      <PortalShell
        profileMenu={profileMenu}
        preview={false}
        admin={admin}
        modes={modes}
        schoolName={context.school.name}
        view="timetable"
      >
        <PageHeading
          eyebrow="ACADEMIC PLANNING"
          title="Weekly timetable"
          description="Schedule lessons from teaching assignments and check teacher and class availability."
        />
        {admin ? (
          <TimetablePanel
            schoolId={context.school.id}
            timezone={context.school.timezone}
            page={params.timetablePage}
            assignment={params.assignment}
          />
        ) : (
          <section className="content-panel">
            <h2>Administrator access required</h2>
            <p className="muted">Your role cannot manage the timetable.</p>
          </section>
        )}
      </PortalShell>
    );
  if (params.view === "teaching")
    return (
      <PortalShell
        profileMenu={profileMenu}
        preview={false}
        admin={admin}
        modes={modes}
        schoolName={context.school.name}
        view="teaching"
      >
        <PageHeading
          eyebrow="ACADEMIC SETUP"
          title="Teaching assignments"
          description="Connect teachers, subjects and classes for the academic year."
        />
        {admin ? (
          <TeachingPanel
            schoolId={context.school.id}
            page={params.teachingPage}
          />
        ) : (
          <section className="content-panel">
            <h2>Administrator access required</h2>
            <p className="muted">
              Your role cannot manage teaching assignments.
            </p>
          </section>
        )}
      </PortalShell>
    );
  if (params.view === "registers")
    return (
      <PortalShell
        profileMenu={profileMenu}
        preview={false}
        admin={admin}
        modes={modes}
        schoolName={context.school.name}
        view="registers"
      >
        <PageHeading
          eyebrow="SCHOOL REGISTERS"
          title="Your school community"
          description="Student, teacher and guardian records, relationships and class enrollment."
        />
        {admin ? (
          <RegistersPanel schoolId={context.school.id} pages={params} />
        ) : (
          <section className="content-panel">
            <h2>Administrator access required</h2>
            <p className="muted">Your role cannot manage school registers.</p>
          </section>
        )}
      </PortalShell>
    );
  if (params.view === "academic")
    return (
      <PortalShell
        profileMenu={profileMenu}
        preview={false}
        admin={admin}
        modes={modes}
        schoolName={context.school.name}
        view="academic"
      >
        <PageHeading
          eyebrow="ACADEMIC SETUP"
          title="Build your school structure"
          description="Years, terms, grades, subjects and classes."
        />
        {admin ? (
          <AcademicPanel schoolId={context.school.id} pages={params} />
        ) : (
          <section className="content-panel">
            <h2>Administrator access required</h2>
            <p className="muted">Your role cannot manage academic setup.</p>
          </section>
        )}
      </PortalShell>
    );
  if (params.view === "people")
    return (
      <PortalShell
        profileMenu={profileMenu}
        preview={false}
        admin={admin}
        modes={modes}
        schoolName={context.school.name}
        view="people"
      >
        <PageHeading
          eyebrow="SCHOOL ADMINISTRATION"
          title="People & access"
          description="Invite your school community and manage each member’s access."
        />
        {admin ? (
          <PeoplePanel
            page={invitationPage(params.invitationPage)}
            schoolId={context.school.id}
            userId={context.userId}
          />
        ) : (
          <section className="content-panel">
            <h2>Administrator access required</h2>
            <p className="muted">Your role cannot manage school memberships.</p>
          </section>
        )}
      </PortalShell>
    );
  return (
    <PortalShell
      profileMenu={profileMenu}
      preview={false}
      admin={admin}
      modes={modes}
      schoolName={context.school.name}
      view={settings ? "settings" : "overview"}
    >
      {(settings || !admin) && (
        <PageHeading
          eyebrow="YOUR SCHOOL WORKSPACE"
          title={
            settings ? "School settings" : `Welcome to ${context.school.name}`
          }
          description={`Signed in with verified access: ${context.roles.map((role) => roleLabels[role]).join(" · ")}`}
        />
      )}
      {settings ? (
        <section className="content-panel">
          {admin ? (
            <>
              <h2>School profile</h2>
              <SettingsForm
                name={context.school.name}
                timezone={context.school.timezone}
              />
            </>
          ) : (
            <>
              <h2>Administrator access required</h2>
              <p className="muted">Your role cannot change school settings.</p>
            </>
          )}
        </section>
      ) : (
        <>
          {admin && (
            <>
              <Suspense fallback={<p role="status">Loading your profile...</p>}>
                <AdminProfile
                  dashboard
                  headingOnly
                  context={context}
                  profileRead={adminProfileRead}
                />
              </Suspense>
              <DailyOverview context={context} />
            </>
          )}
        </>
      )}
    </PortalShell>
  );
}
