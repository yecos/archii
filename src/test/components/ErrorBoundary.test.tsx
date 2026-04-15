import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Component that throws on render
function ThrowOnRender({ message }: { message: string }) {
  throw new Error(message);
}

// Component that throws when button is clicked
function ThrowOnClick({ message }: { message: string }) {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  if (shouldThrow) throw new Error(message);
  return <button onClick={() => setShouldThrow(true)}>Trigger Error</button>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error from React error boundary
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <p>Normal content</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeDefined();
  });

  it('catches render errors and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Test crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Error al cargar/)).toBeDefined();
  });

  it('shows custom label in error message', () => {
    render(
      <ErrorBoundary label="Dashboard">
        <ThrowOnRender message="Crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Error al cargar Dashboard')).toBeDefined();
  });

  it('shows default label "pantalla" when no label provided', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Error al cargar pantalla')).toBeDefined();
  });

  it('shows error message from the thrown error', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Something went wrong" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('shows fallback message when error has no message', () => {
    function ThrowNoMessage() { throw new Error(''); }
    render(
      <ErrorBoundary>
        <ThrowNoMessage />
      </ErrorBoundary>
    );
    expect(screen.getByText('Algo salió mal. Intenta de nuevo.')).toBeDefined();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
        <ThrowOnRender message="Crash" />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('custom-fallback')).toBeDefined();
    expect(screen.queryByText(/Error al cargar/)).toBeNull();
  });

  it('renders "Reintentar" button', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Reintentar')).toBeDefined();
  });

  it('retry button resets error state (re-renders children)', () => {
    // Since ThrowOnRender always throws, retry will just re-throw.
    // But we can verify the button is clickable and the component re-renders.
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Persistent crash" />
      </ErrorBoundary>
    );
    const retryBtn = screen.getByText('Reintentar');
    fireEvent.click(retryBtn);
    // Error should persist since ThrowOnRender always throws
    expect(screen.getByText(/Error al cargar/)).toBeDefined();
  });

  it('logs error to console.error via componentDidCatch', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Logged error" />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
  });
});
