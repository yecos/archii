/**
 * POST /api/notifications/push/send
 *
 * Envía notificaciones push usando la librería `web-push` con VAPID.
 *
 * Body individual: { userId, title, body, data? }
 * Body broadcast:  { broadcast: true, title, body, data? }
 *
 * Busca la suscripción en Firestore (colección `pushSubscriptions`)
 * y envía el payload al service worker del navegador destino.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/api-auth';
import webpush from 'web-push';

const COLLECTION = 'pushSubscriptions';

/** Configura claves VAPID para web-push (se ejecuta una sola vez) */
function configureVapid() {
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@archiflow.app';
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!privateKey || !publicKey) {
    throw new Error(
      'VAPID_PRIVATE_KEY y NEXT_PUBLIC_VAPID_PUBLIC_KEY deben estar configuradas en .env'
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/** Envía un push a una suscripción individual. */
async function sendToSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; icon?: string; data?: Record<string, string> }
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload),
      {
        TTL: 86400, // 24 horas
        urgency: 'normal',
      }
    );
    return true;
  } catch (err: any) {
    // 404 o 410 = suscripción inválida/expirada, se debería limpiar
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.warn(`[ArchiFlow Push] Suscripción expirada: ${subscription.endpoint}`);
    } else {
      console.error('[ArchiFlow Push] Error enviando push:', err.message);
    }
    return false;
  }
}

export async function POST(request: NextRequest) {
  /* ── Auth ── */
  let user: { uid: string };
  try {
    user = await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 401 });
  }

  /* ── Parse body ── */
  let body: {
    userId?: string;
    broadcast?: boolean;
    title?: string;
    body?: string;
    data?: Record<string, string>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  if (!body.title || !body.body) {
    return NextResponse.json(
      { error: 'Campos requeridos: title, body' },
      { status: 400 }
    );
  }

  /* ── Configure VAPID ── */
  try {
    configureVapid();
  } catch (err: any) {
    console.error('[ArchiFlow Push]', err.message);
    return NextResponse.json({ error: 'Configuración VAPID incompleta' }, { status: 500 });
  }

  /* ── Get Firestore ── */
  const { getAdminDb } = await import('@/lib/firebase-admin');
  const db = getAdminDb();

  const payload = {
    title: body.title,
    body: body.body,
    icon: '/icon-192.png',
    data: body.data || {},
  };

  try {
    /* ── Broadcast: enviar a todos los usuarios con suscripción activa ── */
    if (body.broadcast) {
      // Solo admins pueden hacer broadcast
      const ADMIN_EMAILS = ['yecos11@gmail.com'];
      const userSnap = await db.collection('users').doc(user.uid).get();
      const userEmail = userSnap.exists ? userSnap.data()?.email : '';
      if (!ADMIN_EMAILS.includes(userEmail)) {
        return NextResponse.json(
          { error: 'No autorizado para broadcast' },
          { status: 403 }
        );
      }

      const snap = await db
        .collection(COLLECTION)
        .where('active', '==', true)
        .get();

      let sent = 0;
      let failed = 0;
      const expiredEndpoints: string[] = [];

      for (const doc of snap.docs) {
        const sub = doc.data() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;

        // No enviarse a sí mismo en broadcast
        if (doc.id === user.uid) continue;

        const success = await sendToSubscription(sub, payload);
        if (success) {
          sent++;
        } else {
          failed++;
          expiredEndpoints.push(doc.id);
        }
      }

      // Limpiar suscripciones expiradas en background
      if (expiredEndpoints.length > 0) {
        const batch = db.batch();
        for (const uid of expiredEndpoints) {
          batch.update(db.collection(COLLECTION).doc(uid), { active: false });
        }
        await batch.commit();
        console.log(`[ArchiFlow Push] Marcadas ${expiredEndpoints.length} suscripciones como inactivas`);
      }

      return NextResponse.json({ ok: true, sent, failed, total: snap.size });
    }

    /* ── Individual: enviar a un usuario específico ── */
    if (!body.userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
    }

    const subDoc = await db.collection(COLLECTION).doc(body.userId).get();

    if (!subDoc.exists) {
      return NextResponse.json(
        { ok: true, sent: 0, reason: 'no_subscription' },
        { status: 200 }
      );
    }

    const subData = subDoc.data() as {
      active: boolean;
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!subData.active || !subData.endpoint || !subData.keys?.p256dh || !subData.keys?.auth) {
      return NextResponse.json(
        { ok: true, sent: 0, reason: 'inactive_subscription' },
        { status: 200 }
      );
    }

    const success = await sendToSubscription(subData, payload);

    if (!success) {
      // Si falló por suscripción expirada, desactivarla
      await db.collection(COLLECTION).doc(body.userId).update({ active: false });
      return NextResponse.json({ ok: true, sent: 0, reason: 'subscription_expired' });
    }

    return NextResponse.json({ ok: true, sent: 1 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('[ArchiFlow Push] Error enviando notificación:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
