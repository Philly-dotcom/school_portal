"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { RecordSearchSelect } from "@/components/record-search-select";
import { searchAnnouncementClasses } from "@/app/dashboard/announcements/search-actions";
import { uploadDocument, changeDocument } from "@/app/dashboard/documents/actions";
import { documentHref, type DocumentItem, type DocumentStaffMode } from "@/lib/document-validation";

export function DocumentForm({ mode, item }: { mode: DocumentStaffMode; item?: DocumentItem }) {
  const [scope, setScope] = useState(mode === "school_admin" ? "school" : "class");
  const [state, action, pending] = useActionState(item ? changeDocument : uploadDocument, { error: "", saved: false });
  if (state.saved) return <section className="content-panel">
    <p role="status">{item ? "Document visibility saved." : "PDF uploaded as a draft. Open it from the list to review and publish."}</p>
    <Link href={documentHref(mode)}>Back to Documents</Link>
  </section>;
  return <form action={action} className="access-form">
    <input type="hidden" name="mode" value={mode} />
    {item ? <>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="version" value={item.record_version} />
      <h3>{item.title}</h3><p>{item.audience_label} · Current status: {item.status}</p>
      <p className="muted">The file and audience stay fixed. Upload a new document for a replacement.</p>
      {item.status === "uploading" && <p>The upload is unfinished. Saving a draft checks whether the file arrived. If it did not, withdraw this entry and upload a new copy.</p>}
      <label>Visibility after saving<select name="status" defaultValue={item.status === "uploading" ? "draft" : item.status} disabled={pending}>
        {(item.status === "uploading" || item.status === "draft") && <option value="draft">Draft — authorized staff only</option>}
        <option value="published">Published — audience can download</option>
        <option value="withdrawn">Withdrawn — authorized staff only</option>
      </select></label>
    </> : <>
      <input type="hidden" name="scope" value={scope} />
      {mode === "school_admin" && <label>Audience<select value={scope} onChange={e => setScope(e.target.value)} disabled={pending}>
        <option value="school">Whole school</option><option value="class">One class</option>
      </select></label>}
      {scope === "class" ? <RecordSearchSelect kind="classes" name="classId" label="Class" disabled={pending}
        searchAction={(query, page) => searchAnnouncementClasses(mode, query, page)} /> : <input type="hidden" name="classId" value="" />}
      <label>Document title<input name="title" maxLength={160} required disabled={pending} /></label>
      <label>PDF file (maximum 2 MiB)<input type="file" name="file" accept="application/pdf,.pdf" required disabled={pending} /></label>
      <p className="muted">Uploads start as staff-only drafts. Review the PDF before publishing. Use trusted PDFs; this portal does not scan files for malware.</p>
    </>}
    {state.error && <p role="alert" className="error-message">{state.error}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Saving…" : item ? "Save visibility" : "Upload PDF draft"}</button>
    <Link className="button secondary" href={documentHref(mode)}>Return to Documents</Link>
    {state.error && <button type="button" className="button secondary" onClick={() => window.location.reload()}>Reload (discard unsaved changes)</button>}
  </form>;
}
