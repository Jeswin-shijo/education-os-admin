# AI Campus OS — Admin Web Console Build Contract

Single source of truth for this app. It is a **standalone React + TypeScript + Vite** web app —
the "make every DB entry" console for the AI Campus OS college platform, matching the visual design
of the sibling Expo app at `../../education-os` (see that repo's `docs/CONTRACT.md` for the mobile
design system this mirrors) and eventually talking to the same Django/DRF backend at
`../../education-os-backend`.

## Ground rules
- **Functional React.** No classes. Components are functions + hooks. Pure helper functions in `lib/`.
- **TypeScript strict.** No `any` in public signatures.
- **Data now = mock, wired later.** Every `adminService` function is `async` and reads/writes a
  localStorage-backed store (`src/services/db.ts`), exactly mirroring the mobile app's seam
  philosophy — screens call services, never storage directly, so swapping the mock arm for real
  `fetch` calls against `/api/v1` later requires no screen changes.
- **Tailwind v4** for styling (`@tailwindcss/vite`), theme tokens defined once in `src/index.css`
  `@theme` block — **exact hex values** from the mobile CONTRACT.md so this looks like the same
  product. Use the generated utility classes (`bg-navy`, `text-ink-muted`, `rounded-lg`, etc.) —
  do not hardcode hex colors in components.
- **No hand-rolled duplicate UI.** Build the shared component library once (`src/components/`) and
  reuse it everywhere — every management page follows the identical CRUD pattern (see §8).
- **React Router v7** (`react-router-dom`) for routing; `src/router` owns the route table.

## Directory layout
```
src/
  index.css                 // Tailwind import + @theme design tokens
  main.tsx                  // createRoot > BrowserRouter > AuthProvider > App
  App.tsx                   // route table
  lib/                      // cn.ts fn.ts format.ts date.ts validation.ts
  data/
    types.ts                // domain types
    seed.ts                 // deterministic seed data (same fictional college as the mobile app)
  services/
    storage.ts               // localStorage wrapper, namespaced `campusos-admin:`
    db.ts                    // generic collection store: seedIfEmpty/read/write/upsert/removeById/resetAll
    authService.ts            // mock login (admin/superadmin only)
    adminService.ts            // namespaced sub-objects — the entire CRUD surface
  state/
    AuthContext.tsx           // useAuth(): {admin, status, login, logout}
  hooks/
    useAsync.ts               // same shape as the mobile app's useAsync
  components/                // one file per component, barrel index.ts
  layout/
    AppShell.tsx               // sidebar + topbar chrome wrapping every authed page
    Sidebar.tsx
    Topbar.tsx
  pages/
    LoginPage.tsx
    DashboardPage.tsx
    people/StudentsPage.tsx FacultyPage.tsx ParentsPage.tsx UsersRolesPage.tsx
    academics/DepartmentsPage.tsx CoursesPage.tsx SubjectsPage.tsx TimetablePage.tsx AttendancePage.tsx
    campus/FeesPage.tsx LibraryPage.tsx HostelPage.tsx TransportPage.tsx NotificationsPage.tsx
    AuditLogsPage.tsx
  router/
    ProtectedRoute.tsx
```

## Theme tokens (already implemented in `src/index.css`)
Colors: `navy #13327F / navy-deep #0E2563 / navy-dark #091A47 / navy-soft #E8EDFA / navy-muted #5C6B99`,
`accent #F7B500 / accent-dark #D99700 / accent-soft #FFF3CC`, semantic `success/danger/warning/info/
purple/teal/pink` (+ `-soft` variants), neutrals `app-bg #F2F5FC / surface #FFFFFF / surface-alt #F7F9FE`,
`ink #0B1530 / ink-muted #5C6B8A / ink-soft #94A3B8`, `line #E3E9F4 / line-soft #EEF2FA`.
Typography scale (Tailwind `text-*` utilities): `display/h1/h2/h3/title/body/small/label/caption`.
Radii: `radius-sm 6 / md 8 / lg 12 / xl 16` (Tailwind default `rounded-full` covers "round").
Navy = brand/structure/sidebar. Yellow accent = primary CTA + highlights only — do not overuse.

## Domain types — `src/data/types.ts`
Reuses the same fictional college as the mobile app (student "Abin Thomas", CSE department, faculty
"Dr. Rajesh Menon" etc.) so both apps feel like one product. Define:
- `Role = 'student'|'parent'|'faculty'|'hod'|'principal'|'admin'`
- `AdminAccount = { id; name; email; role: 'admin'|'superadmin'; avatarColor: string }`
- `Student = { id; name; rollNo; admissionNo; email; phone; program; branch; semester; section; year; cgpa; avatarColor; mentorName; bloodGroup }`
- `FacultyMember = { id; name; email; phone; department; designation; avatarColor }`
- `ParentAccount = { id; name; email; phone; relation; childId; avatarColor }`
- `PlatformUser = { id; name; email; role: Role; active: boolean; avatarColor }` (drives Users & Roles)
- `Department = { id; code; name; hod?: string }`
- `Course = { id; code; name; departmentCode; durationYears; intake; color }`
- `Subject = { id; code; name; credits; faculty; departmentCode; color }`
- `ClassSession = { id; subjectId; day: Weekday; start; end; room; section; semester; type:'Lecture'|'Lab'|'Tutorial' }` where `Weekday='Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'`
- `AttendanceOverview = { overallPercent: number; sessionsRecorded: number; byClass: { label: string; percent: number; sessions: number }[] }` (read-only, computed)
- `FeeInvoice = { id; studentId; studentName; title; term; amount; dueDate; status:'paid'|'due'|'overdue'; paidOn? }`
- `Book = { id; title; author; category; copies: number; available: number }`
- `HostelInfo = { block; totalRooms; occupied; warden; wardenPhone; messPlan; fees }` (singleton)
- `BusRoute = { id; name; number; driver; driverPhone; stops: { name; time }[] }`
- `NotificationItem = { id; title; body; category:'academic'|'fee'|'event'|'general'|'alert'; audience: Role|'all'; sentAt }`
- `AuditLog = { id; at; actor; action:'create'|'update'|'delete'|'broadcast'; entity; detail }`
- `AdminDashboard = { counts: { students; faculty; parents; departments; courses; subjects; feeInvoices; notifications }; recentAudits: AuditLog[] }`

## Data + services
### `src/services/storage.ts`
`getJSON<T>(key)`, `setJSON<T>(key,val)`, `remove(key)` over `window.localStorage`, namespaced
`campusos-admin:`. Guard for SSR/no-window (not needed here but keep the pattern cheap-safe).

### `src/services/db.ts`
`Collections` = record of collection name → array (`students, faculty, parents, platformUsers,
departments, courses, subjects, sessions, fees, books, busRoutes, notifications, auditLogs`) plus
singleton `hostel`. Export `seedIfEmpty()`, `read(name)`, `write(name, rows)`, `upsert(name, row)`,
`removeById(name, id)`, `readSingleton()`, `writeSingleton(patch)`, `resetAll()`.

### `src/services/adminService.ts` — namespaced sub-objects, mirrors the mobile `adminService` API 1:1
```
getDashboard(): Promise<AdminDashboard>
students = { list(q?), create(input), update(id,patch), remove(id) }
faculty  = { list(q?), create(input), update(id,patch), remove(id) }
parents  = { list(q?), create(input), update(id,patch), remove(id) }
users    = { list(q?, role?), updateRole(id, role), setActive(id, active) }
departments = { list(), create(input), update(id,patch), remove(id) }
courses  = { list(), create(input), update(id,patch), remove(id) }
subjects = { list(q?), create(input), update(id,patch), remove(id) }
timetable = { list(), create(input), update(id,patch), remove(id) }
attendance = { overview(): Promise<AttendanceOverview> }   // read-only, computed from sessions
fees     = { list(q?), create(input), markPaid(id) }
library  = { list(q?), create(input), update(id,patch), remove(id) }
transport = { list(), create(input), update(id,patch), remove(id) }
hostel   = { get(), update(patch) }
notifications = { list(), broadcast(input) }
audit    = { list(), log(entry:{action;entity;detail}) }
```
**Write guards** (throw `new Error('Cannot remove a core record other roles depend on')`):
`students.remove` refuses the seeded primary student (`students[0].id`); `subjects.remove` refuses
the 6 core seeded subject ids; `users.setActive`/nothing removes the seeded admin — Users & Roles has
no `remove`, only role change + active toggle, and `setActive(false)` refuses on the currently logged
in admin's own id and the seeded core role users. Every mutation calls `audit.log(...)`.

### `src/services/authService.ts`
`login(email, password): Promise<AdminAccount>` — mock: matches against seeded admin/superadmin
accounts (`admin@campus.edu.in` / `campus123`, matching the real backend's seeded demo login so the
UI is truthful once wired), else throws. `logout()`, `getSession()`.

## State — `src/state/AuthContext.tsx`
`AuthProvider`, `useAuth(): { admin: AdminAccount|null; status:'loading'|'authed'|'guest';
login(email,password); logout() }`. Persists session id via storage, restores on load.

## Component library — `src/components/` (Tailwind-styled, one file each)
`Button` (`variant: primary|accent|outline|ghost|danger`, `size: sm|md`, `loading?`, `icon?`),
`Card`, `Modal` (bottom-sheet-style on mobile widths, centered dialog on desktop; `onClose`, `title`),
`TextField`, `Select` (native `<select>` styled), `SearchBar`, `Table` (columns + rows, used for every
list screen instead of ad-hoc `<table>` markup), `StatusPill` (`success|warning|danger|info|neutral`),
`StatCard` (`label,value,icon,tone`), `Banner` (`tone,title,message,actionLabel,onAction`), `EmptyState`,
`ConfirmDialog` (built on `Modal`, danger-styled confirm/cancel), `Avatar` (initials circle),
`Badge`/`Chip`, `PageHeader` (`title,subtitle,actionLabel,onAction`), `Loading`. `index.ts` barrel.
Icons: inline SVG or a tiny local icon set — no icon-font dependency needed for this small a surface.

## Layout — `src/layout/`
`AppShell`: fixed navy `Sidebar` (grouped nav — Dashboard; **People**: Students/Faculty/Parents/Users
& Roles; **Academics**: Departments/Courses/Subjects/Timetable/Attendance; **Campus**: Fees/Library/
Hostel/Transport/Notifications; **Audit Logs**) + `Topbar` (page title, admin `Avatar`+name, Logout) +
scrollable content area (`app-bg` background, content padded, `max-w` constrained on very wide screens).
Sidebar collapses to icon-only or an off-canvas drawer under ~900px.

## Routing — `src/router/`
`/login` → `LoginPage` (guest only). Everything else behind `ProtectedRoute` (redirects to `/login`
if `status!=='authed'`), rendered inside `AppShell`: `/` → Dashboard, `/students`, `/faculty`,
`/parents`, `/users`, `/departments`, `/courses`, `/subjects`, `/timetable`, `/attendance` (read-only),
`/fees`, `/library`, `/hostel`, `/transport`, `/notifications`, `/audit-logs`.

## Page pattern — every management page (§ "common management pattern")
`PageHeader` (title + live count) with an "Add" `Button` opening a create `Modal` form; `SearchBar`
above the `Table` when the list can grow long; each row has Edit (opens the same Modal pre-filled) and
Delete (opens `ConfirmDialog`; guard errors surface as a danger `Banner` inside the dialog, not a raw
alert). Reload the list after every mutation. Forms validate via `lib/validation` and show a success
`Banner`/toast after save. `AttendancePage` is the one read-only exception (§ StatCards + a simple
per-class bar list, no Modal at all). `AuditLogsPage` is read-only — reverse-chronological list with a
`SearchBar` and colored action `Badge` per entry.

## Acceptance
- `npm run build` (`tsc -b && vite build`) passes with zero errors.
- App boots to `/login`; logging in as the seeded admin lands on the Dashboard with real KPI counts;
  every sidebar link navigates; create/edit/delete on every entity persists across a page reload
  (localStorage); delete guards block removing the anchor student/subjects with a visible error;
  every mutation appears in Audit Logs.
- Visual language (navy chrome, yellow accent CTAs, card/typography rhythm) matches the mobile app's
  design system at a glance.
