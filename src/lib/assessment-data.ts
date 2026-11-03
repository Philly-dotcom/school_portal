import "server-only";
import { createClient } from "@/lib/supabase/server";
import { assessmentRow, type AssessmentMode } from "@/lib/assessment-validation";
export async function loadAssessments(school: string, mode: AssessmentMode, page: number, edit?: string) {
    try {
        const client = await createClient();
        const { data, error } = await client.rpc("list_assessments", {
            target_school: school, staff_mode: mode, page_number: page, target_assessment: edit ?? null
        });
        const rows = assessmentRow.array().safeParse(data);
        return error || !rows.success ? null : { rows: rows.data.slice(0, 25), hasNext: rows.data.length > 25 };
    }
    catch {
        return null;
    }
}
