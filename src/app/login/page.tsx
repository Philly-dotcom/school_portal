import Link from "next/link";
import { ArrowLeft, BookOpen, ShieldCheck, Users } from "lucide-react";
import { Brand } from "@/components/portal-shell";
import { LoginForm } from "@/components/login-form";
import { isPortalConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default function Login() {
  const configured = isPortalConfigured();
  return <main className="login-page"><section className="login-story"><Link href="/" className="brand-link"><Brand /></Link><div><p className="eyebrow">LEARNING. PEOPLE. POSSIBILITIES.</p><h1>A connected school.<br />A clearer day.</h1><p>One shared space for teachers, learners<br />and the families supporting them.</p><div className="login-story-icons"><BookOpen size={29} /><Users size={29} /><ShieldCheck size={29} /></div></div><span className="small">School Portal · One school first.</span></section><section className="login-panel"><Link href="/preview" className="back-link"><ArrowLeft size={16} /> Explore the preview</Link><div className="login-card"><p className="eyebrow">YOUR SCHOOL WORKSPACE</p><h2>Welcome back.</h2><p className="muted">Sign in with the account provided by your school.</p>{!configured && <div className="login-notice" role="status"><ShieldCheck size={20} /><div><strong>Your school is not connected yet.</strong><p>Sign-in is disabled until the dedicated backend and first administrator are configured.</p><Link href="/preview?view=setup">See setup steps <ArrowLeft size={13} className="flip" /></Link></div></div>}<LoginForm enabled={configured} /></div><p className="login-footer">Your information. Your school. The right access.</p></section></main>;
}
