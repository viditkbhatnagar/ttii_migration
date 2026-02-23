# Frontend Architecture (Phase 11)

## Scope

Phase 11 establishes the reusable React foundation for student, centre, and admin portals without migrating feature pages.

## Package Structure

1. `packages/frontend-core`
   - `LegacyApiClient`: normalized legacy envelope handling and transport errors.
   - `LegacyAuthApi`: `/api/login/index`, `/api/auth/me`, `/api/auth/portal/*`, `/api/login/logout` adapters.
   - `AuthProvider` / `useAuthState`: shared auth session state with local storage restore.
   - `loadRoleShellAccess`: role-shell guard evaluator for portal paths.
   - Shared route metadata helpers (`ROLE_ROUTES`, `findRoleRoute`, `normalizePathname`).
2. `packages/ui`
   - Reusable shell primitives for all portals: `PortalScaffold`, `MetricCard`, `InlineNotice`, `ShellCard`.
3. `apps/web`
   - Role shell router (`/student`, `/centre`, `/admin`) and login bridge page.
   - Guarded shell rendering driven by frontend-core auth APIs.

## Auth + Route Guard Flow

1. Login calls `/api/login/index` through `LegacyAuthApi`.
2. Session token is persisted in shared auth storage.
3. Shell navigation resolves route metadata from shared route registry.
4. Guard check executes:
   - `/api/auth/me` for session validity and role context.
   - `/api/auth/portal/{student|centre|admin}` for role authorization.
5. Shell renders on success, otherwise shows unauthenticated/forbidden/error notices.

## Error Handling Model

1. `ApiError` normalizes HTTP and legacy `status: 0/false` failures.
2. `AuthProvider` surfaces recoverable auth/API failures in shared state.
3. `AppErrorBoundary` catches render-time failures at app root.
4. UI uses `InlineNotice` to present route/auth failures consistently.

## Testing and Gates

1. `packages/frontend-core` unit tests validate API envelope behavior and guard outcomes.
2. `apps/web` e2e test spins real Node API auth routes and validates:
   - student shell guard pass,
   - centre shell guard pass,
   - admin shell guard pass,
   - cross-role access denial.
3. Workspace CI (`npm run ci`) remains the quality gate for lint, test, and build.

## Phase Boundary

- Included: reusable architecture, role shells, route guards, shared auth/API/error/UI foundations.
- Deferred: feature-page parity migration for student (Phase 12), centre (Phase 13), admin (Phase 14).
