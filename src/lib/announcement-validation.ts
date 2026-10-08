import { z } from "zod";

export const announcementStaffMode = z.enum(["school_admin", "teacher"]);
export type AnnouncementStaffMode = z.infer<typeof announcementStaffMode>;
export const announcementStatus = z.enum(["draft", "published", "withdrawn"]);
export const announcementInput = z
  .object({
    mode: announcementStaffMode,
    id: z.uuid().nullable(),
    classId: z.uuid().nullable(),
    scope: z.enum(["school", "class"]),
    version: z.number().int().min(0).max(2147483646),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(10000),
    status: announcementStatus,
  })
  .strict()
  .refine((value) => (value.id ? value.version > 0 : value.version === 0))
  .refine((value) => value.mode !== "teacher" || value.classId !== null)
  .refine((value) => (value.scope === "school") === (value.classId === null));

export const announcementRow = z.object({
  id: z.uuid(),
  class_id: z.uuid().nullable(),
  audience_label: z.string(),
  title: z.string(),
  body: z.string(),
  status: announcementStatus,
  published_at: z.string().nullable(),
  record_version: z.number().int().positive(),
  can_edit: z.boolean(),
});
export type AnnouncementItem = z.infer<typeof announcementRow>;
export type AnnouncementState = { error: string; saved: boolean };

export function announcementHref(
  mode: string,
  options: {
    child?: string;
    page?: number;
    edit?: string;
  } = {},
) {
  const params = new URLSearchParams({ view: "announcements", mode });
  if (options.child) params.set("child", options.child);
  if (options.page && options.page > 1)
    params.set("announcementPage", String(options.page));
  if (options.edit) params.set("announcementEdit", options.edit);
  return `/dashboard?${params}`;
}
