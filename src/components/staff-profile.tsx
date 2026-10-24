import { loadAdminProfile, loadTeacherProfile } from "@/lib/staff-profile-data";

function ProfileUnavailable() {
  return (
    <p className="quiet-note" role="status" style={{ marginTop: 24 }}>
      Your profile could not be loaded. Please reload and try again.
    </p>
  );
}

export async function TeacherProfile() {
  const profile = await loadTeacherProfile();
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

export async function AdminProfile() {
  const profile = await loadAdminProfile();
  return (
    <section className="content-panel" style={{ marginBottom: 24 }}>
      <h2>My profile</h2>
      {profile.status !== "ready" ? (
        <ProfileUnavailable />
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2" style={{ marginTop: 16 }}>
          <div>
            <dt className="muted">Full name</dt>
            <dd>{profile.fullName}</dd>
          </div>
          <div>
            <dt className="muted">Admin reference (school membership ID)</dt>
            <dd className="break-all">{profile.reference}</dd>
          </div>
          <div>
            <dt className="muted">Email</dt>
            <dd className="break-all">{profile.email}</dd>
          </div>
          <div>
            <dt className="muted">School</dt>
            <dd>{profile.schoolName}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
