export const listPageSize = 50;
export const maxListPage = 100_000;

export function listPage(value?: string | string[]): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= maxListPage ? page : 1;
}

export function listPageHref<K extends string>(
  view: string,
  kinds: readonly K[],
  params: Partial<Record<`${K}Page`, string | string[]>>,
  kind: K,
  page: number,
): string {
  const query = new URLSearchParams({ view });
  for (const key of kinds) {
    const value = listPage(key === kind ? String(page) : params[`${key}Page`]);
    if (value > 1) query.set(`${key}Page`, String(value));
  }
  return `/dashboard?${query.toString()}#${kind}`;
}
