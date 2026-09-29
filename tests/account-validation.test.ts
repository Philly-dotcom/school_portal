import { describe, expect, it } from "vitest";
import { confirmationSchema, invitationSchema, membershipSchema, passwordSchema, validatedSiteOrigin } from "../src/lib/account-validation";

describe("account inputs and trusted redirect configuration", () => {
  it("allows only explicit school roles", () => {
    expect(invitationSchema.safeParse({email:"test@example.invalid",name:"Test",roles:["super_admin"]}).success).toBe(false);
    expect(invitationSchema.safeParse({email:"test@example.invalid",name:"Test",roles:[]}).success).toBe(false);
    expect(membershipSchema.safeParse({membershipId:"not-an-id",version:1,status:"active",roles:["teacher"]}).success).toBe(false);
  });
  it("requires matching passwords of sufficient length", () => {
    expect(passwordSchema.safeParse({password:"short",confirm:"short"}).success).toBe(false);
    expect(passwordSchema.safeParse({password:"fictional-password-123",confirm:"different"}).success).toBe(false);
    expect(passwordSchema.safeParse({password:"fictional-password-123",confirm:"fictional-password-123"}).success).toBe(true);
  });
  it("rejects open redirect, userinfo and unsafe deployment URLs", () => {
    for (const url of ["//evil.invalid","javascript:alert(1)","https://user:pass@example.invalid","https://example.invalid/path","http://example.invalid","https://example.invalid?next=evil"]) expect(validatedSiteOrigin(url)).toBeNull();
    expect(validatedSiteOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(validatedSiteOrigin("https://school.example.invalid/")).toBe("https://school.example.invalid");
  });
  it("limits confirmation to invite and recovery and strips arbitrary destinations", () => {
    expect(confirmationSchema.safeParse({token_hash:"a".repeat(64),type:"signup"}).success).toBe(false);
    const parsed = confirmationSchema.parse({token_hash:"a".repeat(64),type:"invite",next:"https://evil.invalid"});
    expect(parsed).not.toHaveProperty("next");
  });
});
