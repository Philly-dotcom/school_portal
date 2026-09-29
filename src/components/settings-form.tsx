"use client";
import { useActionState } from "react";
import { saveSchoolSettings } from "@/app/dashboard/actions";

export function SettingsForm({ name, timezone }: { name: string; timezone: string }) {
  const [state, action, pending] = useActionState(saveSchoolSettings, { error: "", saved: false });
  return <form action={action} className="login-form" style={{ maxWidth: 480 }}>
    <label htmlFor="name">School name</label><input id="name" name="name" defaultValue={name} minLength={2} maxLength={120} required disabled={pending} />
    <label htmlFor="timezone">Timezone</label><input id="timezone" name="timezone" defaultValue={timezone} placeholder="Africa/Johannesburg" required disabled={pending} />
    {state.error && <p role="alert" className="error-message">{state.error}</p>}
    {state.saved && <p role="status" className="success-message">School settings saved.</p>}
    <button type="submit" className="button primary" disabled={pending}>{pending ? "Saving…" : "Save school settings"}</button>
  </form>;
}
