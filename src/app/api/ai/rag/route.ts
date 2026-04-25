/**
 * /api/ai/rag/route.ts
 * Endpoint RAG: búsqueda semántica y问答 con contexto.
 *
 * POST /api/ai/rag
 * Body:
 *   { action: 'search', tenantId, query, topK?, sourceFilter?, minScore? }
 *   { action: 'ask', tenantId, question, sourceFilter?, maxContext? }
 *   { action: 'index', tenantId, source, sourceDocId, text, chunkSize?, chunkOverlap?, metadata? }
 *   { action: 'delete', tenantId, sourceDocId }
 *   { action: 'reindex', tenantId, collection, textFields: string[] }
 *
 * Requiere autenticación Firebase + tenantId.
 * Gated por feature flag 'rag_search'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import {
  searchDocuments,
  askWithRAG,
  indexDocument,
  deleteDocumentChunks,
  reindexCollection,
} from '@/lib/rag-service';
import { isFlagEnabled } from '@/lib/feature-flags';

export async function POST(request: NextRequest) {
  try {
    // Feature gate
    if (!isFlagEnabled('rag_search')) {
      return NextResponse.json(
        { error: 'RAG search no está habilitado. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Auth
    const user = await requireAuth(request);
    const body = await request.json();
    const { action, tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    switch (action) {
      // ── Búsqueda semántica ──
      case 'search': {
        const { query, topK, sourceFilter, minScore } = body;
        if (!query?.trim()) {
          return NextResponse.json({ error: 'query requerida' }, { status: 400 });
        }

        const results = await searchDocuments({
          tenantId,
          query,
          topK: topK || 10,
          sourceFilter,
          minScore: minScore || 0.3,
        });

        return NextResponse.json({
          results,
          count: results.length,
          query,
        });
      }

      // ── Pregunta con contexto RAG ──
      case 'ask': {
        const { question, sourceFilter, maxContext } = body;
        if (!question?.trim()) {
          return NextResponse.json({ error: 'question requerida' }, { status: 400 });
        }

        const response = await askWithRAG(tenantId, question, {
          sourceFilter,
          maxContext: maxContext || 5,
        });

        return NextResponse.json(response);
      }

      // ── Indexar documento ──
      case 'index': {
        const { source, sourceDocId, text, chunkSize, chunkOverlap, metadata } = body;
        if (!source || !sourceDocId || !text?.trim()) {
          return NextResponse.json(
            { error: 'source, sourceDocId y text son requeridos' },
            { status: 400 }
          );
        }

        const chunkCount = await indexDocument({
          tenantId,
          source,
          sourceDocId,
          text,
          chunkSize,
          chunkOverlap,
          metadata,
        });

        return NextResponse.json({
          message: `Documento indexado: ${chunkCount} chunks creados`,
          chunkCount,
          source,
          sourceDocId,
        });
      }

      // ── Eliminar chunks de un documento ──
      case 'delete': {
        const { sourceDocId } = body;
        if (!sourceDocId) {
          return NextResponse.json({ error: 'sourceDocId requerido' }, { status: 400 });
        }

        const deletedCount = await deleteDocumentChunks(tenantId, sourceDocId);

        return NextResponse.json({
          message: `${deletedCount} chunks eliminados`,
          deletedCount,
        });
      }

      // ── Re-indexar colección completa ──
      case 'reindex': {
        const { collection, textFields } = body;
        if (!collection || !textFields?.length) {
          return NextResponse.json(
            { error: 'collection y textFields son requeridos' },
            { status: 400 }
          );
        }

        // Re-indexar es asíncrono — devolvemos confirmación inmediata
        reindexCollection(tenantId, collection, textFields).catch((err) => {
          console.error(`[RAG] Error en reindex asíncrono:`, err);
        });

        return NextResponse.json({
          message: `Re-indexación iniciada para ${collection}`,
          collection,
          textFields,
        });
      }

      default:
        return NextResponse.json(
          { error: `Acción no válida: ${action}. Usa 'search', 'ask', 'index', 'delete' o 'reindex'` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[RAG API] Error:', error?.message);

    if (error?.status === 401) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
