'use client';
import React, { Component, ReactNode } from 'react';

/* ===== Error Boundary =====
 * Captura errores de renderizado en componentes hijos.
 * Muestra una UI de fallback con diagnóstico detallado.
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
    this.setState({ componentStack: errorInfo.componentStack || '' });
    // Log full diagnostic info
    console.error(`[ArchiFlow] ErrorBoundary "${this.props.label || 'unknown'}" caught:`, error);
    console.error('[ArchiFlow] Component stack:', errorInfo.componentStack);
    // Try to log additional info about the error
    try {
      // React #300 errors sometimes include info about the object in the error
      const errorAny = error as any;
      if (errorAny.args) {
        console.error('[ArchiFlow] Error args:', errorAny.args);
      }
    } catch { /* noop */ }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, componentStack: '' });
  };

  render() {
    if (this.state.hasError) {
      // Use !== undefined so that fallback={null} actually renders null (null is falsy)
      if (this.props.fallback !== undefined) return this.props.fallback;

      const label = this.props.label || 'componente';

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
            Error en {label}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--muted-foreground, #9a9b9e)', maxWidth: '340px', marginBottom: '12px', wordBreak: 'break-word' }}>
            {this.state.error?.message || 'Algo salió mal. Intenta de nuevo.'}
          </p>
          {/* Diagnostic: show component stack */}
          {this.state.componentStack && (
            <details style={{
              marginBottom: '16px', maxWidth: '400px', width: '100%', textAlign: 'left',
              fontSize: '11px', color: 'var(--muted-foreground, #9a9b9e)',
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '4px', fontWeight: 500 }}>
                🔍 Diagnóstico
              </summary>
              <pre style={{
                background: 'rgba(0,0,0,0.05)', borderRadius: '8px',
                padding: '8px 12px', overflow: 'auto', maxHeight: '200px',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontSize: '10px', lineHeight: 1.4,
              }}>
                {this.state.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 20px', borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--af-bg3, rgba(0,0,0,0.05))',
              color: 'var(--foreground)', fontSize: '13px', fontWeight: 500,
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
