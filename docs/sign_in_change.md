# Campus sign-in change

**Status:** implemented on `experiment/ui-ux` · 7 November 2026
**Scope:** presentation only for `/login`. Authentication, validation, sessions and redirects are unchanged.

## Why

The sign-in page now uses the Campus visual language: a blue-to-teal brand story on desktop, a calm single-column form on smaller screens, and one clear sign-in action.

The route remains `/login`. No new package, migration or authentication service was added.

## Files

| File | Change |
| --- | --- |
| [`src/app/campus-sign-in.css`](../src/app/campus-sign-in.css) | New, isolated sign-in palette and layout |
| [`src/app/login/page.tsx`](../src/app/login/page.tsx) | Replaced with the Campus brand panel and form layout |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Imports `campus-sign-in.css` |
| [`src/components/login-form.tsx`](../src/components/login-form.tsx) | **Unchanged** — still the real form, errors, pending state and reset link |
| [`src/app/login/actions.ts`](../src/app/login/actions.ts) | **Unchanged** — Supabase sign-in and redirect |

## Layout

### Desktop, 1024px and wider

Two equal columns:

- **Left:** gradient brand panel with a green graduation-cap tile, “School Portal”, the headline **A connected school. A clearer day.**, a supporting sentence, and three feature pills: Every class one place, Teachers/learners/families, School-verified access. A small “One school first” footer sits at the bottom.
- **Right:** “Explore the preview” link, a centred form up to 448px wide, and the privacy strapline.

### Below 1024px

The brand panel is hidden. The form fills one column, remains centred, and the preview link and footer stay available.

### Form content

- Eyebrow: **Your school workspace**
- Heading: **Welcome back.**
- Description: **Sign in with the account provided by your school.**
- Fields: **School account email**, **Password**
- Primary action: **Sign in** with a right arrow; Campus blue, not the dashboard’s yellow CTA.
- Recovery: **Forgot your password?** → `/forgot-password`
- Advice: accounts are provided by the school; contact the school administrator for access.
- Unconfigured backend: setup notice; form controls disabled.

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| `--si-bg` | `oklch(0.97 0.01 230)` | Page background |
| `--si-ink` | `oklch(0.22 0.03 250)` | Text |
| `--si-primary` | `oklch(0.52 0.15 240)` | Links and primary button |
| `--si-muted` | `oklch(0.95 0.012 230)` | Advice panel and disabled fields |
| `--si-muted-ink` | `oklch(0.5 0.03 250)` | Secondary text |
| `--si-border` | `oklch(0.91 0.014 230)` | Input and notice borders |
| `--si-green` | `oklch(0.65 0.15 155)` | Brand tile |

The story gradient runs from `--si-primary` to `oklch(0.62 0.13 215)`. The page uses a system-font stack that prefers DM Sans/Space Grotesk when installed, with Segoe UI/system-ui fallbacks. No webfont is downloaded at build time.

## Accessibility and responsive behaviour

- One `h1` — **Welcome back.** The decorative brand headline is an `h2`.
- Story panel has `aria-label="About School Portal"`; decorative icons are `aria-hidden`.
- Visible `:focus-visible` outlines on links, inputs and the button, including a white outline on the gradient panel.
- Minimum 44px targets for the preview link and recovery link; 46px inputs and 50px primary button.
- Required email/password fields keep native browser validation.
- Existing generic error appears with `role="alert"`; the form becomes usable again.
- Disabled fields/button while pending or unconfigured.
- At 390px and 360px the panel uses 16px gutters; the card heading reduces to 32px.
- The page scrolls on short viewports; no fixed-height clipping.
- Reduced-motion preferences remove transitions and hover transforms.

## Authentication boundary

This change does not touch:

- `signIn` validation, Supabase `signInWithPassword`, error wording or `/dashboard` redirect.
- Session cookies or Supabase Auth configuration.
- Password recovery or invitation flows.
- Role resolution; there is no role selector on the form.

`LoginForm` still uses `useActionState(signIn, …)` and the existing `/forgot-password` link.

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Pass |
| `npx eslint .` | Pass |
| Full Vitest suite | **687 tests in 61 files passed** |
| Next/Turbopack compile | Compiled successfully |
| Signed-in browser walkthrough | Not performed by the agent; no browser control in this session |

The new [`tests/login-page.test.ts`](../tests/login-page.test.ts) renders the page with a mocked backend flag and checks the single heading, labels, preview/reset links, setup notice and disabled state. TypeScript was verified separately because the sandbox blocks Next's post-compile TypeScript worker.

## Known limits

- Exact Campus webfonts are not bundled; system fallbacks are used for offline-safe builds.
- The brand panel is intentionally hidden below 1024px, so mobile shows the form without the large story panel.
- Visual checks at 1440, 1024, 768, 390 and 360px, plus 200% zoom and an on-screen keyboard, still need a human browser pass.
- A real sign-in still requires the existing test account; no credentials were entered during this work.

## Reviewing it

```powershell
npm run dev
```

Open `http://127.0.0.1:3000/login` and check:

1. Desktop 1440px — equal columns; brand headline 60px; form no wider than 448px.
2. Desktop 1024px — brand panel appears; 48px headline.
3. Tablet 768px — brand hidden; form centred.
4. Mobile 390/360px — no horizontal scroll; fields and button fit.
5. Tab order — preview link, email, password, submit, reset link.
6. Empty fields — native required validation.
7. Invalid credentials — generic error; form usable again.
8. Valid account — redirects to `/dashboard`.
9. Unconfigured backend — notice visible; controls disabled.
10. Dashboard and preview — styles unchanged.

## Reverting

- Delete `src/app/campus-sign-in.css`.
- Restore the previous `src/app/login/page.tsx`.
- Remove the stylesheet import from `layout.tsx`.
- Delete `tests/login-page.test.ts` if the old page is restored.

No database or hosted configuration changes are involved.
