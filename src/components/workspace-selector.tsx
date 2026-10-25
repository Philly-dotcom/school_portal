import Link from "next/link";
import { NavigationPending } from "@/components/navigation-pending";
import { roleLabels, type Role } from "@/lib/permissions";

// This is navigation only. The dashboard verifies membership on every request.
export function WorkspaceSelector({
  roles,
  activeRole,
  compact = false,
}: {
  roles: readonly Role[];
  activeRole?: Role;
  compact?: boolean;
}) {
  return (
    <section
      className={
        compact ? "profile-workspaces" : "content-panel workspace-selection"
      }
    >
      {compact ? (
        <h3>Switch Workspace</h3>
      ) : (
        <>
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Welcome back! How would you like to continue?</h1>
          <p className="muted">
            Choose a workspace for this visit. You can switch from your profile
            at any time.
          </p>
        </>
      )}
      <nav aria-label="Choose workspace" className="workspace-choices">
        {roles.map((role) => (
          <Link
            key={role}
            href={`/dashboard?view=overview&mode=${role}`}
            className="button secondary"
            aria-current={activeRole === role ? "page" : undefined}
          >
            {compact ? roleLabels[role] : `Continue as ${roleLabels[role]}`}
            {activeRole === role && <span className="small"> · Current</span>}
            <NavigationPending />
          </Link>
        ))}
      </nav>
    </section>
  );
}
