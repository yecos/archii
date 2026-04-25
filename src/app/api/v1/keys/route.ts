/**
 * /api/v1/keys/route.ts
 * Gestión de API Keys.
 *
 * POST /api/v1/keys
 *   Body: { action: 'create', tenantId, name, permissions?, rateLimit?, expiresAt? }
 *
 * GET /api/v1/keys?tenantId=xxx
 *   — Lista API keys del tenant (sin hash)
 *
 * POST /api/v1/keys
 *   Body: { action: 'revoke', tenantId, keyId }
 *   — Revoca una API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import {
  createAPIKey,
  listAPIKeys,
  revokeAPIKey,
} from '@/lib/rate-limiter';
import { isFlagEnabled } from '@/lib/feature-flags';

export async function GET(request: NextRequest) {
  try {
    if (!isFlagEnabled('public_api')) {
      return NextResponse.json({ error: 'API pública no habilitada' }, { status: 403 });
    }

    const user = await requireAuth(request);
    const tenantId = new URL(request.url).searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    const keys = await listAPIKeys(tenantId);
    return NextResponse.json({ keys, count: keys.length });
  } catch (error: any) {
    console.error('[API Keys] GET error:', error?.message);
    if (error?.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFlagEnabled('public_api')) {
      return NextResponse.json({ error: 'API pública no habilitada' }, { status: 403 });
    }

    const user = await requireAuth(request);
    const body = await request.json();
    const { action, tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        if (!body.name?.trim()) {
          return NextResponse.json({ error: 'name requerido' }, { status: 400 });
        }

        const result = await createAPIKey({
          tenantId,
          name: body.name,
          createdBy: user.uid,
          permissions: body.permissions || ['read'],
          rateLimit: body.rateLimit,
          expiresAt: body.expiresAt,
        });

        // Solo mostramos la key completa UNA VEZ
        return NextResponse.json(
          {
            key: result.key,
            message: '⚠️ Guarda esta API Key ahora. No podrás verla de nuevo.',
            keyPrefix: result.record.keyPrefix,
            permissions: result.record.permissions,
            rateLimit: result.record.rateLimit,
            createdAt: result.record.createdAt,
          },
          { status: 201 }
        );
      }

      case 'revoke': {
        if (!body.keyId) {
          return NextResponse.json({ error: 'keyId requerido' }, { status: 400 });
        }

        const revoked = await revokeAPIKey(body.keyId, tenantId);
        if (!revoked) {
          return NextResponse.json({ error: 'API Key no encontrada o no pertenece al tenant' }, { status: 404 });
        }

        return NextResponse.json({ message: 'API Key revocada' });
      }

      default:
        return NextResponse.json(
          { error: `Acción no válida: ${action}. Usa 'create' o 'revoke'` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API Keys] POST error:', error?.message);
    if (error?.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
