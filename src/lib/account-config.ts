import "server-only";
import { isPortalConfigured } from "./config";
import { validatedSiteOrigin } from "./account-validation";

export function siteOrigin() {
  return validatedSiteOrigin(process.env.SCHOOL_PORTAL_SITE_URL);
}
export function emailFlowsEnabled() {
  return (
    isPortalConfigured() &&
    Boolean(siteOrigin()) &&
    process.env.SCHOOL_PORTAL_EMAIL_ENABLED === "true"
  );
}
export function invitationDeliveryEnabled() {
  return (
    emailFlowsEnabled() &&
    process.env.SCHOOL_PORTAL_INVITATIONS_ENABLED === "true"
  );
}
