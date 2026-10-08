"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { inspectPdf } from "@/lib/document-file";
import { loadDocuments } from "@/lib/document-data";
import { documentBucket, documentPath, documentUploadInput, documentChangeInput, type DocumentState } from "@/lib/document-validation";

export async function uploadDocument(_state: DocumentState, form: FormData): Promise<DocumentState> {
  const context = await getSchoolContext();
  const parsed = documentUploadInput.safeParse({ mode: form.get("mode"), scope: form.get("scope"),
    classId: form.get("classId") || null, title: form.get("title") });
  if (!parsed.success || context.status !== "ready" || !context.roles.includes(parsed.data.mode))
    return { error: "Choose an audience and title using an authorized staff account.", saved: false };
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf"))
    return { error: "Choose a PDF file, up to 2 MiB.", saved: false };
  let prepared = false;
  try {
    const pdf = await inspectPdf(file);
    if (!pdf) return { error: "This file does not pass the PDF format or 2 MiB size check.", saved: false };
    const client = await createClient();
    const { data, error } = await client.rpc("prepare_document", {
      target_school: context.school.id, staff_mode: parsed.data.mode, target_class: parsed.data.classId,
      new_title: parsed.data.title, expected_size: pdf.size, content_sha256: pdf.sha256,
    });
    const id = z.uuid().safeParse(data);
    if (error || !id.success) return { error: "The upload could not be prepared. Check your class access and database setup.", saved: false };
    prepared = true;
    const uploaded = await client.storage.from(documentBucket).upload(documentPath(context.school.id, id.data), pdf.bytes,
      { contentType: "application/pdf", upsert: false, cacheControl: "0" });
    if (uploaded.error) throw new Error("Upload incomplete");
    const finished = await client.rpc("change_document", { target_school: context.school.id, staff_mode: parsed.data.mode,
      target_document: id.data, expected_version: 1, new_status: "draft" });
    if (finished.error) throw new Error("Finalization incomplete");
    revalidatePath("/dashboard");
    return { error: "", saved: true };
  } catch {
    if (prepared) revalidatePath("/dashboard");
    return { error: prepared
      ? "The upload could not be confirmed. Return to Documents and open the unfinished entry. If the file arrived, finish it there; otherwise withdraw it and upload a new copy."
      : "The upload could not be confirmed. Check Documents before retrying.", saved: false };
  }
}

export async function changeDocument(_state: DocumentState, form: FormData): Promise<DocumentState> {
  const context = await getSchoolContext();
  const rawVersion = form.get("version");
  const parsed = documentChangeInput.safeParse({ mode: form.get("mode"), id: form.get("id"), status: form.get("status"),
    version: typeof rawVersion === "string" && /^\d+$/.test(rawVersion) ? Number(rawVersion) : null });
  if (!parsed.success || context.status !== "ready" || !context.roles.includes(parsed.data.mode))
    return { error: "Document staff access and a valid selection are required.", saved: false };
  const value = parsed.data;
  try {
    const item = (await loadDocuments(context.school.id, value.mode, { edit: value.id }))?.rows[0];
    if (!item?.can_edit) return { error: "This document is unavailable for editing.", saved: false };
    const client = await createClient();
    if (value.status !== "withdrawn") {
      const downloaded = await client.storage.from(documentBucket).download(documentPath(context.school.id, item.id));
      const pdf = !downloaded.error && downloaded.data ? await inspectPdf(downloaded.data) : null;
      if (!pdf || pdf.size !== item.file_size || pdf.sha256 !== item.sha256)
        return { error: "The stored file is missing or does not match the upload. Withdraw this entry and upload a new copy.", saved: false };
    }
    const { error } = await client.rpc("change_document", { target_school: context.school.id, staff_mode: value.mode,
      target_document: value.id, expected_version: value.version, new_status: value.status });
    if (error) return { error: error.code === "40001" ? "This document changed. Reload before saving."
      : "The document could not be changed. Reload and check your access.", saved: false };
    revalidatePath("/dashboard");
    return { error: "", saved: true };
  } catch { return { error: "The change could not be confirmed. Reload before retrying.", saved: false }; }
}
