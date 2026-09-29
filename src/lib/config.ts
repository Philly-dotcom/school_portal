import { z } from "zod";

const schema = z.object({
  url: z.url(),
  key: z.string().min(20).refine((value) => !value.startsWith("sb_secret_")),
});

export function getSupabaseConfig() {
  const result = schema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return result.success ? result.data : null;
}

export function getSchoolId() {
  const result = z.uuid().safeParse(process.env.SCHOOL_PORTAL_SCHOOL_ID);
  return result.success ? result.data : null;
}

export function isPortalConfigured() {
  return Boolean(getSupabaseConfig() && getSchoolId());
}
