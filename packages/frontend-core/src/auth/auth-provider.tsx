import type { PortalSurface } from '@ttii/shared-types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { toApiError, type ApiError } from '../api/api-error.js';
import { clearStoredSession, readStoredSession, writeStoredSession } from './auth-storage.js';
import type { AuthApi, AuthSession, LoginInput } from './auth-api.js';

export type AuthPhase = 'bootstrapping' | 'ready';

interface AuthState {
  phase: AuthPhase;
  session: AuthSession | null;
  error: ApiError | null;
}

export interface AuthContextValue extends AuthState {
  authApi: AuthApi;
  login: (input: LoginInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
  checkPortalAccess: (surface: PortalSurface) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  authApi: AuthApi;
  storageKey?: string;
  children: ReactNode;
}

export function AuthProvider({ authApi, storageKey, children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    phase: 'bootstrapping',
    session: null,
    error: null,
  });

  const portalAccessCache = useRef(new Map<PortalSurface, boolean>());

  const applyReadyState = useCallback((session: AuthSession | null, error: ApiError | null = null) => {
    setState({
      phase: 'ready',
      session,
      error,
    });
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthSession | null> => {
    const storedSession = readStoredSession(storageKey);
    if (!storedSession) {
      portalAccessCache.current.clear();
      applyReadyState(null);
      return null;
    }

    try {
      const currentUser = await authApi.getCurrentUser(storedSession.token);
      const refreshedSession: AuthSession = {
        token: storedSession.token,
        userId: currentUser.userId,
        roleId: currentUser.roleId,
      };

      writeStoredSession(refreshedSession, storageKey);
      portalAccessCache.current.clear();
      applyReadyState(refreshedSession);
      return refreshedSession;
    } catch (error: unknown) {
      const apiError = toApiError(error, '/auth/me');
      clearStoredSession(storageKey);
      portalAccessCache.current.clear();
      applyReadyState(null, apiError);
      return null;
    }
  }, [applyReadyState, authApi, storageKey]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (input: LoginInput): Promise<AuthSession> => {
      const session = await authApi.login(input);
      writeStoredSession(session, storageKey);
      portalAccessCache.current.clear();
      applyReadyState(session);
      return session;
    },
    [applyReadyState, authApi, storageKey],
  );

  const logout = useCallback(async (): Promise<void> => {
    const token = state.session?.token;

    if (token) {
      try {
        await authApi.logout(token);
      } catch (error: unknown) {
        const apiError = toApiError(error, '/login/logout');
        clearStoredSession(storageKey);
        portalAccessCache.current.clear();
        applyReadyState(null, apiError);
        return;
      }
    }

    clearStoredSession(storageKey);
    portalAccessCache.current.clear();
    applyReadyState(null);
  }, [applyReadyState, authApi, state.session?.token, storageKey]);

  const checkPortalAccess = useCallback(
    async (surface: PortalSurface): Promise<boolean> => {
      const token = state.session?.token;
      if (!token) {
        return false;
      }

      if (portalAccessCache.current.has(surface)) {
        return portalAccessCache.current.get(surface) ?? false;
      }

      try {
        await authApi.checkPortalAccess(surface, token);
        portalAccessCache.current.set(surface, true);
        return true;
      } catch (error: unknown) {
        const apiError = toApiError(error, `/auth/portal/${surface}`);
        if (apiError.statusCode === 401 || apiError.statusCode === 403) {
          portalAccessCache.current.set(surface, false);
          return false;
        }

        setState((current) => ({
          ...current,
          error: apiError,
        }));
        throw apiError;
      }
    },
    [authApi, state.session?.token],
  );

  const clearError = useCallback(() => {
    setState((current) => ({
      ...current,
      error: null,
    }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase: state.phase,
      session: state.session,
      error: state.error,
      authApi,
      login,
      logout,
      refreshSession,
      checkPortalAccess,
      clearError,
    }),
    [authApi, checkPortalAccess, clearError, login, logout, refreshSession, state.error, state.phase, state.session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthState(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthState must be used within an AuthProvider.');
  }

  return context;
}
