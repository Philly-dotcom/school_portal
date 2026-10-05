import { z } from "zod";
import { listPage } from "./list-pagination";

export type PlanningPageParams = {
  teachingPage?: string | string[];
  timetablePage?: string | string[];
  assignment?: string | string[];
};
export function timetableFilter(value?: string | string[]) {
  if (value === undefined || value === "")
    return { valid: true as const, id: "" };
  const result = z.uuid().safeParse(value);
  return result.success
    ? { valid: true as const, id: result.data }
    : { valid: false as const, id: "" };
}
export function planningPageHref(
  view: "teaching" | "timetable",
  page: number,
  assignment = "",
) {
  const query = new URLSearchParams({ view });
  const safePage = listPage(String(page));
  if (safePage > 1) query.set(`${view}Page`, String(safePage));
  const filter = timetableFilter(assignment);
  if (view === "timetable" && filter.valid && filter.id)
    query.set("assignment", filter.id);
  return `/dashboard?${query.toString()}#${view}`;
}
