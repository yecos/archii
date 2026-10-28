import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAuth } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { executeInventory, type InventoryAction } from '@/lib/inventory-service';
import { InventoryError } from '@/lib/inventory-stock';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }); }
    if (!body || typeof body.tenantId !== 'string' || typeof body.requestId !== 'string' || typeof body.action !== 'string' || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return NextResponse.json({ error: 'Faltan datos de la operación de inventario' }, { status: 400 });
    }
    const result = await executeInventory(getAdminDb(), user.uid, body.tenantId, body.requestId, body.action as InventoryAction, body.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AuthError || error instanceof InventoryError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[Archii] inventory operation failed:', error);
    return NextResponse.json({ error: 'No se pudo confirmar la operación. Reintenta con los mismos datos.' }, { status: 503 });
  }
}
