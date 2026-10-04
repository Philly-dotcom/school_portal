import { createClient } from "@supabase/supabase-js";

type Settings = {
  enabled: boolean;
  url: string;
  anonKey: string;
  serviceKey: string;
  siteUrl: string;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function reply(status: number, message: string) {
  return Response.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

// Separate Supabase-hosted privilege boundary. Never import this module into Next.js.
export async function handleInvitation(request: Request, settings: Settings) {
  if (request.method !== "POST") return reply(405, "POST required.");
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return reply(401, "Sign in required.");
  if (
    !settings.enabled ||
    !settings.url ||
    !settings.anonKey ||
    !settings.serviceKey ||
    !settings.siteUrl
  )
    return reply(503, "Invitation delivery is not configured.");
  let origin: URL;
  try {
    origin = new URL(settings.siteUrl);
    if (
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      (origin.protocol !== "https:" &&
        !(
          origin.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(origin.hostname)
        ))
    )
      throw new Error();
  } catch {
    return reply(503, "Invitation delivery is not configured.");
  }
  let input: { schoolId?: unknown; invitationId?: unknown };
  try {
    const body = await request.text();
    if (body.length > 2048) return reply(413, "Request too large.");
    input = JSON.parse(body);
    if (!input || typeof input !== "object") throw new Error();
  } catch {
    return reply(400, "Invalid invitation request.");
  }
  if (
    typeof input.schoolId !== "string" ||
    typeof input.invitationId !== "string" ||
    !uuid.test(input.schoolId) ||
    !uuid.test(input.invitationId)
  )
    return reply(400, "Invalid invitation request.");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  try {
    const caller = createClient(settings.url, settings.anonKey, {
      ...options,
      global: { headers: { Authorization: authorization } },
    });
    const {
      data: { user },
      error,
    } = await caller.auth.getUser(authorization.slice(7));
    if (error || !user) return reply(401, "Sign in required.");
    // SQL rechecks active admin membership and claims exactly one pending request.
    const { data, error: claimError } = await caller.rpc(
      "claim_school_invitation",
      { target_school: input.schoolId, target_invitation: input.invitationId },
    );
    if (claimError || !Array.isArray(data) || data.length !== 1)
      return reply(403, "Invitation unavailable or already processed.");
    const claim = data[0] as { email: string; claim_id: string };
    const service = createClient(settings.url, settings.serviceKey, options);
    let sent: boolean | null = null;
    try {
      const result = await service.auth.admin.inviteUserByEmail(claim.email, {
        redirectTo: `${origin.origin}/account/password?flow=invite`,
      });
      sent = result.error
        ? result.error.status &&
          result.error.status < 500 &&
          result.error.name !== "AuthRetryableFetchError"
          ? false
          : null
        : true;
    } catch {
      /* Ambiguous provider failures require operator review, not automatic resend. */
    }
    const { error: finishError } = await service.rpc(
      "complete_school_invitation_delivery",
      {
        target_invitation: input.invitationId,
        claim: claim.claim_id,
        succeeded: sent,
      },
    );
    if (finishError)
      return reply(
        503,
        "Delivery status needs administrator review. Do not resend automatically.",
      );
    if (sent === null)
      return reply(
        502,
        "Delivery outcome is unknown. Check provider logs before allowing a retry.",
      );
    if (!sent)
      return reply(
        502,
        "The provider could not accept the invitation. Check email configuration or invite an existing account through the documented workflow.",
      );
    return reply(
      200,
      "Invitation accepted by the email provider. Inbox delivery is not yet confirmed.",
    );
  } catch {
    return reply(
      503,
      "Invitation service temporarily unavailable. Check its recorded status before retrying.",
    );
  }
}
