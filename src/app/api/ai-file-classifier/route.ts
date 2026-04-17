/**
 * /api/ai-file-classifier
 *
 * Analiza archivos con IA y devuelve metadatos inteligentes:
 *   - Nombre sugerido (renombrado)
 *   - Categoría (planos, fotos, contratos, presupuestos, permisos, otros)
 *   - Subcategoría (arquitectónicos, fachada, etc.)
 *   - Fase y proceso del proyecto asociado
 *   - Tags descriptivos
 *   - Descripción del contenido
 *
 * Accepts JSON body:
 *   {
 *     files: Array<{ name: string; type: string; size: number }>,
 *     projectPhases: Array<{ id: string; name: string; processes: Array<{ id: string; name: string }> }>,
 *     projectName: string,
 *     locale?: string  // default 'es'
 *   }
 *
 * Returns JSON:
 *   {
 *     results: Array<{
 *       originalName: string;
 *       suggestedName: string;
 *       category: string;
 *       subcategory: string;
 *       phaseId: string | null;
 *       phaseName: string | null;
 *       processId: string | null;
 *       processName: string | null;
 *       tags: string[];
 *       description: string;
 *       confidence: number;
 *     }>
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { routeAIRequest, type AITaskType } from '@/lib/ai-router';
import { getTenantIdForUser } from '@/lib/tenant-server';
import { generateText } from 'ai';

// ===== FILE EXTENSION MAP =====
const EXT_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  // Planos
  '.dwg': { category: 'planos', subcategory: 'arquitectonicos' },
  '.dxf': { category: 'planos', subcategory: 'arquitectonicos' },
  '.skp': { category: 'planos', subcategory: '3d' },
  '.rvt': { category: 'planos', subcategory: 'bim' },
  '.ifc': { category: 'planos', subcategory: 'bim' },
  '.plt': { category: 'planos', subcategory: 'plotting' },
  '.3dm': { category: 'planos', subcategory: '3d' },
  // Imágenes
  '.jpg': { category: 'fotos', subcategory: 'obra' },
  '.jpeg': { category: 'fotos', subcategory: 'obra' },
  '.png': { category: 'fotos', subcategory: 'obra' },
  '.heic': { category: 'fotos', subcategory: 'obra' },
  '.webp': { category: 'fotos', subcategory: 'obra' },
  '.gif': { category: 'fotos', subcategory: 'obra' },
  '.svg': { category: 'fotos', subcategory: 'graficos' },
  '.bmp': { category: 'fotos', subcategory: 'obra' },
  // Documentos
  '.pdf': { category: 'documentos', subcategory: 'general' },
  '.doc': { category: 'documentos', subcategory: 'word' },
  '.docx': { category: 'documentos', subcategory: 'word' },
  '.xls': { category: 'documentos', subcategory: 'excel' },
  '.xlsx': { category: 'documentos', subcategory: 'excel' },
  '.csv': { category: 'documentos', subcategory: 'datos' },
  '.ppt': { category: 'documentos', subcategory: 'presentacion' },
  '.pptx': { category: 'documentos', subcategory: 'presentacion' },
  '.txt': { category: 'documentos', subcategory: 'general' },
  '.rtf': { category: 'documentos', subcategory: 'general' },
  // Video
  '.mp4': { category: 'fotos', subcategory: 'video' },
  '.mov': { category: 'fotos', subcategory: 'video' },
  '.avi': { category: 'fotos', subcategory: 'video' },
  // Audio
  '.mp3': { category: 'documentos', subcategory: 'audio' },
  '.wav': { category: 'documentos', subcategory: 'audio' },
  // CAD additional
  '.pdf_plot': { category: 'planos', subcategory: 'planos_impresos' },
};

function getExtCategory(fileName: string): { category: string; subcategory: string } | null {
  const dotIdx = fileName.lastIndexOf('.');
  if (dotIdx === -1) return null;
  const ext = fileName.substring(dotIdx).toLowerCase();
  return EXT_CATEGORY_MAP[ext] || null;
}

function guessCategoryFromMimeType(mimeType: string): { category: string; subcategory: string } {
  if (mimeType.startsWith('image/')) return { category: 'fotos', subcategory: 'obra' };
  if (mimeType.startsWith('video/')) return { category: 'fotos', subcategory: 'video' };
  if (mimeType.startsWith('audio/')) return { category: 'documentos', subcategory: 'audio' };
  if (mimeType.includes('pdf')) return { category: 'documentos', subcategory: 'general' };
  if (mimeType.includes('word') || mimeType.includes('document')) return { category: 'documentos', subcategory: 'word' };
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return { category: 'documentos', subcategory: 'excel' };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return { category: 'documentos', subcategory: 'presentacion' };
  return { category: 'otros', subcategory: 'general' };
}

const CLASSIFIER_SYSTEM_PROMPT = `Eres un asistente de IA para gestión de proyectos de construcción. Tu trabajo es analizar archivos y asignarles metadatos inteligentes.

CATEGORÍAS disponibles:
- planos: dibujos técnicos, planos arquitectónicos, estructurales, de instalaciones, BIM
- fotos: fotografías de obra, fachada, interiores, progreso, entregas, renders, videos
- contratos: contratos de obra, anexos, convenios, actas
- presupuestos: cotizaciones, estimaciones, costos, análisis de precios
- permisos: licencias, aprobaciones, certificados, actas de inspección
- documentos: oficios, memorandos, reportes, actas, minutas
- otros: cualquier otro tipo de archivo

SUBCATEGORÍAS comunes por categoría:
- planos: arquitectonicos, estructurales, instalaciones, 3d, bim, electricos, hidraulicos, gas
- fotos: fachada, interiores, progreso_obra, entregas, renders, equipo, materiales, seguridad
- contratos: obra, anexo, convenio, acta
- presupuestos: cotizacion, estimacion, analisis_precios
- permisos: licencia_construccion, certificado, inspeccion, ambiental
- documentos: oficio, reporte, acta, minuta, especificacion_tecnica

Reglas para el nombre sugerido:
- Formato: {Tipo}_{Descripcion}_{Fecha}.{extension}
- Ejemplo: Plano_PlantaArquitectonica_2024-01-15.pdf
- Ejemplo: Foto_FachadaPrincipal_2024-03-20.jpg
- Ejemplo: Contrato_ObraCivilEstructura_2024-02-10.pdf
- Ejemplo: Presupuesto_CimentacionYCimientos_2024-01-05.xlsx
- Mantener la extensión original
- Fecha: usar la fecha actual (hoy) si no se puede inferir del nombre
- Palabras en español, sin espacios especiales (usar guion bajo)
- Máximo 80 caracteres para el nombre completo

Responde SIEMPRE en JSON válido con esta estructura exacta (un array):
[
  {
    "suggestedName": "nombre_sugerido.ext",
    "category": "planos",
    "subcategory": "arquitectonicos",
    "phaseId": "ID_DE_FASE_O_NULL",
    "processId": "ID_DE_PROCESO_O_NULL",
    "tags": ["tag1", "tag2", "tag3"],
    "description": "Descripción breve del archivo en español",
    "confidence": 0.85
  }
]

IMPORTANTE:
- Si no puedes asociar una fase/proceso con confianza, usa null para phaseId y processId
- La confianza (confidence) va de 0.0 a 1.0
- Si el nombre del archivo ya es descriptivo, mejóralo mínimamente
- Los tags deben ser en español, relevantes al contenido inferido
- Responde ÚNICAMENTE con el JSON, sin texto adicional ni markdown`;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenantId = await getTenantIdForUser(user.uid);

    const body = await request.json();
    const { files, projectPhases, projectName } = body as {
      files: Array<{ name: string; type: string; size: number }>;
      projectPhases: Array<{ id: string; name: string; processes: Array<{ id: string; name: string }> }>;
      projectName: string;
      locale?: string;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron archivos' }, { status: 400 });
    }

    if (files.length > 20) {
      return NextResponse.json({ error: 'Máximo 20 archivos por solicitud' }, { status: 400 });
    }

    // Build phases context for the AI
    const phasesContext = projectPhases && projectPhases.length > 0
      ? projectPhases.map(p => ({
          id: p.id,
          name: p.name,
          processes: (p.processes || []).map(pr => ({ id: pr.id, name: pr.name }))
        }))
      : [];

    // Build file info for the AI
    const filesInfo = files.map(f => {
      const extCat = getExtCategory(f.name);
      const mimeCat = guessCategoryFromMimeType(f.type);
      return {
        name: f.name,
        mimeType: f.type,
        sizeKB: Math.round((f.size || 0) / 1024),
        extHint: extCat ? `${extCat.category}/${extCat.subcategory}` : mimeCat.category,
      };
    });

    const today = new Date().toISOString().split('T')[0];

    const userMessage = `Proyecto: "${projectName || 'Proyecto sin nombre'}"
Fecha de hoy: ${today}

Fases y procesos del proyecto:
${phasesContext.length > 0 ? JSON.stringify(phasesContext, null, 2) : 'No hay fases definidas en el proyecto.'}

Archivos a clasificar (${filesInfo.length}):
${filesInfo.map((f, i) => `${i + 1}. "${f.name}" — Tipo: ${f.mimeType}, Tamaño: ${f.sizeKB}KB, Pista: ${f.extHint}`).join('\n')}

Clasifica cada archivo y devuelve el JSON.`;

    // Call AI
    const aiResult = await routeAIRequest({
      taskType: 'analysis' as AITaskType,
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
      maxTokens: 4000,
      temperature: 0.3,
    });

    const result = await generateText({
      model: aiResult.model,
      system: CLASSIFIER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 4000,
      temperature: 0.3,
    } as any);

    // Parse AI response
    let aiResults: Array<Record<string, unknown>>;
    try {
      // Try to extract JSON from the response (it might have markdown backticks)
      let text = result.text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      aiResults = JSON.parse(text);
    } catch (parseErr) {
      console.error('[AI File Classifier] Failed to parse AI response:', parseErr, 'Raw:', result.text?.substring(0, 500));
      // Fallback: generate basic metadata from file extensions
      aiResults = files.map(f => {
        const extCat = getExtCategory(f.name) || guessCategoryFromMimeType(f.type);
        const ext = f.name.includes('.') ? f.name.substring(f.name.lastIndexOf('.')) : '';
        const baseName = f.name.replace(ext, '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_\-]/g, '_');
        return {
          suggestedName: `${extCat.category}_${baseName}_${today}${ext}`,
          category: extCat.category,
          subcategory: extCat.subcategory,
          phaseId: null,
          processId: null,
          tags: [extCat.category, extCat.subcategory],
          description: `Archivo ${f.name} clasificado automáticamente por extensión`,
          confidence: 0.5,
        };
      });
    }

    // Merge AI results with original file names
    const results = files.map((f, i) => {
      const ai = aiResults[i] || {};
      const ext = f.name.includes('.') ? f.name.substring(f.name.lastIndexOf('.')) : '';
      const suggestedName = (ai.suggestedName as string) || `${f.name.replace(ext, '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_\-]/g, '_')}_${today}${ext}`;

      // Ensure extension matches
      const finalName = suggestedName.toLowerCase().endsWith(ext.toLowerCase())
        ? suggestedName
        : suggestedName + ext;

      return {
        originalName: f.name,
        suggestedName: finalName,
        category: (ai.category as string) || 'otros',
        subcategory: (ai.subcategory as string) || 'general',
        phaseId: (ai.phaseId as string) || null,
        phaseName: null, // will be filled on client
        processId: (ai.processId as string) || null,
        processName: null, // will be filled on client
        tags: Array.isArray(ai.tags) ? ai.tags.filter((t: unknown) => typeof t === 'string') : [],
        description: (ai.description as string) || '',
        confidence: typeof ai.confidence === 'number' ? ai.confidence : 0.5,
      };
    });

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[AI File Classifier] Error:', msg);
    return NextResponse.json({ error: 'Error al clasificar archivos: ' + msg }, { status: 500 });
  }
}
