import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { invitationDeliveryEnabled } from "@/lib/account-config";
import { BulkInviteForm, InvitationItem, InviteForm, MemberEditor, type InvitationRow, type MemberRow } from "./access-management";

export async function PeoplePanel({ schoolId, userId }: { schoolId: string; userId: string }) {
  const client = await createClient();
  const [members, invitations, audit] = await Promise.all([
    client.rpc("list_school_members", { target_school: schoolId }),
    client.from("school_invitations").select("id,email,display_name,roles,status,delivery_status,expires_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(100),
    client.from("audit_events").select("id,action,occurred_at").eq("school_id", schoolId).order("occurred_at", { ascending: false }).limit(10),
  ]);
  if (members.error || invitations.error || audit.error) return <section className="content-panel"><h2>Account management needs its database update.</h2><p className="muted" style={{ marginTop: 12 }}>Apply the new account-management migration to this project, then reload. If it is already applied, check your school access.</p><p className="small muted" style={{ marginTop: 12 }}>Setup instructions: docs/ACCOUNT_MANAGEMENT.md</p><Link className="button secondary" href="/dashboard" style={{ marginTop: 20 }}>Back to overview</Link></section>;
  const canSend = invitationDeliveryEnabled();
  // eslint-disable-next-line react-hooks/purity -- Dynamic Server Component: one request-time snapshot. SQL enforces actual expiry.
  const requestTime = Date.now();
  return <><div className="quiet-note" style={{ marginBottom: 24 }}><p><strong>{canSend ? "Invitation sending is enabled." : "Invitation emails are not enabled yet."}</strong> {canSend ? "Only press Send after checking the recipient and roles. Provider acceptance does not confirm inbox delivery." : "You can prepare invitations and manage existing members. Configure the isolated sender, email templates and delivery settings before sending."}</p></div><div className="people-grid"><section><div className="section-heading"><h2>School members</h2><span className="phase-tag">{members.data?.length ?? 0} members</span></div>{(members.data as MemberRow[]).map((member) => <MemberEditor key={`${member.id}-${member.access_version}`} member={member} ownAccount={member.user_id === userId} />)}<section className="content-panel" style={{ marginTop: 24 }}><h2>Recent access activity</h2><ul className="audit-list">{audit.data.map((event) => <li key={event.id}><span>{event.action.replaceAll("_", " ").replaceAll(".", " · ")}</span><time dateTime={event.occurred_at}>{event.occurred_at.slice(0, 16).replace("T", " ")} UTC</time></li>)}</ul></section></section><div><InviteForm /><BulkInviteForm /><section className="content-panel"><h2>Invitation history</h2>{!invitations.data.length && <p className="muted" style={{ marginTop: 16 }}>No invitations yet.</p>}{(invitations.data as InvitationRow[]).map((invitation) => <InvitationItem key={invitation.id} invitation={invitation} canSend={canSend} expired={Date.parse(invitation.expires_at) <= requestTime} />)}{invitations.data.length === 100 && <p className="muted small">Showing the latest 100 invitations.</p>}</section></div></div></>;
}
