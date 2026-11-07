"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { loadAssessments } from "@/lib/assessment-data";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  assessmentInput,
  assessmentMode,
  type AssessmentState,
} from "@/lib/assessment-validation";
import type { RecordSearchResult } from "@/lib/record-search";
export async function saveAssessment(
  _state: AssessmentState,
  form: FormData,
): Promise<AssessmentState> {
  const context = await getSchoolContext();
  const integer = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null;
  };
  const parsed = assessmentInput.safeParse({
    mode: form.get("mode"),
    id: form.get("id") || null,
    assignmentId: form.get("assignmentId"),
    termId: form.get("termId"),
    version: integer("version"),
    title: form.get("title"),
    instructions: form.get("instructions"),
    effectiveDate: form.get("effectiveDate"),
    minimum: form.get("minimum"),
    maximum: form.get("maximum"),
    precision: integer("precision"),
    authorise: form.get("authorise") === "on",
  });
  if (!parsed.success)
    return {
      error:
        "Check the assignment, term, date and scale. Bounds must match the allowed decimal precision.",
      saved: false,
    };
  const v = parsed.data;
  if (context.status !== "ready" || !context.roles.includes(v.mode))
    return { error: "Assessment staff access is required.", saved: false };
  return persistAssessment(context.school.id, v);
}

export async function authoriseAssessmentScale(
  id: string,
  expectedVersion: number,
): Promise<AssessmentState> {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context))
    return { error: "School Admin access is required.", saved: false };

  if (
    !z.uuid().safeParse(id).success ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 1
  )
    return { error: "Choose a saved assessment.", 
      saved: false };

  const result = await loadAssessments(
    context.school.id,
    "school_admin",
    1,
    id,
  );
  const item = result?.rows[0];
  if (!item || item.id !== id)
    return {
      error:
        "The assessment could not be loaded. Refresh the list and try again.",
      saved: false,
    };
  if (item.record_version !== expectedVersion || item.scale_authorised)
    return {
      error:
        "This assessment changed. Refresh the list and check its current scale.",
      saved: false,
    };

  // Copy the stored proposal. The RPC checks the expected version again under lock.
  return persistAssessment(context.school.id, {
    mode: "school_admin",
    id,
    version: expectedVersion,
    assignmentId: item.assignment_id,
    termId: item.term_id,
    title: item.title,
    instructions: item.instructions,
    effectiveDate: item.effective_date,
    minimum: item.minimum,
    maximum: item.maximum,
    precision: item.decimal_places,
    authorise: true,
  });
}

async function persistAssessment(
  schoolId: string,
  v: z.infer<typeof assessmentInput>,
): Promise<AssessmentState> {
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("save_assessment", {
      target_school: schoolId,
      staff_mode: v.mode,
      target_assessment: v.id,
      target_assignment: v.assignmentId,
      expected_version: v.version,
      target_term: v.termId,
      new_title: v.title,
      new_instructions: v.instructions,
      new_date: v.effectiveDate,
      new_minimum: v.minimum,
      new_maximum: v.maximum,
      new_precision: v.precision,
      authorise_scale: v.authorise,
    });
    if (error || typeof data !== "string") {
      // Some gateways replace database errors. Check the visible definition before
      // reporting a generic failure; a lost response could also follow a committed save.
      if (
        v.id &&
        error &&
        !["40001", "PT409", "55000", "42501", "22023"].includes(error.code)
      ) {
        const latest = await loadAssessments(schoolId, v.mode, 1, v.id);
        const current = latest?.rows.find((row) => row.id === v.id);
        if (current && current.record_version !== v.version)
          return {
            error:
              "The saved assessment version changed. Reload and check the saved definition before retrying.",
            saved: false,
          };
      }
      return {
        error:
          error?.code === "40001" || error?.code === "PT409"
            ? "This assessment changed. Reload before saving again."
            : error?.code === "55000"
              ? "The roster has been frozen. This assessment definition is locked."
              : "Assessment could not be saved. Check assignment access, term dates and scale authorisation.",
        saved: false,
      };
    }
    revalidatePath("/dashboard");
    return { error: "", saved: true };
  } catch {
    return {
      error:
        "The save could not be confirmed. Reload the list before retrying.",
      saved: false,
    };
  }
}
export async function searchAssessmentChoices(
  mode: string,
  kind: "assignment" | "term",
  assignment: string | null,
  query: string,
  page: number,
): Promise<RecordSearchResult> {
  const context = await getSchoolContext();
  const parsed = z
    .object({
      mode: assessmentMode,
      kind: z.enum(["assignment", "term"]),
      assignment: z.uuid().nullable(),
      query: z.string().trim().max(80),
      page: z.number().int().min(1).max(100000),
    })
    .safeParse({ mode, kind, assignment, query, page });
  const unavailable = {
    choices: [],
    hasNext: false,
    error: "Choices could not be loaded. Check your assignment access.",
  };
  if (
    !parsed.success ||
    context.status !== "ready" ||
    !context.roles.includes(parsed.data.mode)
  )
    return unavailable;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("search_assessment_choices", {
      target_school: context.school.id,
      staff_mode: mode,
      choice_kind: kind,
      target_assignment: assignment,
      search_text: parsed.data.query,
      page_number: page,
    });
    const rows = z
      .array(z.object({ id: z.uuid(), label: z.string() }))
      .safeParse(data);
    if (error || !rows.success) return unavailable;
    return {
      choices: rows.data.slice(0, 25),
      hasNext: rows.data.length > 25,
      error: "",
    };
  } catch {
    return unavailable;
  }
}
