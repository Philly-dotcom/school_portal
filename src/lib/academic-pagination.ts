import { academicLabels, type AcademicKind } from "./academic-validation";
import { listPageHref } from "./list-pagination";
export {
  listPage as academicPage,
  listPageSize as academicPageSize,
} from "./list-pagination";

export type AcademicPageParams = Partial<
  Record<`${AcademicKind}Page`, string | string[]>
>;

export function academicPageHref(
  params: AcademicPageParams,
  kind: AcademicKind,
  page: number,
): string {
  return listPageHref<AcademicKind>(
    "academic",
    Object.keys(academicLabels) as AcademicKind[],
    params,
    kind,
    page,
  );
}
