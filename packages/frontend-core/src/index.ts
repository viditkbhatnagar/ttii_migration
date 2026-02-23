export { ApiError, toApiError, type ApiErrorDetails } from './api/api-error.js';
export { LegacyApiClient, isLegacySuccessStatus, type LegacyApiRequestOptions, type QueryValue } from './api/legacy-api-client.js';
export {
  LegacyAuthApi,
  resolvePortalSurfaceForRole,
  resolveShellPathForRole,
  type AuthApi,
  type AuthSession,
  type LoginInput,
} from './auth/auth-api.js';
export {
  AuthProvider,
  useAuthState,
  type AuthContextValue,
  type AuthPhase,
  type AuthProviderProps,
} from './auth/auth-provider.js';
export {
  DEFAULT_AUTH_STORAGE_KEY,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from './auth/auth-storage.js';
export {
  loadRoleShellAccess,
  type LoadRoleShellAccessOptions,
  type RoleShellLoadResult,
  type RoleShellLoadStatus,
} from './auth/role-shell.js';
export {
  ROLE_ROUTES,
  findRoleRoute,
  normalizePathname,
  type RoleRouteDefinition,
} from './routing/role-routes.js';
export { AppErrorBoundary, type AppErrorBoundaryProps } from './errors/app-error-boundary.js';
