# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
TTII (Teacher's Training Institute of India) LMS monorepo with admin dashboard, student portal, and centre portal.

## Tech Stack
- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 + shadcn/ui (new-york, non-RSC)
- **Backend:** Fastify 5 + Prisma 6 (MongoDB)
- **Packages:** `@ttii/ui` (Tailwind components), `@ttii/frontend-core` (auth/routing), `@ttii/shared-types`
- **Path alias:** `@/` → `apps/web/src/`
- **Node:** >=24.0.0, **npm:** >=11.0.0

## Build & Dev
```bash
npm run dev                    # Start API (4000) + Web (5173) concurrently
npm run build                  # Build all packages + apps (order: shared-types → frontend-core → ui → api → web)
npm run lint                   # Lint all workspaces
npm run typecheck              # Typecheck all workspaces
npm run test                   # Test all workspaces
npm run ci                     # lint + test + build

# Per-workspace
cd apps/web && npx vite build          # Web production build only
cd apps/web && npx vitest run --dir tests  # Run web tests
npm run build -w @ttii/ui             # Build UI package only
npm run lint -w @ttii/api             # Lint API only

# Database (run from apps/api/)
npx prisma generate --schema prisma/schema.prisma   # Regenerate client
npx prisma db push --schema prisma/schema.prisma     # Push schema to DB
npx tsx prisma/seed-from-sql.ts                      # Seed from SQL dump
```

## Key Conventions
- **API response format:** `{ status: 1, message: "success", data: {...} }`
- **DB queries:** Always use Prisma Client query builder (findMany, create, groupBy, aggregate, etc.) — NOT raw SQL
- **DB IDs:** All MongoDB IDs are `String @id @default(auto()) @map("_id") @db.ObjectId`; `role_id` is the exception (stays `Int`)
- **JOIN pattern:** Fetch primary data, collect FK IDs, batch-fetch related records, merge via Maps
- **Admin page pattern:** Each page receives `{ api, session, onNavigate }` props and uses `useAdminPageData()` hook
- **Code splitting:** All admin pages use `React.lazy()` + `Suspense`
- **Routing:** Custom `pushState` + `popstate` event system (no React Router)
- **Auth:** Legacy JWT tokens, `requireLegacyAuth` + `requireLegacyRoles` middleware

## Architecture
```
apps/
  api/          Fastify 5 backend
    src/
      routes/       Route handlers (auth, profile, content, assessment, operations, engagement, commerce, health)
      auth/         Auth service + middleware
      operations/   operations-service.ts (admin CRUD)
      assessment/   assessment-service.ts
      content/      content-service.ts
      engagement/   engagement-service.ts
      commerce/     commerce-service.ts
    prisma/         schema.prisma (83 models, MongoDB)
  web/          React 19 frontend
    src/
      admin/        Admin portal (69 pages)
        admin-portal-api.ts     Frontend API client class
        routing/
          admin-routes.ts       Route config
          admin-nav-tree.ts     Sidebar navigation tree
      student/      Student portal
      centre/       Centre portal
packages/
  ui/             @ttii/ui — shared Tailwind components (shadcn/ui based)
  frontend-core/  @ttii/frontend-core — auth, routing, API client base
  shared-types/   @ttii/shared-types — cross-app type contracts
```

## Design Tokens
Primary: `#8F2774`, Secondary: `#F06543`, Navbar: `rgb(64,81,137)`, Sidebar active: `rgb(27,97,197)`, Page bg: `#F3F6F9`, Font: Poppins. All in `apps/web/src/app.css`.

## Important Files
- `apps/web/src/admin/admin-portal-api.ts` — Frontend API client (AdminPortalApi class)
- `apps/web/src/admin/routing/admin-routes.ts` — Route config
- `apps/web/src/admin/routing/admin-nav-tree.ts` — Sidebar navigation
- `apps/api/src/routes/` — All backend route files
- `apps/api/src/*/` — Service layer files (one per domain)
- `apps/api/prisma/schema.prisma` — Full database schema (83 models)
- `apps/web/src/app.css` — Design tokens and global styles
