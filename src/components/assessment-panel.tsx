import Link from "next/link";
import { MarksPanel } from "./marks-panel";
import { RosterAmendmentPanel } from "./roster-amendment-panel";
import { marksHref } from "@/lib/marks-validation";
import { z } from "zod";
import type { ReadySchoolContext } from "@/lib/auth-context";
import { assessmentMode, assessmentHref } from "@/lib/assessment-validation";
import { loadAssessments } from "@/lib/assessment-data";
import { AssessmentForm, AuthoriseScaleButton } from "@/components/assessment-form";
export type AssessmentParams = {
  rosterChanges?: string | string[];
  marks?: string | string[];
  marksPage?: string | string[];
  assessmentPage?: string | string[];
  assessmentEdit?: string | string[];
  child?: string | string[];
};
export async function AssessmentPanel({
  params,
  context,
  mode,
}: {
  params: AssessmentParams;
  context: ReadySchoolContext;
  mode: string;
}) {
  const role = assessmentMode.safeParse(mode);
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .safeParse(params.assessmentPage ?? "1");
  const edit = params.assessmentEdit;
  if (
    !role.success ||
    !context.roles.includes(role.data) ||
    params.child !== undefined ||
    !page.success ||
    Array.isArray(params.assessmentPage) ||
    (edit !== undefined && edit !== "new" && !z.uuid().safeParse(edit).success)
  )
    return (
      <p role="alert">
        Assessment planning is available only in an authorised staff workspace.
      </p>
    );
  if (params.marks !== undefined || params.marksPage !== undefined || params.rosterChanges !== undefined) {
    const id = z.uuid().safeParse(params.marks);
    const index = z.string().regex(/^[1-9]\d{0,5}$/).transform(Number).pipe(z.number().max(100000)).safeParse(params.marksPage ?? "1");
    if (!id.success || !index.success || edit !== undefined)
      return <p role="alert">Invalid assessment roster link.</p>;
    if (params.rosterChanges !== undefined) {
      if (role.data !== "school_admin" || params.rosterChanges !== "1") return <p role="alert">School Admin access required.</p>;
      return <RosterAmendmentPanel school={context.school.id} id={id.data} page={index.data} />;
    }
    return <MarksPanel school={context.school.id} mode={role.data} id={id.data} page={index.data} />;
  }
  if (edit === "new")
    return (
      <section className="content-panel">
        <h2>Plan an assessment</h2>
        {role.data === "school_admin" && (
          <p>To authorise an existing proposal, <Link href={assessmentHref(role.data)}>open the assessment list</Link> and choose Authorise scale.</p>
        )}
        <AssessmentForm mode={role.data} />
      </section>
    );
  const rows = await loadAssessments(
    context.school.id,
    role.data,
    edit ? 1 : page.data,
    edit as string | undefined,
  );
  if (!rows)
    return (
      <p role="alert">
        Assessments could not be loaded. Reload or contact your school
        administrator.
      </p>
    );
  if (edit) {
    const item = rows.rows[0];
    return item ? (
      <section className="content-panel">
        <h2>Edit assessment definition</h2>
        <AssessmentForm
          key={`${item.id}:${item.record_version}`}
          mode={role.data}
          item={item}
        />
      </section>
    ) : (
      <p role="alert">Assessment unavailable.</p>
    );
  }
  return (
    <section className="content-panel">
      <h2>Assessment planning</h2>
      <p>
        Plan assessments, authorise scales and capture private draft marks.
      </p>
      <Link className="button primary" href={assessmentHref(role.data, "new")}>
        Plan assessment
      </Link>
      {!rows.rows.length && (
        <p>No assessment definitions are available in this staff scope.</p>
      )}
      <ul>
        {rows.rows.map((item) => (
          <li key={item.id}>
            <Link href={assessmentHref(role.data, item.id)}>{item.title}</Link>
            {" · "}<Link href={marksHref(role.data, item.id)}>Roster and draft marks</Link>
            <p>
              {item.assignment_label} · {item.term_label} ·{" "}
              {item.effective_date}
            </p>
            <p>
              Scale: {item.minimum}–{item.maximum}, {item.decimal_places}{" "}
              decimal places ·{" "}
              {item.scale_authorised
                ? "Admin-authorised"
                : "Awaiting Admin authorisation"}{" "}
              · Version {item.record_version}
            </p>
            {role.data === "school_admin" && !item.scale_authorised && (
              <AuthoriseScaleButton key={item.record_version} item={{ id: item.id, title: item.title, record_version: item.record_version }} />
            )}
          </li>
        ))}
      </ul>
      <nav aria-label="Assessment pages">
        {page.data > 1 && (
          <Link href={assessmentHref(role.data, undefined, page.data - 1)}>
            Previous
          </Link>
        )}
        {rows.hasNext && page.data < 100000 && (
          <Link href={assessmentHref(role.data, undefined, page.data + 1)}>
            Next
          </Link>
        )}
      </nav>
    </section>
  );
}
