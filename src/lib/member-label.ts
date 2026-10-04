export function memberLabel(member: {
  id: string;
  display_name: string;
  verified_email: string | null;
  status: string;
}) {
  return `${member.display_name || "School member"} · ${member.verified_email || "No verified email"} · ${member.id}${member.status === "active" ? "" : " (inactive)"}`;
}
