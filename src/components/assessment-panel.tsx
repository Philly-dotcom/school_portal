import Link from "next/link";
import { MarksPanel } from "./marks-panel";
import { AssessmentReviewPanel } from "./assessment-review-panel";
import { GradingPolicyPanel } from "./grading-policy-panel";
import { gradingPolicyHref } from "@/lib/grading-policy-validation";
import { ReviewerGrantForm } from "./reviewer-grant-form";
import { ReviewerGrantList } from "./reviewer-grant-list";
import { CorrectionGrantPanel } from "./correction-grant-panel";
import { RosterAmendmentPanel } from "./roster-amendment-panel";
import { marksHref } from "@/lib/marks-validation";
import { z } from "zod";
import type { ReadySchoolContext } from "@/lib/auth-context";
import { assessmentMode, assessmentHref } from "@/lib/assessment-validation";
import { loadAssessments } from "@/lib/assessment-data";
import {
  AssessmentForm,
  AuthoriseScaleButton,
} from "@/components/assessment-form";


export type AssessmentParams = {
  policy?: string | string[];
  policyPage?: string | string[];
  review?: string | string[];
  reviewPage?: string | string[];
  reviewersPage?: string | string[];
  grantPage?: string | string[];
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
  if (params.policy !== undefined || params.policyPage !== undefined) {
    const policy = z
      .union([z.literal("list"), z.literal("new"), z.uuid()])
      .safeParse(params.policy ?? "list");
    const index = z
      .string()
      .regex(/^[1-9]\d{0,5}$/)
      .transform(Number)
      .pipe(z.number().max(100000))
      .safeParse(params.policyPage ?? "1");
    if (
      role.data !== "school_admin" ||
      !policy.success ||
      !index.success ||
      (policy.data === "new" && index.data !== 1) ||
      edit !== undefined ||
      params.assessmentPage !== undefined ||
      params.review !== undefined ||
      params.reviewPage !== undefined ||
      params.reviewersPage !== undefined ||
      params.marks !== undefined ||
      params.marksPage !== undefined ||
      params.grantPage !== undefined ||
      params.rosterChanges !== undefined
    )
      return <p role="alert">Invalid School Admin policy link.</p>;
    return (
      <GradingPolicyPanel
        school={context.school.id}
        policy={policy.data}
        page={index.data}
      />
    );
  }
  if (params.review !== undefined || params.reviewPage !== undefined) {
    const id = z.uuid().optional().safeParse(params.review);
    const index = z
      .string()
      .regex(/^[1-9]\d{0,5}$/)
      .transform(Number)
      .pipe(z.number().max(100000))
      .safeParse(params.reviewPage ?? "1");
    if (
      !id.success ||
      !index.success ||
      edit !== undefined ||
      params.marks !== undefined ||
      params.reviewersPage !== undefined ||
      params.grantPage !== undefined ||
      params.rosterChanges !== undefined ||
      params.marksPage !== undefined
    )
      return <p role="alert">Invalid assessment review link.</p>;
    return (
      <AssessmentReviewPanel
        school={context.school.id}
        mode={role.data}
        id={id.data}
        page={index.data}
      />
    );
  }
  if (params.reviewersPage !== undefined) {
    const index = z
      .string()
      .regex(/^[1-9]\d{0,5}$/)
      .transform(Number)
      .pipe(z.number().max(100000))
      .safeParse(params.reviewersPage);
    if (
      !index.success ||
      role.data !== "school_admin" ||
      edit !== undefined ||
      params.marks !== undefined ||
      params.rosterChanges !== undefined ||
      params.grantPage !== undefined ||
      params.marksPage !== undefined
    )
      return <p role="alert">Invalid School Admin reviewer grant link.</p>;
    return <ReviewerGrantList school={context.school.id} page={index.data} />;
  }
  if (params.grantPage !== undefined) {
    const index = z
      .string()
      .regex(/^[1-9]\d{0,4}$/)
      .transform(Number)
      .safeParse(params.grantPage);
    const id = z.uuid().optional().safeParse(params.marks);
    if (
      !index.success ||
      !id.success ||
      edit ||
      params.rosterChanges ||
      params.marksPage ||
      (role.data === "school_admin") !== Boolean(id.data)
    )
      return <p role="alert">Invalid correction access link.</p>;
    return (
      <CorrectionGrantPanel
        school={context.school.id}
        mode={role.data}
        assessment={id.data}
        page={index.data}
      />
    );
  }
  if (
    params.marks !== undefined ||
    params.marksPage !== undefined ||
    params.rosterChanges !== undefined
  ) {
    const id = z.uuid().safeParse(params.marks);
    const index = z
      .string()
      .regex(/^[1-9]\d{0,5}$/)
      .transform(Number)
      .pipe(z.number().max(100000))
      .safeParse(params.marksPage ?? "1");
    if (!id.success || !index.success || edit !== undefined)
      return <p role="alert">Invalid assessment roster link.</p>;
    if (params.rosterChanges !== undefined) {
      if (role.data !== "school_admin" || params.rosterChanges !== "1")
        return <p role="alert">School Admin access required.</p>;
      return (
        <RosterAmendmentPanel
          school={context.school.id}
          id={id.data}
          page={index.data}
        />
      );
    }
    return (
      <MarksPanel
        school={context.school.id}
        mode={role.data}
        id={id.data}
        page={index.data}
      />
    );
  }
  if (edit === "new")
    return (
      <section className="content-panel">
        <h2>Plan an assessment</h2>
        {role.data === "school_admin" && (
          <p>
            To authorise an existing proposal,{" "}
            <Link href={assessmentHref(role.data)}>
              open the assessment list
            </Link>{" "}
            and choose Authorise scale.
          </p>
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
        {role.data === "school_admin" && (
          <details>
            <summary>Reviewer access for this scope</summary>
            <ReviewerGrantForm
              key={item.id + ":" + item.record_version}
              item={item}
            />
          </details>
        )}
      </section>
    ) : (
      <p role="alert">Assessment unavailable.</p>
    );
  }
  return (
    <section className="content-panel">
      <h2>Assessment planning</h2>
      {role.data === "school_admin" && (
        <Link href={gradingPolicyHref()}>Reporting policy drafts</Link>
      )}{" "}
      <Link href={assessmentHref(role.data) + "&reviewPage=1"}>
        Assessment reviews
      </Link>{" "}
      {role.data === "school_admin" && (
        <Link href={assessmentHref(role.data) + "&reviewersPage=1"}>
          Manage assessment reviewer grants
        </Link>
      )}
      {role.data === "teacher" && (
        <Link href={assessmentHref(role.data) + "&grantPage=1"}>
          My historical correction access
        </Link>
      )}
      <p>Plan assessments, authorise scales and capture private draft marks.</p>
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
            {" · "}
            <Link href={marksHref(role.data, item.id)}>
              Roster and draft marks
            </Link>
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
              <AuthoriseScaleButton
                key={item.record_version}
                item={{
                  id: item.id,
                  title: item.title,
                  record_version: item.record_version,
                }}
              />
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
