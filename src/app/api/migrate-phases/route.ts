import { NextRequest, NextResponse } from 'next/server';
import { getFirebase } from '@/lib/firebase-service';
import { PROJECT_TYPE_PHASES } from '@/lib/types';

/**
 * POST /api/migrate-phases
 * Inicializa fases (tipo Ambos) en todos los proyectos que no las tengan.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, uid } = body;
    if (!tenantId || !uid) {
      return NextResponse.json({ error: 'tenantId y uid son requeridos' }, { status: 400 });
    }

    const fb = getFirebase();
    const db = fb.firestore();

    // 1. Get all projects for this tenant
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
        // 2. Check existing phases
        const phasesSnap = await db.collection('projects').doc(projId).collection('workPhases').get();
        const hasNewFormat = phasesSnap.docs.some((d: any) => d.data().phaseKey);

        if (hasNewFormat) {
          skipped++;
          if (!projData.projectType) {
            await db.collection('projects').doc(projId).update({ projectType: 'Ambos' });
          }
          continue;
        }

        // 3. Delete old phases if any
        if (phasesSnap.size > 0) {
          const batch = db.batch();
          phasesSnap.docs.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
        }

        // 4. Create new phases (Ambos = Diseño + Ejecución, all enabled)
        const types = ['Diseño', 'Ejecución'];
        const ts = db.FieldValue.serverTimestamp();
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

        // 5. Update project with projectType
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
