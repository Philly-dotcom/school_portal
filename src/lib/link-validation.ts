import { z } from "zod";
import type { Role } from "./permissions";

export const linkKinds = ["students", "teachers", "guardians"] as const;
export type LinkKind = (typeof linkKinds)[number];
// Exact result shape of list_linkable_members; account-management rows also
// contain user_id/access_version, which this restricted listing does not return.
export type RegisterLoginMember = {
  id: string;
  display_name: string;
  status: "active" | "suspended";
  roles: Role[];
  verified_email: string | null;
};
export const guardianAccessInput = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  enabled: z.enum(["true", "false"]),
  confirmed: z.literal("yes"),
});
export const linkRoleFor: Record<LinkKind, "student" | "teacher" | "guardian"> =
  { students: "student", teachers: "teacher", guardians: "guardian" };
// An empty membershipId means "remove the link".
export const linkInput = z.object({
  kind: z.enum(linkKinds),
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  confirmed: z.literal("yes"),
  membershipId: z
    .union([z.uuid(), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
});
