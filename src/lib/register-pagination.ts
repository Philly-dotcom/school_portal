import { listPageHref } from "./list-pagination";

export const registerLists = [
  "students",
  "teachers",
  "guardians",
  "student_guardians",
  "enrollments",
] as const;
export type RegisterList = (typeof registerLists)[number];
export type RegisterPageParams = Partial<
  Record<`${RegisterList}Page`, string | string[]>
>;
export function registerPageHref(
  params: RegisterPageParams,
  kind: RegisterList,
  page: number,
) {
  return listPageHref<RegisterList>(
    "registers",
    registerLists,
    params,
    kind,
    page,
  );
}
