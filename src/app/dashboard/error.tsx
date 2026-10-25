"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function DashboardError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <main className="standalone-state">
      <h1>Your workspace could not be loaded.</h1>
      <p role="alert">Please try again. If this happened after saving, check the record before submitting it again.</p>
      <button className="button primary" disabled={pending} onClick={() => startTransition(() => {
        router.refresh();
        reset();
      })}>{pending ? "Retrying…" : "Try again"}</button>
      <p className="small muted">Retry keeps the current page, role and learner selection. If the problem continues, contact your School Admin.</p>
    </main>
  );
}
