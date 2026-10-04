export const invitationPageSize = 50;
export function invitationPage(value?: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= 100000 ? number : 1;
}
export function invitationPageHref(page: number) {
  return `/dashboard?view=people&invitationPage=${page}`;
}
