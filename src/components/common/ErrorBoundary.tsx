'use client';
import React, { Component, ReactNode } from 'react';

/* ===== Error Boundary =====
 * Captura errores de renderizado en componentes hijos.
 * Muestra una UI de fallback en vez de romper toda la app.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Screen name shown in the error message (e.g. "Dashboard", "Reportes") */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ArchiFlow] ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const label = this.props.label || 'pantalla';

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
            Error al cargar {label}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--muted-foreground, #9a9b9e)', maxWidth: '300px', marginBottom: '16px' }}>
            {this.state.error?.message || 'Algo salió mal. Intenta de nuevo.'}
          </p>
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
