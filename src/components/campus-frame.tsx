import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CampusMenu } from "@/components/campus-menu";

export function CampusFrame({
  children,
  schoolName,
  homeHref,
  navigation,
  profileMenu,
  learnerName,
}: {
  children: ReactNode;
  schoolName: string;
  homeHref: string;
  navigation?: ReactNode;
  profileMenu: ReactNode;
  learnerName?: string;
}) {
  return (
    <div className="campus-root">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="campus-header">
        <Link className="campus-brand" href={homeHref} aria-label="School Portal home">
          <span className="campus-brand-icon" aria-hidden="true">
            <GraduationCap size={24} />
          </span>
          <span className="campus-brand-copy">
            <strong>{schoolName}</strong>
            <small>School Portal · A place to grow</small>
          </span>
        </Link>
        <div className="campus-header-actions">
          {navigation ? <CampusMenu>{navigation}</CampusMenu> : null}
          {profileMenu}
        </div>
        {learnerName && (
          <p className="campus-learner-context">
            Viewing learner: <strong>{learnerName}</strong>
          </p>
        )}
      </header>
      <main id="main" tabIndex={-1} className="campus-main">
        {children}
      </main>
      <footer className="campus-footer">
        <span>{schoolName}</span>
        <span>School Portal</span>
      </footer>
    </div>
  );
}
