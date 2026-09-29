"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isPortalConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string };

export async function signIn(_state: LoginState, formData: FormData): Promise<LoginState> {
  if (!isPortalConfigured()) return { error: "Sign-in is not available until your school is connected." };
  const parsed = z.object({ email: z.email(), password: z.string().min(1).max(1024) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email address and password." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: "Unable to sign in. Check your details or contact your school administrator." };
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again later." };
  }
  redirect("/dashboard");
}

export async function signOut() {
  if (isPortalConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error("Unable to sign out. Please try again.");
  }
  redirect("/login");
}
