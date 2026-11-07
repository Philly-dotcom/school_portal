import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(() => false),
}));

vi.mock("@/lib/config", () => ({
  isPortalConfigured: () => mocks.configured(),
}));
vi.mock("@/app/login/actions", () => ({ signIn: vi.fn() }));

import Login from "../src/app/login/page";

it("renders the Campus sign-in with a single form heading and disabled setup state", () => {
  const html = renderToStaticMarkup(Login());
  expect(html).toContain("A connected school.");
  expect(html).toContain("A clearer day.");
  expect(html).toContain('aria-label="About School Portal"');
  expect(html).toContain("Welcome back.");
  expect(html).toContain("School account email");
  expect(html).toContain("Password");
  expect(html).toContain("Your school is not connected yet.");
  expect(html).toContain("See setup steps");
  expect(html).toContain("Explore the preview");
  expect(html).toContain("Forgot your password?");
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain('href="/preview"');
  expect(html).toContain('href="/forgot-password"');
  expect(html).toContain('id="email"');
  expect(html).toContain('id="password"');
  expect(html).toContain("disabled");
});

it("enables the form when the school backend is configured", () => {
  mocks.configured.mockReturnValueOnce(true);
  const html = renderToStaticMarkup(Login());
  expect(html).not.toContain("Your school is not connected yet.");
  expect(html).not.toContain("See setup steps");
  expect(html).toContain('<button class="button primary" type="submit">');
});
