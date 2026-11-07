import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { isPortalConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

const highlights = [
  { Icon: BookOpen, text: "Every class, one place", colour: "blue" },
  { Icon: Users, text: "Teachers, learners & families", colour: "green" },
  { Icon: ShieldCheck, text: "School-verified access", colour: "orange" },
];

export default function Login() {
  const configured = isPortalConfigured();
  return (
    <div className="campus-signin">
      <aside className="signin-story" aria-label="About School Portal">
        <Link href="/" className="signin-brand">
          <span className="signin-brand-icon">
            <GraduationCap size={24} aria-hidden="true" />
          </span>
          <span>
            <strong>School Portal</strong>
            <small>A place to grow.</small>
          </span>
        </Link>

        <div className="signin-story-copy">
          <p className="signin-story-eyebrow">
            Learning. People. Possibilities.
          </p>
          <h2>
            A connected school.
            <br />A clearer day.
          </h2>
          <p className="signin-story-description">
            One shared space for teachers, learners and the families supporting
            them.
          </p>
          <ul className="signin-highlights">
            {highlights.map(({ Icon, text, colour }) => (
              <li key={text}>
                <span className={`signin-highlight-icon ${colour}`}>
                  <Icon size={14} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="signin-story-footer">
          School Portal · One school first.
        </p>
      </aside>

      <main className="signin-panel">
        <Link href="/preview" className="signin-back">
          <ArrowLeft size={16} aria-hidden="true" /> Explore the preview
        </Link>

        <div className="signin-card">
          <p className="signin-eyebrow">Your school workspace</p>
          <h1>Welcome back.</h1>
          <p className="signin-description">
            Sign in with the account provided by your school.
          </p>

          {!configured && (
            <section className="signin-setup-notice" role="status">
              <strong>Your school is not connected yet.</strong>
              <p>
                Sign-in is disabled until the dedicated backend and first
                administrator are configured.
              </p>
              <Link href="/preview?view=setup">See setup steps</Link>
            </section>
          )}

          <LoginForm enabled={configured} />
        </div>

        <p className="signin-footer">
          Your information. Your school. The right access.
        </p>
      </main>
    </div>
  );
}
