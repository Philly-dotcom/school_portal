import type { PortalChild, PortalMode } from "@/lib/portal-validation";

export function ChildSelector({
  learners,
  selectedChildId,
  mode,
  view,
}: {
  learners: PortalChild[];
  selectedChildId?: string | null;
  mode: PortalMode;
  view: string;
}) {
  if (!learners.length) {
    return (
      <p className="muted">
        No learner access has been granted to this guardian account.
      </p>
    );
  }

  return (
    <form method="get" action="/dashboard" className="access-form">
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="mode" value={mode} />

      <label>
        Learner
        <select name="child" defaultValue={selectedChildId ?? ""} required>
          <option value="" disabled>
            Choose a learner
          </option>

          {learners.map((child) => (
            <option key={child.id} value={child.id}>
              {child.fullName} · {child.reference}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="button secondary">
        View learner
      </button>
    </form>
  );
}
