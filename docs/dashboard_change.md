# Campus dashboard change

**Status:** implemented on `experiment/ui-ux` · 7 November 2026
**Scope:** presentation only for Teacher, Student and Guardian. No schema, RLS, grading-policy or publication changes.

## Why

The portal's Teacher, Student and Guardian dashboards used the original sidebar shell and role overview. The Campus experiment gives those roles a friendlier daily landing page: school identity in a compact header, a dated greeting, one clear action, colour-coded feature shortcuts, and a small set of real daily cards.

School Admin and `/preview` deliberately keep the existing UI.

## What changed

### New files

| File | Responsibility |
| --- | --- |
| [`src/app/campus.css`](../src/app/campus.css) | All Campus styles, scoped to `.campus-root` |
| [`src/components/campus-frame.tsx`](../src/components/campus-frame.tsx) | Signed-in header, Menu, profile slot, learner context, main area and footer |
| [`src/components/campus-menu.tsx`](../src/components/campus-menu.tsx) | Client wrapper around `<details>`; closes on link navigation, Escape and outside click |
| [`src/components/campus-overview.tsx`](../src/components/campus-overview.tsx) | Teacher, Student and Guardian dashboard compositions |

### Edited files

| File | Change |
| --- | --- |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Imports `campus.css` after `globals.css` |
| [`src/components/portal-shell.tsx`](../src/components/portal-shell.tsx) | Adds Campus branches for non-Admin roles and the workspace chooser; Admin uses its own shell, preview keeps the old one |
| [`src/components/role-overview.tsx`](../src/components/role-overview.tsx) | Passes ready actors to Campus; keeps unavailable, forbidden, unconfigured and empty states |
| [`src/app/dashboard/page.tsx`](../src/app/dashboard/page.tsx) | Removes the duplicate overview heading; My timetable keeps its heading |
| [`src/components/announcement-panel.tsx`](../src/components/announcement-panel.tsx), [`attendance-panel.tsx`](../src/components/attendance-panel.tsx), [`document-panel.tsx`](../src/components/document-panel.tsx), [`homework-panel.tsx`](../src/components/homework-panel.tsx) | Pass the verified school context when they fall back to `RoleOverview` |

### Tests updated

Presentation assertions only, retaining role, access and selected-child checks:

- [`tests/portal-routing.test.ts`](../tests/portal-routing.test.ts)
- [`tests/staff-profile.test.ts`](../tests/staff-profile.test.ts)
- [`tests/workspace-navigation.test.ts`](../tests/workspace-navigation.test.ts)

Unrelated formatting edits already present in the assessment actions and panel were left untouched.

## How it fits the existing app

There are no new routes. `/dashboard` still selects a view through `?view=`, and `PortalShell` decides which shell to render.

```text
Browser
  → /dashboard?view=…&mode=teacher|student|guardian
  → verified context in src/lib/auth-context.ts
  → PortalShell
      School Admin                     → CampusAdminShell
      Teacher / Student / Guardian     → CampusFrame + CampusOverview
      Multi-role chooser               → CampusFrame without navigation
      Public preview                   → existing preview shell
```

- Campus is rendered for non-Admin roles with a `mode`, and for the multi-role workspace chooser without one.
- The chooser uses `CampusFrame` with its Menu omitted: brand, profile pill, centred selection card and footer.
- A URL still cannot grant a role; the existing server checks remain authoritative.
- Guardian child IDs are still resolved and verified server-side. The Campus picker only submits a `child` UUID.
- The existing feature panels remain in place inside the Campus frame; their forms, pagination and error handling are unchanged.

## Role layouts

### Teacher

1. Header: school, Menu, account menu.
2. Greeting banner with the school-local date and **Mark today's attendance**.
3. Shortcuts: My timetable, Attendance, Assessments, Homework, Announcements, Documents.
4. Cards: Today's lessons, Published homework, Announcements, School documents.

### Student

1. Header.
2. Greeting banner with **My timetable**.
3. Compact current grade / class / academic-year strip, reusing `StudentProfile`.
4. Shortcuts: My timetable, Homework, Attendance, Announcements, Documents.
5. Cards: Homework due soon, Today's lessons, Announcements, School documents.

### Guardian

1. Header, plus the selected learner's name.
2. Learner picker and selected-learner card.
3. Greeting banner; the action is **View attendance** only after a learner is selected.
4. Shortcuts: Attendance, Homework, Timetable, Announcements, Documents.
5. Cards: Homework due soon, Today at school, Announcements, School documents.

With no linked learners, the dashboard explains that no access has been granted and does not offer a picker. With linked learners but no selection, data cards stay hidden until one is chosen.

### Workspace chooser

Accounts with more than one role but no selected mode previously saw the old authenticated shell and sidebar. They now see the Campus frame with:

- The school brand and account pill, but no Menu or sidebar.
- A centred white card with the existing “How would you like to continue?” copy.
- One full-width option per authorised role, still linking to `/dashboard?view=overview&mode=…`.
- The same server-verified role list; this remains navigation only.

### Unchanged

- School Admin keeps the grouped sidebar and its dedicated overview.
- The multi-role workspace chooser now uses the Campus frame and a centred selection card.
- `/preview` remains static and disconnected.
- All feature pages keep their existing data, filters and actions.

## Design system

### Colour tokens

| Token | Value | Use |
| --- | --- | --- |
| `--c-bg` | `oklch(0.97 0.01 230)` | Page background |
| `--c-card` | white | Header and cards |
| `--c-ink` | `oklch(0.22 0.03 250)` | Primary text |
| `--c-muted-ink` | `oklch(0.5 0.03 250)` | Secondary text |
| `--c-primary` | `oklch(0.52 0.15 240)` | Links, buttons, active navigation |
| `--c-sun` | `oklch(0.86 0.15 88)` | Primary banner action |
| `--c-blue` | `oklch(0.6 0.15 240)` | Timetable |
| `--c-green` | `oklch(0.65 0.15 155)` | Attendance |
| `--c-orange` | `oklch(0.72 0.15 60)` | Assessments |
| `--c-coral` | `oklch(0.6 0.17 20)` | Homework |
| `--c-purple` | `oklch(0.55 0.15 295)` | Announcements |
| `--c-teal` | `oklch(0.62 0.11 200)` | Documents |

Feature colours are stable per feature, not tied to tile position.

### Typography

The stylesheet prefers `DM Sans` for body text and `Space Grotesk` for headings, then falls back to `Segoe UI`/`system-ui`.

No webfonts are downloaded at build time. This keeps the build offline-safe and avoids adding a dependency on Google Fonts. The exact families can be added later through local `.woff2` files if the design needs pixel-level typography.

### Profile trigger

The shared `ProfileMenu` trigger is a consistent 60px pill across Teacher, Student, Guardian, School Admin and the workspace chooser: 44px light-blue initials avatar, stacked 14px/11px name and role, light surface, chevron. Below 640px it becomes an avatar-only control. The base styles live in [globals.css](../src/app/globals.css); Campus no longer applies a smaller variant.

### Spacing and shape

- Main column: `max-width: 1280px`, centred.
- Header: sticky, 72px desktop / 64px mobile minimum.
- Card radius: 18px; banner radius: 22px.
- Card padding: 22px desktop, 17px mobile.
- Shortcut tiles: 64px desktop, 56px mobile.

## Responsive behaviour

| Width | Layout |
| --- | --- |
| Below 640px | Single card column; three shortcut columns; stacked banner; full-width primary action; profile name hidden, avatar retained |
| 640–1023px | Four shortcut columns; cards remain stacked |
| 1024px and wider | Six shortcut columns; 2:1 main/side card grid |

The header wraps rather than shrinking the school name. School names, learner names and card text use `overflow-wrap: anywhere`.

## Interaction and accessibility

- Skip link to `#main`.
- Native `<details>` Menu; closes after following a link, on Escape with focus returned to the summary, and on outside click.
- `aria-current="page"` on the active navigation item.
- Visible `:focus-visible` outlines, including a white outline on the gradient banner.
- Decorative icons are `aria-hidden="true"`; every shortcut keeps a text label.
- Feature navigation uses labels plus colour, never colour alone.
- 44px minimum targets for menu rows, picker and primary links.
- Reduced-motion rules remove tile transforms, transitions and smooth scrolling.
- Loading, empty and error copy is distinct. Failed feeds are not rendered as zero lessons or zero work.
- No fake search, notification count, attendance percentage, unread state or results.

## States

| State | Behaviour |
| --- | --- |
| Teacher/Student ready | Campus overview with shortcuts and cards |
| Guardian, no linked learners | Explanatory card; no picker, no learner data |
| Guardian, learners but no selection | Picker remains; data cards hidden |
| Guardian, selected learner | Learner context, attendance action, learner-scoped cards |
| Loader failure | Each card shows its existing unavailable/error message |
| No `context` in a fallback | RoleOverview shows a safe “school information unavailable” card |

## Data and authorisation

Campus adds no queries of its own beyond the existing loaders:

- [`daily-overview.tsx`](../src/components/daily-overview.tsx) supplies `DashboardLessons` and `DashboardFeed`.
- [`student-profile.tsx`](../src/components/student-profile.tsx) supplies the compact enrolment strip.
- [`child-selector.tsx`](../src/components/child-selector.tsx) supplies guardian learner selection.
- [`profile-menu.tsx`](../src/components/profile-menu.tsx) supplies account details, workspace switching and sign-out.

Every card still goes through the existing server-verified context, role checks and RLS/RPC boundaries. The Campus frame does not add a client-side permission check and does not read school data in the browser.

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Pass |
| `npx eslint .` | Pass |
| Full Vitest suite | **685 tests in 60 files passed** |
| Next/Turbopack compile | Compiled successfully |
| Signed-in browser walkthrough | **Not performed by the agent**; no browser control available in this session |

The full build reached Next's post-compile TypeScript worker, which the agent sandbox blocks with `spawn EPERM`; TypeScript was verified separately with `tsc`. The local test run used the thread pool because the sandbox blocks Vitest's default child-process workers.

## Known limits and deliberate omissions

- The four cards are the supported minimum. “Needs attention”, student “Next lesson”, attendance summaries and published results are not shown yet because the existing loaders do not expose reliable, publication-aware values for them.
- The teacher homework card is labelled **Published homework**; the shared feed filters out drafts.
- Exact Campus webfonts are not bundled yet.
- The Menu replaces the old sidebar for non-Admin roles; the spec's optional mobile bottom bar is not included.
- Visual checks at 360, 390, 768, 1024, 1440px and 200% text zoom still need a human browser pass.

## Reviewing it

From the project root:

```powershell
npm run dev
```

Then sign in as Teacher, Student and Guardian and check:

1. Banner action reaches the intended page.
2. All six/five shortcuts reach the correct role view and retain the Guardian `child` parameter.
3. Menu closes after navigation, on Escape and after an outside click.
4. Guardian picker works with no children, one child and several children.
5. Admin and `/preview` still render the old shell.
6. Widths 360, 390, 768, 1024 and 1440px have no page-wide horizontal scroll.
7. Keyboard focus is visible through the header, menu, picker and cards.

## Reverting

The change is isolated:

- Delete `campus.css`, `campus-frame.tsx`, `campus-menu.tsx` and `campus-overview.tsx`.
- Revert the five integration edits (`layout.tsx`, `portal-shell.tsx`, `role-overview.tsx`, `dashboard/page.tsx`, the four panel context props).
- Revert the three test presentation assertions.

No database or hosted configuration needs reversing.

## References

- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — request and authorisation model
- [`docs/ASSESSMENTS.md`](ASSESSMENTS.md) — current academic workflow
- [`tests/README.md`](../tests/README.md) — test evidence and limits
