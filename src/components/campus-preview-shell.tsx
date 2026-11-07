import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, LockKeyhole } from "lucide-react";

const navigation = [
  { view: "overview", label: "Overview" },
  { view: "modules", label: "School workspace" },
  { view: "access", label: "Roles & access" },
  { view: "settings", label: "School settings" },
  { view: "setup", label: "Setup guide" },
];

export function CampusPreviewShell({
  children,
  view,
}: {
  children: ReactNode;
  view: string;
}) {
  return (
    <div className="campus-preview">
      <a href="#preview-main" className="skip-link">
        Skip to content
      </a>
      <header className="cp-header">
        <div className="cp-header-inner">
          <Link
            href="/preview"
            className="cp-brand"
            aria-label="School Portal preview home"
          >
            <span className="cp-brand-icon">
              <GraduationCap size={24} aria-hidden="true" />
            </span>
            <span>
              <strong>School Portal</strong>
              <small>A place to grow.</small>
            </span>
          </Link>
          <div className="cp-header-actions">
            <span className="cp-preview-badge">Preview mode</span>
            <Link href="/login" className="cp-signin">
              School sign-in <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <nav aria-label="Preview navigation" className="cp-navigation">
          {navigation.map((item) => (
            <Link
              key={item.view}
              href={`/preview?view=${item.view}`}
              aria-current={view === item.view ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="preview-main" tabIndex={-1} className="cp-main">
        {children}
      </main>
      <footer className="cp-footer">
        <span>School Portal / Foundation</span>
        <span>
          <LockKeyhole size={13} aria-hidden="true" /> Preview only · no
          personal information
        </span>
      </footer>
    </div>
  );
}
