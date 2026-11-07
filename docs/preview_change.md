# Campus preview page change

**Status:** implemented on `experiment/ui-ux` · 7 November 2026
**Scope:** presentation only for `/preview`. Content, destinations and the disconnected preview boundary are unchanged.

## Why

The public preview now uses its own Campus shell instead of the dashboard sidebar. It keeps the existing preview content while giving the page the same blue/teal, rounded-card visual language as the signed-in Teacher, Student and Guardian dashboards.

It remains public, static and disconnected from school records.

## Files

| File | Change |
| --- | --- |
| [`src/components/campus-preview-shell.tsx`](../src/components/campus-preview-shell.tsx) | New header, preview badge, navigation, sign-in link and footer |
| [`src/app/campus-preview.css`](../src/app/campus-preview.css) | New scoped preview palette, banner, cards and responsive rules |
| [`src/app/preview/page.tsx`](../src/app/preview/page.tsx) | Uses `CampusPreviewShell` instead of `PortalShell` |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Imports `campus-preview.css` |
| [`src/components/preview-content.tsx`](../src/components/preview-content.tsx) | Moves “Start with the essentials” above the foundation feature cards and removes the old `overview-grid` wrapper |
| [`tests/preview-page.test.ts`](../tests/preview-page.test.ts) | New shell/order/active-view regression test |

`PortalShell`, `Brand`, `PageHeading` and `PreviewNotice` remain in place. `Brand` is still used by account pages; `PageHeading` and `PreviewNotice` are still used by the preview content.

## Layout

| Area | Desktop | Mobile |
| --- | --- | --- |
| Header | Logo left; Preview mode badge and School sign-in right | Wraps; sign-in remains visible |
| Navigation | Overview, School workspace, Roles & access, School settings, Setup guide | Wraps onto additional lines |
| Heading | Existing School overview heading and description | Smaller title |
| Notice | Existing preview notice | Wrapped |
| Banner | Blue-to-teal gradient; copy left, existing illustration right; yellow CTA | Copy and full-width CTA; illustration hidden |
| Shortcuts | Three colourful cards in one row | One per row |
| Foundation features | Three small white cards | Stacked |
| Roadmap | Six phases in a three-column grid | Stacked |
| Footer | Brand plus preview/privacy wording | Wrapped |

### Reading order

The DOM and visual order now match:

1. Heading
2. Preview notice
3. Welcome banner
4. Start with the essentials
5. Foundation features
6. The path ahead

No copy, link, phase, status or destination changed. Only the section order and the removed `overview-grid` wrapper changed.

## Destinations preserved

| Control | Destination |
| --- | --- |
| Logo / Overview | `/preview` |
| School workspace | `/preview?view=modules` |
| Roles & access | `/preview?view=access` |
| School settings | `/preview?view=settings` |
| Setup guide / Prepare your school | `/preview?view=setup` |
| School sign-in | `/login` |

The view whitelist still falls back to Overview for an unknown `view`.

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| `--cp-bg` | `oklch(0.97 0.01 230)` | Page background |
| `--cp-blue` | `oklch(0.52 0.15 240)` | Header action, links, banner |
| `--cp-blue-light` | `oklch(0.93 0.04 235)` | Badges, icons, active navigation |
| `--cp-yellow` | `oklch(0.86 0.15 88)` | Banner CTA |
| `--cp-orange` / `--cp-purple` / `--cp-green` | Campus tile colours | Starter cards |
| `--cp-border` | `oklch(0.91 0.014 230)` | Cards and dividers |

The preview uses a system-font stack that prefers DM Sans/Space Grotesk when installed, with Segoe UI/system-ui fallbacks. No webfont is downloaded at build time.

## Accessibility and responsiveness

- Skip link to `#preview-main`.
- `aria-current="page"` on the active preview navigation item.
- Visible `:focus-visible` outlines; white outline on the gradient banner.
- Existing `PageHeading`, `PreviewNotice` and section headings are retained in document order.
- Starter cards are links with visible text; the decorative chevron is hidden.
- 44px minimum targets for navigation, sign-in and starter links.
- The access table scrolls inside `.table-wrap`, not the page.
- Mobile: one-column content, hidden illustration, full-width CTA, wrapped navigation and footer.
- Reduced-motion rules remove hover movement and transitions.

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Pass |
| `npx eslint .` | Pass |
| Full Vitest suite | **690 tests in 62 files passed** |
| Next/Turbopack compile | Compiled successfully |
| Browser walkthrough | Not performed by the agent; no browser control in this session |

The new test checks the Campus shell, all five destinations, active navigation, the overview section order, the removed wrapper and unknown-view fallback.

## Known limits

- Exact Campus webfonts are not bundled; system fallbacks are used.
- The preview still uses the existing content, including phase/status wording. This change does not edit that content.
- Visual checks at 1440, 1024, 768, 390 and 360px, and at 200% zoom, still need a human browser pass.
- Inner preview pages were restyled through scoped overrides; any remaining hard-coded colours should be checked visually.

## Reviewing it

```powershell
npm run dev
```

Open `/preview` and each `?view=` destination. Check the active navigation item, banner CTA, shortcut links, sign-in link, mobile wrapping and the access table’s own scroll container. Also confirm the signed-in dashboard and sign-in page are unaffected.

## Reverting

- Delete `campus-preview-shell.tsx` and `campus-preview.css`.
- Restore `preview/page.tsx` to use `PortalShell`.
- Remove the stylesheet import from `layout.tsx`.
- Restore the previous Overview section order in `preview-content.tsx`.
- Delete `tests/preview-page.test.ts`.

No database or hosted configuration changes are involved.
