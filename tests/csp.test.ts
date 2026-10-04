import { describe, expect, it } from "vitest";
import { buildCsp, createNonce } from "../src/lib/csp";

describe("content security policy", () => {
  it("allows scripts only by nonce, forbids framing, plugins and foreign forms", () => {
    const csp = buildCsp("abc123");
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    for (const directive of [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "default-src 'self'",
    ])
      expect(csp).toContain(directive);
    expect(csp).not.toMatch(/https?:\/\//);
  });
  it("only relaxes eval and websockets in development", () => {
    expect(buildCsp("n", true)).toContain("'unsafe-eval'");
    expect(buildCsp("n", true)).toContain("ws:");
    expect(buildCsp("n", false)).not.toContain("unsafe-eval");
    expect(buildCsp("n", false)).not.toContain("ws:");
  });
  it("creates an unpredictable nonce for every request", () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/=]{20,}$/);
  });
});
