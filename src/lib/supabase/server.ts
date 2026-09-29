import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/config";

export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("School Portal backend is not configured.");
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. Proxy refreshes them before rendering.
        }
      },
    },
  });
}
