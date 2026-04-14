/**
 * toast-dom.ts
 * Sistema de notificaciones toast basado en DOM puro.
 * No depende de React ni de sonner — funciona siempre.
 *
 * Se usa como fallback cuando el Toaster de sonner no renderiza
 * (compatibilidad React 19 + Next.js 16).
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  element: HTMLDivElement;
  timeout: ReturnType<typeof setTimeout>;
}

let container: HTMLDivElement | null = null;
const activeToasts: Map<string, ToastItem> = new Map();
let idCounter = 0;

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#34d399', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   text: '#f87171', icon: '✕' },
  warning: { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  text: '#fbbf24', icon: '⚠' },
  info:    { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  text: '#60a5fa', icon: 'ℹ' },
};

function getContainer(): HTMLDivElement {
  if (container && document.body.contains(container)) return container;

  container = document.createElement('div');
  container.id = 'af-dom-toast-container';
  container.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  document.body.appendChild(container);
  return container;
}

function createToastElement(id: string, message: string, type: ToastType): HTMLDivElement {
  const colors = COLORS[type] || COLORS.info;

  const el = document.createElement('div');
  el.id = `af-toast-${id}`;
  el.style.cssText = `
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 10px;
    background: ${colors.bg};
    border: 1px solid ${colors.border};
    color: ${colors.text};
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    max-width: 420px;
    width: max-content;
    opacity: 0;
    transform: translateY(-12px) scale(0.95);
    transition: opacity 0.3s ease, transform 0.3s ease;
    white-space: nowrap;
  `;

  // Icon
  const iconEl = document.createElement('span');
  iconEl.textContent = colors.icon;
  iconEl.style.cssText = `
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
  `;
  el.appendChild(iconEl);

  // Message
  const msgEl = document.createElement('span');
  msgEl.textContent = message;
  msgEl.style.cssText = `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
  el.appendChild(msgEl);

  // Close button
  const closeEl = document.createElement('button');
  closeEl.textContent = '×';
  closeEl.style.cssText = `
    flex-shrink: 0;
    background: none;
    border: none;
    color: ${colors.text};
    font-size: 18px;
    cursor: pointer;
    padding: 0 2px;
    opacity: 0.7;
    line-height: 1;
    margin-left: 4px;
  `;
  closeEl.addEventListener('click', () => dismissToast(id));
  el.appendChild(closeEl);

  return el;
}

function dismissToast(id: string) {
  const item = activeToasts.get(id);
  if (!item) return;

  clearTimeout(item.timeout);
  item.element.style.opacity = '0';
  item.element.style.transform = 'translateY(-12px) scale(0.95)';

  setTimeout(() => {
    item.element.remove();
    activeToasts.delete(id);
  }, 300);
}

/**
 * Show a toast notification using pure DOM manipulation.
 * Works everywhere — no React, no sonner dependency.
 * Safe for SSR: returns immediately if not in browser.
 */
export function domToast(message: string, type: ToastType = 'info', duration = 4000): string {
  if (typeof document === 'undefined') return 'ssr-skip';
  const id = `dom-${++idCounter}`;
  const c = getContainer();

  const element = createToastElement(id, message, type);
  c.appendChild(element);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0) scale(1)';
    });
  });

  const timeout = setTimeout(() => dismissToast(id), duration);

  activeToasts.set(id, { id, message, type, element, timeout });
  return id;
}

/** Dismiss a specific toast by id */
export function dismissDomToast(id: string) {
  if (typeof document === 'undefined') return;
  dismissToast(id);
}

/** Dismiss all active toasts */
export function dismissAllDomToasts() {
  if (typeof document === 'undefined') return;
  activeToasts.forEach((_, id) => dismissToast(id));
}
