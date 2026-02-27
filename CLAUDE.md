# TTII App — Claude Code Instructions

## Project Overview
TTII (Teacher's Training Institute of India) LMS monorepo with admin dashboard, student portal, and centre portal.

## Tech Stack
- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 + shadcn/ui (new-york, non-RSC)
- **Backend:** Fastify 5 + Prisma 6 (SQLite, raw SQL queries via `Prisma.sql`)
- **Packages:** `@ttii/ui` (Tailwind components), `@ttii/frontend-core` (auth/routing), `@ttii/shared-types`
- **Path alias:** `@/` → `apps/web/src/`

## Key Conventions
- **API response format:** `{ status: 1, message: "success", data: {...} }`
- **DB queries:** Always use raw SQL via `Prisma.sql` template literals, NOT Prisma's query builder
- **Admin page pattern:** Each page receives `{ api, session, onNavigate }` and uses `useAdminPageData()` hook
- **Code splitting:** All admin pages use `React.lazy()` + `Suspense`
- **Routing:** Custom `pushState` + `popstate` (no React Router)
- **DATABASE_URL:** Must be provided inline for Prisma CLI: `DATABASE_URL="file:./prisma/dev.db" npx prisma db push`

## Build & Dev
```bash
npm run dev              # Start API (4000) + Web (5173)
npm run build            # Build all packages + apps
cd apps/web && npx vite build  # Web production build only
npm run build -w @ttii/ui      # Build UI package
```

## Design Tokens
Primary: `#8F2774`, Secondary: `#F06543`, Navbar: `rgb(64,81,137)`, Sidebar active: `rgb(27,97,197)`, Page bg: `#F3F6F9`, Font: Poppins. All in `apps/web/src/app.css`.

## Current State
- **Phase 1 COMPLETE:** Admin layout shell, 19 pages, 16 API endpoints, Prisma schema synced (~70 models), design system migrated to Tailwind
- **Phase 2 COMPLETE:** Exams & Assessments — 10 pages, ~30 new API endpoints
- **Phase 3 COMPLETE:** Operations & People — 12 pages (Cohorts 5, Fee 4, Users 3), 9 new routes
- **Phase 4 COMPLETE:** CRM & Content — 12 pages (Counsellors 2, Associates 2, Documents 3, Events 1, Circulars 1, AI Mentor 2, Calendar 1), 5 new DB tables, 11 new routes
- **Phase 5 TODO:** Integrations & Polish — Chat Support, Training Videos, App Enrollments, Feeds, Integrations, User Feedbacks, Language (~7 pages) + Student/Centre portal Tailwind migration
- 54 pages built, 7 placeholder routes remaining

## Important Files
- `apps/web/src/admin/admin-portal-api.ts` — Frontend API client
- `apps/web/src/admin/routing/admin-routes.ts` — Route config
- `apps/web/src/admin/routing/admin-nav-tree.ts` — Sidebar navigation
- `apps/api/src/routes/operations.ts` — Backend admin routes
- `apps/api/src/operations/operations-service.ts` — Backend service layer
- `apps/api/prisma/schema.prisma` — Full database schema
