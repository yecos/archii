/**
 * /api/webhooks/route.ts
 * Gestión de webhooks y log de entregas.
 *
 * POST /api/webhooks
 *   Body: { action: 'create', tenantId, url, events?, name?, customHeaders? }
 *   Body: { action: 'delete', tenantId, webhookId }
 *   Body: { action: 'test', tenantId, webhookId }
 *
 * GET /api/webhooks?tenantId=xxx
 *   — Lista webhooks del tenant
 *
 * GET /api/webhooks?tenantId=xxx&deliveries=true
 *   — Lista log de entregas recientes
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  getWebhookDeliveries,
  generateWebhookSecret,
  dispatchWebhookEvent,
  generateEventId,
  type WebhookEventType,
} from '@/lib/webhook-service';
import { isFlagEnabled } from '@/lib/feature-flags';

export async function GET(request: NextRequest) {
  try {
    if (!isFlagEnabled('webhooks_system')) {
      return NextResponse.json({ error: 'Sistema de webhooks no habilitado' }, { status: 403 });
    }

    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const deliveries = searchParams.get('deliveries') === 'true';

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    if (deliveries) {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const logs = await getWebhookDeliveries(tenantId, limit);
      return NextResponse.json({ deliveries: logs, count: logs.length });
    }

    const webhooks = await listWebhooks(tenantId);
    return NextResponse.json({ webhooks, count: webhooks.length });
  } catch (error: any) {
    console.error('[Webhooks API] GET error:', error?.message);
    if (error?.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFlagEnabled('webhooks_system')) {
      return NextResponse.json({ error: 'Sistema de webhooks no habilitado' }, { status: 403 });
    }

    const user = await requireAuth(request);
    const body = await request.json();
    const { action, tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        if (!body.url?.trim()) {
          return NextResponse.json({ error: 'url requerida' }, { status: 400 });
        }

        // Validar URL
        try {
          new URL(body.url);
        } catch {
          return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
        }

        const secret = generateWebhookSecret();
        const webhookId = await createWebhook({
          tenantId,
          url: body.url,
          events: body.events || [],
          secret,
          name: body.name || body.url,
          active: body.active !== false,
          customHeaders: body.customHeaders,
          createdBy: user.uid,
        });

        return NextResponse.json({
          message: 'Webhook creado exitosamente',
          webhookId,
          secret,
          url: body.url,
        }, { status: 201 });
      }

      case 'delete': {
        if (!body.webhookId) {
          return NextResponse.json({ error: 'webhookId requerido' }, { status: 400 });
        }

        const deleted = await deleteWebhook(body.webhookId, tenantId);
        if (!deleted) {
          return NextResponse.json(
            { error: 'Webhook no encontrado o no pertenece al tenant' },
            { status: 404 }
          );
        }

        return NextResponse.json({ message: 'Webhook eliminado' });
      }

      case 'test': {
        if (!body.webhookId) {
          return NextResponse.json({ error: 'webhookId requerido' }, { status: 400 });
        }

        // Enviar un evento de prueba
        await dispatchWebhookEvent({
          event: 'task.created',
          tenantId,
          resourceId: 'test-id',
          resourceType: 'test',
          payload: {
            message: 'Webhook de prueba desde ArchiFlow',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
          eventId: generateEventId(),
        });

        return NextResponse.json({ message: 'Evento de prueba enviado' });
      }

      default:
        return NextResponse.json(
          { error: `Acción no válida: ${action}. Usa 'create', 'delete' o 'test'` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Webhooks API] POST error:', error?.message);
    if (error?.status === 401) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
