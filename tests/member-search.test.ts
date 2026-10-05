import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const mock = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
vi.mock("@/app/dashboard/registers/link-actions", () => ({ linkRegisterMember: vi.fn() }));
import { searchRegisterMembers } from "../src/app/dashboard/search/member-actions";
import { LoginLink } from "../src/components/login-link";
const recordId = "00000000-0000-4000-8000-000000000001";
const input = { kind: "students", recordId, query: " Fictional ", page: 2 };
beforeEach(() => {
  mock.context.mockResolvedValue({ status: "ready", school: { id: "trusted-school" }, roles: ["school_admin"] });
  mock.rpc.mockReset();
  mock.rpc.mockResolvedValue({ data: [], error: null });
});
it("derives school on the server and requests a bounded eligibility page", async () => {
  mock.rpc.mockResolvedValue({ data: Array.from({ length: 26 }, (_, n) => ({ id: String(n), display_name: "Fictional", status: "active", roles: ["student"], verified_email: null })), error: null });
  const result = await searchRegisterMembers(input);
  expect(mock.rpc).toHaveBeenCalledWith("search_register_members", { target_school: "trusted-school", record_kind: "students", target_record: recordId, search_text: "Fictional", page_number: 2 });
  expect(result.choices).toHaveLength(25);
  expect(result.hasNext).toBe(true);
});
it("rejects non-admins and forged or unbounded requests before any database call", async () => {
  for (const extra of [{ schoolId: "foreign" }, { page: 0 }, { page: 100001 }, { query: "x".repeat(81) }, { kind: "profiles" }, { recordId: "bad" }]) {
    expect((await searchRegisterMembers({ ...input, ...extra })).error).not.toBe("");
  }
  mock.context.mockResolvedValue({ status: "ready", roles: ["teacher"] });
  expect((await searchRegisterMembers(input)).error).toContain("administrator");
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("keeps database and transport errors private", async () => {
  mock.rpc.mockResolvedValue({ error: { message: "PRIVATE DATABASE DETAIL" } });
  expect(JSON.stringify(await searchRegisterMembers(input))).not.toContain("PRIVATE");
  mock.rpc.mockRejectedValue(new Error("PRIVATE TRANSPORT DETAIL"));
  const result = await searchRegisterMembers(input);
  expect(result.error).toContain("Try again");
  expect(result.choices).toEqual([]);
});
it("preserves an inactive current link in the payload until deliberately removed", () => {
  const html = renderToStaticMarkup(createElement(LoginLink, { kind: "students", id: recordId, version: 7, currentMembershipId: recordId, currentChoice: { id: recordId, label: "Fictional account (inactive)", disabled: true } }));
  expect(html).toContain(`name="membershipId" value="${recordId}"`);
  expect(html).toContain('name="version" value="7"');
  expect(html).toContain("No linked login");
  expect(html).toContain("Fictional account (inactive)");
  expect(html).toContain('name="confirmed"');
  expect(html).toContain("Search choices");
});
