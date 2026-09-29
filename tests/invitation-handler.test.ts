import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ getUser: vi.fn(), claim: vi.fn(), send: vi.fn(), complete: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: (_url: string, key: string) => key === "service-test" ? {auth:{admin:{inviteUserByEmail:mock.send}},rpc:mock.complete} : {auth:{getUser:mock.getUser},rpc:mock.claim} }));
import { handleInvitation } from "../supabase/functions/invite-school-user/handler";
const config = {url:"https://example.invalid",anonKey:"anon-test",serviceKey:"service-test",siteUrl:"http://127.0.0.1:3000"};
const input = {schoolId:"00000000-0000-4000-8000-000000000001",invitationId:"00000000-0000-4000-8000-000000000002"};
function request(body = input, token = true) { return new Request("https://example.invalid/invite",{method:"POST",headers:token?{Authorization:"Bearer fictional-test-token"}:{},body:JSON.stringify(body)}); }
beforeEach(() => {
  vi.resetAllMocks();
  mock.getUser.mockResolvedValue({data:{user:{id:"caller"}},error:null});
  mock.claim.mockResolvedValue({data:[{email:"approved@example.invalid",claim_id:"claim"}],error:null});
  mock.send.mockResolvedValue({error:null}); mock.complete.mockResolvedValue({error:null});
});
describe("isolated invitation email boundary (mocked provider; no emails)", () => {
  it("rejects anonymous or invalid sessions before privileged operations", async () => {
    expect((await handleInvitation(request(input,false),config)).status).toBe(401);
    mock.getUser.mockResolvedValue({data:{user:null},error:{message:"invalid"}});
    expect((await handleInvitation(request(),config)).status).toBe(401);
    expect(mock.send).not.toHaveBeenCalled();
  });
  it("rejects non-admin, wrong-school, already-sent or revoked requests when claim is denied", async () => {
    mock.claim.mockResolvedValue({data:null,error:{message:"denied"}});
    expect((await handleInvitation(request(),config)).status).toBe(403);
    expect(mock.send).not.toHaveBeenCalled();
  });
  it("sends only to the database-approved address and fixed trusted site", async () => {
    expect((await handleInvitation(request(),config)).status).toBe(200);
    expect(mock.send).toHaveBeenCalledWith("approved@example.invalid",{redirectTo:"http://127.0.0.1:3000/account/password?flow=invite"});
    expect(mock.complete).toHaveBeenCalledWith("complete_school_invitation_delivery",expect.objectContaining({succeeded:true,claim:"claim"}));
  });
  it("records failures without leaking provider details or auto-resending", async () => {
    mock.send.mockResolvedValue({error:{message:"internal sensitive detail"}});
    const response = await handleInvitation(request(),config);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("sensitive");
    expect(mock.send).toHaveBeenCalledTimes(1);
    expect(mock.complete).toHaveBeenCalledWith("complete_school_invitation_delivery",expect.objectContaining({succeeded:false}));
  });
  it("does not report success if status persistence fails", async () => {
    mock.complete.mockResolvedValue({error:{message:"database unavailable"}});
    expect((await handleInvitation(request(),config)).status).toBe(503);
  });
});
