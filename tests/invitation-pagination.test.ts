import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  range: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/account-config", () => ({
  invitationDeliveryEnabled: () => false,
}));
vi.mock("./../src/components/access-management", () => ({
  BulkInviteForm: () => null,
  InviteForm: () => null,
  MemberEditor: () => null,
  InvitationItem: ({ invitation }: { invitation: { display_name: string } }) =>
    createElement("p", null, invitation.display_name),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async () => ({ data: [], error: null }),
    from: (table: string) => {
      const query = {
        select: mock.select,
        eq: mock.eq,
        order: mock.order,
        range: mock.range,
        limit: async () => ({ data: [], error: null }),
      };
      mock.select.mockReturnValue(query);
      mock.eq.mockReturnValue(query);
      mock.order.mockReturnValue(query);
      if (table === "school_invitations")
        mock.range.mockImplementation(async (start: number, end: number) => ({
          count: 125,
          error: null,
          data: Array.from({ length: 125 }, (_, i) => ({
            id: String(i),
            display_name: `Fictional invitation ${i}`,
            expires_at: "2099-01-01",
          })).slice(start, end + 1),
        }));
      return query;
    },
  }),
}));
import { PeoplePanel } from "../src/components/people-panel";
import { invitationPage } from "../src/lib/invitation-pagination";
import { memberLabel } from "../src/lib/member-label";
beforeEach(() => vi.clearAllMocks());
it("lets an admin reach invitations older than the previous 100-row cutoff", async () => {
  const html = renderToStaticMarkup(
    await PeoplePanel({
      schoolId: "fictional-school",
      userId: "fictional-admin",
      page: 3,
    }),
  );
  expect(mock.range).toHaveBeenCalledWith(100, 149);
  expect(mock.eq).toHaveBeenCalledWith("school_id", "fictional-school");
  expect(mock.order).toHaveBeenCalledWith("created_at", { ascending: false });
  expect(mock.order).toHaveBeenCalledWith("id", { ascending: false });
  expect(html).toContain("Fictional invitation 124");
  expect(html).not.toContain("Fictional invitation 99");
  expect(html).toContain("Previous invitations");
  expect(html).not.toContain("Next invitations");
  expect(html).toContain("invitationPage=2");
});
it("shows the next page and handles invalid page requests safely", async () => {
  for (const value of [undefined, "-1", "0", "1.5", "Infinity", "100001"])
    expect(invitationPage(value)).toBe(1);
  expect(invitationPage("2")).toBe(2);
  const html = renderToStaticMarkup(
    await PeoplePanel({
      schoolId: "fictional-school",
      userId: "fictional-admin",
      page: 1,
    }),
  );
  expect(html).toContain("Next invitations");
  expect(html).not.toContain("Previous invitations");
});
it("distinguishes duplicate display names even without verified email", () => {
  const first = memberLabel({
    id: "member-A",
    display_name: "Same Name",
    verified_email: null,
    status: "active",
  });
  const second = memberLabel({
    id: "member-B",
    display_name: "Same Name",
    verified_email: null,
    status: "suspended",
  });
  expect(first).not.toBe(second);
  expect(first).toContain("member-A");
  expect(second).toContain("inactive");
});
