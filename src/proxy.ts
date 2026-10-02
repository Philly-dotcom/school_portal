import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/config";
import { buildCsp, createNonce } from "@/lib/csp";

// Paths that need a refreshed Supabase session. Every other page only receives security headers.
const sessionPaths = /^\/(dashboard|login|account|auth|forgot-password)(\/|$)/;

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV !== "production");
  // Next.js reads the nonce from the REQUEST's CSP header and applies it to its own scripts.
  const forward = () => {
    const headers = new Headers(request.headers); // rebuilt after cookie updates so they are forwarded
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers } });
  };
  let response = forward();
  const config = getSupabaseConfig();
  const needsSession = sessionPaths.test(request.nextUrl.pathname);
  if (config && needsSession) {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = forward();
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // The protected page checks the current user AND active DB membership again.
    await supabase.auth.getUser();
  }
  response.headers.set("Content-Security-Policy", csp);
  if (needsSession) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

// Run on pages, not on static assets.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"] };
