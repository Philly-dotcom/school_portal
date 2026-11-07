import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import Preview from "../src/app/preview/page";

async function render(view?: string) {
  return renderToStaticMarkup(
    await Preview({
      searchParams: Promise.resolve(view ? { view } : {}),
    }),
  );
}

it("uses the Campus preview shell and orders the overview sections for reading", async () => {
  const html = await render();
  expect(html).toContain("Preview mode");
  expect(html).toContain("School sign-in");
  expect(html).toContain("School overview");
  expect(html).toContain("Start with the essentials");
  expect(html).toContain("4 connected roles");
  expect(html).toContain("The path ahead");
  expect(html).not.toContain('class="overview-grid"');

  const essentials = html.indexOf("Start with the essentials");
  const features = html.indexOf("4 connected roles");
  const roadmap = html.indexOf("The path ahead");
  expect(essentials).toBeGreaterThan(-1);
  expect(essentials).toBeLessThan(features);
  expect(features).toBeLessThan(roadmap);
});

it("keeps every preview destination and marks the active view", async () => {
  const html = await render("access");
  for (const view of ["overview", "modules", "access", "settings", "setup"]) {
    expect(html).toContain(`/preview?view=${view}`);
  }
  expect(html).toContain('href="/login"');
  expect(html).toContain("The right access, for everyone");
  expect(html).toMatch(/aria-current="page"[^>]*view=access|view=access[^>]*aria-current="page"/);
});

it("falls back to the overview for an unknown view", async () => {
  const html = await render("not-a-view");
  expect(html).toContain("School overview");
  expect(html).not.toContain("The right access, for everyone");
});
