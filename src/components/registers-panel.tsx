import Link from "next/link";
import { loadRegisters } from "@/lib/register-data";
import { listPage, maxListPage } from "@/lib/list-pagination";
import {
  registerPageHref,
  type RegisterList,
  type RegisterPageParams,
} from "@/lib/register-pagination";
import {
  classLabel,
  personLabels,
  type PersonKind,
  type PersonRow,
} from "@/lib/register-validation";
import { PersonForm, RelationshipForm } from "./register-forms";
import { RecordEditor } from "./record-editor";
import { GuardianAccess } from "./guardian-access";
import { memberLabel } from "@/lib/member-label";
import { LoginLink } from "./login-link";
import { linkRoleFor } from "@/lib/link-validation";
import { EnrollmentEditor } from "./enrollment-editor";

export async function RegistersPanel({
  schoolId,
  pages = {},
}: {
  schoolId: string;
  pages?: RegisterPageParams;
}) {
  const data = await loadRegisters(schoolId, pages);
  if (!data)
    return (
      <section className="content-panel">
        <h2>School registers are unavailable.</h2>
        <p className="muted">
          If this is your first visit, apply the register migration 004, record
          correction migration 007 and register-link migration 010 to School
          Portal. Otherwise check your access and connection, then reload.
        </p>
      </section>
    );
  const {
    records: people,
    labels,
    members,
    hasNext,
  } = data;
  const links = people.student_guardians;
  const enrollments = people.enrollments;
  const navigation = (kind: RegisterList, label: string) => {
    const page = listPage(pages[`${kind}Page`]);
    return (
      <nav
        aria-label={`${label} pages`}
        className="flex flex-wrap items-center gap-3 py-4"
      >
        <span className="muted">Page {page}</span>
        {page > 1 && (
          <>
            <Link prefetch={false} href={registerPageHref(pages, kind, 1)}>
              First page
            </Link>
            <Link
              prefetch={false}
              href={registerPageHref(pages, kind, page - 1)}
            >
              Previous
            </Link>
          </>
        )}
        {hasNext[kind] && page < maxListPage && (
          <Link prefetch={false} href={registerPageHref(pages, kind, page + 1)}>
            Next
          </Link>
        )}
        {hasNext[kind] && page === maxListPage && (
          <span>Page limit reached. Contact the maintainer.</span>
        )}
      </nav>
    );
  };
  const currentChoice = (kind: PersonKind, membershipId: string | null | undefined) => {
    if (!membershipId) return null;
    const member = members.find((m) => m.id === membershipId);
    return {
      id: membershipId,
      label: member ? memberLabel(member) : "Existing login unavailable - unlink deliberately or reload",
      disabled: !member || member.status !== "active" || !member.roles.includes(linkRoleFor[kind]),
    };
  };
  const personName = (rows: PersonRow[], id: string) => {
    const row = rows.find((r) => r.id === id);
    return row ? `${row.full_name} · ${row.reference}` : "Record unavailable";
  };
  return (
    <>
      <div className="quiet-note">
        <p>
          School records are separate from sign-in accounts. Adding a person or
          relationship here sends no email and grants no portal access; use
          “Link sign-in” on a record to let that person read their own
          information. You can correct names and references, and transfer or
          withdraw enrollments while keeping their history on. Guardian child
          access must be explicitly granted below; relationship records alone
          grant no access. Use fictional records while testing.
        </p>
      </div>
      <div className="academic-grid">
        {(Object.keys(personLabels) as PersonKind[]).map((kind) => (
          <section className="content-panel" key={kind} id={kind}>
            <h2>{personLabels[kind].title}</h2>
            <ul className="academic-list">
              {people[kind].map((p) => (
                <li key={p.id}>
                  <strong>{p.full_name}</strong>
                  <span>
                    {personLabels[kind].reference}: {p.reference}
                  </span>
                  <RecordEditor
                    kind={kind}
                    id={p.id}
                    version={p.record_version}
                    name={p.full_name}
                    label={`${personLabels[kind].singular} full name`}
                    reference={p.reference}
                    referenceLabel={personLabels[kind].reference}
                  />
                  <LoginLink
                    key={`${p.id}-${p.record_version}`}
                    kind={kind}
                    id={p.id}
                    version={p.record_version ?? 1}
                    currentMembershipId={p.membership_id ?? null}
                    currentChoice={currentChoice(kind, p.membership_id)}
                  />
                </li>
              ))}
            </ul>
            {!people[kind].length && (
              <p className="muted">
                {listPage(pages[`${kind}Page`]) === 1
                  ? `No ${personLabels[kind].title.toLowerCase()} added yet.`
                  : "No records on this page. Return to an earlier page."}
              </p>
            )}
            {navigation(kind, personLabels[kind].title)}
            <PersonForm kind={kind} />
          </section>
        ))}
        <section className="content-panel" id="student_guardians">
          <h2>Guardian links</h2>
          <ul className="academic-list">
            {links.map((l) => (
              <li key={l.id}>
                <strong>{personName(labels.students, l.student_id)}</strong>
                <span>
                  {personName(labels.guardians, l.guardian_id)} ·{" "}
                  {l.relationship}
                </span>
                <GuardianAccess
                  key={`${l.id}-${l.record_version}`}
                  id={l.id}
                  version={l.record_version}
                  enabled={l.access_enabled}
                />
              </li>
            ))}
          </ul>
          {!links.length && (
            <p className="muted">
              {listPage(pages.student_guardiansPage) === 1
                ? "No guardians linked yet."
                : "No links on this page. Return to an earlier page."}
            </p>
          )}
          {navigation("student_guardians", "Guardian links")}
          <RelationshipForm enrollment={false} />
        </section>
        <section className="content-panel" id="enrollments">
          <h2>Class enrollment</h2>
          <ul className="academic-list">
            {enrollments.map((e) => {
              const c = labels.classes.find((c) => c.id === e.class_id);
              return (
                <li key={e.id}>
                  <strong>{personName(labels.students, e.student_id)}</strong>
                  <span>{c ? classLabel(c, labels) : "Class unavailable"}</span>
                  <span>
                    {e.starts_on} – {e.ends_on}
                  </span>
                  <EnrollmentEditor
                    key={`${e.id}-${e.record_version}`}
                    row={e}
                  />
                </li>
              );
            })}
          </ul>
          {!enrollments.length && (
            <p className="muted">
              {listPage(pages.enrollmentsPage) === 1
                ? "No students enrolled yet."
                : "No enrollments on this page. Return to an earlier page."}
            </p>
          )}
          {navigation("enrollments", "Class enrollment")}
          <RelationshipForm enrollment />
        </section>
      </div>
    </>
  );
}
