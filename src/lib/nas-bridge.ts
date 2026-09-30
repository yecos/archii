/**
 * nas-bridge.ts
 * Server-only client for the private S10 NAS bridge.
 */

import type { NasConfig } from '@/lib/nas-auth';

export interface NasFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mimeType?: string;
  lastModified?: string;
}

export class NasBridgeError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = 'NAS_BRIDGE_ERROR') {
    super(message);
    this.name = 'NasBridgeError';
    this.status = status;
    this.code = code;
  }
}

export async function nasBridgeFetch(
  config: NasConfig,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  const headers = new Headers(init.headers || {});
  headers.set('X-Archii-Bridge-Token', config.bridgeToken);
  headers.set('Accept', headers.get('Accept') || 'application/json');

  try {
    const response = await fetch(`${config.bridgeUrl}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `NAS Bridge respondió HTTP ${response.status}`;
      let code = 'NAS_BRIDGE_HTTP_ERROR';
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
        if (body?.code) code = body.code;
      } catch {
        // keep generic message
      }
      throw new NasBridgeError(message, response.status, code);
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof NasBridgeError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NasBridgeError('Tiempo de espera agotado al contactar la NAS', 504, 'NAS_TIMEOUT');
    }
    const message = error instanceof Error ? error.message : 'No se pudo contactar la NAS';
    throw new NasBridgeError(message, 502, 'NAS_UNREACHABLE');
  } finally {
    clearTimeout(timer);
  }
}

export function nasQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') sp.set(key, value);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}
