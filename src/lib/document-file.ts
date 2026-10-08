import "server-only";
import { createHash } from "node:crypto";
import { maxPdfBytes } from "@/lib/document-validation";

// Basic format checks, not a PDF parser or malware scanner. Always download
// as an attachment rather than embedding user-supplied PDFs in the portal.
export async function inspectPdf(blob: Blob) {
  if (blob.size < 12 || blob.size > maxPdfBytes) return null;
  const bytes = Buffer.from(await blob.arrayBuffer());
  if (!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(bytes.subarray(0, 10).toString("ascii")) ||
      !bytes.subarray(Math.max(0, bytes.length - 1024)).toString("ascii").includes("%%EOF")) return null;
  return { bytes, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}
