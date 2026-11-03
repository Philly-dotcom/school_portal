import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  marksHref,
  rosterDifference,
  type RosterDifference,
} from "@/lib/marks-validation";
import { AmendmentForm } from "./roster-amendment-form";

export async function RosterAmendmentPanel({
  school,
  id,
  page,
}: {
  school: string;
  id: string;
  page: number;
}) {
  const link = (p: number) =>
    marksHref("school_admin", id, p) + "&rosterChanges=1";
  let rows: RosterDifference[] | undefined;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("preview_roster_amendments", {
      target_school: school,
      target_assessment: id,
      page_number: page,
    });
    if (!error) rows = rosterDifference.array().max(26).safeParse(data).data;
  } catch {
    /* Show the same retry message on a transport failure. */
  }
  return (
    <section className="content-panel">
      <Link href={marksHref("school_admin", id)}>Back to draft marks</Link>
      <h2>Review roster changes</h2>
      <p>
        Compare frozen placements with enrolments on the assessment date. Choose
        which learner to update.
      </p>
      {!rows && (
        <p role="alert">
          Could not load the comparison. Reload and check your access.
        </p>
      )}
      {rows?.length === 0 && <p>No placement differences on this page.</p>}
      {rows?.slice(0, 25).map((row) => (
        <AmendmentForm
          key={row.learner_id + ":" + row.revision}
          id={id}
          row={row}
        />
      ))}
      <nav aria-label="Placement differences">
        {page > 1 && <Link href={link(page - 1)}>Previous differences</Link>}{" "}
        {rows && rows.length > 25 && (
          <Link href={link(page + 1)}>Next differences</Link>
        )}
      </nav>
    </section>
  );
}
