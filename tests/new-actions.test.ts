import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  getContext: vi.fn(),
  rpc: vi.fn(),
  invoke: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.getContext }));
vi.mock("@/lib/account-config", () => ({
  invitationDeliveryEnabled: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mock.rpc,
    functions: { invoke: mock.invoke },
  }),
}));
import {
  bulkInvite,
  changeInvitation,
} from "../src/app/dashboard/people/actions";
import {
  linkRegisterMember,
  setGuardianAccess,
} from "../src/app/dashboard/registers/link-actions";

const school = "00000000-0000-4000-8000-000000000001",
  record = "00000000-0000-4000-8000-000000000002",
  member = "00000000-0000-4000-8000-000000000003";
const accessState = { error: "", message: "" },
  linkState = { error: "", saved: false };
function form(values: Record<string, string>) {
  const d = new FormData();
  d.set("version", "1");
  d.set("confirmed", "yes");
  d.set("reviewed", "yes");
  for (const [k, v] of Object.entries(values)) d.set(k, v);
  return d;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.getContext.mockResolvedValue({
    status: "ready",
    school: { id: school },
    roles: ["school_admin"],
  });
  mock.rpc.mockResolvedValue({ data: null, error: null });
});

describe("bulkInvite", () => {
  it("denies non-admins before parsing or calling the database", async () => {
    mock.getContext.mockResolvedValue({
      status: "ready",
      school: { id: school },
      roles: ["teacher"],
    });
    expect(
      (
        await bulkInvite(
          accessState,
          form({ list: "a@example.invalid,A,student" }),
        )
      ).error,
    ).toContain("Admin");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed lists locally with the line number", async () => {
    expect(
      (
        await bulkInvite(
          accessState,
          form({ list: "a@example.invalid,A,student\nbad,B,student" }),
        )
      ).error,
    ).toContain("Line 2");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("sends the server-side school ID, ignoring any forged one, and reports counts", async () => {
    mock.rpc.mockResolvedValue({
      data: [{ created_count: 2, skipped_count: 1 }],
      error: null,
    });
    const result = await bulkInvite(
      accessState,
      form({
        list: "a@example.invalid,A,student\nb@example.invalid,B,teacher",
        schoolId: record,
      }),
    );
    expect(result.message).toContain("Prepared 2");
    expect(result.message).toContain("1 already pending");
    expect(mock.rpc).toHaveBeenCalledWith("create_school_invitations_bulk", {
      target_school: school,
      invites: [
        { email: "a@example.invalid", name: "A", roles: ["student"] },
        { email: "b@example.invalid", name: "B", roles: ["teacher"] },
      ],
    });
    expect(mock.invoke).not.toHaveBeenCalled();
  });
  it("shows our own row-level SQL messages but hides unexpected database errors", async () => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { code: "22023", message: "Row 2: invalid email" },
    });
    expect(
      (
        await bulkInvite(
          accessState,
          form({ list: "a@example.invalid,A,student" }),
        )
      ).error,
    ).toContain("Row 2: invalid email");
    mock.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "22023",
        message: 'relation "secret_table" does not exist',
      },
    });
    expect(
      (
        await bulkInvite(
          accessState,
          form({ list: "a@example.invalid,A,student" }),
        )
      ).error,
    ).not.toContain("secret_table");
    mock.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "Daily bulk invitation limit reached" },
    });
    expect(
      (
        await bulkInvite(
          accessState,
          form({ list: "a@example.invalid,A,student" }),
        )
      ).error,
    ).toContain("500");
  });
});

describe("changeInvitation reset", () => {
  it("calls the reset RPC for admins only and never sends email by itself", async () => {
    const result = await changeInvitation(
      accessState,
      form({ invitationId: record, command: "reset" }),
    );
    expect(result.message).toContain("Delivery reset");
    expect(mock.rpc).toHaveBeenCalledWith("reset_invitation_delivery", {
      target_school: school,
      target_invitation: record,
      reviewed_not_sent: true,
    });
    expect(mock.invoke).not.toHaveBeenCalled();
    mock.rpc.mockResolvedValue({ error: { code: "22023" } });
    expect(
      (
        await changeInvitation(
          accessState,
          form({ invitationId: record, command: "reset" }),
        )
      ).error,
    ).toContain("cannot be reset yet");
    mock.getContext.mockResolvedValue({
      status: "ready",
      school: { id: school },
      roles: ["teacher"],
    });
    mock.rpc.mockClear();
    expect(
      (
        await changeInvitation(
          accessState,
          form({ invitationId: record, command: "reset" }),
        )
      ).error,
    ).toContain("Admin");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});

describe("linkRegisterMember", () => {
  it("requires a version and explicit identity confirmation, and reports stale updates", async () => {
    const input = form({ kind: "teachers", id: record, membershipId: member });
    input.delete("version");
    expect((await linkRegisterMember(linkState, input)).saved).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
    input.set("version", "2");
    input.delete("confirmed");
    expect((await linkRegisterMember(linkState, input)).saved).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
    input.set("confirmed", "yes");
    mock.rpc.mockResolvedValue({ error: { code: "40001" } });
    expect((await linkRegisterMember(linkState, input)).error).toContain(
      "Reload",
    );
  });
  it("denies non-admins and unsupported kinds", async () => {
    mock.getContext.mockResolvedValue({
      status: "ready",
      school: { id: school },
      roles: ["guardian"],
    });
    expect(
      (
        await linkRegisterMember(
          linkState,
          form({ kind: "students", id: record, membershipId: member }),
        )
      ).error,
    ).toContain("administrator");
    mock.getContext.mockResolvedValue({
      status: "ready",
      school: { id: school },
      roles: ["school_admin"],
    });
    mock.rpc.mockClear();
    expect(
      (
        await linkRegisterMember(
          linkState,
          form({ kind: "audit_events", id: record, membershipId: member }),
        )
      ).error,
    ).toContain("valid");
    expect(
      (
        await linkRegisterMember(
          linkState,
          form({ kind: "students", id: "nope", membershipId: member }),
        )
      ).error,
    ).toContain("valid");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("links, unlinks (empty selection becomes null) and maps database errors", async () => {
    expect(
      (
        await linkRegisterMember(
          linkState,
          form({
            kind: "teachers",
            id: record,
            membershipId: member,
            schoolId: member,
          }),
        )
      ).saved,
    ).toBe(true);
    expect(mock.rpc).toHaveBeenLastCalledWith("link_register_to_member", {
      target_school: school,
      record_kind: "teachers",
      target_record: record,
      target_membership: member,
      expected_version: 1,
    });
    await linkRegisterMember(
      linkState,
      form({ kind: "teachers", id: record, membershipId: "" }),
    );
    expect(mock.rpc).toHaveBeenLastCalledWith(
      "link_register_to_member",
      expect.objectContaining({ target_membership: null }),
    );
    mock.rpc.mockResolvedValue({ error: { code: "23505" } });
    expect(
      (
        await linkRegisterMember(
          linkState,
          form({ kind: "teachers", id: record, membershipId: member }),
        )
      ).error,
    ).toContain("already linked");
    mock.rpc.mockResolvedValue({ error: { code: "22023" } });
    expect(
      (
        await linkRegisterMember(
          linkState,
          form({ kind: "teachers", id: record, membershipId: member }),
        )
      ).error,
    ).toContain("matching role");
  });
});

it("changes guardian grants only through verified admin scope and a versioned confirmed RPC", async () => {
  const input = form({
    id: record,
    version: "2",
    enabled: "true",
    schoolId: member,
  });
  expect((await setGuardianAccess(linkState, input)).saved).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith("set_guardian_access", {
    target_school: school,
    target_link: record,
    expected_version: 2,
    enabled: true,
  });
  mock.rpc.mockClear();
  input.delete("confirmed");
  expect((await setGuardianAccess(linkState, input)).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
  input.set("confirmed", "yes");
  mock.rpc.mockResolvedValue({ error: { code: "40001" } });
  expect((await setGuardianAccess(linkState, input)).error).toContain("Reload");
  mock.getContext.mockResolvedValue({
    status: "ready",
    school: { id: school },
    roles: ["guardian"],
  });
  mock.rpc.mockClear();
  expect((await setGuardianAccess(linkState, input)).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
