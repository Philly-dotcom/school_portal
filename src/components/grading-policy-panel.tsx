import { randomUUID } from "node:crypto";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assessmentHref } from "@/lib/assessment-validation";
import { gradingPolicyHref, gradingPolicyRecord } from "@/lib/grading-policy-validation";
import { GradingPolicyForm } from "./grading-policy-form";

const policyList = z.array(z.object({
  id: z.uuid(), title: z.string(), scope_label: z.string(), record_version: z.number(),
  effective_from: z.iso.date(), effective_until: z.iso.date(),
})).max(26);
const policyDetail = z.object({
  current: gradingPolicyRecord,
  history: z.array(z.object({
    version: z.number(), title: z.string(), start: z.iso.date(), end: z.iso.date(),
    source: z.string(), rules: z.string(), recorded_at: z.string(), recorded_by: z.uuid(),
  })).max(26),
});

export async function GradingPolicyPanel({ school, policy, page }: {
  school: string; policy: string; page: number;
}) {
  let rows: z.infer<typeof policyList> | undefined;
  let detail: z.infer<typeof policyDetail> | undefined;
  if (policy !== "new") {
    try {
      const client = await createClient();
      if (policy === "list") {
        const { data, error } = await client.rpc("list_grading_policy_drafts", { target_school: school, page_number: page });
        if (!error) rows = policyList.safeParse(data).data;
      } else {
        const { data, error } = await client.rpc("read_grading_policy_draft", { target_school: school, target_policy: policy, page_number: page });
        if (!error) detail = policyDetail.safeParse(data).data;
      }
    } catch { /* Failed and denied reads share the same unavailable state. */ }
    if (!rows && !detail) return <p role="alert">Policy drafts could not be loaded. Check your access and try again.</p>;
  }
  const hasNext = (rows ?? detail?.history ?? []).length > 25;
  return <section className="content-panel">
    <Link href={assessmentHref("school_admin")}>Back to assessments</Link>
    <h2>Reporting policy drafts</h2>
    <p>These records gather the school’s policy and its source. Saving a draft does not approve it or release results.</p>
    {policy === "new" && <GradingPolicyForm id={randomUUID()} />}
    {rows && <>
      <Link className="button primary" href={gradingPolicyHref("new")}>New policy draft</Link>
      {!rows.length && <p>No policy drafts have been recorded.</p>}
      <ul>{rows.slice(0, 25).map(row => <li key={row.id}>
        <Link href={gradingPolicyHref(row.id)}>{row.title}</Link>
        <p>{row.scope_label} · Draft version {row.record_version}</p>
        <p>{row.effective_from} to {row.effective_until}</p>
      </li>)}</ul>
    </>}
    {detail && <>
      <GradingPolicyForm key={detail.current.id + ":" + detail.current.version} id={detail.current.id} item={detail.current} />
      <h3>Saved draft history</h3>
      <p>Each changed save keeps the previous version for reference.</p>
      {detail.history.slice(0, 25).map(version => <details key={version.version}>
        <summary>Draft version {version.version} · {version.title}</summary>
        <p>Effective {version.start} to {version.end}</p>
        <p>Source — {version.source || "Still to be supplied"}</p>
        <p style={{ whiteSpace: "pre-wrap" }}>{version.rules || "School rules still to be supplied"}</p>
        <p>Saved {version.recorded_at} · Account {version.recorded_by}</p>
      </details>)}
    </>}
    {policy !== "new" && <nav aria-label={detail ? "Policy history pages" : "Policy draft pages"}>
      {page > 1 && <Link href={gradingPolicyHref(policy, page - 1)}>Previous page</Link>}{" "}
      {hasNext && <Link href={gradingPolicyHref(policy, page + 1)}>Next page</Link>}
    </nav>}
  </section>;
}
