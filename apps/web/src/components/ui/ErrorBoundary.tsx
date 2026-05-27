import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './ErrorState';

interface Props {
  children: ReactNode;
  /** Optional render-prop for custom fallback UI. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-line-of-defense error boundary.
 *
 * Class components are explicitly avoided everywhere else in this codebase,
 * but React still doesn't ship a hooks-based equivalent for `componentDidCatch`
 * — so this is the one acceptable exception.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // In a real product this would forward to Sentry / Datadog. Logging to the
    // console is enough for an assessment build.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <ErrorState message={error.message} onRetry={this.reset} />;
  }
}
