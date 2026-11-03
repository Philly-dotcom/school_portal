"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assessmentMode } from "@/lib/assessment-validation";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import {
  markChange,
  rosterDifference,
  type RosterDifference,
} from "@/lib/marks-validation";
import { isSchoolAdminContext } from "@/lib/permissions";

const requestSchema = z.object({
  id: z.uuid(),
  mode: assessmentMode,
  version: z.number().int().positive(),
  operation: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("freeze") }),
    z.object({
      kind: z.literal("save"),
      changes: markChange.array().min(1).max(25),
    }),
  ]),
});

export async function amendRoster(
  id: string,
  preview: RosterDifference,
  reason: string,
) {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return "School Admin access required.";
  const input = z
    .object({
      id: z.uuid(),
      preview: rosterDifference,
      reason: z.string().trim().min(1).max(500),
    })
    .safeParse({ id, preview, reason });
  if (!input.success)
    return "Check the preview and enter a reason of up to 500 characters.";
  const row = input.data.preview;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("amend_draft_roster", {
      target_school: context.school.id,
      target_assessment: id,
      target_learner: row.learner_id,
      expected_revision: row.revision,
      expected_previous: row.previous_placement,
      expected_next: row.next_placement,
      amendment_reason: input.data.reason,
    });
    if (error?.code === "40001")
      return "The roster or placement changed. Reload the preview before continuing.";
    if (error || typeof data !== "number")
      return "Could not confirm the amendment. Reload and check the roster.";
  } catch {
    return "Could not confirm the amendment. Reload and check the roster.";
  }
  revalidatePath("/dashboard");
  return "Roster updated.";
}

export async function updateMarkDraft(input: z.input<typeof requestSchema>) {
  const context = await getSchoolContext();
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Check each score and give a reason for every exemption." };
  const { id, mode, version, operation } = parsed.data;
  if (context.status !== "ready" || !context.roles.includes(mode))
    return { error: "Staff assessment access is required." };
  const scope = {
    target_school: context.school.id,
    target_assessment: id,
    staff_mode: mode,
  };
  try {
    const client = await createClient();
    const { data, error } =
      operation.kind === "freeze"
        ? await client.rpc("freeze_assessment_roster", {
            ...scope,
            expected_version: version,
          })
        : await client.rpc("save_assessment_draft", {
            ...scope,
            expected_revision: version,
            changes: operation.changes,
          });
    if (error || typeof data !== "number") {
      if (error?.code === "40001")
        return {
          error:
            "This roster changed. Reload it before entering your changes again.",
        };
      return {
        error:
          operation.kind === "freeze"
            ? "Could not freeze the roster. Check learner eligibility, scale authorisation, date and staff access."
            : "Could not save this page. Check score bounds, decimal places, exemptions and staff access.",
      };
    }
    revalidatePath("/dashboard");
    return { error: "" };
  } catch {
    return {
      error:
        "The result could not be confirmed. Reload the roster before retrying.",
    };
  }
}
