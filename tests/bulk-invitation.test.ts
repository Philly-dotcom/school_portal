import { describe, expect, it } from "vitest";
import { MAX_BULK_ROWS, parseBulkInvitations } from "../src/lib/bulk-invitation";

describe("parseBulkInvitations", () => {
  it("parses rows, a header, quotes, aliases and mixed separators", () => {
    const result = parseBulkInvitations('Email,Name,Roles\n  A@Example.invalid , "Fictional, Anna" ,teacher|Parent\n\nb@example.invalid,Ben,student;guardian\r\n');
    expect(result).toEqual({ ok: true, rows: [
      { email: "a@example.invalid", name: "Fictional, Anna", roles: ["teacher", "guardian"] },
      { email: "b@example.invalid", name: "Ben", roles: ["student", "guardian"] },
    ] });
  });
  it("rejects bad input with the line number and no partial result", () => {
    expect(parseBulkInvitations("a@example.invalid,Ann,teacher\nnot-an-email,Bob,student")).toEqual({ ok: false, error: "Line 2: invalid email address." });
    expect(parseBulkInvitations("a@example.invalid,Ann,principal")).toMatchObject({ ok: false, error: expect.stringContaining("unknown role") });
    expect(parseBulkInvitations("a@example.invalid,Ann,")).toEqual({ ok: false, error: "Line 1: choose at least one role." });
    expect(parseBulkInvitations("a@example.invalid,Ann")).toMatchObject({ ok: false, error: expect.stringContaining("exactly three fields") });
    expect(parseBulkInvitations('a@example.invalid,"Unclosed,teacher')).toMatchObject({ ok: false, error: expect.stringContaining("Line 1") });
  });
  it("enforces empty and size limits", () => {
    expect(parseBulkInvitations("   ")).toMatchObject({ ok: false });
    expect(parseBulkInvitations(null)).toMatchObject({ ok: false });
    expect(parseBulkInvitations("email,name,roles")).toMatchObject({ ok: false });
    const many = Array.from({ length: MAX_BULK_ROWS + 1 }, (_, i) => `p${i}@example.invalid,P${i},student`).join("\n");
    expect(parseBulkInvitations(many)).toMatchObject({ ok: false, error: expect.stringContaining("at most 200") });
    expect(parseBulkInvitations("x".repeat(100_001))).toMatchObject({ ok: false });
  });
});
