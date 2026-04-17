/**
 * /api/ai-file-manager/sync
 *
 * API ligera que solo recibe JSON (sin archivos binarios).
 * Sincroniza metadatos de archivos clasificados por IA a Firestore.
 *
 * Esto es fundamental para evitar el límite de body size de Vercel:
 * - Los archivos se suben DIRECTAMENTE desde el navegador a OneDrive (Graph API)
 * - Este API solo recibe metadatos JSON ligeros (~1KB por archivo)
 *
 * Accepts JSON body:
 *   {
 *     projectId: string,
 *     fileMetadata: Array<{
 *       driveItemId: string,        // ID del item en OneDrive
 *       driveWebUrl: string,        // URL web del archivo
 *       originalName: string,
 *       smartName: string,          // Nombre sugerido por la IA
 *       category: string,           // planos, fotos, contratos, etc.
 *       subcategory: string,        // arquitectonicos, obra, etc.
 *       phaseId: string | null,
 *       phaseName: string | null,
 *       processId: string | null,
 *       processName: string | null,
 *       tags: string[],
 *       description: string,
 *       confidence: number,
 *       size: number,
 *       mimeType: string,
 *       parentFolderId: string,     // ID de la carpeta de OneDrive
 *     }>
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getTenantIdForUser } from '@/lib/tenant-server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenantId = await getTenantIdForUser(user.uid);

    const body = await request.json();
    const { projectId, fileMetadata } = body as {
      projectId: string;
      fileMetadata: Array<{
        driveItemId: string;
        driveWebUrl: string;
        originalName: string;
        smartName: string;
        category: string;
        subcategory: string;
        phaseId: string | null;
        phaseName: string | null;
        processId: string | null;
        processName: string | null;
        tags: string[];
        description: string;
        confidence: number;
        size: number;
        mimeType: string;
        parentFolderId: string;
      }>;
    };

    if (!projectId || !fileMetadata || !Array.isArray(fileMetadata) || fileMetadata.length === 0) {
      return NextResponse.json({ error: 'Datos requeridos faltantes' }, { status: 400 });
    }

    if (fileMetadata.length > 50) {
      return NextResponse.json({ error: 'Maximo 50 archivos por solicitud' }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();
    const now = new Date();
    let ops = 0;

    for (const meta of fileMetadata) {
      const docId = `${projectId}_${meta.driveItemId}`;
      const docRef = db.collection('smart_files').doc(docId);

      batch.set(docRef, {
        // Identificacion
        projectId,
        tenantId,
        driveItemId: meta.driveItemId,
        driveWebUrl: meta.driveWebUrl || null,
        parentFolderId: meta.parentFolderId || null,

        // Nombres
        originalName: meta.originalName,
        smartName: meta.smartName,

        // Clasificacion IA
        category: meta.category,
        subcategory: meta.subcategory,
        phaseId: meta.phaseId || null,
        phaseName: meta.phaseName || null,
        processId: meta.processId || null,
        processName: meta.processName || null,
        tags: meta.tags || [],
        description: meta.description || '',
        confidence: meta.confidence || 0,

        // Metadatos del archivo
        size: meta.size || 0,
        mimeType: meta.mimeType || 'application/octet-stream',

        // Origen
        aiProcessed: true,
        uploadedBy: user.uid,
        uploadedByName: user.email || user.uid || 'Desconocido',

        // Fechas
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
      ops++;

      if (ops >= 500) break; // Firestore batch limit
    }

    if (ops > 0) await batch.commit();

    return NextResponse.json({
      success: true,
      synced: ops,
      message: `${ops} archivo(s) sincronizado(s) correctamente`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[AI File Manager Sync] Error:', msg);
    return NextResponse.json({ error: 'Error al sincronizar: ' + msg }, { status: 500 });
  }
}
