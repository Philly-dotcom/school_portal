"use server";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { linkKinds, type RegisterLoginMember } from "@/lib/link-validation";
import { memberLabel } from "@/lib/member-label";
import { searchPageSize, type RecordSearchResult } from "@/lib/record-search";

const inputSchema = z.object({
  kind: z.enum(linkKinds),
  recordId: z.uuid(),
  query: z.string().trim().max(80),
  page: z.number().int().min(1).max(100_000),
}).strict();

export async function searchRegisterMembers(input: unknown): Promise<RecordSearchResult> {
  const failure = (error: string): RecordSearchResult => ({ choices: [], hasNext: false, error });
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return failure("School administrator access is required.");
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return failure("Check the account search and try again.");
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("search_register_members", {
      target_school: context.school.id,
      record_kind: parsed.data.kind,
      target_record: parsed.data.recordId,
      search_text: parsed.data.query,
      page_number: parsed.data.page,
    });
    if (error) return failure("Account search is unavailable. Check migration 015 and your access, then retry.");
    const rows = (data ?? []) as RegisterLoginMember[];
    return {
      choices: rows.slice(0, searchPageSize).map((member) => ({ id: member.id, label: memberLabel(member) })),
      hasNext: rows.length > searchPageSize,
      error: "",
    };
  } catch {
    return failure("Account search could not complete. Try again.");
  }
}
