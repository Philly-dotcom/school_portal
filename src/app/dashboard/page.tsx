import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getSchoolContext } from "@/lib/auth-context";
import { PageHeading, PortalShell } from "@/components/portal-shell";
import { SettingsForm } from "@/components/settings-form";
import { roleLabels } from "@/lib/permissions";
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

export const dynamic = "force-dynamic";
export const metadata = { title: "School workspace" };

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<
    { view?: string; invitationPage?: string } & AcademicPageParams &
      RegisterPageParams &
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
  const admin = context.roles.includes("school_admin");
  const params = await searchParams;
  const settings = params.view === "settings";
  if (params.view === "timetable")
    return (
      <PortalShell
        preview={false}
        admin={admin}
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
        preview={false}
        admin={admin}
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
        preview={false}
        admin={admin}
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
        preview={false}
        admin={admin}
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
        preview={false}
        admin={admin}
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
      preview={false}
      admin={admin}
      schoolName={context.school.name}
      view={settings ? "settings" : "overview"}
    >
      <PageHeading
        eyebrow="YOUR SCHOOL WORKSPACE"
        title={
          settings ? "School settings" : `Welcome to ${context.school.name}`
        }
        description={`Signed in with verified access: ${context.roles.map((role) => roleLabels[role]).join(" · ")}`}
      />
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
          <section className="content-panel">
            <h2>Your secure foundation is connected.</h2>
            <p className="muted" style={{ marginTop: 12 }}>
              Your identity, active school membership and roles were checked
              before this page was shown. Administrators can now create years,
              terms, grades, subjects and classes in Academic setup. School
              registers support student, teacher and guardian records, guardian
              links and initial class enrollment.
            </p>
            {admin && (
              <Link
                className="button primary"
                href="/dashboard?view=settings"
                style={{ marginTop: 22 }}
              >
                Manage school settings
              </Link>
            )}
          </section>
          <div className="quiet-note">
            <ShieldCheck size={21} />
            <p>
              Attendance, marks and finance modules are not available yet.
              Academic setup is available to school administrators.
            </p>
          </div>
        </>
      )}
    </PortalShell>
  );
}
