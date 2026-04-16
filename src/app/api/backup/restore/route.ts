/**
 * /api/backup/restore — Restore backup data to Firestore.
 * Auth via Firebase ID token. Validates backup format, writes collections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import type { ImportResult, ImportSummary, ImportConflictStrategy } from '@/lib/backup-service';

/** Maximum number of documents to restore per collection to prevent abuse */
const MAX_DOCS_PER_COLLECTION = 5000;

/** Maximum total documents across all collections */
const MAX_TOTAL_DOCS = 50000;

/**
 * POST /api/backup/restore
 * Body: { backupData: object, conflictStrategy: 'skip' | 'replace' | 'merge' }
 * Requires Authorization: Bearer <Firebase ID Token>
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const { backupData, conflictStrategy = 'skip' } = body as {
      backupData: Record<string, unknown>;
      conflictStrategy?: ImportConflictStrategy;
    };

    if (!backupData) {
      return NextResponse.json(
        { error: 'Se requiere backupData en el cuerpo de la solicitud.' },
        { status: 400 },
      );
    }

    // Validate backup structure
    const validationError = validateBackup(backupData);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const collections = backupData.collections as Array<{
      collection: string;
      count: number;
      documents: Array<{ id: string; data: Record<string, unknown> }>;
    }>;

    // Validate total document limits
    const totalDocs = collections.reduce((sum, c) => sum + c.count, 0);
    if (totalDocs > MAX_TOTAL_DOCS) {
      return NextResponse.json(
        { error: `El backup excede el límite de ${MAX_TOTAL_DOCS} documentos (${totalDocs}).` },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const result: ImportResult = {
      success: true,
      summary: [],
      totalCreated: 0,
      totalSkipped: 0,
      totalReplaced: 0,
      totalErrors: 0,
      errors: [],
    };

    // Process each collection
    for (const col of collections) {
      if (col.count === 0) continue;

      const colLimit = Math.min(col.count, MAX_DOCS_PER_COLLECTION);
      const summary: ImportSummary = {
        collection: col.collection,
        total: col.count,
        created: 0,
        skipped: 0,
        replaced: 0,
        errors: 0,
      };

      const docsToProcess = col.documents.slice(0, colLimit);

      // Firestore batches support max 500 operations
      const BATCH_SIZE = 400;
      for (let i = 0; i < docsToProcess.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = docsToProcess.slice(i, i + BATCH_SIZE);

        for (const doc of chunk) {
          try {
            const docRef = db.collection(col.collection).doc(doc.id);

            switch (conflictStrategy) {
              case 'skip': {
                // Check if document exists
                const existing = await docRef.get();
                if (existing.exists) {
                  summary.skipped++;
                } else {
                  // Clean data: remove server timestamp sentinels that can't be re-sent
                  const cleanData = cleanFirestoreData(doc.data);
                  batch.set(docRef, cleanData);
                  summary.created++;
                }
                break;
              }
              case 'replace': {
                const cleanData = cleanFirestoreData(doc.data);
                batch.set(docRef, cleanData, { merge: true });
                summary.replaced++;
                break;
              }
              case 'merge': {
                const cleanData = cleanFirestoreData(doc.data);
                batch.set(docRef, cleanData, { merge: true });
                summary.replaced++;
                break;
              }
            }
          } catch (err) {
            summary.errors++;
            result.errors.push(
              `${col.collection}/${doc.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        // Commit batch if there are operations
        if (summary.created > 0 || summary.replaced > 0) {
          try {
            await batch.commit();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push(`Batch commit error in ${col.collection}: ${msg}`);
          }
        }
      }

      result.summary.push(summary);
      result.totalCreated += summary.created;
      result.totalSkipped += summary.skipped;
      result.totalReplaced += summary.replaced;
      result.totalErrors += summary.errors;
    }

    result.success = result.totalErrors === 0;

    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[ArchiFlow Backup Restore] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ===== HELPERS ===== */

function validateBackup(data: Record<string, unknown>): string | null {
  if (!data || typeof data !== 'object') {
    return 'El archivo no es un objeto JSON válido.';
  }

  const { metadata, collections } = data;

  if (!metadata || typeof metadata !== 'object') {
    return 'El backup no contiene metadatos válidos.';
  }

  const meta = metadata as Record<string, unknown>;
  if (!meta.version || typeof meta.version !== 'string') {
    return 'Metadatos inválidos: falta versión.';
  }
  if (!meta.exportDate || typeof meta.exportDate !== 'string') {
    return 'Metadatos inválidos: falta fecha de exportación.';
  }

  if (!Array.isArray(collections)) {
    return 'El backup no contiene una lista de colecciones.';
  }

  for (const col of collections) {
    if (!col || typeof col !== 'object') continue;
    const c = col as Record<string, unknown>;
    if (typeof c.collection !== 'string') {
      return `Colección inválida: nombre faltante.`;
    }
    if (!Array.isArray(c.documents)) {
      return `Colección "${c.collection}": documentos no son un array.`;
    }
  }

  return null;
}

/**
 * Remove Firestore server timestamp sentinels and non-serializable values from data.
 * These objects have _isFieldValue: true and can't be re-sent as-is.
 */
function cleanFirestoreData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    // Skip Firestore FieldValue sentinels (they have _isFieldValue: true)
    if (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<string, unknown>)._isFieldValue === true
    ) {
      // Replace server timestamps with current server timestamp placeholder
      // The admin SDK will handle this on write
      continue;
    }

    // Handle nested objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = cleanFirestoreData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Clean array elements that might contain objects
      clean[key] = value.map((item) => {
        if (
          typeof item === 'object' &&
          item !== null &&
          (item as Record<string, unknown>)._isFieldValue === true
        ) {
          return null;
        }
        if (typeof item === 'object' && !Array.isArray(item) && item !== null) {
          return cleanFirestoreData(item as Record<string, unknown>);
        }
        return item;
      });
    } else {
      clean[key] = value;
    }
  }

  return clean;
}
