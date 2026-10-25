import { loadAdminProfile, loadTeacherProfile } from "@/lib/staff-profile-data";

function ProfileUnavailable() {
  return (
    <p className="quiet-note" role="status" style={{ marginTop: 24 }}>
      Your profile could not be loaded. Please reload and try again.
    </p>
  );
}

export async function TeacherProfile({
  read,
}: { read?: Parameters<typeof loadTeacherProfile>[0] } = {}) {
  const profile = await loadTeacherProfile(read);
  if (profile.status !== "ready") return <ProfileUnavailable />;
  return (
    <div style={{ marginTop: 24 }}>
      <h3>My profile</h3>
      <dl className="grid gap-3 sm:grid-cols-3" style={{ marginTop: 12 }}>
        <div>
          <dt className="muted">Full name</dt>
          <dd>{profile.person.fullName}</dd>
        </div>
        <div>
          <dt className="muted">Teacher reference</dt>
          <dd>{profile.person.reference}</dd>
        </div>
        <div>
          <dt className="muted">School</dt>
          <dd>{profile.schoolName}</dd>
        </div>
      </dl>
      <h3 style={{ marginTop: 24 }}>Linked subjects</h3>
      {profile.subjects.length ? (
        <ul className="grid gap-2" style={{ marginTop: 12 }}>
          {profile.subjects.map((subject, index) => (
            <li key={index}>
              <strong>{subject.name}</strong> · Academic year:{" "}
              {subject.academicYear} · {subject.period}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ marginTop: 12 }}>
          No subjects are linked through teaching assignments yet. Ask your
          School Admin to check your assignments.
        </p>
      )}
    </div>
  );
}

export async function AdminProfile({
  context,
  dashboard = false,
  detailsOnly = false,
  headingOnly = false,
  profileRead,
}: {
  context?: Parameters<typeof loadAdminProfile>[0];
  dashboard?: boolean;
  detailsOnly?: boolean;
  headingOnly?: boolean;
  profileRead?: ReturnType<typeof loadAdminProfile>;
} = {}) {
  const profile = await (profileRead ?? loadAdminProfile(context));
  const details =
    profile.status !== "ready" ? (
      <ProfileUnavailable />
    ) : (
      <dl className="admin-profile-fields">
        <div>
          <dt>Full name</dt>
          <dd>{profile.fullName}</dd>
        </div>
        <div>
          <dt>Admin reference (school membership ID)</dt>
          <dd>{profile.reference}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{profile.email}</dd>
        </div>
        <div>
          <dt>School</dt>
          <dd>{profile.schoolName}</dd>
        </div>
      </dl>
    );
  if (detailsOnly) return details;
  return (
    <section
      className={dashboard ? "admin-overview-heading" : "content-panel"}
      style={{ marginBottom: 24 }}
    >
      {dashboard && (
        <>
          <p className="eyebrow">SCHOOL ADMINISTRATION</p>
          <h1>
            {profile.status === "ready" &&
            profile.fullName !== "Name not recorded"
              ? `Welcome back, ${profile.fullName}`
              : "Your school overview"}
          </h1>
          <p className="muted">
            {context?.school.name} · Your school at a glance
          </p>
        </>
      )}
      {!headingOnly && (
        <details className="admin-profile-disclosure" open={!dashboard}>
          <summary>My profile</summary>
          {details}
        </details>
      )}
    </section>
  );
}
