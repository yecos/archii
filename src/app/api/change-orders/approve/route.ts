import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError, isPlatformAdminEmail, requireAuth } from '@/lib/api-auth';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);
    const { coId, action, comments } = body ?? {};
    if (typeof coId !== 'string' || !coId || coId.includes('/')
      || (action !== 'approve' && action !== 'reject')) {
      throw new AuthError('Orden o acción inválida', 400);
    }
    if (comments !== undefined && typeof comments !== 'string') {
      throw new AuthError('Comentarios inválidos', 400);
    }
    const review = comments?.trim() ?? '';
    const approving = action === 'approve';
    if (!approving && !review) throw new AuthError('Se requiere una razón para rechazar', 400);

    const db = getAdminDb();
    const fieldValue = getAdminFieldValue();
    const orderRef = db.collection('changeOrders').doc(coId);
    const status = approving ? 'aprobada' : 'rechazada';

    await db.runTransaction(async transaction => {
      const order = (await transaction.get(orderRef)).data();
      if (!order || typeof order.tenantId !== 'string' || !order.tenantId || order.tenantId.includes('/')) {
        throw new AuthError('Orden de cambio no encontrada', 404);
      }

      const [workspaceSnapshot, profileSnapshot] = await Promise.all([
        transaction.get(db.collection('tenants').doc(order.tenantId)),
        transaction.get(db.collection('users').doc(user.uid)),
      ]);
      const workspace = workspaceSnapshot.data();
      if (!workspace?.members?.includes(user.uid)) {
        throw new AuthError('Orden de cambio no encontrada', 404);
      }
      const profile = profileSnapshot.data();
      const isWorkspaceAdmin = workspace.createdBy === user.uid || workspace.superAdmins?.includes(user.uid);
      if (!isWorkspaceAdmin && !isPlatformAdminEmail(user.email) && profile?.role !== 'Interventor') {
        throw new AuthError('Tu rol no permite revisar esta orden', 403);
      }
      if (order.status !== 'pendiente_aprobacion') {
        throw new AuthError('La orden no está pendiente de aprobación', 409);
      }

      const now = Timestamp.now();
      if (approving) {
        if (typeof order.projectId !== 'string' || !order.projectId || order.projectId.includes('/')) {
          throw new AuthError('Proyecto de la orden inválido', 409);
        }
        const projectRef = db.collection('projects').doc(order.projectId);
        const project = (await transaction.get(projectRef)).data();
        if (!project || project.tenantId !== order.tenantId) {
          throw new AuthError('El proyecto no está disponible en este espacio', 409);
        }
        const projectUpdates: { budget?: number; endDate?: string } = {};
        if (order.costImpact) {
          const budget = order.costImpact.newBudget;
          if (!Number.isFinite(budget) || budget < 0) throw new AuthError('Presupuesto inválido', 409);
          projectUpdates.budget = budget;
        }
        if (order.scheduleImpact) {
          const days = order.scheduleImpact.daysExtension;
          if (!Number.isSafeInteger(days) || days <= 0) throw new AuthError('Ampliación de plazo inválida', 409);
          const endDate = new Date(project.endDate);
          if (Number.isNaN(endDate.getTime())) throw new AuthError('El proyecto requiere una fecha de entrega válida', 409);
          endDate.setUTCDate(endDate.getUTCDate() + days);
          if (Number.isNaN(endDate.getTime())) throw new AuthError('La nueva fecha de entrega es inválida', 409);
          projectUpdates.endDate = endDate.toISOString().slice(0, 10);
        }
        if (Object.keys(projectUpdates).length) {
          transaction.update(projectRef, { ...projectUpdates, updatedAt: now });
        }
      }

      const reviewer = profile?.name || user.email || 'Usuario';
      transaction.update(orderRef, {
        status,
        ...(approving
          ? { approvedBy: user.uid, approvedByName: reviewer, approvedAt: now }
          : { rejectionReason: review }),
        reviewedComments: review,
        history: fieldValue.arrayUnion({
          action: approving ? 'approved' : 'rejected',
          by: user.uid,
          byName: reviewer,
          at: now,
          comments: review || 'Orden aprobada',
        }),
      });
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Archii] Error al revisar orden de cambio:', error);
    return NextResponse.json({ error: 'No se pudo revisar la orden de cambio' }, { status: 500 });
  }
}
