import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), verifyOtp: vi.fn(), resetPasswordForEmail: vi.fn(), rpc: vi.fn(), configured: true, emailEnabled: true, school: "00000000-0000-4000-8000-000000000001" }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("@/lib/config", () => ({ isPortalConfigured: () => mock.configured, getSchoolId: () => mock.school }));
vi.mock("@/lib/account-config", () => ({ emailFlowsEnabled: () => mock.emailEnabled, siteOrigin: () => "https://school.example.invalid" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mock, rpc: mock.rpc }) }));
import { acceptInvitation, changePassword, confirmEmail, requestRecovery } from "../src/app/account/actions";

const state = { error: "", message: "" };
function form(values: Record<string,string>) { const data = new FormData(); for (const [key,value] of Object.entries(values)) data.set(key,value); return data; }
beforeEach(() => { vi.clearAllMocks(); mock.configured=true; mock.emailEnabled=true; mock.getUser.mockResolvedValue({data:{user:{id:"verified-user"}},error:null});mock.updateUser.mockResolvedValue({error:null});mock.signOut.mockResolvedValue({error:null});mock.verifyOtp.mockResolvedValue({error:null});mock.resetPasswordForEmail.mockResolvedValue({error:null});mock.rpc.mockResolvedValue({error:null}); });

describe("password recovery and invitation actions (no real requests)", () => {
  it("does not send when email is disabled", async () => {
    mock.emailEnabled=false;
    expect((await requestRecovery(state,form({email:"user@example.invalid"}))).error).toContain("not enabled");
    expect(mock.resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it("returns the same recovery response for success and provider failure", async () => {
    const data = form({email:"user@example.invalid"});
    const expected = await requestRecovery(state,data);
    mock.resetPasswordForEmail.mockResolvedValue({error:{message:"user not found"}});
    expect(await requestRecovery(state,data)).toEqual(expected);
    mock.resetPasswordForEmail.mockRejectedValue(new Error("network failure"));
    expect(await requestRecovery(state,data)).toEqual(expected);
    expect(mock.resetPasswordForEmail).toHaveBeenCalledWith("user@example.invalid",{redirectTo:"https://school.example.invalid/account/password"});
  });
  it("rejects unsupported token types and does not honor external redirect input", async () => {
    expect((await confirmEmail(state,form({type:"signup",token_hash:"a".repeat(64)}))).error).toContain("invalid");
    expect(mock.verifyOtp).not.toHaveBeenCalled();
    await expect(confirmEmail(state,form({type:"invite",token_hash:"a".repeat(64),next:"https://evil.invalid"}))).rejects.toThrow("REDIRECT:/account/password?flow=invite");
    mock.verifyOtp.mockResolvedValue({error:{message:"expired"}});
    expect((await confirmEmail(state,form({type:"recovery",token_hash:"a".repeat(64)}))).error).toContain("expired");
  });
  it("requires a verified user before changing a password", async () => {
    mock.getUser.mockResolvedValue({data:{user:null},error:{message:"invalid"}});
    const result = await changePassword(state,form({password:"fictional-password-123",confirm:"fictional-password-123"}));
    expect(result.error).toContain("expired");
    expect(mock.updateUser).not.toHaveBeenCalled();
  });
  it("does not update mismatched passwords and routes invited users to acceptance", async () => {
    const values = {password:"fictional-password-123",confirm:"wrong"};
    expect((await changePassword(state,form(values))).error).toContain("same password");
    expect(mock.updateUser).not.toHaveBeenCalled();
    await expect(changePassword(state,form({...values,confirm:values.password,flow:"invite"}))).rejects.toThrow("REDIRECT:/account/accept");
  });
  it("ends all other sessions after a successful password change, and tolerates revocation failure", async () => {
    const values = {password:"fictional-password-123",confirm:"fictional-password-123"};
    await expect(changePassword(state,form(values))).rejects.toThrow("REDIRECT:/dashboard");
    expect(mock.signOut).toHaveBeenCalledWith({scope:"others"});
    mock.signOut.mockRejectedValue(new Error("network"));
    await expect(changePassword(state,form(values))).rejects.toThrow("REDIRECT:/dashboard");
  });
  it("does not revoke sessions when the password update fails", async () => {
    mock.updateUser.mockResolvedValue({error:{message:"weak"}});
    expect((await changePassword(state,form({password:"fictional-password-123",confirm:"fictional-password-123"}))).error).toContain("could not be updated");
    expect(mock.signOut).not.toHaveBeenCalled();
  });
  it("accepts only through the authenticated database RPC and configured school", async () => {
    await expect(acceptInvitation(state)).rejects.toThrow("REDIRECT:/dashboard");
    expect(mock.rpc).toHaveBeenCalledWith("accept_school_invitation",{target_school:mock.school});
    mock.rpc.mockResolvedValue({error:{message:"revoked"}});
    expect((await acceptInvitation(state)).error).toContain("No valid invitation");
  });
});
