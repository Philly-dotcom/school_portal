import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  academicLabels,
  type AcademicKind,
  type AcademicRow,
} from "@/lib/academic-validation";
import { AcademicForm } from "./academic-form";
import { RecordEditor } from "./record-editor";
import {
  academicPage,
  academicPageHref,
  academicPageSize,
  type AcademicPageParams,
} from "@/lib/academic-pagination";

export async function AcademicPanel({
  schoolId,
  pages = {},
}: {
  schoolId: string;
  pages?: AcademicPageParams;
}) {
  const client = await createClient();
  const kinds = Object.keys(academicLabels) as AcademicKind[];
  const results = await Promise.all(
    kinds.map((kind) =>
      client
        .from(kind)
        .select("*")
        .eq("school_id", schoolId)
        .order("name")
        .order("id")
        .range(
          (academicPage(pages[`${kind}Page`]) - 1) * academicPageSize,
          academicPage(pages[`${kind}Page`]) * academicPageSize,
        ),
    ),
  );
  const records = Object.fromEntries(
    kinds.map((kind, i) => [
      kind,
      (results[i].data ?? []).slice(0, academicPageSize),
    ]),
  ) as Record<AcademicKind, AcademicRow[]>;
  // Look up labels for the visible rows, including references beyond the
  // dropdown capacity. Every lookup still uses the signed-in user's school.
  const labels = await Promise.all(
    (["academic_years", "grades"] as const).map(async (kind) => {
      const field = kind === "academic_years" ? "academic_year_id" : "grade_id";
      const ids = [
        ...new Set(
          Object.values(records)
            .flat()
            .flatMap((row) => (row[field] ? [row[field]] : [])),
        ),
      ];
      if (!ids.length) return { data: [], error: null };
      return client
        .from(kind)
        .select("id,name")
        .eq("school_id", schoolId)
        .in("id", ids);
    }),
  );
  if ([...results, ...labels].some((r) => r.error))
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
        {kinds.map((kind, index) => {
          const page = academicPage(pages[`${kind}Page`]);
          const hasNext = (results[index].data?.length ?? 0) > academicPageSize;
          return (
            <section className="content-panel" key={kind} id={kind}>
              <h2>{academicLabels[kind]}</h2>
              <ul className="academic-list">
                {records[kind].map((row) => (
                  <li key={row.id}>
                    <strong>{row.name}</strong>
                    {row.academic_year_id && (
                      <span>
                        {labels[0].data?.find(
                          (y) => y.id === row.academic_year_id,
                        )?.name ?? "Year unavailable"}
                      </span>
                    )}
                    {row.grade_id && (
                      <span>
                        {labels[1].data?.find((g) => g.id === row.grade_id)
                          ?.name ?? "Grade unavailable"}
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
              {!records[kind].length && (
                <p className="muted">
                  {page === 1
                    ? "No records yet."
                    : "No records on this page. Return to an earlier page."}
                </p>
              )}
              <nav
                aria-label={`${academicLabels[kind]} pages`}
                className="flex flex-wrap items-center gap-3 py-4"
              >
                <span className="muted">Page {page}</span>
                {page > 1 && (
                  <>
                    <Link
                      href={academicPageHref(pages, kind, 1)}
                      prefetch={false}
                    >
                      First page
                    </Link>
                    <Link
                      href={academicPageHref(pages, kind, page - 1)}
                      prefetch={false}
                    >
                      Previous
                    </Link>
                  </>
                )}
                {hasNext && (
                  <Link
                    href={academicPageHref(pages, kind, page + 1)}
                    prefetch={false}
                  >
                    Next
                  </Link>
                )}
              </nav>
              <AcademicForm kind={kind} />
            </section>
          );
        })}
      </div>
    </>
  );
}
