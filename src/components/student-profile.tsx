import { loadStudentProfile } from "@/lib/student-profile-data";

export async function StudentProfile() {
  const profile = await loadStudentProfile();
  if (profile.status !== "ready") {
    return (
      <div className="quiet-note" style={{ marginTop: 24 }} role="status">
        Your profile and enrolments could not be loaded. Please reload and try
        again. If this continues, contact your School Admin.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h3>My profile</h3>
      <dl className="grid gap-3 sm:grid-cols-3" style={{ marginTop: 12 }}>
        <div>
          <dt className="muted">Full name</dt>
          <dd>{profile.person.fullName}</dd>
        </div>
        <div>
          <dt className="muted">Student reference</dt>
          <dd>{profile.person.reference}</dd>
        </div>
        <div>
          <dt className="muted">School</dt>
          <dd>{profile.schoolName}</dd>
        </div>
      </dl>
      <p className="small muted" style={{ marginTop: 12 }}>
        Contact your School Admin if these details need correcting.
      </p>
      <h3 style={{ marginTop: 24 }}>My enrolments</h3>
      {!profile.enrollments.length && (
        <p className="muted" style={{ marginTop: 12 }}>
          Your student account is linked, but no enrolment has been recorded.
          Ask your School Admin to check your class placement.
        </p>
      )}
      <div className="grid gap-4" style={{ marginTop: 12 }}>
        {profile.enrollments.map((enrollment) => {
          const period =
            enrollment.starts_on > profile.today
              ? "Upcoming"
              : enrollment.ends_on < profile.today
                ? "Past"
                : "Current";
          return (
            <section key={enrollment.id} className="quiet-note">
              <h4>Academic year: {enrollment.academic_years.name}</h4>
              <p>
                <strong>{period}</strong> · {enrollment.classes.grades.name} ·
                Class {enrollment.classes.name}
              </p>
              <p>
                Enrolment dates:{" "}
                <time dateTime={enrollment.starts_on}>
                  {enrollment.starts_on}
                </time>{" "}
                to{" "}
                <time dateTime={enrollment.ends_on}>{enrollment.ends_on}</time>
              </p>
              {enrollment.closure && (
                <p>
                  {enrollment.closure === "transfer"
                    ? "Transfer recorded"
                    : "Withdrawal recorded"}
                  ; this placement ends on {enrollment.ends_on}.
                </p>
              )}
              {period === "Upcoming" && (
                <p className="small muted">
                  This is a future placement. Daily activities follow the
                  enrolment and assignment dates.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
