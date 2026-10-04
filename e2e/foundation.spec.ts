import { expect, test } from "@playwright/test";

test("production CSP uses fresh script nonces and blocks untrusted inline code", async ({
  page,
}) => {
  test.skip(
    process.env.SCHOOL_PORTAL_E2E_PRODUCTION !== "true",
    "Production-only CSP assertion",
  );
  const response = await page.goto("/preview");
  const csp = response?.headers()["content-security-policy"] ?? "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(csp).not.toContain("'unsafe-eval'");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  const scripts = await page
    .locator("script")
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLScriptElement).nonce),
    );
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.every((value) => value === nonce)).toBe(true);
  const second = await page.reload();
  expect(
    second?.headers()["content-security-policy"].match(/'nonce-([^']+)'/)?.[1],
  ).not.toBe(nonce);
  // Test parser-inserted HTML. DevTools evaluation is privileged and is not an XSS probe.
  await page.route("**/preview?csp-probe=1", async (route) => {
    const actual = await route.fetch();
    const actualNonce = actual
      .headers()
      ["content-security-policy"].match(/'nonce-([^']+)'/)?.[1];
    const body = (await actual.text()).replace(
      "</body>",
      `<script>document.documentElement.dataset.untrustedScript='executed'</script><script nonce="${actualNonce}">document.documentElement.dataset.trustedScript='executed'</script></body>`,
    );
    await route.fulfill({ response: actual, body });
  });
  await page.goto("/preview?csp-probe=1");
  expect(await page.locator("html").getAttribute("data-trusted-script")).toBe(
    "executed",
  );
  expect(
    await page.locator("html").getAttribute("data-untrusted-script"),
  ).toBeNull();
});

test("preview navigation, disconnected login and protected route", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/preview$/);
  await expect(
    page.getByRole("heading", { name: "School overview" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Roles & access", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The right access, for everyone" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "School settings", exact: true })
    .click();
  await expect(page.getByText("Read-only preview")).toBeVisible();
  await page.getByRole("link", { name: "School sign-in" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("School account email")).toBeDisabled();
  await page.goto("/dashboard?view=settings");
  await expect(
    page.getByRole("heading", { name: "Your school is not connected yet." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save school settings" }),
  ).toHaveCount(0);
  await page.goto("/preview?view=super_admin");
  await expect(
    page.getByRole("heading", { name: "School overview" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("recovery is gated and invalid links cannot grant account access", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request recovery email" }),
  ).toBeDisabled();
  await page.goto(
    "/auth/confirm?type=signup&token_hash=fictional-invalid-token&next=https://example.invalid",
  );
  await expect(page.getByText(/This link is incomplete/)).toBeVisible();
  for (const route of ["/account/password", "/account/accept"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/forgot-password");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/recovery-320.png",
    fullPage: true,
  });
});

for (const width of [1440, 390, 320]) {
  test(`preview stays navigable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const view of ["overview", "modules", "access", "settings", "setup"]) {
      await page.goto(`/preview?view=${view}`);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/preview");
    await page.screenshot({
      path: `test-results/overview-${width}.png`,
      fullPage: true,
    });
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
