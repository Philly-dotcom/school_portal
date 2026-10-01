import { z } from "zod";
import { normalizeGradeName } from "./grade-name";
export const correctionKinds = ["academic_years","academic_terms","grades","subjects","classes","students","teachers","guardians"] as const;
export type CorrectionKind = typeof correctionKinds[number];
export const correctionInput = z.object({
  kind: z.enum(correctionKinds), id: z.uuid(),
  version: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483646)),
  name: z.string().trim().min(1).max(120),
  reference: z.string().trim().max(40).optional(),
}).transform(v => ({...v,name:v.kind === "grades" ? normalizeGradeName(v.name) : v.name}))
  .refine(v => ["students","teachers","guardians"].includes(v.kind)
    ? Boolean(v.reference) : v.name.length <= 80 && v.reference === undefined);
