import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/api-auth';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import { verifyTenantMembership } from '@/lib/tenant-utils';

function limitText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.slice(0, max);
}

/**
 * POST /api/error-reports
 * Server-side error reporting. error_reports is intentionally server-write-only
 * in Firestore Security Rules, so authenticated clients submit reports here.
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId || typeof tenantId !== 'string') {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'message requerido' }, { status: 400 });
    }

    const isMember = await verifyTenantMembership(user.uid, tenantId);
    if (!isMember) {
      return NextResponse.json({ error: 'No tienes acceso a este tenant' }, { status: 403 });
    }

    const db = getAdminDb();
    const FieldValue = getAdminFieldValue();
    const now = FieldValue.serverTimestamp();

    const doc = await db.collection('error_reports').add({
      tenantId,
      userId: user.uid,
      userEmail: user.email || '',
      message: limitText(body.message, 5000),
      stack: limitText(body.stack, 20000),
      componentStack: limitText(body.componentStack, 12000),
      screen: limitText(body.screen, 200),
      userAgent: limitText(body.userAgent, 1000),
      resolved: false,
      timestamp: now,
      createdAt: now,
    });

    return NextResponse.json({ id: doc.id }, { status: 201 });
  } catch (error) {
    console.error('[ErrorReports] Failed to persist report:', error);
    return NextResponse.json({ error: 'No se pudo registrar el error' }, { status: 500 });
  }
}
