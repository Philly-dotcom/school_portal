"use client";

import { useState } from "react";
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
  const [pending, setPending] = useState(false);
  if (!learners.length) {
    return (
      <p className="muted">
        No learner access has been granted to this guardian account.
      </p>
    );
  }

  return (
    <form method="get" action="/dashboard" className="access-form" onSubmit={() => setPending(true)}>
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

      <button type="submit" className="button secondary" disabled={pending}>
        {pending ? "Opening learner…" : "View learner"}
      </button>
      {pending && <p role="status">Loading the selected learner. If the request fails, reload this page to try again.</p>}
    </form>
  );
}
