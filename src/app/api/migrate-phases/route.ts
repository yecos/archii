import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import { PROJECT_TYPE_PHASES } from '@/lib/types';

/**
 * POST /api/migrate-phases
 * Inicializa fases (tipo Ambos) en proyectos usando Admin SDK (bypass security rules).
 * Body: { tenantId, uid, projectId? }
 * - Si projectId: inicializa solo ese proyecto (force recreate)
 * - Si no: inicializa todos los proyectos del tenant que no tengan fases nuevas
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, uid, projectId } = body;
    if (!tenantId || !uid) {
      return NextResponse.json({ error: 'tenantId y uid son requeridos' }, { status: 400 });
    }

    const db = getAdminDb();
    const ts = getAdminFieldValue().serverTimestamp();

    if (projectId) {
      // Single project — force recreate
      const projDoc = await db.collection('projects').doc(projectId).get();
      if (!projDoc.exists) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }

      // Delete existing phases
      const phasesSnap = await db.collection('projects').doc(projectId).collection('workPhases').get();
      if (!phasesSnap.empty) {
        const batch = db.batch();
        phasesSnap.docs.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
      }

      // Create new phases (Ambos = Diseño + Ejecución, all enabled)
      const types = ['Diseño', 'Ejecución'];
      let globalOrder = 0;
      const batch = db.batch();

      for (const type of types) {
        const templates = PROJECT_TYPE_PHASES[type] || [];
        for (const tpl of templates) {
          const phaseRef = db.collection('projects').doc(projectId).collection('workPhases').doc();
          batch.set(phaseRef, {
            name: tpl.name,
            description: tpl.description,
            status: 'Pendiente',
            order: globalOrder,
            startDate: '',
            endDate: '',
            createdAt: ts,
            tenantId: tenantId,
            type,
            enabled: true,
            phaseKey: tpl.key,
          });
          globalOrder++;
        }
      }
      await batch.commit();

      // Update projectType
      await db.collection('projects').doc(projectId).update({ projectType: 'Ambos' });

      return NextResponse.json({
        message: `Fases inicializadas para el proyecto`,
        migrated: 1,
        skipped: 0,
      });
    }

    // Batch mode — all projects in tenant
    const projSnap = await db.collection('projects').where('tenantId', '==', tenantId).get();
    if (projSnap.empty) {
      return NextResponse.json({ message: 'No hay proyectos', migrated: 0, skipped: 0 });
    }

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const projDoc of projSnap.docs) {
      const projId = projDoc.id;
      const projData = projDoc.data();
      const projName = projData.name || projId;

      try {
        const phasesSnap = await db.collection('projects').doc(projId).collection('workPhases').get();
        const hasNewFormat = phasesSnap.docs.some((d: any) => d.data().phaseKey);

        if (hasNewFormat) {
          skipped++;
          if (!projData.projectType) {
            await db.collection('projects').doc(projId).update({ projectType: 'Ambos' });
          }
          continue;
        }

        // Delete old phases
        if (phasesSnap.size > 0) {
          const batch = db.batch();
          phasesSnap.docs.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
        }

        // Create new phases
        const types = ['Diseño', 'Ejecución'];
        let globalOrder = 0;
        const batch = db.batch();

        for (const type of types) {
          const templates = PROJECT_TYPE_PHASES[type] || [];
          for (const tpl of templates) {
            const phaseRef = db.collection('projects').doc(projId).collection('workPhases').doc();
            batch.set(phaseRef, {
              name: tpl.name,
              description: tpl.description,
              status: 'Pendiente',
              order: globalOrder,
              startDate: '',
              endDate: '',
              createdAt: ts,
              tenantId: tenantId,
              type,
              enabled: true,
              phaseKey: tpl.key,
            });
            globalOrder++;
          }
        }
        await batch.commit();

        await db.collection('projects').doc(projId).update({ projectType: 'Ambos' });

        migrated++;
        console.log(`[MigratePhases] OK: ${projName}`);
      } catch (err: any) {
        console.error(`[MigratePhases] Error en ${projName}:`, err);
        errors.push(`${projName}: ${err.message || err}`);
      }
    }

    return NextResponse.json({
      message: `Migración completada: ${migrated} migrados, ${skipped} omitidos`,
      migrated,
      skipped,
      errors,
    });
  } catch (err: any) {
    console.error('[MigratePhases] Error global:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
