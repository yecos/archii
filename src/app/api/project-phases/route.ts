import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * GET /api/project-phases?projectId=xxx&tenantId=xxx
 * Lee fases usando Admin SDK (bypass security rules).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const tenantId = searchParams.get('tenantId');

    if (!projectId || !tenantId) {
      return NextResponse.json({ error: 'projectId y tenantId requeridos' }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection('projects').doc(projectId).collection('workPhases')
      .orderBy('order', 'asc').get();

    const phases = snap.docs.map((doc: any) => ({
      id: doc.id,
      data: doc.data(),
    }));

    return NextResponse.json({ phases });
  } catch (err: any) {
    console.error('[ProjectPhases] Error:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
