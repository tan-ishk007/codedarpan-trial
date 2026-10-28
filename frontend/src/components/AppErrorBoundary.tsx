import { Component, type ReactNode } from 'react';

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { hasError: boolean };

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-boundary" role="alert">
          <p className="eyebrow"><span className="eyebrow-rule" />FRONTEND ERROR</p>
          <h1>This view couldn’t be rendered.</h1>
          <p>The atlas stopped unexpectedly. No analysis result or sample data has been substituted.</p>
          <a href="/">Return to repository intake</a>
        </main>
      );
    }

    return this.props.children;
  }
}
