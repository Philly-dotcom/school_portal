import Link from "next/link";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { loadPortalActor } from "@/lib/portal-data";
import { loadHomework } from "@/lib/homework-data";
import {
  availablePortalModes,
  portalModeSchema,
  selectedChildSchema,
} from "@/lib/portal-validation";
import { homeworkHref } from "@/lib/homework-validation";
import { maxListPage } from "@/lib/list-pagination";
import { HomeworkForm } from "@/components/homework-form";
import { ChildSelector } from "@/components/child-selector";
import { RoleOverview } from "@/components/role-overview";

export type HomeworkParams = {
  mode?: string | string[];
  child?: string | string[];
  homeworkPage?: string | string[];
  homeworkEdit?: string | string[];
};
export async function HomeworkPanel({ params }: { params: HomeworkParams }) {
  const context = await getSchoolContext();
  if (context.status !== "ready")
    return <p role="alert">Homework access could not be verified.</p>;
  const modes = availablePortalModes(context.roles);
  const mode =
    params.mode ??
    (context.roles.includes("school_admin") ? "school_admin" : modes[0]);
  const unavailable = (
    <p role="alert">
      This homework view is unavailable. Check your role and selected learner.
    </p>
  );
  if (
    typeof mode !== "string" ||
    !context.roles.includes(mode as (typeof context.roles)[number])
  )
    return unavailable;
  const staff = mode === "school_admin" || mode === "teacher";
  if (staff && params.child !== undefined) return unavailable;
  if (!staff && params.homeworkEdit !== undefined) return unavailable;
  if (staff && params.homeworkEdit === "new")
    return (
      <section className="content-panel">
        <h2>New homework</h2>
        <HomeworkForm mode={mode} />
      </section>
    );
  const edit =
    params.homeworkEdit === undefined
      ? undefined
      : z.uuid().safeParse(params.homeworkEdit);
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
          view="homework"
        />
      );
      if (!childId)
        return (
          <section className="content-panel">
            <h2>Homework</h2>
            {selector}
            <p>Choose a learner to view homework.</p>
          </section>
        );
    }
  }
  const result = await loadHomework(context.school.id, mode, {
    child: childId,
    page: params.homeworkPage,
    edit: edit?.success ? edit.data : undefined,
  });
  if (!result)
    return (
      <section className="content-panel">
        {selector}
        <p role="alert">
          Homework could not be loaded. Please reload or contact your school
          administrator.
        </p>
      </section>
    );
  if (edit?.success && staff) {
    const item = result.rows[0];
    if (!item?.can_edit) return unavailable;
    return (
      <section className="content-panel">
        <h2>Edit homework</h2>
        <HomeworkForm key={item.id} mode={mode} item={item} />
      </section>
    );
  }
  return (
    <section className="content-panel">
      <h2>{staff ? "Homework management" : "Homework"}</h2>
      {selector}
      {staff ? (
        <Link
          className="button primary"
          href={homeworkHref(mode, { edit: "new" })}
        >
          New homework
        </Link>
      ) : (
        <p className="muted">
          Published homework for classes you belonged to on its original
          publication date. There are no online submissions.
        </p>
      )}
      {!result.rows.length && <p>No homework was found on this page.</p>}
      {result.rows.map((item) => (
        <article
          key={item.id}
          className="content-panel"
          style={{ marginTop: 20 }}
        >
          <h3>{item.title}</h3>
          <p className="muted">
            {item.assignment_label} · Due {item.due_date}
          </p>
          {staff && <p>Status: {item.status}</p>}
          <p className="whitespace-pre-wrap">{item.instructions}</p>
          {item.can_edit && staff && (
            <Link href={homeworkHref(mode, { edit: item.id })}>
              Edit / change visibility
            </Link>
          )}
        </article>
      ))}
      <nav
        aria-label="Homework pages"
        className="flex flex-wrap gap-3"
        style={{ marginTop: 20 }}
      >
        {result.page > 1 && (
          <Link
            href={homeworkHref(mode, { child: childId, page: result.page - 1 })}
          >
            Previous
          </Link>
        )}
        <span>Page {result.page}</span>
        {result.hasNext && result.page < maxListPage && (
          <Link
            href={homeworkHref(mode, { child: childId, page: result.page + 1 })}
          >
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
