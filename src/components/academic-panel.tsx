import { createClient } from "@/lib/supabase/server";
import {
  academicLabels,
  type AcademicKind,
  type AcademicRow,
} from "@/lib/academic-validation";
import { AcademicForm } from "./academic-form";
import { RecordEditor } from "./record-editor";

export async function AcademicPanel({ schoolId }: { schoolId: string }) {
  const client = await createClient();
  const kinds = Object.keys(academicLabels) as AcademicKind[];
  const results = await Promise.all(
    kinds.map((kind) =>
      client
        .from(kind)
        .select("*")
        .eq("school_id", schoolId)
        .order("name")
        .limit(500),
    ),
  );
  if (results.some((r) => r.error))
    return (
      <section className="content-panel">
        <h2>Academic setup is unavailable.</h2>
        <p className="muted">
          If this is your first visit, apply migration
          202610010003_academic_structure.sql to the dedicated School Portal
          project. Otherwise check your access and connection, then reload.
        </p>
      </section>
    );
  const records = Object.fromEntries(
    kinds.map((kind, i) => [kind, results[i].data ?? []]),
  ) as Record<AcademicKind, AcademicRow[]>;
  const years = records.academic_years;
  const grades = records.grades;
  return (
    <>
      <div className="quiet-note">
        <p>
          Create years and grades before classes. Terms must fall within their
          year. You can create records and correct their names. Dates and class
          relationships stay unchanged when correcting a name. No login accounts
          or emails are created here.
        </p>
      </div>
      <div className="academic-grid">
        {kinds.map((kind) => (
          <section className="content-panel" key={kind}>
            <h2>{academicLabels[kind]}</h2>
            <ul className="academic-list">
              {records[kind].map((row) => (
                <li key={row.id}>
                  <strong>{row.name}</strong>
                  {row.academic_year_id && (
                    <span>
                      {years.find((y) => y.id === row.academic_year_id)?.name ??
                        "Year unavailable"}
                    </span>
                  )}
                  {row.grade_id && (
                    <span>
                      {grades.find((g) => g.id === row.grade_id)?.name ??
                        "Grade unavailable"}
                    </span>
                  )}
                  {row.starts_on && (
                    <span>
                      {row.starts_on} – {row.ends_on}
                    </span>
                  )}
                  <RecordEditor
                    kind={kind}
                    id={row.id}
                    version={row.record_version}
                    name={row.name}
                    label={
                      {
                        academic_years: "Academic year name",
                        academic_terms: "Term name",
                        grades: "Grade name",
                        subjects: "Subject name",
                        classes: "Class name",
                      }[kind]
                    }
                  />
                </li>
              ))}
            </ul>
            {!records[kind].length && <p className="muted">No records yet.</p>}
            {records[kind].length === 500 ? (
              <p className="muted">
                Showing the first 500 records. Contact the maintainer before
                adding more; full pagination is needed.
              </p>
            ) : (
              <AcademicForm kind={kind} years={years} grades={grades} />
            )}
          </section>
        ))}
      </div>
    </>
  );
}
