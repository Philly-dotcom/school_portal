import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { loadDocuments } from "@/lib/document-data";
import { inspectPdf } from "@/lib/document-file";
import { documentBucket, documentPath } from "@/lib/document-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const querySchema = z
  .object({
    mode: z.enum(["school_admin", "teacher", "student", "guardian"]),
    child: z.uuid().optional(),
  })
  .refine((v) =>
    v.mode === "guardian" ? Boolean(v.child) : v.child === undefined,
  );
const unavailable = () =>
  new Response("Document unavailable.", {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Keep authentication redirects outside the transport-error catch.
  const context = await getSchoolContext();
  const id = z.uuid().safeParse((await params).id);
  const url = new URL(request.url);
  const query = querySchema.safeParse({
    mode: url.searchParams.get("mode"),
    child: url.searchParams.get("child") ?? undefined,
  });
  if (
    !id.success ||
    !query.success ||
    context.status !== "ready" ||
    !context.roles.includes(query.data.mode)
  )
    return unavailable();
  try {
    const item = (
      await loadDocuments(context.school.id, query.data.mode, {
        edit: id.data,
        child: query.data.child,
      })
    )?.rows[0];
    if (!item) return unavailable();
    const client = await createClient();
    const { data, error } = await client.storage
      .from(documentBucket)
      .download(documentPath(context.school.id, item.id));
    const pdf = !error && data ? await inspectPdf(data) : null;
    if (!pdf || pdf.size !== item.file_size || pdf.sha256 !== item.sha256)
      return unavailable();
    return new Response(new Uint8Array(pdf.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="document-${item.id}.pdf"`,
        "Content-Length": String(pdf.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    });
  } catch {
    return unavailable();
  }
}
