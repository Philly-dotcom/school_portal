import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  getContext: vi.fn(),
  rpc: vi.fn(),
  invoke: vi.fn(),
  canSend: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.getContext }));
vi.mock("@/lib/account-config", () => ({
  invitationDeliveryEnabled: () => mock.canSend,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mock.rpc,
    functions: { invoke: mock.invoke },
  }),
}));
import {
  createInvitation,
  updateMember,
  changeInvitation,
} from "../src/app/dashboard/people/actions";
const state = { error: "", message: "" };
const school = "00000000-0000-4000-8000-000000000001",
  target = "00000000-0000-4000-8000-000000000002";
function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values))
    for (const item of Array.isArray(value) ? value : [value])
      data.append(key, item);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.canSend = false;
  mock.getContext.mockResolvedValue({
    status: "ready",
    school: { id: school },
    roles: ["school_admin"],
  });
  mock.rpc.mockResolvedValue({ data: target, error: null });
  mock.invoke.mockResolvedValue({ error: null });
});
describe("access action authorization and dispatch", () => {
  it("denies non-admin direct invocation before RPC or email", async () => {
    mock.getContext.mockResolvedValue({
      status: "ready",
      school: { id: school },
      roles: ["teacher"],
    });
    for (const action of [createInvitation, updateMember, changeInvitation])
      expect((await action(state, new FormData())).error).toContain("Admin");
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.invoke).not.toHaveBeenCalled();
  });
  it("prepares invitations without sending and ignores a forged school ID", async () => {
    const result = await createInvitation(
      state,
      form({
        name: "Fictional",
        email: "person@example.invalid",
        roles: ["teacher"],
        schoolId: target,
      }),
    );
    expect(result.message).toContain("No email");
    expect(mock.rpc).toHaveBeenCalledWith(
      "create_school_invitation",
      expect.objectContaining({ target_school: school }),
    );
    expect(mock.invoke).not.toHaveBeenCalled();
  });
  it("passes optimistic version to the database and reports last-admin protection", async () => {
    mock.rpc.mockResolvedValue({ error: { code: "23514" } });
    const result = await updateMember(
      state,
      form({
        membershipId: target,
        version: "2",
        status: "suspended",
        roles: ["school_admin"],
      }),
    );
    expect(result.error).toContain("at least one");
    expect(mock.rpc).toHaveBeenCalledWith(
      "manage_school_member",
      expect.objectContaining({ expected_version: 2, target_school: school }),
    );
  });
  it("blocks disabled email and invokes the sender only on an explicit send action", async () => {
    const data = form({ invitationId: target, command: "send" });
    expect((await changeInvitation(state, data)).error).toContain(
      "not enabled",
    );
    expect(mock.invoke).not.toHaveBeenCalled();
    mock.canSend = true;
    await changeInvitation(state, data);
    expect(mock.invoke).toHaveBeenCalledWith("invite-school-user", {
      body: { schoolId: school, invitationId: target },
    });
  });
});
