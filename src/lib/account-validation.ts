import { z } from "zod";
import { roles } from "./permissions";

export const selectedRoles = z
  .array(z.enum(roles))
  .min(1)
  .max(4)
  .transform((values) => [...new Set(values)]);
export const invitationSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase().trim()),
  name: z.string().trim().min(1).max(120),
  roles: selectedRoles,
});
export const membershipSchema = z.object({
  membershipId: z.uuid(),
  version: z.coerce.number().int().positive(),
  status: z.enum(["active", "suspended"]),
  roles: selectedRoles,
});
export const passwordSchema = z
  .object({
    password: z.string().min(12).max(128),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm);
export const confirmationSchema = z.object({
  token_hash: z
    .string()
    .min(16)
    .max(1024)
    .regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum(["invite", "recovery"]),
});
export function validatedSiteOrigin(value: string | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
