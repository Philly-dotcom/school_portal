# School Portal

This project is isolated at C:\Users\moses\Documents\School_portal. Never import other projects' files, credentials, schemas, business rules, or assumptions.

## Product decisions
- Single-school experience first. School-aware ownership, memberships and access boundaries from day one. Multi-school SaaS administration is future scope.
- Roles: school_admin, teacher, student, guardian. Multiple roles per membership are allowed. No platform super-admin UI in Version 1.
- An authorized reviewer approves results; only School Admin publishes. Changed approved marks will require re-review (proposed rule to confirm before Phase 4).
- Homework is view-only for learners. No submissions. PDF documents only; exact role upload policy must be confirmed before implementation.
- Notification channels are undecided; invitations/recovery delivery must be settled before live accounts.
- Never make preview content look like live school data. /preview is public, static, and contains no backend data or authorization bypass.

## Engineering
- Next.js App Router, TypeScript, Tailwind, Supabase PostgreSQL/Auth/Storage.
- Use server-verified identity, active school membership and role permissions. Never authorize from user-editable metadata or UI role switches.
- Keep elevated Supabase credentials out of the app. Normal requests use the user's database context and RLS.
- Commit schema changes as SQL migrations. Test denied reads AND writes with two synthetic schools.
- No real school data in tests, screenshots, previews or logs. Do not log credentials.
- Run npm run check for foundation changes. Supabase connectivity and live email remain unverified until explicitly configured and tested.
- Do not deploy publicly, create cloud resources, or modify other projects without authorization. No delegated agents unless explicitly requested.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
