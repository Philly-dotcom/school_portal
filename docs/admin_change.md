# Campus Administrator change

**Status:** implemented on `experiment/ui-ux` · 7 November 2026
**Scope:** presentation only for the School Admin workspace. Authentication, permissions, routes, server actions and database rules are unchanged.

## Why

School Admin keeps a sidebar because it has many destinations. The shell is now compact, grouped and collapsible, using the Campus palette, typography and dashboard cards. Teacher, Student, Guardian, preview and sign-in keep their own shells.

## Files

| File | Change |
| --- | --- |
| [`src/components/campus-admin-shell.tsx`](../src/components/campus-admin-shell.tsx) | New client shell for collapse state and the mobile navigation drawer |
| [`src/components/campus-admin-overview.tsx`](../src/components/campus-admin-overview.tsx) | New Admin dashboard composition: banner, statistics, quick actions and feeds |
| [`src/app/campus-admin.css`](../src/app/campus-admin.css) | Scoped Admin palette, sidebar, drawer, cards and responsive rules |
| [`src/app/globals.css`](../src/app/globals.css) | Shared profile-trigger pill used by Admin and Campus headers |
| [`src/app/campus.css`](../src/app/campus.css) | Removes the old smaller Campus-only profile-trigger overrides |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Imports `campus-admin.css` |
| [`src/components/portal-shell.tsx`](../src/components/portal-shell.tsx) | Adds the Admin shell branch before the non-Admin Campus branch |
| [`src/app/dashboard/page.tsx`](../src/app/dashboard/page.tsx) | Replaces the old Admin heading + `DailyOverview` fragment with `CampusAdminOverview` |
| [`tests/workspace-navigation.test.ts`](../tests/workspace-navigation.test.ts), [`tests/portal-routing.test.ts`](../tests/portal-routing.test.ts) | Updated presentation assertions for the grouped Admin sidebar and Admin shell |
| [`tests/admin-overview.test.ts`](../tests/admin-overview.test.ts) | New test for the Admin greeting, actions, feeds and non-Admin guard |

`DailyOverview`, `AdminProfile`, `ProfileMenu`, `DashboardCounts`, `DashboardFeed`, every feature panel and every loader remain in place. `AdminProfile` is still used by the account menu.

## Layout

| Area | Design |
| --- | --- |
| Header | School Portal brand, actual school name, account menu and mobile Menu button |
| Sidebar | 224px expanded / 72px collapsed; white; grouped; sticky on desktop |
| Sidebar rows | 40px minimum; coloured icon chips; pale-blue active row with inset bar |
| Main | Pale blue background; up to 1500px; 24px padding desktop, 16px mobile |
| Banner | Blue-to-teal greeting, school-local date, yellow **Review attendance** action |
| Statistics | Three white cards using the existing accurate counts |
| Quick actions | Attendance, Timetable, Registers, Create announcement |
| Feeds | Announcements in the wider column; homework and documents stacked beside it |
| Mobile | Sidebar hidden; Menu opens a modal drawer |

### Navigation groups

| Group | Items |
| --- | --- |
| Home | Overview |
| School day | Attendance, Timetable, Homework |
| Academics | Assessments, Academic setup, Teaching assignments |
| School community | School registers, People & access |
| Information | Announcements, Documents |
| Bottom utility | School settings |

All links retain `/dashboard?view=…&mode=school_admin`. No new destination or permission was added.

## Client/server boundary

`CampusAdminShell` is a Client Component only for the collapse toggle and `<dialog>` drawer. The page content and profile menu remain server-rendered slots passed in as `children` and `profileMenu`. No database loader, permission check or server action moved into the client bundle.

- `PortalShell` remains the server-side decision point; `admin` is already resolved by the protected dashboard.
- The shell does not decide who is an administrator.
- Feature pages, forms, server actions and RLS continue to enforce access independently.

The Admin branch is placed before the Teacher/Student/Guardian Campus branch. The public preview and workspace chooser still use the old shell.

## Shared profile pill

The account trigger in `ProfileMenu` is now one consistent pill across School Admin, Teacher, Student, Guardian and the workspace chooser:

- 44px light-blue initials avatar with blue text.
- Name and role stacked; 14px/11px type in a 60px pill.
- Light blue-grey surface with a 999px radius and a subtle hover/open state.
- Chevron on the right.
- Below 640px the name and role hide and the pill becomes a compact avatar control, matching the Campus headers.

The base lives in [globals.css](../src/app/globals.css); the older smaller Campus-only overrides were removed so the Admin header inherits exactly the same trigger. The profile popover content, workspace switching and sign-out are unchanged.

## Admin overview

`CampusAdminOverview` reuses the existing prestarted `loadAdminProfile` read, `DashboardCounts` and `DashboardFeed`:

- Greeting uses the verified profile name, with a safe fallback.
- Date uses the school timezone.
- Statistics retain existing labels and distinguish unavailable from zero.
- Four quick actions use existing routes.
- Announcements are the wider feed; homework and documents sit in the secondary column.
- “Create announcement” keeps `announcementEdit=new`.
- Empty and failed feeds keep their existing explanations and full-page links.
- No new counters, attendance rates or invented totals were added.

## Sidebar behaviour

- The collapse button switches the desktop grid from `224px` to `72px`.
- Collapsed links keep `aria-label` and native `title`; group headings and visible labels are hidden with CSS.
- Active item follows the `view` prop and keeps `aria-current="page"`.
- The settings utility stays at the bottom.
- Collapse state lasts while the shell stays mounted; a full reload starts expanded. Persistence is deliberately deferred.
- The header scrolls with the page; the sidebar is sticky and its link area scrolls independently.

## Mobile drawer

- Menu opens the native `<dialog>` with `showModal()`, giving background inertness, focus containment and Escape handling.
- Close button and Link activation close the drawer.
- Closing returns focus to the Menu button when it is visible.
- Switching to the 1024px desktop breakpoint closes the drawer.
- Drawer labels stay readable even when the desktop sidebar is collapsed.

## Accessibility

- Skip link to `#main`.
- `aside aria-label="Administrator sidebar"`; each navigation group has its own label.
- 44px targets in the drawer; 40px desktop rows; visible focus outlines.
- `aria-expanded` and `aria-controls` on the collapse control; `aria-haspopup="dialog"` and `aria-controls` on Menu.
- `aria-labelledby` on the drawer.
- Active navigation uses both colour and `aria-current`.
- Reduced-motion rules remove animation and transitions.
- Long school names wrap; table wrappers scroll locally.

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Pass |
| `npx eslint .` | Pass |
| Full Vitest suite | **692 tests in 63 files passed** |
| Next/Turbopack compile | Compiled successfully |
| Browser walkthrough | Not performed by the agent; no browser control in this session |

The build’s post-compile TypeScript worker remains blocked by the agent sandbox (`spawn EPERM`); TypeScript was verified separately. Existing presentation tests were updated for the intentional Admin-sidebar change; role and access assertions were retained.

## Known limits

- Collapse state is not persisted across full reloads or, if the shell remounts on navigation, across route changes. Verify in a browser; add `sessionStorage` only if needed.
- The header is not sticky; the sidebar is sticky. The guide’s 100vh sidebar can extend below a short viewport, with its link area scrolling independently.
- Exact Campus webfonts are not bundled; system fallbacks are used.
- The mobile drawer uses native dialog behaviour; clicking the backdrop does not close it, only Close, Escape or a link.
- Contrast, height at 200% zoom and long-name wrapping still need a human browser pass at 360, 390, 768, 1024, 1280 and 1440px.
- Existing feature panels may contain hard-coded colours; only shared surfaces were scoped. Inspect each Admin page.

## Reviewing it

```powershell
npm run dev
```

Sign in as School Admin and check:

1. Admin home has one banner, one statistics row, four actions and announcements first.
2. Expanded sidebar shows every group; settings is at the bottom.
3. Collapse gives a 72px rail; labels remain accessible; active item is visible.
4. Every link keeps `mode=school_admin`.
5. Mobile Menu opens the drawer; Escape/Close returns focus; background is inert.
6. Resize with the drawer open; it closes at desktop width.
7. Collapse/drawer toggles do not submit or reset an open form.
8. Profile menu workspace switching and sign-out still work.
9. Teacher, Student, Guardian, preview and sign-in are unchanged.

## Reverting

- Delete `campus-admin-shell.tsx`, `campus-admin-overview.tsx` and `campus-admin.css`.
- Remove the Admin branch and import from `portal-shell.tsx`.
- Restore the previous Admin fragment/imports in `dashboard/page.tsx`.
- Remove the stylesheet import from `layout.tsx`.
- Restore the three presentation assertions and remove `admin-overview.test.ts`.

No database or hosted configuration changes are involved.
