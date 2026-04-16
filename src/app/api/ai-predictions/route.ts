import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { routeAIRequest } from "@/lib/ai-router";

/**
 * POST /api/ai-predictions
 *
 * Genera predicciones inteligentes para proyectos de construcción:
 *   - "budget":     Predicción de sobrecosto o ahorro presupuestal
 *   - "timeline":   Predicción de retraso o adelanto en cronograma
 *   - "risks":      Análisis de riesgos multi-factorial
 *   - "full":       Predicción completa (budget + timeline + risks)
 */

const SYSTEM_PROMPT = `Eres ArchiFlow Predictive AI, un motor de análisis predictivo especializado en proyectos de construcción, arquitectura e interiorismo. Tu tono es analítico, profesional y SIEMPRE respondes en español.

Tu función es analizar datos históricos del proyecto y generar predicciones accionables con un enfoque cuantitativo cuando sea posible.

FORMATO DE RESPUESTA (IMPORTANTE — devuelve SOLO un JSON válido, sin texto adicional ni markdown):
{
  "prediction": {
    "type": "budget | timeline | risks | full",
    "overallRisk": "bajo | medio | alto | critico",
    "confidence": 75,
    "summary": "Resumen ejecutivo de 2-3 oraciones",
    "budget": {
      "currentBurnRate": 15000000,
      "projectedTotal": 85000000,
      "variance": -5000000,
      "variancePercent": -5.6,
      "riskLevel": "medio",
      "recommendation": "Recomendación específica de presupuesto",
      "monthlyForecast": [
        { "month": "Mayo", "projected": 12000000, "cumulative": 57000000 }
      ]
    },
    "timeline": {
      "currentVelocity": 4.2,
      "projectedEndDate": "2026-09-15",
      "plannedEndDate": "2026-08-01",
      "varianceDays": 45,
      "riskLevel": "alto",
      "recommendation": "Recomendación específica de cronograma",
      "milestones": [
        { "name": "Fase 2 Estructura", "plannedDate": "2026-06-01", "projectedDate": "2026-06-20", "status": "atrasado" }
      ]
    },
    "risks": [
      {
        "id": "risk-1",
        "title": "Título del riesgo",
        "description": "Descripción detallada del riesgo",
        "probability": 65,
        "impact": "alto",
        "category": "presupuesto | cronograma | recursos | calidad | legal",
        "mitigation": "Estrategia de mitigación sugerida"
      }
    ],
    "keyInsights": [
      "Insight 1: dato concreto sobre el proyecto",
      "Insight 2: otro dato relevante"
    ]
  }
}

Reglas:
- Calcula proyecciones basándote en los datos reales proporcionados.
- La "confidence" debe ser un número del 30 al 95 basado en la cantidad y calidad de datos.
- Los montos deben estar en COP (pesos colombianos).
- Sé específico con números, fechas y porcentajes.
- Los riesgos deben tener mitigaciones accionables.
- Si hay pocos datos, reduce la confidence y menciona la limitación.
- Prioriza riesgos por (probabilidad × impacto).`;

type PredictionType = "budget" | "timeline" | "risks" | "full";

interface MonthlyForecast {
  month: string;
  projected: number;
  cumulative: number;
}

interface MilestonePrediction {
  name: string;
  plannedDate: string;
  projectedDate: string;
  status: "adelantado" | "a tiempo" | "atrasado" | "en riesgo";
}

interface RiskPrediction {
  id: string;
  title: string;
  description: string;
  probability: number;
  impact: "bajo" | "medio" | "alto" | "critico";
  category: string;
  mitigation: string;
}

interface AIPrediction {
  type: PredictionType;
  overallRisk: string;
  confidence: number;
  summary: string;
  budget?: {
    currentBurnRate: number;
    projectedTotal: number;
    variance: number;
    variancePercent: number;
    riskLevel: string;
    recommendation: string;
    monthlyForecast: MonthlyForecast[];
  };
  timeline?: {
    currentVelocity: number;
    projectedEndDate: string;
    plannedEndDate: string;
    varianceDays: number;
    riskLevel: string;
    recommendation: string;
    milestones: MilestonePrediction[];
  };
  risks?: RiskPrediction[];
  keyInsights?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocData = Record<string, any>;

async function callAI(userPrompt: string, userId: string): Promise<AIPrediction> {
  try {
    const { model, provider } = await routeAIRequest({
      taskType: 'analysis',
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2500,
      temperature: 0.4, // Low temp for more analytical/deterministic output
      userId,
    });

    console.log(`[AI Predictions] Using ${provider}`);

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      maxOutputTokens: 2500,
      temperature: 0.4,
    });

    try {
      const jsonStr = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      const parsed = JSON.parse(jsonStr);
      return parsed.prediction || parsed || {};
    } catch {
      console.warn("[AI Predictions] Could not parse JSON:", text.substring(0, 300));
      return {
        type: 'full',
        overallRisk: 'medio',
        confidence: 30,
        summary: 'No se pudo generar una predicción precisa. Intenta nuevamente con más datos en el proyecto.',
        keyInsights: ['Datos insuficientes para una predicción confiable'],
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[AI Predictions] Provider error:', msg);
    throw new Error(`PROVIDER_ERROR: ${msg}`);
  }
}

/** Helper: map Firestore snapshot docs to typed array */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapDocs(snap: any): DocData[] {
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
}

function buildBudgetPrompt(project: DocData, expenses: DocData[], tasks: DocData[]): string {
  const budget = Number(project.budget) || 0;
  const totalSpent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const now = new Date();
  const created = project.createdAt?.toDate ? project.createdAt.toDate() : new Date(project.createdAt || now);
  const monthsElapsed = Math.max(1, Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const burnRate = monthsElapsed > 0 ? totalSpent / monthsElapsed : 0;
  const remaining = budget - totalSpent;

  return `Genera una PREDICCIÓN DE PRESUPUESTO para el siguiente proyecto de construcción.

Datos del proyecto:
- Nombre: ${project.name || 'Sin nombre'}
- Presupuesto total: $${budget.toLocaleString('es-CO')} COP
- Total gastado: $${totalSpent.toLocaleString('es-CO')} COP
- Meses transcurridos: ${monthsElapsed}
- Burn rate mensual actual: $${Math.round(burnRate).toLocaleString('es-CO')} COP/mes
- Saldo restante: $${remaining.toLocaleString('es-CO')} COP
- Porcentaje ejecutado: ${budget ? Math.round((totalSpent / budget) * 100) : 0}%

Gastos por categoría:
${expenses.reduce((acc: Record<string, number>, e) => {
  const cat = e.category || 'Otro';
  acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
  return acc;
}, {} as Record<string, number>)}

Tareas completadas: ${tasks.filter((t) => t.status === 'Completado').length} de ${tasks.length}

Genera la predicción con:
1. Proyección del gasto total al cierre
2. Variación vs presupuesto (positive = sobrecosto, negative = ahorro)
3. Forecast mensual para los próximos 3-4 meses
4. Nivel de riesgo y recomendaciones específicas`;
}

function buildTimelinePrompt(project: DocData, tasks: DocData[]): string {
  const now = new Date();
  const completedTasks = tasks.filter((t) => t.status === 'Completado');
  const inProgressTasks = tasks.filter((t) => t.status === 'En progreso');
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Completado' || !t.dueDate) return false;
    return new Date(t.dueDate) < now;
  });

  // Calculate velocity: tasks completed per week (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentCompleted = completedTasks.filter((t) => {
    const completedAt = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.updatedAt || 0);
    return completedAt >= thirtyDaysAgo;
  });
  const velocity = recentCompleted.length / 4.3; // per week

  const pendingTasks = tasks.length - completedTasks.length;
  const projectedWeeksRemaining = velocity > 0 ? Math.ceil(pendingTasks / velocity) : 0;

  return `Genera una PREDICCIÓN DE CRONOGRAMA para el siguiente proyecto de construcción.

Datos del proyecto:
- Nombre: ${project.name || 'Sin nombre'}
- Estado: ${project.status || 'Sin estado'}
- Fecha de inicio: ${project.startDate || 'No definida'}
- Fecha límite: ${project.dueDate || 'No definida'}

Métricas de tareas:
- Total tareas: ${tasks.length}
- Completadas: ${completedTasks.length}
- En progreso: ${inProgressTasks.length}
- Vencidas: ${overdueTasks.length}
- Velocidad actual: ${velocity.toFixed(1)} tareas/semana (últimos 30 días)
- Tareas pendientes: ${pendingTasks}
- Semanas proyectadas restantes: ${projectedWeeksRemaining}

Tareas vencidas:
${overdueTasks.slice(0, 10).map((t) => `- ${t.title}: vencida el ${t.dueDate}`).join('\n')}

Genera la predicción con:
1. Fecha proyectada de finalización
2. Varianza en días vs fecha planificada
3. Predicción por milestones principales (usa las fases del proyecto si existen)
4. Nivel de riesgo cronograma y recomendaciones`;
}

function buildRisksPrompt(project: DocData, expenses: DocData[], tasks: DocData[], changeOrders: DocData[]): string {
  const budget = Number(project.budget) || 0;
  const totalSpent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const now = new Date();
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Completado' || !t.dueDate) return false;
    return new Date(t.dueDate) < now;
  });
  const pendingChangeOrders = changeOrders.filter((c) =>
    ['Solicitada', 'En Revisión'].includes(c.status)
  );
  const approvedChangeOrders = changeOrders.filter((c) =>
    ['Aprobada', 'Implementada'].includes(c.status)
  );
  const totalImpactBudget = approvedChangeOrders.reduce((s, c) => s + (Number(c.impactBudget) || 0), 0);
  const totalImpactDays = approvedChangeOrders.reduce((s, c) => s + (Number(c.impactDays) || 0), 0);

  return `Genera un ANÁLISIS DE RIESGOS MULTI-FACTORIAL para el siguiente proyecto de construcción.

Datos del proyecto:
- Nombre: ${project.name || 'Sin nombre'}
- Estado: ${project.status || 'Sin estado'}
- Presupuesto: $${budget.toLocaleString('es-CO')} COP (${budget ? Math.round((totalSpent / budget) * 100) : 0}% ejecutado)
- Avance tareas: ${tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'Completado').length / tasks.length) * 100) : 0}%

Factores de riesgo identificados:
1. PRESUPUESTO: ${budget > 0 && totalSpent / budget > 0.8 ? 'Ejecución mayor al 80% - RIESGO ALTO' : 'Ejecución normal'}
2. CRONOGRAMA: ${overdueTasks.length > 3 ? `${overdueTasks.length} tareas vencidas - RIESGO ALTO` : `${overdueTasks.length} tareas vencidas`}
3. CAMBIOS: ${pendingChangeOrders.length} cambios pendientes, ${approvedChangeOrders.length} aprobados
4. IMPACTO ACUMULADO: +$${totalImpactBudget.toLocaleString('es-CO')} COP, +${totalImpactDays} días

Gastos por categoría:
${Object.entries(expenses.reduce((acc: Record<string, number>, e) => {
  const cat = e.category || 'Otro';
  acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
  return acc;
}, {} as Record<string, number>)).map(([cat, amt]) => `- ${cat}: $${amt.toLocaleString('es-CO')}`).join('\n')}

Genera entre 4 y 8 riesgos priorizados con:
- Título descriptivo
- Probabilidad estimada (30-90%)
- Impacto (bajo/medio/alto/critico)
- Categoría (presupuesto/cronograma/recursos/calidad/legal)
- Mitigación accionable`;
}

export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth(request);
    } catch (authError) {
      return authError as NextResponse;
    }

    // Rate limit: 5 requests per minute (predictions are expensive)
    const rateLimit = checkRateLimit(request, { maxRequests: 5, windowSeconds: 60 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Demasiadas peticiones de predicción.", prediction: null },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            ...getRateLimitHeaders(rateLimit),
          },
        }
      );
    }

    const body = await request.json();
    const { type, projectId } = body;

    const validTypes: PredictionType[] = ["budget", "timeline", "risks", "full"];
    if (!type || !validTypes.includes(type as PredictionType)) {
      return NextResponse.json(
        { error: `Tipo inválido. Debe ser uno de: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "Se requiere un projectId para generar predicciones" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const uid = user.uid;

    // Fetch project data
    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const project: DocData = { id: projectSnap.id, ...projectSnap.data() };

    // Fetch related data in parallel
    const [tasksSnap, expensesSnap, changeOrdersSnap] = await Promise.all([
      db.collection("tasks").where("projectId", "==", projectId).limit(100).get(),
      db.collection("expenses").where("projectId", "==", projectId).limit(100).get(),
      db.collection("changeOrders").where("projectId", "==", projectId).limit(50).get(),
    ]);

    const tasks: DocData[] = snapDocs(tasksSnap);
    const expenses: DocData[] = snapDocs(expensesSnap);
    const changeOrders: DocData[] = snapDocs(changeOrdersSnap);

    let prompt = "";
    const predType = type as PredictionType;

    if (predType === "budget") {
      prompt = buildBudgetPrompt(project, expenses, tasks);
    } else if (predType === "timeline") {
      prompt = buildTimelinePrompt(project, tasks);
    } else if (predType === "risks") {
      prompt = buildRisksPrompt(project, expenses, tasks, changeOrders);
    } else {
      // "full" — comprehensive prediction
      prompt = `Genera una PREDICCIÓN COMPLETA (presupuesto + cronograma + riesgos) para el siguiente proyecto de construcción.

${buildBudgetPrompt(project, expenses, tasks)}

${buildTimelinePrompt(project, tasks)}

${buildRisksPrompt(project, expenses, tasks, changeOrders)}

Genera la predicción completa con todas las secciones: budget, timeline, risks y keyInsights.
El overallRisk debe considerar los tres factores combinados.`;
    }

    const prediction = await callAI(prompt, uid);

    return NextResponse.json({
      prediction,
      projectId,
      type: predType,
      dataPoints: {
        tasksCount: tasks.length,
        expensesCount: expenses.length,
        changeOrdersCount: changeOrders.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[ArchiFlow AI Predictions] Error:", message);

    if (message === "API_KEY_NOT_CONFIGURED" || message.startsWith("PROVIDER_ERROR")) {
      const detail = message.startsWith("PROVIDER_ERROR") ? message.replace("PROVIDER_ERROR: ", "") : message;
      return NextResponse.json(
        {
          error: "IA no disponible",
          message: `No se pudo conectar con los proveedores de IA. ${detail}`,
          prediction: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
