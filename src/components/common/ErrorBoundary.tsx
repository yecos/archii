'use client';
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ArchiFlow] ErrorBoundary caught:', error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack || '' });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, componentStack: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 20px', textAlign: 'center',
          minHeight: '200px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(220, 53, 69, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px', fontSize: '24px',
          }}>
            ⚠️
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--foreground, #f0f0ee)' }}>
            ArchiFlow — Error
          </h3>
          <p style={{ fontSize: '13px', color: '#ef4444', maxWidth: '400px', marginBottom: '8px', fontFamily: 'monospace', wordBreak: 'break-word', background: 'rgba(239,68,68,0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          {this.state.componentStack && (
            <pre style={{
              fontSize: '10px', color: 'var(--muted-foreground, #9a9b9e)',
              maxWidth: '500px', maxHeight: '120px', overflow: 'auto',
              background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px',
              textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              marginBottom: '12px',
            }}>
              {this.state.componentStack}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 20px', borderRadius: '10px',
              border: '1px solid rgba(200,169,110,0.3)',
              background: 'rgba(200,169,110,0.1)',
              color: '#c8a96e', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;