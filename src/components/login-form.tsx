"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { signIn } from "@/app/login/actions";

export function LoginForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return (
    <form action={action} className="login-form">
      <label htmlFor="email">School account email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="you@school.org"
        required
        disabled={!enabled || pending}
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        disabled={!enabled || pending}
      />
      {state.error && (
        <p className="error-message" role="alert">
          {state.error}
        </p>
      )}
      <button
        className="button primary"
        type="submit"
        disabled={!enabled || pending}
      >
        {pending ? (
          <>
            <LoaderCircle size={18} className="spin" /> Signing in…
          </>
        ) : (
          <>
            Sign in <ArrowRight size={18} />
          </>
        )}
      </button>
      <Link className="text-link" href="/forgot-password">
        Forgot your password?
      </Link>
      <p className="muted small">
        Accounts are provided by your school. For account access, contact your
        school administrator.
      </p>
    </form>
  );
}
