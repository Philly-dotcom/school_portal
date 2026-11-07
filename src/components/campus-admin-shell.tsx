"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

const groups = [
  {
    label: "Home",
    items: [
      { view: "overview", label: "Overview", Icon: LayoutDashboard, colour: "blue" },
    ],
  },
  {
    label: "School day",
    items: [
      { view: "attendance", label: "Attendance", Icon: ClipboardCheck, colour: "green" },
      { view: "timetable", label: "Timetable", Icon: CalendarDays, colour: "blue" },
      { view: "homework", label: "Homework", Icon: BookOpen, colour: "coral" },
    ],
  },
  {
    label: "Academics",
    items: [
      { view: "assessments", label: "Assessments", Icon: ClipboardList, colour: "orange" },
      { view: "academic", label: "Academic setup", Icon: Layers3, colour: "orange" },
      { view: "teaching", label: "Teaching assignments", Icon: GraduationCap, colour: "orange" },
    ],
  },
  {
    label: "School community",
    items: [
      { view: "registers", label: "School registers", Icon: Users, colour: "green" },
      { view: "people", label: "People & access", Icon: ShieldCheck, colour: "green" },
    ],
  },
  {
    label: "Information",
    items: [
      { view: "announcements", label: "Announcements", Icon: Megaphone, colour: "purple" },
      { view: "documents", label: "Documents", Icon: FileText, colour: "teal" },
    ],
  },
];

function adminUrl(view: string) {
  return `/dashboard?${new URLSearchParams({ view, mode: "school_admin" })}`;
}

function Navigation({
  view,
  onNavigate,
}: {
  view: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="ca-navigation-groups">
        {groups.map((group) => (
          <nav
            key={group.label}
            aria-label={group.label}
            className="ca-nav-group"
          >
            <p className="ca-group-heading">{group.label}</p>
            {group.items.map(({ view: key, label, Icon, colour }) => (
              <Link
                key={key}
                href={adminUrl(key)}
                className="ca-nav-link"
                aria-label={label}
                title={label}
                aria-current={view === key ? "page" : undefined}
                onClick={onNavigate}
              >
                <span className={`ca-nav-icon ${colour}`}>
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="ca-nav-label">{label}</span>
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <nav aria-label="School settings" className="ca-settings-nav">
        <Link
          className="ca-nav-link"
          href={adminUrl("settings")}
          aria-label="School settings"
          title="School settings"
          aria-current={view === "settings" ? "page" : undefined}
          onClick={onNavigate}
        >
          <span className="ca-nav-icon blue">
            <Settings2 size={17} aria-hidden="true" />
          </span>
          <span className="ca-nav-label">School settings</span>
        </Link>
      </nav>
    </>
  );
}

export function CampusAdminShell({
  children,
  schoolName,
  view,
  profileMenu,
}: {
  children: ReactNode;
  schoolName: string;
  view: string;
  profileMenu: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (media.matches && drawer.current?.open) drawer.current.close();
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (drawer.current?.open) drawer.current.close();
  }, [view]);

  return (
    <div
      className="campus-admin"
      data-collapsed={collapsed}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="ca-header">
        <Link href={adminUrl("overview")} className="ca-brand">
          <span className="ca-brand-icon">
            <GraduationCap size={24} aria-hidden="true" />
          </span>
          <span>
            <strong>School Portal</strong>
            <small>A place to grow.</small>
          </span>
        </Link>
        <div className="ca-school">
          <strong>{schoolName}</strong>
          <small>School administration</small>
        </div>
        <div className="ca-account">{profileMenu}</div>
        <button
          ref={menuButton}
          type="button"
          className="ca-mobile-menu"
          aria-haspopup="dialog"
          aria-controls="admin-navigation-drawer"
          onClick={() => {
            if (!drawer.current?.open) drawer.current?.showModal();
          }}
        >
          <Menu size={20} aria-hidden="true" /> Menu
        </button>
      </header>

      <aside className="ca-sidebar" aria-label="Administrator sidebar">
        <button
          type="button"
          className="ca-collapse"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="admin-desktop-navigation"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
          <span className="ca-nav-label">Collapse sidebar</span>
        </button>
        <div
          id="admin-desktop-navigation"
          className="ca-sidebar-scroll"
        >
          <Navigation view={view} />
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="ca-main">
        {children}
      </main>

      <dialog
        ref={drawer}
        id="admin-navigation-drawer"
        className="ca-drawer"
        aria-labelledby="admin-drawer-title"
        onClose={() => {
          if (menuButton.current?.offsetParent) menuButton.current.focus();
        }}
      >
        <div className="ca-drawer-heading">
          <h2 id="admin-drawer-title">School navigation</h2>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => drawer.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <Navigation
          view={view}
          onNavigate={() => drawer.current?.close()}
        />
      </dialog>
    </div>
  );
}
