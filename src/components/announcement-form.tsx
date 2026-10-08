"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { RecordSearchSelect } from "@/components/record-search-select";
import { saveAnnouncement } from "@/app/dashboard/announcements/actions";
import { searchAnnouncementClasses } from "@/app/dashboard/announcements/search-actions";
import { announcementHref, type AnnouncementItem, type AnnouncementStaffMode } from "@/lib/announcement-validation";

export function AnnouncementForm({ mode, item }: { mode: AnnouncementStaffMode; item?: AnnouncementItem }) {
  const [scope, setScope] = useState(mode === "school_admin" ? "school" : "class");
  const [state, action, pending] = useActionState(saveAnnouncement, { error: "", saved: false });
  if (state.saved) return <section className="content-panel">
    <p role="status" className="success-message">Announcement saved.</p>
    <Link href={announcementHref(mode)} className="button secondary">Back to announcements</Link>
  </section>;
  return <form action={action} className="access-form">
    <input type="hidden" name="mode" value={mode} />
    <input type="hidden" name="id" value={item?.id ?? ""} />
    <input type="hidden" name="version" value={item?.record_version ?? 0} />
    <input type="hidden" name="scope" value={item ? (item.class_id ? "class" : "school") : scope} />
    {item ? <>
      <input type="hidden" name="classId" value={item.class_id ?? ""} />
      <p>Audience: {item.audience_label}</p>
      <p className="muted">The audience stays fixed. Create a new notice for a different audience.</p>
    </> : <>
      {mode === "school_admin" && <label>Audience
        <select value={scope} onChange={(event) => setScope(event.target.value)} disabled={pending}>
          <option value="school">Whole school</option><option value="class">One class</option>
        </select>
      </label>}
      {scope === "class" ? <RecordSearchSelect kind="classes" name="classId" label="Class" disabled={pending}
        searchAction={(query, page) => searchAnnouncementClasses(mode, query, page)} />
        : <input type="hidden" name="classId" value="" />}
    </>}
    <label>Announcement title<input name="title" defaultValue={item?.title ?? ""} maxLength={160} required disabled={pending} /></label>
    <label>Message<textarea name="body" defaultValue={item?.body ?? ""} maxLength={10000} rows={8} required disabled={pending} /></label>
    <label>Visibility after saving<select name="status" defaultValue={item?.status ?? "draft"} disabled={pending}>
      {!item?.published_at && <option value="draft">Draft — authorized staff only</option>}
      <option value="published">Published — visible to the audience</option>
      {item && <option value="withdrawn">Withdrawn — authorized staff only</option>}
    </select></label>
    <p className="muted">Publishing takes effect when you save. Current class learners and their authorized guardians can read class notices, including earlier notices. This does not send email or messages.</p>
    {state.error && <p role="alert" className="error-message">{state.error}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save announcement"}</button>
    <Link className="button secondary" href={announcementHref(mode)}>Cancel / return to list</Link>
    {state.error && <button type="button" className="button secondary" onClick={() => window.location.reload()}>Reload (discard unsaved edits)</button>}
  </form>;
}
