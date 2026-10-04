// Content-Security-Policy with a per-request nonce. The app loads nothing from other origins
// (the browser never talks to Supabase; all backend calls happen on the server), so the policy
// can be tight. style-src keeps 'unsafe-inline' because React inline style attributes are used;
// scripts, the dangerous part, are nonce-only.NOTE this came from claude AI as a suggestion after system evaluation. 
export function buildCsp(nonce: string, development = false) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}

export function createNonce() {
  return btoa(crypto.randomUUID());
}
