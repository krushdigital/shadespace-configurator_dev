import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../utils/errorReporter';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportClientError({
      message: error?.message || 'Render error',
      stack: `${error?.stack || ''}\n\nComponent stack:${info?.componentStack || ''}`,
      source: 'error_boundary',
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="ss-scope" style={{ padding: '2rem 1rem', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: '32rem',
            width: '100%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            color: '#0f172a',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Something went wrong loading the designer
          </h2>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: '#475569', margin: '0 0 1.5rem' }}>
            We hit an unexpected error. Please reload the page to try again. If it keeps happening,
            try updating your browser or opening the link in a different browser.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              background: '#0f766e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
