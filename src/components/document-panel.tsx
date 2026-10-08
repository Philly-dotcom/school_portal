import Link from "next/link";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { loadPortalActor } from "@/lib/portal-data";
import { loadDocuments } from "@/lib/document-data";
import {
  availablePortalModes,
  portalModeSchema,
  selectedChildSchema,
} from "@/lib/portal-validation";
import { documentHref, documentDownloadHref } from "@/lib/document-validation";
import { maxListPage } from "@/lib/list-pagination";
import { DocumentForm } from "@/components/document-form";
import { ChildSelector } from "@/components/child-selector";
import { RoleOverview } from "@/components/role-overview";

export type DocumentParams = {
  mode?: string | string[];
  child?: string | string[];
  documentPage?: string | string[];
  documentEdit?: string | string[];
};
export async function DocumentPanel({ params }: { params: DocumentParams }) {
  const context = await getSchoolContext();
  if (context.status !== "ready")
    return <p role="alert">Document access could not be verified.</p>;
  const modes = availablePortalModes(context.roles);
  const mode =
    params.mode ??
    (context.roles.includes("school_admin") ? "school_admin" : modes[0]);
  const unavailable = (
    <p role="alert">
      This document view is unavailable. Check your role and selected learner.
    </p>
  );
  if (
    typeof mode !== "string" ||
    !context.roles.includes(mode as (typeof context.roles)[number])
  )
    return unavailable;
  const staff = mode === "school_admin" || mode === "teacher";
  if (staff && params.child !== undefined) return unavailable;
  if (!staff && params.documentEdit !== undefined) return unavailable;
  if (staff && params.documentEdit === "new")
    return (
      <section className="content-panel">
        <h2>New document</h2>
        <DocumentForm mode={mode} />
      </section>
    );
  const edit =
    params.documentEdit === undefined
      ? undefined
      : z.uuid().safeParse(params.documentEdit);
  if (edit && !edit.success) return unavailable;
  let childId: string | undefined;
  let selector: React.ReactNode = null;
  if (!staff) {
    const parsedMode = portalModeSchema.safeParse(mode);
    const child =
      params.child === undefined
        ? undefined
        : selectedChildSchema.safeParse(params.child);
    if (!parsedMode.success || (child && !child.success)) return unavailable;
    const actor = await loadPortalActor(
      parsedMode.data,
      child?.success ? child.data : undefined,
    );
    if (actor.status !== "ready")
      return <RoleOverview actor={actor} availableModes={modes} />;
    if (actor.mode === "guardian") {
      childId = actor.selectedChild?.id;
      selector = (
        <ChildSelector
          learners={actor.children}
          selectedChildId={childId}
          mode="guardian"
          view="documents"
        />
      );
      if (!childId)
        return (
          <section className="content-panel">
            <h2>Document</h2>
            {selector}
            <p>Choose a learner to view document.</p>
          </section>
        );
    }
  }
  const result = await loadDocuments(context.school.id, mode, {
    child: childId,
    page: params.documentPage,
    edit: edit?.success ? edit.data : undefined,
  });
  if (!result)
    return (
      <section className="content-panel">
        {selector}
        <p role="alert">
          Document could not be loaded. Please reload or contact your school
          administrator.
        </p>
      </section>
    );
  if (edit?.success && staff) {
    const item = result.rows[0];
    if (!item?.can_edit) return unavailable;
    return (
      <section className="content-panel">
        <h2>Edit document</h2>
        <DocumentForm key={item.id} mode={mode} item={item} />
      </section>
    );
  }
  return (
    <section className="content-panel">
      <h2>{staff ? "Document management" : "Document"}</h2>
      {selector}
      {staff ? (
        <Link
          className="button primary"
          href={documentHref(mode, { edit: "new" })}
        >
          New document
        </Link>
      ) : (
        <p className="muted">
          Published school PDFs and documents for your current class. Class access changes when your enrollment changes.
        </p>
      )}
      {!result.rows.length && <p>No document was found on this page.</p>}
      {result.rows.map((item) => (
        <article
          key={item.id}
          className="content-panel"
          style={{ marginTop: 20 }}
        >
          <h3>{item.title}</h3>
          <p className="muted">
            {item.audience_label}
          </p>
          {staff && <p>Status: {item.status}</p>}
          <p className="whitespace-pre-wrap">{Math.ceil(item.file_size / 1024)} KiB · PDF</p>
          {item.status !== "uploading" && <a className="button secondary" href={documentDownloadHref(item.id, mode, childId)}>Download PDF</a>}
          {item.can_edit && staff && (
            <Link href={documentHref(mode, { edit: item.id })}>
              Edit / change visibility
            </Link>
          )}
        </article>
      ))}
      <nav
        aria-label="Document pages"
        className="flex flex-wrap gap-3"
        style={{ marginTop: 20 }}
      >
        {result.page > 1 && (
          <Link
            href={documentHref(mode, { child: childId, page: result.page - 1 })}
          >
            Previous
          </Link>
        )}
        <span>Page {result.page}</span>
        {result.hasNext && result.page < maxListPage && (
          <Link
            href={documentHref(mode, { child: childId, page: result.page + 1 })}
          >
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
