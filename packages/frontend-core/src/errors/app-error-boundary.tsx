import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export interface AppErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
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
