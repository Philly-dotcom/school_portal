import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getSchoolContext } from "@/lib/auth-context";
import { PageHeading, PortalShell } from "@/components/portal-shell";
import { SettingsForm } from "@/components/settings-form";
import { roleLabels } from "@/lib/permissions";
import { signOut } from "@/app/login/actions";
import { PeoplePanel } from "@/components/people-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "School workspace" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const context = await getSchoolContext();
  if (context.status !== "ready") {
    const messages = {
      unconfigured: ["Your school is not connected yet.", "This protected workspace needs its dedicated backend and school membership before it can be opened."],
      forbidden: ["School access is not available.", "An active membership with an assigned role is required. Please contact your school administrator."],
      unavailable: ["We couldn’t load your school.", "School access could not be verified. Please try again or contact your school administrator."],
    };
    const [title, detail] = messages[context.status];
    return <main className="standalone-state"><ShieldCheck size={35} /><h1 style={{ marginTop: 20 }}>{title}</h1><p>{detail}</p><Link href="/preview" className="button secondary">Explore the public preview</Link>{context.status === "forbidden" && <Link href="/account/accept" className="button secondary" style={{ marginLeft: 8 }}>Accept a school invitation</Link>}{context.status !== "unconfigured" && <form action={signOut} style={{ marginTop: 15 }}><button className="button primary">Sign out</button></form>}</main>;
  }
  const admin = context.roles.includes("school_admin");
  const params = await searchParams;
  const settings = params.view === "settings";
  if (params.view === "people") return <PortalShell preview={false} admin={admin} schoolName={context.school.name} view="people"><PageHeading eyebrow="SCHOOL ADMINISTRATION" title="People & access" description="Invite your school community and manage each member’s access." />{admin ? <PeoplePanel schoolId={context.school.id} userId={context.userId} /> : <section className="content-panel"><h2>Administrator access required</h2><p className="muted">Your role cannot manage school memberships.</p></section>}</PortalShell>;
  return <PortalShell preview={false} admin={admin} schoolName={context.school.name} view={settings ? "settings" : "overview"}>
    <PageHeading eyebrow="YOUR SCHOOL WORKSPACE" title={settings ? "School settings" : `Welcome to ${context.school.name}`} description={`Signed in with verified access: ${context.roles.map((role) => roleLabels[role]).join(" · ")}`} />
    {settings ? <section className="content-panel">{admin ? <><h2>School profile</h2><SettingsForm name={context.school.name} timezone={context.school.timezone} /></> : <><h2>Administrator access required</h2><p className="muted">Your role cannot change school settings.</p></>}</section> : <><section className="content-panel"><h2>Your secure foundation is connected.</h2><p className="muted" style={{ marginTop: 12 }}>Your identity, active school membership and roles were checked before this page was shown. Academic records and daily operations will be added in the next phases.</p>{admin && <Link className="button primary" href="/dashboard?view=settings" style={{ marginTop: 22 }}>Manage school settings</Link>}</section><div className="quiet-note"><ShieldCheck size={21} /><p>No student, attendance, marks or finance modules are available yet. This workspace only shows the implemented foundation.</p></div></>}
  </PortalShell>;
}
