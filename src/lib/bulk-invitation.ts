import type { Role } from "./permissions";
import { invitationSchema } from "./account-validation";

export const MAX_BULK_ROWS = 200;
const MAX_BULK_CHARS = 100_000;
const roleAliases: Record<string, Role> = {
  admin: "school_admin", school_admin: "school_admin", "school admin": "school_admin",
  teacher: "teacher", student: "student", learner: "student",
  guardian: "guardian", parent: "guardian", "parent / guardian": "guardian",
};

export type BulkInvitation = { email: string; name: string; roles: Role[] };
export type BulkParse = { ok: true; rows: BulkInvitation[] } | { ok: false; error: string };

// Minimal RFC-4180-style splitter: commas, double-quoted fields, "" as an escaped quote.
function splitCsvLine(line: string): string[] | null {
  const out: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') { if (line[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"' && field.trim() === "") { quoted = true; field = ""; }
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  if (quoted) return null;
  out.push(field);
  return out.map((value) => value.trim());
}

// Input lines: email,name,roles   (roles separated by | or ;  e.g. teacher|guardian)
// A header row starting with "email" is accepted and ignored. Blank lines are skipped.
export function parseBulkInvitations(text: unknown): BulkParse {
  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "Paste at least one line: email,name,roles." };
  if (text.length > MAX_BULK_CHARS) return { ok: false, error: "That list is too large. Import at most 200 people at a time." };
  const lines = text.split(/\r?\n/).map((line, index) => ({ line, number: index + 1 })).filter(({ line }) => line.trim());
  if (lines.length && /^\s*"?email"?\s*,/i.test(lines[0].line)) lines.shift();
  if (!lines.length) return { ok: false, error: "Paste at least one line: email,name,roles." };
  if (lines.length > MAX_BULK_ROWS) return { ok: false, error: `Import at most ${MAX_BULK_ROWS} people at a time (found ${lines.length}).` };
  const rows: BulkInvitation[] = [];
  for (const { line, number } of lines) {
    const fields = splitCsvLine(line);
    if (!fields || fields.length !== 3) return { ok: false, error: `Line ${number}: use exactly three fields — email,name,roles. Put names containing commas in double quotes.` };
    const parsedRoles: Role[] = [];
    for (const raw of fields[2].split(/[|;]/).map((value) => value.trim().toLowerCase()).filter(Boolean)) {
      const role = roleAliases[raw];
      if (!role) return { ok: false, error: `Line ${number}: unknown role “${raw.slice(0, 30)}”. Use teacher, student, guardian or school_admin.` };
      parsedRoles.push(role);
    }
    const parsed = invitationSchema.safeParse({ email: fields[0], name: fields[1], roles: parsedRoles });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return { ok: false, error: `Line ${number}: ${field === "email" ? "invalid email address" : field === "name" ? "name must be 1–120 characters" : "choose at least one role"}.` };
    }
    rows.push(parsed.data);
  }
  return { ok: true, rows };
}
