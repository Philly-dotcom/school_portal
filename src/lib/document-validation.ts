import { z } from "zod";
export const documentBucket = "school-documents";
export const maxPdfBytes = 2 * 1024 * 1024;
export const documentStaffMode = z.enum(["school_admin", "teacher"]);
export type DocumentStaffMode = z.infer<typeof documentStaffMode>;
export const documentUploadInput = z.object({
  mode: documentStaffMode, scope: z.enum(["school", "class"]),
  classId: z.uuid().nullable(), title: z.string().trim().min(1).max(160),
}).strict().refine(v => (v.scope === "school") === (v.classId === null))
  .refine(v => v.mode !== "teacher" || v.classId !== null);
export const documentChangeInput = z.object({
  mode: documentStaffMode, id: z.uuid(), version: z.number().int().positive().max(2147483646),
  status: z.enum(["draft", "published", "withdrawn"]),
}).strict();
export const documentRow = z.object({
  id: z.uuid(), class_id: z.uuid().nullable(), audience_label: z.string(),
  title: z.string(), file_size: z.number().int().positive().max(maxPdfBytes),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["uploading", "draft", "published", "withdrawn"]),
  record_version: z.number().int().positive(), can_edit: z.boolean(),
});
export type DocumentItem = z.infer<typeof documentRow>;
export type DocumentState = { error: string; saved: boolean };
export function documentPath(school: string, id: string) { return `${school}/${id}.pdf`; }
export function documentHref(mode: string, options: { child?: string; page?: number; edit?: string } = {}) {
  const params = new URLSearchParams({ view: "documents", mode });
  if (options.child) params.set("child", options.child);
  if (options.page && options.page > 1) params.set("documentPage", String(options.page));
  if (options.edit) params.set("documentEdit", options.edit);
  return `/dashboard?${params}`;
}
export function documentDownloadHref(id: string, mode: string, child?: string) {
  const params = new URLSearchParams({ mode });
  if (child) params.set("child", child);
  return `/dashboard/documents/${id}/download?${params}`;
}
