import type { NextConfig } from "next";

const config: NextConfig = {
  // Do not infer this project's root from unrelated parent-directory lockfiles.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  logging: { incomingRequests: { ignore: [/\/auth\/confirm/] } },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }, { source: "/auth/:path*", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store" },
    ] }];
  },
};
export default config;
