"use client";

import { useLinkStatus } from "next/link";

// This is rendered inside each navigation Link, including query-only changes.
export function NavigationPending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span role="status" className="small">
      Loading…
    </span>
  ) : null;
}
