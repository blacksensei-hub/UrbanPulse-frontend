import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info);
    // Sentry captures rendering errors automatically when initialized
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
          <p className="max-w-sm text-muted">
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
