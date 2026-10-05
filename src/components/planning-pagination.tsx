import Link from "next/link";
import { maxListPage } from "@/lib/list-pagination";
import { planningPageHref } from "@/lib/planning-pagination";

export function PlanningPagination({
  view,
  page,
  hasNext,
  assignment = "",
}: {
  view: "teaching" | "timetable";
  page: number;
  hasNext: boolean;
  assignment?: string;
}) {
  return (
    <nav
      aria-label={`${view === "teaching" ? "Teaching assignment" : "Timetable"} pages`}
      className="flex flex-wrap items-center gap-3 py-4"
    >
      <span className="muted">Page {page} · up to 50 records</span>
      {page > 1 && (
        <>
          <Link prefetch={false} href={planningPageHref(view, 1, assignment)}>
            First page
          </Link>
          <Link
            prefetch={false}
            href={planningPageHref(view, page - 1, assignment)}
          >
            Previous
          </Link>
        </>
      )}
      {hasNext && page < maxListPage && (
        <Link
          prefetch={false}
          href={planningPageHref(view, page + 1, assignment)}
        >
          Next
        </Link>
      )}
      {hasNext && page === maxListPage && (
        <span>Page limit reached. Contact the maintainer.</span>
      )}
    </nav>
  );
}
