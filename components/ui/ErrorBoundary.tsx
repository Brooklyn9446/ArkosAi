import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 my-4 bg-surface border border-sev-critical/30 rounded-[2px] text-left">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-2 h-2 bg-sev-critical rounded-[2px] animate-pulse" />
            <h3 className="font-display text-lg text-ink font-semibold tracking-wide">
              An unexpected error occurred
            </h3>
          </div>
          <p className="text-sm text-ink-sec font-body mb-4">
            {this.state.error?.message || 'A component has crashed while rendering.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-raised border border-border-bright text-xs font-mono text-copper hover:bg-hover hover:text-copper-dim transition-all rounded-[2px]"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
