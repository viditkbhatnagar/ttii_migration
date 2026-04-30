import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
  isChunkLoad: boolean;
}

export interface AppErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

/** Detects the "stale chunk" failure mode that Vite produces when a deploy
 * lands while a user has the previous index.html cached: the browser asks
 * for a hashed asset filename that no longer exists on the server, the
 * dynamic import rejects, and React surfaces the error here. The fix is
 * a hard reload — once we have the fresh index.html the new chunk
 * filenames resolve. */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes("Importing a module script failed") ||
    error.name === 'ChunkLoadError'
  );
}

const RELOAD_GUARD_KEY = 'ttii.chunk_reload_at';

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
    isChunkLoad: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
      isChunkLoad: isChunkLoadError(error),
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);

    // Auto-reload exactly once on a chunk-load failure. The session-scoped
    // guard prevents an infinite reload loop in the unlikely case the new
    // index.html still references the missing chunk (e.g. CDN lag).
    if (typeof window !== 'undefined' && isChunkLoadError(error)) {
      try {
        const last = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
        const now = Date.now();
        if (!last || now - Number(last) > 60_000) {
          window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
          window.location.reload();
        }
      } catch {
        // sessionStorage may be disabled — best effort only.
      }
    }
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Friendlier copy when we're already auto-reloading; technical detail
      // for any other render failure.
      if (this.state.isChunkLoad) {
        return (
          <section
            className="w-[min(680px,calc(100%-2rem))] mx-auto mt-9 border border-blue-200 bg-blue-50 rounded-2xl p-5 text-blue-900"
            role="status"
          >
            <h2 className="font-semibold text-lg mb-2">Updating to the latest version…</h2>
            <p>The app was updated while you were here. Reloading automatically.</p>
          </section>
        );
      }

      return (
        <section
          className="w-[min(680px,calc(100%-2rem))] mx-auto mt-9 border border-red-300 bg-red-50 rounded-2xl p-5 text-red-900"
          role="alert"
        >
          <h2 className="font-semibold text-lg mb-2">Application error</h2>
          <p>{this.state.message || 'Unexpected render failure.'}</p>
        </section>
      );
    }

    return this.props.children;
  }
}
