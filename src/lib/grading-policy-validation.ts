import { z } from "zod";
import { assessmentHref } from "./assessment-validation";

export const gradingPolicyInput = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().min(0).max(2147483646),
  year: z.uuid(),
  grade: z.uuid(),
  subject: z.uuid(),
  title: z.string().trim().min(1).max(160),
  start: z.iso.date(),
  end: z.iso.date(),
  source: z.string().trim().max(1000),
  rules: z.string().trim().max(12000),
}).refine(value => value.start <= value.end);

export const gradingPolicyRecord = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  year: z.uuid(),
  grade: z.uuid(),
  subject: z.uuid(),
  scope: z.string(),
  title: z.string(),
  start: z.iso.date(),
  end: z.iso.date(),
  source: z.string(),
  rules: z.string(),
});

export type GradingPolicyRecord = z.infer<typeof gradingPolicyRecord>;

export function gradingPolicyHref(policy = "list", page = 1) {
  const params = new URLSearchParams({ policy, policyPage: String(page) });
  return `${assessmentHref("school_admin")}&${params}`;
}
