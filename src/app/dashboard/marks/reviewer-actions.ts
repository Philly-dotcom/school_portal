"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { searchPageSize, type RecordSearchResult } from "@/lib/record-search";

export async function searchReviewers(query: string, page: number): Promise<RecordSearchResult> {
  const failure = { choices: [], hasNext: false, error: "Could not search eligible staff." };
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context) || typeof query !== "string" || query.length > 80 ||
      !Number.isInteger(page) || page < 1 || page > 100000) return failure;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("search_assessment_reviewers", {
      target_school: context.school.id, search_text: query.trim(), page_number: page,
    });
    const choices = z.array(z.object({ id: z.uuid(), label: z.string() })).max(searchPageSize + 1).safeParse(data);
    if (error || !choices.success) return failure;
    return { choices: choices.data.slice(0, searchPageSize), hasNext: choices.data.length > searchPageSize, error: "" };
  } catch { return failure; }
}

const date = z.union([z.iso.date(), z.literal("")]).transform(value => value || null);
const operation = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("issue"), assessment: z.uuid(), version: z.coerce.number().int().positive(),
    reviewer: z.uuid(), start: date, end: date }),
  z.object({ kind: z.literal("revoke"), grant: z.uuid() }),
]);

export async function changeReviewerAccess(_: string, form: FormData) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return "School Admin access required.";
  const parsed = operation.safeParse(Object.fromEntries(form));
  if (!parsed.success) return "Choose an eligible staff account and check the dates.";
  const v = parsed.data;
  if (v.kind === "issue" && v.start && v.end && v.start > v.end) return "The last day must be on or after the first.";
  try {
    const client = await createClient();
    const { error } = v.kind === "revoke"
      ? await client.rpc("revoke_assessment_reviewer_grant", { target_school: context.school.id, target_grant: v.grant })
      : await client.rpc("issue_assessment_reviewer_grant", {
          target_school: context.school.id, target_assessment: v.assessment, expected_definition: v.version,
          target_member: v.reviewer, valid_from: v.start, valid_until: v.end,
        });
    if (error?.code === "PT409") return "The assessment changed. Reload it and confirm the scope.";
    if (error) return "Could not change reviewer access. Check the account, validity dates and existing grants.";
  } catch { return "The change could not be confirmed. Check the reviewer grant list before retrying."; }
  revalidatePath("/dashboard");
  return v.kind === "issue" ? "Reviewer access granted." : "Reviewer access revoked.";
}
