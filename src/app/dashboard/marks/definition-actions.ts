"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSchoolContext } from "@/lib/auth-context";
import { isSchoolAdminContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const proposal = z.object({
  id: z.uuid(), revision: z.number().int().positive(), date: z.iso.date(),
  minimum: z.string().regex(/^\d{1,10}(\.\d{1,6})?$/),
  maximum: z.string().regex(/^\d{1,10}(\.\d{1,6})?$/),
  precision: z.number().int().min(0).max(6),
});
const impact = z.object({
  token: z.string().regex(/^[a-f0-9]{32}$/), total: z.number().int(), eligible: z.number().int(), blocked: z.number().int(),
  rows: z.array(z.object({ id: z.uuid(), full_name: z.string(), reference: z.string(),
    effect: z.enum(["keep","add","remove","update"]), score: z.string().nullable(), incompatible: z.boolean() })).max(25),
});
export type Proposal = z.infer<typeof proposal>;
export type DefinitionPreview = z.infer<typeof impact>;
type Result = { error: string } | { preview: DefinitionPreview } | { saved: true };

export async function reviewFrozenDefinition(input: Proposal, page: number, confirmation?: { token: string; reason: string }): Promise<Result> {
  const context = await getSchoolContext();
  if (!isSchoolAdminContext(context)) return { error: "School Admin access required." };
  const parsed = proposal.safeParse(input);
  if (!parsed.success || !Number.isSafeInteger(page) || page<1 || page>100000)
    return {error:"Check the date, scale and page number."};
  const v = parsed.data;
  const args = { target_school:context.school.id, target_assessment:v.id, expected_revision:v.revision,
    proposed_date:v.date, low:v.minimum, high:v.maximum, precision_places:v.precision };
  try {
    const client = await createClient();
    if (confirmation === undefined) {
      const {data,error} = await client.rpc("preview_frozen_definition",{...args,page_number:page});
      if (error?.code==="PT409") return {error:"The draft changed. Reload the roster and start a new preview."};
      if (error) return {error:"Check that the proposal changes the frozen date or scale. The date must fit the assignment and term and cannot be in the future."};
      return {preview:impact.parse(data)};
    }
    const approval = z.object({token:impact.shape.token,reason:z.string().trim().min(1).max(500)}).safeParse(confirmation);
    if (!approval.success) return {error:"Preview the change and enter a reason of up to 500 characters."};
    const {data,error} = await client.rpc("amend_frozen_definition",{...args,preview_token:approval.data.token,amendment_reason:approval.data.reason});
    if (error?.code==="PT409") return {error:"The draft or placements changed. Reload the roster and preview again."};
    if (error || typeof data!=="number") return {error:"Amendment unconfirmed. Reload the saved definition before retrying."};
  } catch { return {error:"The request could not be confirmed. Reload the saved roster before retrying."}; }
  revalidatePath("/dashboard");
  return {saved:true};
}
