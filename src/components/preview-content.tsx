import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Circle,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Megaphone,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeading, PreviewNotice } from "@/components/portal-shell";

const phases = [
  "Foundation",
  "Academic setup",
  "Daily operations",
  "Academic performance",
  "Finance & communication",
  "Smart features",
];
const modules = [
  {
    name: "People & classes",
    description:
      "Students, teachers, guardians and the classes that connect them.",
    phase: "Phase 2",
    icon: Users,
  },
  {
    name: "Timetable",
    description:
      "A shared view of lessons, teaching assignments and the school day.",
    phase: "Phases 2–3",
    icon: CalendarDays,
  },
  {
    name: "Attendance",
    description:
      "Daily registers with clear records and accountable corrections.",
    phase: "Phase 3",
    icon: ClipboardCheck,
  },
  {
    name: "Homework",
    description:
      "Instructions and PDF resources for learners to view. No submissions.",
    phase: "Phase 3",
    icon: BookOpen,
  },
  {
    name: "Announcements",
    description: "School and class notices, delivered to the right audience.",
    phase: "Phase 3",
    icon: Megaphone,
  },
  {
    name: "Documents",
    description:
      "Private PDF documents with access based on role and relationship.",
    phase: "Phase 3",
    icon: FileText,
  },
  {
    name: "Marks & reports",
    description:
      "Teacher entry, authorized review, then School Admin publication.",
    phase: "Phase 4",
    icon: GraduationCap,
  },
  {
    name: "Fees & payments",
    description: "Charges, recorded payments and clear family balances.",
    phase: "Phase 5",
    icon: Wallet,
  },
  {
    name: "Smart features",
    description:
      "Useful automations and AI, considered after the essentials work.",
    phase: "Phase 6 · optional",
    icon: Sparkles,
  },
];

export function Overview() {
  return (
    <>
      <PageHeading
        eyebrow="YOUR SCHOOL, CONNECTED"
        title="School overview"
        description="One place for the people, learning and everyday life of your school."
        action={
          <Link className="button secondary" href="/preview?view=setup">
            Setup guide <ArrowUpRight size={16} />
          </Link>
        }
      />
      <PreviewNotice />
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="welcome-tag">
            <span className="status-dot" /> PHASE 01 · FOUNDATION
          </span>
          <h2 id="welcome-title">
            A strong start.
            <br />A connected school.
          </h2>
          <p>
            Begin with a secure space for your school.
            <br className="desktop-break" /> People, classes and daily routines
            come next.
          </p>
          <Link href="/preview?view=setup" className="button light">
            Prepare your school <ArrowRight size={17} />
          </Link>
        </div>
        <div className="school-illustration" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="illustration-school">
            <GraduationCap size={55} strokeWidth={1.3} />
            <span>School Portal</span>
          </div>
          <span className="floating-label label-teacher">
            <BookOpen size={17} />
            Teachers
          </span>
          <span className="floating-label label-student">
            <GraduationCap size={17} />
            Students
          </span>
          <span className="floating-label label-family">
            <Users size={17} />
            Families
          </span>
          <span className="illustration-dot dot-one" />
          <span className="illustration-dot dot-two" />
        </div>
      </section>
      <div className="foundation-stats">
        <div>
          <span className="stat-icon">
            <Users size={21} />
          </span>
          <div>
            <strong>4 connected roles</strong>
            <span>One shared school experience</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <ShieldCheck size={21} />
          </span>
          <div>
            <strong>Permission-led access</strong>
            <span>The right information, for each person</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Layers3 size={21} />
          </span>
          <div>
            <strong>One school first</strong>
            <span>Room to grow when you are ready</span>
          </div>
        </div>
      </div>
      <div className="overview-grid">
        <section>
          <div className="section-heading">
            <h2>Start with the essentials</h2>
            <span className="muted small">Your first steps</span>
          </div>
          <div className="starter-list">
            <Starter
              href="/preview?view=settings"
              icon={<Settings2 size={21} />}
              title="Make it your school"
              text="Review the school profile and configuration."
              label="School settings"
            />
            <Starter
              href="/preview?view=access"
              icon={<ShieldCheck size={21} />}
              title="Give everyone the right access"
              text="Understand what each role can see and do."
              label="Explore roles"
            />
            <Starter
              href="/preview?view=modules"
              icon={<BookOpen size={21} />}
              title="Plan the school workspace"
              text="See how academic and daily operations fit together."
              label="View modules"
            />
          </div>
        </section>
        <section className="roadmap-panel">
          <div className="section-heading">
            <h2>The path ahead</h2>
            <span className="small muted">6 phases</span>
          </div>
          <ol className="phase-list">
            {phases.map((phase, i) => (
              <li key={phase} className={i === 0 ? "current" : ""}>
                <span className="phase-number">
                  {i === 0 ? (
                    <Layers3 size={15} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  {phase}
                  {i === 0 && <small>In progress</small>}
                  {i === 5 && <small>Optional, later</small>}
                </span>
                {i === 0 && <span className="status-dot" />}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

function Starter({
  href,
  icon,
  title,
  text,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  label: string;
}) {
  return (
    <Link href={href} className="starter">
      <span className="starter-icon">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
        <span className="text-link">
          {label} <ArrowRight size={14} />
        </span>
      </div>
      <Chevron />
    </Link>
  );
}
function Chevron() {
  return <ArrowUpRight className="starter-arrow" size={18} />;
}

export function Modules() {
  return (
    <>
      <PageHeading
        eyebrow="THE BIG PICTURE"
        title="Your school workspace"
        description="A connected set of modules, introduced one phase at a time."
      />
      <PreviewNotice />
      <div className="module-grid">
        {modules.map(({ name, description, phase, icon: Icon }) => (
          <article className="module-card" key={name}>
            <div className="module-top">
              <span className="module-icon">
                <Icon size={23} strokeWidth={1.6} />
              </span>
              <span className="phase-tag">{phase}</span>
            </div>
            <h2>{name}</h2>
            <p>{description}</p>
            <span className="planned-label">
              <Circle size={10} /> Planned · not available yet
            </span>
          </article>
        ))}
      </div>
    </>
  );
}

export function Access() {
  const rows = [
    [
      "School Admin",
      "School setup, people and permissions. Publishes approved results.",
      "Their school only",
    ],
    [
      "Teacher",
      "Assigned classes, attendance, homework and mark entry.",
      "Assigned learners and subjects",
    ],
    [
      "Student",
      "Own timetable, homework and published results.",
      "Their own permitted records",
    ],
    [
      "Parent / Guardian",
      "Linked children’s attendance, homework, results and fee balances.",
      "Verified child relationships",
    ],
  ];
  return (
    <>
      <PageHeading
        eyebrow="TRUST BY DESIGN"
        title="The right access, for everyone"
        description="Roles define capabilities. School membership and relationships define the boundaries."
      />
      <PreviewNotice />
      <section className="content-panel">
        <div className="section-heading">
          <h2>Four school-facing roles</h2>
          <span className="phase-tag">Planned permissions</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Purpose</th>
                <th>Access boundary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([role, purpose, boundary]) => (
                <tr key={role}>
                  <th scope="row">{role}</th>
                  <td>{purpose}</td>
                  <td>
                    <span className="boundary">
                      <LockKeyhole size={13} />
                      {boundary}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-footnote">
          Academic and finance permissions will be implemented with their
          modules. Current database policies cover the foundation only.
        </p>
      </section>
      <section className="content-panel">
        <h2>Results have a clear path</h2>
        <div className="approval-flow">
          {[
            "Teacher enters marks",
            "Authorized person reviews",
            "School Admin publishes",
            "Learner / guardian views",
          ].map((step, i) => (
            <div key={step}>
              <span>{i + 1}</span>
              <strong>{step}</strong>
              {i < 3 && <ArrowRight size={18} />}
            </div>
          ))}
        </div>
        <p className="muted">
          Review is a permission for designated staff. Whether an administrator
          can also review will be agreed before the marks module is built.
        </p>
      </section>
      <div className="quiet-note">
        <ShieldCheck size={21} />
        <p>
          <strong>No public registration or role switching.</strong> Accounts
          are provisioned for the school. A future Platform Super Admin is
          outside this first-school foundation.
        </p>
      </div>
    </>
  );
}

export function SettingsPreview() {
  return (
    <>
      <PageHeading
        eyebrow="SCHOOL IDENTITY"
        title="Make this space your own"
        description="A dedicated profile for the school, without hard-coded branding or academic rules."
      />
      <PreviewNotice />
      <section className="content-panel settings-preview">
        <div className="section-heading">
          <h2>School profile</h2>
          <span className="phase-tag">Read-only preview</span>
        </div>
        <div className="school-profile-heading">
          <span className="large-monogram">
            <GraduationCap size={31} />
          </span>
          <div>
            <h3>Your school</h3>
            <p className="muted">
              A name and identity will be added during setup.
            </p>
          </div>
        </div>
        <dl className="settings-list">
          <div>
            <dt>School name</dt>
            <dd>Not configured</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>
              Africa/Johannesburg{" "}
              <span className="muted">· proposed default</span>
            </dd>
          </div>
          <div>
            <dt>School ownership</dt>
            <dd>One dedicated school record</dd>
          </div>
          <div>
            <dt>Document format</dt>
            <dd>PDF only</dd>
          </div>
          <div>
            <dt>Homework</dt>
            <dd>View instructions and resources · no submissions</dd>
          </div>
          <div>
            <dt>Notifications</dt>
            <dd>Channels to be selected later</dd>
          </div>
        </dl>
        <Link href="/preview?view=setup" className="button primary">
          Review setup steps <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}

export function SetupGuide() {
  const steps = [
    [
      "Create a dedicated backend",
      "Create a new Supabase project for School Portal. Keep its resources separate from every other project.",
    ],
    [
      "Apply the foundation migration",
      "Use the reviewed migration to create schools, profiles, memberships, roles and access policies.",
    ],
    [
      "Provision the first administrator",
      "Create a confirmed test account, then provision its profile, school membership and School Admin role.",
    ],
    [
      "Configure this local application",
      "Add the project URL, publishable key and school ID to .env.local. Never add a service-role or secret key.",
    ],
    [
      "Verify the connected experience",
      "Restart the app and test login, sign-out, school settings and denied access before adding school records.",
    ],
  ];
  return (
    <>
      <PageHeading
        eyebrow="A CAREFUL FIRST STEP"
        title="Prepare your school"
        description="The local foundation is ready to explore. A dedicated backend is the next connection."
      />
      <div className="setup-layout">
        <section className="content-panel">
          <div className="section-heading">
            <h2>Connection checklist</h2>
            <span className="phase-tag">Not connected</span>
          </div>
          <ol className="setup-list">
            {steps.map(([title, body], i) => (
              <li key={title}>
                <span className="setup-number">{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <aside className="setup-aside">
          <ShieldCheck size={30} strokeWidth={1.5} />
          <h2>Keep the first steps safe.</h2>
          <p>
            Use fictional people until access and recovery have been verified.
          </p>
          <ul>
            <li>
              <Check size={16} /> A separate School Portal project
            </li>
            <li>
              <Check size={16} /> No secrets in the repository
            </li>
            <li>
              <Check size={16} /> Two fictional schools for policy tests
            </li>
          </ul>
          <p className="small">
            Detailed instructions are included in the project’s README and
            docs/SUPABASE_SETUP.md.
          </p>
          <Link href="/login" className="button secondary">
            View sign-in <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}
