import Link from "next/link";
import { ArrowUpRight, BookOpen, Check, ChevronRight, GraduationCap, LayoutDashboard, Layers3, LockKeyhole, Settings2, ShieldCheck, Users } from "lucide-react";
import { signOut } from "@/app/login/actions";

const navigation = [
  { view: "overview", label: "Overview", icon: LayoutDashboard },
  { view: "modules", label: "School workspace", icon: BookOpen },
  { view: "access", label: "Roles & access", icon: ShieldCheck },
  { view: "settings", label: "School settings", icon: Settings2 },
];

export function Brand() {
  return <span className="brand"><span className="brand-icon"><GraduationCap size={25} strokeWidth={1.65} /></span><span>School Portal<span className="brand-caption">A place to grow.</span></span></span>;
}

export function PortalShell({ children, view = "overview", preview = true, schoolName = "Your school workspace", admin = false }: {
  children: React.ReactNode; view?: string; preview?: boolean; schoolName?: string; admin?: boolean;
}) {
  const base = preview ? "/preview" : "/dashboard";
  const items = preview ? navigation : [navigation[0], ...(admin ? [{ view: "academic", label: "Academic setup", icon: BookOpen }, { view: "registers", label: "School registers", icon: GraduationCap }, { view: "teaching", label: "Teaching assignments", icon: BookOpen }, { view: "people", label: "People & access", icon: Users }, navigation[3]] : [])];
  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <Link href={base} className="brand-link" aria-label="School Portal home"><Brand /></Link>
      <div className="school-label"><span className="school-monogram">SP</span><span>{schoolName}<small>{preview ? "Single-school foundation" : "School workspace"}</small></span></div>
      <span className="nav-caption">WORKSPACE</span>
      <nav aria-label="Main navigation" className="main-nav">
        {items.map(({ view: key, label, icon: Icon }) => <Link key={key} href={`${base}?view=${key}`} className={`nav-item ${view === key ? "active" : ""}`} aria-current={view === key ? "page" : undefined}><Icon size={19} />{label}{view === key && <span className="nav-dot" />}</Link>)}
      </nav>
      {preview && <div className="sidebar-guide"><Layers3 size={21} /><strong>Built one step at a time.</strong><p>One school first.<br />A thoughtful foundation for more.</p><Link href="/preview?view=setup">View setup guide <ArrowUpRight size={15} /></Link></div>}
      <div className="sidebar-footer"><span className={`status-dot ${preview ? "amber" : ""}`} /><span>{preview ? "Foundation preview" : "School membership verified"}<small>{preview ? "No live school data" : "Access checked on every request"}</small></span></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14} /><span>{view === "setup" ? "Setup guide" : items.find((item) => item.view === view)?.label ?? "Overview"}</span></div><div className="topbar-actions">{preview ? <><span className="status-pill"><span className="status-dot amber" />Preview mode</span><Link href="/login" className="topbar-login">School sign-in <ArrowUpRight size={15} /></Link></> : <form action={signOut}><button className="button secondary compact">Sign out</button></form>}</div></header>
      <main id="main" tabIndex={-1} className="main-content">{children}</main>
      <footer className="page-footer"><span>School Portal <span className="footer-divider">/</span> Foundation</span><span><LockKeyhole size={13} /> {preview ? "Preview only · no personal information" : "School-scoped access"}</span></footer>
    </div>
  </div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div>;
}

export function PreviewNotice() {
  return <div className="preview-notice"><span className="notice-icon"><Check size={15} /></span><span><strong>A foundation you can explore.</strong> This preview uses no school records. Sign-in becomes available after setup.</span></div>;
}
