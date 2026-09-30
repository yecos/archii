import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { isPlatformAdminEmail } from '@/lib/api-auth';
import { PROJECT_TYPE_PHASES } from '@/lib/types';

const EDIT_ROLES = new Set(['Director', 'Arquitecto']);

function effectiveRole(params: {
  platformAdmin: boolean;
  isTenantSuperAdmin: boolean;
  storedRole: string;
}) {
  if (params.platformAdmin) return 'Admin';
  if (params.isTenantSuperAdmin) return 'Super Admin';
  // A stored "Admin" role is not authoritative; platform Admin comes only from ADMIN_EMAILS.
  return params.storedRole === 'Admin' ? 'Miembro' : params.storedRole;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.slice('Bearer '.length);
    const auth = getAdminAuth();
    let uid = '';
    let userEmail = '';
    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
      userEmail = decoded.email || '';
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { type, id, tenantId, data } = body || {};

    if (type !== 'project') {
      return NextResponse.json({ error: `Tipo no soportado: ${type || 'vacío'}` }, { status: 400 });
    }
    if (!id || !tenantId || !data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Faltan id, tenantId o data' }, { status: 400 });
    }

    const db = getAdminDb();
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Espacio de trabajo no encontrado' }, { status: 404 });
    }

    const tenantData = tenantDoc.data() || {};
    const members: string[] = tenantData.members || [];
    const superAdmins: string[] = tenantData.superAdmins || [];
    const isCreator = tenantData.createdBy === uid;
    const isTenantSuperAdmin = isCreator || superAdmins.includes(uid);
    const isTenantMember = members.includes(uid) || isTenantSuperAdmin;
    const platformAdmin = isPlatformAdminEmail(userEmail);

    if (!isTenantMember && !platformAdmin) {
      return NextResponse.json({ error: 'No eres miembro de este espacio de trabajo' }, { status: 403 });
    }

    const callerDoc = await db.collection('users').doc(uid).get();
    const storedRole = callerDoc.exists ? (callerDoc.data()?.role || 'Miembro') : 'Miembro';
    const role = effectiveRole({ platformAdmin, isTenantSuperAdmin, storedRole });
    const canEdit = role === 'Admin' || role === 'Super Admin' || EDIT_ROLES.has(role);

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Tu rol no permite editar proyectos' },
        { status: 403 },
      );
    }

    const projectRef = db.collection('projects').doc(id);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const current = projectDoc.data() || {};
    if (current.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Proyecto no pertenece a tu espacio' }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    const stringFields = ['name', 'status', 'client', 'location', 'description', 'startDate', 'endDate', 'companyId', 'projectType'];
    for (const key of stringFields) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        updates[key] = typeof data[key] === 'string' ? data[key] : String(data[key] ?? '');
      }
    }
    if (Object.prototype.hasOwnProperty.call(data, 'budget')) {
      updates.budget = Number(data.budget) || 0;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'progress')) {
      updates.progress = Math.min(100, Math.max(0, Number(data.progress) || 0));
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos editables para actualizar' }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = uid;

    const previousProjectType = current.projectType || 'Ejecución';
    await projectRef.update(updates);

    if (updates.projectType && updates.projectType !== previousProjectType) {
      const existing = await projectRef.collection('workPhases').get();
      const deleteBatch = db.batch();
      existing.docs.forEach((doc: any) => deleteBatch.delete(doc.ref));
      if (!existing.empty) await deleteBatch.commit();

      const enabledPhases: string[] = Array.isArray(data.enabledPhases) ? data.enabledPhases : [];
      const types = updates.projectType === 'Ambos' ? ['Diseño', 'Ejecución'] : [updates.projectType];
      const createBatch = db.batch();
      let order = 0;

      for (const phaseType of types) {
        const templates = PROJECT_TYPE_PHASES[phaseType] || [];
        for (const tpl of templates) {
          const phaseRef = projectRef.collection('workPhases').doc();
          createBatch.set(phaseRef, {
            name: tpl.name,
            description: tpl.description,
            status: 'Pendiente',
            order,
            startDate: '',
            endDate: '',
            createdAt: new Date().toISOString(),
            tenantId,
            type: phaseType,
            enabled: enabledPhases.length === 0 || enabledPhases.includes(tpl.key),
            phaseKey: tpl.key,
          });
          order += 1;
        }
      }

      if (order > 0) await createBatch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Archii] update-entity error:', err);
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
