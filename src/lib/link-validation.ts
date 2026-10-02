import { z } from "zod";

export const linkKinds = ["students", "teachers", "guardians"] as const;
export type LinkKind = (typeof linkKinds)[number];
export const linkRoleFor: Record<LinkKind, "student" | "teacher" | "guardian"> = { students: "student", teachers: "teacher", guardians: "guardian" };
// An empty membershipId means "remove the link".
export const linkInput = z.object({
  kind: z.enum(linkKinds),
  id: z.uuid(),
  membershipId: z.union([z.uuid(), z.literal("")]).transform((value) => (value === "" ? null : value)),
});
