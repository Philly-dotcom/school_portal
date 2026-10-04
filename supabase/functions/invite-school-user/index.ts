import { handleInvitation } from "./handler.ts";

// The Supabase runtime supplies Deno and privileged credentials, never the web app.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
Deno.serve((request) =>
  handleInvitation(request, {
    enabled:
      Deno.env.get("SCHOOL_PORTAL_INVITATION_DELIVERY_ENABLED") === "true",
    url: Deno.env.get("SUPABASE_URL") ?? "",
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    siteUrl: Deno.env.get("SCHOOL_PORTAL_SITE_URL") ?? "",
  }),
);
