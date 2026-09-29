import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3001", channel: process.platform === "win32" ? "msedge" : undefined, trace: "retain-on-failure" },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001/preview",
    reuseExistingServer: false,
    timeout: 120000,
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", SCHOOL_PORTAL_SCHOOL_ID: "", SCHOOL_PORTAL_EMAIL_ENABLED: "false", SCHOOL_PORTAL_INVITATIONS_ENABLED: "false", SCHOOL_PORTAL_SITE_URL: "" },
  },
});
