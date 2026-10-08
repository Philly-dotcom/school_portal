import Link from "next/link";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { loadPortalActor } from "@/lib/portal-data";
import { loadAnnouncement } from "@/lib/announcement-data";
import {
  availablePortalModes,
  portalModeSchema,
  selectedChildSchema,
} from "@/lib/portal-validation";
import { announcementHref } from "@/lib/announcement-validation";
import { maxListPage } from "@/lib/list-pagination";
import { AnnouncementForm } from "@/components/announcement-form";
import { ChildSelector } from "@/components/child-selector";
import { RoleOverview } from "@/components/role-overview";

export type AnnouncementParams = {
  mode?: string | string[];
  child?: string | string[];
  announcementPage?: string | string[];
  announcementEdit?: string | string[];
};
export async function AnnouncementPanel({ params }: { params: AnnouncementParams }) {
  const context = await getSchoolContext();
  if (context.status !== "ready")
    return <p role="alert">Announcement access could not be verified.</p>;
  const modes = availablePortalModes(context.roles);
  const mode =
    params.mode ??
    (context.roles.includes("school_admin") ? "school_admin" : modes[0]);
  const unavailable = (
    <p role="alert">
      This announcement view is unavailable. Check your role and selected learner.
    </p>
  );
  if (
    typeof mode !== "string" ||
    !context.roles.includes(mode as (typeof context.roles)[number])
  )
    return unavailable;
  const staff = mode === "school_admin" || mode === "teacher";
  if (staff && params.child !== undefined) return unavailable;
  if (!staff && params.announcementEdit !== undefined) return unavailable;
  if (staff && params.announcementEdit === "new")
    return (
      <section className="content-panel">
        <h2>New announcement</h2>
        <AnnouncementForm mode={mode} />
      </section>
    );
  const edit =
    params.announcementEdit === undefined
      ? undefined
      : z.uuid().safeParse(params.announcementEdit);
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
          view="announcements"
        />
      );
      if (!childId)
        return (
          <section className="content-panel">
            <h2>Announcement</h2>
            {selector}
            <p>Choose a learner to view announcement.</p>
          </section>
        );
    }
  }
  const result = await loadAnnouncement(context.school.id, mode, {
    child: childId,
    page: params.announcementPage,
    edit: edit?.success ? edit.data : undefined,
  });
  if (!result)
    return (
      <section className="content-panel">
        {selector}
        <p role="alert">
          Announcement could not be loaded. Please reload or contact your school
          administrator.
        </p>
      </section>
    );
  if (edit?.success && staff) {
    const item = result.rows[0];
    if (!item?.can_edit) return unavailable;
    return (
      <section className="content-panel">
        <h2>Edit announcement</h2>
        <AnnouncementForm key={item.id} mode={mode} item={item} />
      </section>
    );
  }
  return (
    <section className="content-panel">
      <h2>{staff ? "Announcement management" : "Announcement"}</h2>
      {selector}
      {staff ? (
        <Link
          className="button primary"
          href={announcementHref(mode, { edit: "new" })}
        >
          New announcement
        </Link>
      ) : (
        <p className="muted">
          Published school notices and notices for your current class. Class access changes when your enrollment changes.
        </p>
      )}
      {!result.rows.length && <p>No announcement was found on this page.</p>}
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
          <p className="whitespace-pre-wrap">{item.body}</p>
          {item.can_edit && staff && (
            <Link href={announcementHref(mode, { edit: item.id })}>
              Edit / change visibility
            </Link>
          )}
        </article>
      ))}
      <nav
        aria-label="Announcement pages"
        className="flex flex-wrap gap-3"
        style={{ marginTop: 20 }}
      >
        {result.page > 1 && (
          <Link
            href={announcementHref(mode, { child: childId, page: result.page - 1 })}
          >
            Previous
          </Link>
        )}
        <span>Page {result.page}</span>
        {result.hasNext && result.page < maxListPage && (
          <Link
            href={announcementHref(mode, { child: childId, page: result.page + 1 })}
          >
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
