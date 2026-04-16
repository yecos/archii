/**
 * ai-tools.ts
 * Herramientas del Agente IA para ArchiFlow — Nivel 1 + Nivel 2 + Nivel 3 (Fase 3).
 * Usa Vercel AI SDK tool() wrapper. Consolidadas desde route.ts.
 *
 * Fase 1: Tareas, gastos, consultas básicas
 * Fase 2: Edición avanzada de tareas, consultas de gastos y presupuesto
 * Fase 3: Inventario, facturación, cotizaciones, reuniones, reportes
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';

const FV = getAdminFieldValue();

/** Admin SDK document spread type — preserves dynamic fields with proper typing. */
type AdminDoc = Record<string, unknown> & { id: string };

/* ===== Factory: crea todas las tools con userId inyectado ===== */
export function createAgentTools(userId: string) {
  const db = getAdminDb();

  return {
    /* ==========================================================================
     * NIVEL 1: Escritura básica — Tareas y Gastos
     * ========================================================================== */

    createTask: tool({
      description: 'Crea una nueva tarea en un proyecto existente. Úsala cuando el usuario quiere agregar una tarea, pendiente o actividad.',
      inputSchema: z.object({
        projectId: z.string().describe('ID del proyecto'),
        title: z.string().describe('Título de la tarea'),
        description: z.string().optional().describe('Descripción detallada'),
        priority: z.enum(['Alta', 'Media', 'Baja']).default('Media').describe('Prioridad'),
        dueDate: z.string().optional().describe('Fecha límite YYYY-MM-DD'),
        assigneeId: z.string().optional().describe('ID del usuario asignado'),
        phase: z.string().optional().describe('Fase del proyecto'),
      }),
      execute: async (args) => {
        try {
          const { projectId, title, description, priority, dueDate, assigneeId, phase } = args as {
            projectId: string; title: string; description?: string; priority?: string;
            dueDate?: string; assigneeId?: string; phase?: string;
          };
          const ref = await db.collection('tasks').add({
            title, description: description || '', priority: priority || 'Media',
            status: 'Pendiente', dueDate: dueDate || '',
            assignees: assigneeId ? [assigneeId] : [],
            phase: phase || '',
            createdAt: FV.serverTimestamp(), createdBy: userId,
            updatedAt: FV.serverTimestamp(), projectId,
          });
          return { success: true, id: ref.id, action: 'created', message: `Tarea "${title}" creada` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error creando tarea: ${msg}` };
        }
      },
    }),

    changeTaskStatus: tool({
      description: 'Cambia el estado de una tarea existente. Úsala cuando el usuario quiere avanzar, completar o retroceder una tarea.',
      inputSchema: z.object({
        taskId: z.string().describe('ID de la tarea'),
        newStatus: z.enum(['Pendiente', 'En progreso', 'En revisión', 'Completado']).describe('Nuevo estado'),
      }),
      execute: async (args) => {
        try {
          const { taskId, newStatus } = args as { taskId: string; newStatus: string };
          await db.collection('tasks').doc(taskId).update({ status: newStatus, updatedAt: FV.serverTimestamp(), updatedBy: userId });
          return { success: true, message: `Tarea → ${newStatus}` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error cambiando estado: ${msg}` };
        }
      },
    }),

    createExpense: tool({
      description: 'Registra un nuevo gasto en un proyecto. Úsala cuando el usuario menciona un gasto, compra o pago.',
      inputSchema: z.object({
        projectId: z.string().describe('ID del proyecto'),
        concept: z.string().describe('Concepto del gasto'),
        amount: z.number().describe('Monto en COP'),
        category: z.string().optional().describe('Categoría (Materiales, Mano de obra, Transporte, Otro)'),
        date: z.string().optional().describe('Fecha YYYY-MM-DD'),
        supplier: z.string().optional().describe('Proveedor'),
      }),
      execute: async (args) => {
        try {
          const { projectId, concept, amount, category, date, supplier } = args as {
            projectId: string; concept: string; amount: number; category?: string;
            date?: string; supplier?: string;
          };
          await db.collection('expenses').add({
            concept, amount, category: category || 'Otro',
            date: date || new Date().toISOString().split('T')[0],
            supplier: supplier || '',
            createdAt: FV.serverTimestamp(), createdBy: userId, projectId,
          });
          return { success: true, message: `Gasto $${amount.toLocaleString('es-CO')} registrado` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error registrando gasto: ${msg}` };
        }
      },
    }),

    /* ==========================================================================
     * NIVEL 2: Escritura avanzada — Tareas
     * ========================================================================== */

    updateTask: tool({
      description: 'Actualiza campos de una tarea existente (título, descripción, prioridad, fecha límite). Úsala para editar tareas.',
      inputSchema: z.object({
        taskId: z.string().describe('ID de la tarea'),
        title: z.string().optional().describe('Nuevo título'),
        description: z.string().optional().describe('Nueva descripción'),
        priority: z.enum(['Alta', 'Media', 'Baja']).optional().describe('Nueva prioridad'),
        dueDate: z.string().optional().describe('Nueva fecha límite YYYY-MM-DD'),
      }),
      execute: async (args) => {
        try {
          const { taskId, ...fields } = args as { taskId: string; title?: string; description?: string; priority?: string; dueDate?: string };
          const updateData: Record<string, unknown> = { updatedAt: FV.serverTimestamp(), updatedBy: userId };
          if (fields.title !== undefined) updateData.title = fields.title;
          if (fields.description !== undefined) updateData.description = fields.description;
          if (fields.priority !== undefined) updateData.priority = fields.priority;
          if (fields.dueDate !== undefined) updateData.dueDate = fields.dueDate;
          await db.collection('tasks').doc(taskId).update(updateData);
          const changed = Object.keys(fields).filter(k => fields[k as keyof typeof fields] !== undefined).join(', ');
          return { success: true, message: `Tarea actualizada (${changed})` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error actualizando tarea: ${msg}` };
        }
      },
    }),

    deleteTask: tool({
      description: 'Elimina una tarea existente. Úsala SOLO si el usuario lo pide explícitamente.',
      inputSchema: z.object({
        taskId: z.string().describe('ID de la tarea a eliminar'),
      }),
      execute: async (args) => {
        try {
          const { taskId } = args as { taskId: string };
          await db.collection('tasks').doc(taskId).delete();
          return { success: true, message: 'Tarea eliminada' };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error eliminando tarea: ${msg}` };
        }
      },
    }),

    /* ==========================================================================
     * NIVEL 1-2: Lectura — Proyectos, Tareas, Gastos
     * ========================================================================== */

    queryProject: tool({
      description: 'Consulta el estado actual de un proyecto. Úsala para responder preguntas sobre el estado de un proyecto.',
      inputSchema: z.object({ projectId: z.string().describe('ID del proyecto') }),
      execute: async (args) => {
        try {
          const { projectId } = args as { projectId: string };
          const doc = await db.collection('projects').doc(projectId).get();
          if (!doc.exists) return { success: false, message: 'Proyecto no encontrado' };
          const p = doc.data();
          const ts = await db.collection('tasks').where('projectId', '==', projectId).get();
          const tasks = ts.docs.map(d => d.data());
          const pending = tasks.filter((t: Record<string, unknown>) => t.status === 'Pendiente').length;
          const inProgress = tasks.filter((t: Record<string, unknown>) => t.status === 'En progreso').length;
          const completed = tasks.filter((t: Record<string, unknown>) => t.status === 'Completado').length;
          const es = await db.collection('expenses').where('projectId', '==', projectId).get();
          const totalSpent = es.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
          return {
            success: true,
            project: { name: p?.name || 'Sin nombre', status: p?.status || 'Activo', progress: p?.progress || 0, budget: p?.budget || 0 },
            tasks: { total: tasks.length, pending, inProgress, completed },
            totalSpent,
            message: `"${p?.name || 'Sin nombre'}": ${tasks.length} tareas (${pending} pend, ${inProgress} prog, ${completed} comp), $${totalSpent.toLocaleString('es-CO')} gastados de $${((p?.budget || 0)).toLocaleString('es-CO')}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando: ${msg}` };
        }
      },
    }),

    queryTasks: tool({
      description: 'Lista las tareas de un proyecto o usuario. Úsala para "¿qué tareas hay?" o "muéstrame las tareas".',
      inputSchema: z.object({
        projectId: z.string().optional().describe('ID del proyecto'),
        userId: z.string().optional().describe('ID del usuario asignado'),
        status: z.string().optional().describe('Filtrar por estado'),
      }),
      execute: async (args) => {
        try {
          const { projectId, userId, status } = args as { projectId?: string; userId?: string; status?: string };
          let snap;
          if (projectId) snap = await db.collection('tasks').where('projectId', '==', projectId).limit(15).get();
          else if (userId) snap = await db.collection('tasks').where('assignees', 'array-contains', userId).limit(15).get();
          else snap = await db.collection('tasks').orderBy('createdAt', 'desc').limit(15).get();
          let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AdminDoc[];
          if (status) tasks = tasks.filter((t: Record<string, unknown>) => t.status === status);
          if (tasks.length === 0) return { success: true, tasks: [], message: 'No se encontraron tareas' };
          const summary = tasks.slice(0, 10).map((t: Record<string, unknown>) =>
            `- "${t.title}" [${t.status}] ${t.priority}${t.dueDate ? ` Vence: ${t.dueDate}` : ''}`
          ).join('\n');
          return { success: true, count: tasks.length, message: `${tasks.length} tareas:\n${summary}` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error listando: ${msg}` };
        }
      },
    }),

    queryDeadlines: tool({
      description: 'Muestra tareas con fecha límite próxima. Úsala cuando el usuario pregunta por vencimientos o plazos.',
      inputSchema: z.object({
        projectId: z.string().optional().describe('Filtrar por proyecto'),
        days: z.number().default(7).describe('Días futuros a considerar'),
      }),
      execute: async (args) => {
        try {
          const { projectId, days } = args as { projectId?: string; days?: number };
          const snap = await db.collection('tasks').orderBy('dueDate', 'asc').limit(50).get();
          const now = new Date().toISOString().split('T')[0];
          const future = new Date(Date.now() + (days || 7) * 86400000).toISOString().split('T')[0];
          let tasks = (snap.docs.map(d => ({ id: d.id, ...d.data() })) as AdminDoc[])
            .filter((t: Record<string, unknown>) => t.dueDate && t.dueDate <= future && t.dueDate >= now && t.status !== 'Completado');
          if (projectId) tasks = tasks.filter((t: Record<string, unknown>) => t.projectId === projectId);
          if (tasks.length === 0) return { success: true, count: 0, message: `No hay tareas venciendo en ${days || 7} días` };
          const summary = tasks.slice(0, 10).map((t: Record<string, unknown>) =>
            `- "${t.title}" Vence: ${t.dueDate} [${t.priority}]`
          ).join('\n');
          return { success: true, count: tasks.length, message: `${tasks.length} tareas venciendo:\n${summary}` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando fechas: ${msg}` };
        }
      },
    }),

    queryExpenses: tool({
      description: 'Lista los gastos de un proyecto. Úsala para "¿cuánto se ha gastado?" o "muéstrame los gastos".',
      inputSchema: z.object({
        projectId: z.string().describe('ID del proyecto'),
        category: z.string().optional().describe('Filtrar por categoría'),
        limit: z.number().default(10).describe('Máximo de registros a mostrar'),
      }),
      execute: async (args) => {
        try {
          const { projectId, category, limit } = args as { projectId: string; category?: string; limit?: number };
          const snap = await db.collection('expenses').where('projectId', '==', projectId).orderBy('createdAt', 'desc').limit(limit || 10).get();
          let expenses = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AdminDoc[];
          if (category) expenses = expenses.filter((e: Record<string, unknown>) => e.category === category);
          const total = expenses.reduce((s: number, e: Record<string, unknown>) => s + (Number(e.amount) || 0), 0);
          if (expenses.length === 0) return { success: true, total: 0, message: 'Sin gastos registrados' };
          const summary = expenses.slice(0, 8).map((e: Record<string, unknown>) =>
            `- ${e.concept}: $${(Number(e.amount) || 0).toLocaleString('es-CO')} [${e.category || 'Otro'}] ${e.date || ''}`
          ).join('\n');
          return { success: true, count: expenses.length, total, message: `${expenses.length} gastos (total $${total.toLocaleString('es-CO')}):\n${summary}` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando gastos: ${msg}` };
        }
      },
    }),

    queryBudget: tool({
      description: 'Muestra el presupuesto vs gastos de un proyecto. Úsala para "¿cuánto presupuesto queda?" o "resumen financiero".',
      inputSchema: z.object({
        projectId: z.string().describe('ID del proyecto'),
      }),
      execute: async (args) => {
        try {
          const { projectId } = args as { projectId: string };
          const doc = await db.collection('projects').doc(projectId).get();
          if (!doc.exists) return { success: false, message: 'Proyecto no encontrado' };
          const p = doc.data();
          const budget = Number(p?.budget) || 0;
          const es = await db.collection('expenses').where('projectId', '==', projectId).get();
          const totalSpent = es.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
          const remaining = budget - totalSpent;
          const pct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
          // Group by category
          const byCat: Record<string, number> = {};
          es.docs.forEach(d => {
            const e = d.data();
            const cat = e.category || 'Otro';
            byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
          });
          const catSummary = Object.entries(byCat)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amt]) => `  ${cat}: $${amt.toLocaleString('es-CO')}`)
            .join('\n');
          const statusEmoji = pct >= 100 ? '🔴' : pct >= 80 ? '🟠' : pct >= 50 ? '🟡' : '🟢';
          return {
            success: true,
            budget, totalSpent, remaining, pct,
            message: `${statusEmoji} "${p?.name}":\n  Presupuesto: $${budget.toLocaleString('es-CO')}\n  Gastado: $${totalSpent.toLocaleString('es-CO')} (${pct}%)\n  Restante: $${remaining.toLocaleString('es-CO')}\n\nDesglose:\n${catSummary || '  Sin gastos'}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando presupuesto: ${msg}` };
        }
      },
    }),

    /* ==========================================================================
     * NIVEL 3: Inventario — Consulta y Alertas
     * ========================================================================== */

    queryInventory: tool({
      description: 'Consulta productos del inventario. Úsala para "¿qué hay en inventario?", "stock de cemento", "materiales disponibles", etc.',
      inputSchema: z.object({
        search: z.string().optional().describe('Buscar por nombre o SKU del producto'),
        warehouse: z.string().optional().describe('Filtrar por almacén (Almacén Principal, Obra en Curso, Bodega Reserva)'),
        lowStock: z.boolean().optional().describe('Si es true, solo muestra productos con stock bajo'),
      }),
      execute: async (args) => {
        try {
          const { search, warehouse, lowStock } = args as { search?: string; warehouse?: string; lowStock?: boolean };
          const snap = await db.collection('invProducts').orderBy('createdAt', 'desc').limit(50).get();
          let products = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AdminDoc[];

          // Filter by search
          if (search) {
            const q = search.toLowerCase();
            products = products.filter((p: Record<string, unknown>) =>
              (p.name as string)?.toLowerCase().includes(q) || (p.sku as string)?.toLowerCase().includes(q)
            );
          }

          // Calculate total stock per product
          const enriched = products.map((p: Record<string, unknown>) => {
            const ws = p.warehouseStock as Record<string, number> || {};
            const total = Object.values(ws).reduce((s: number, v) => s + (Number(v) || 0), 0);
            const warehouseQty = warehouse ? (Number(ws[warehouse]) || 0) : total;
            return { ...p, totalStock: total, warehouseQty };
          });

          // Filter by low stock
          let result = enriched;
          if (lowStock) {
            result = enriched.filter((p: Record<string, unknown>) =>
              (p.totalStock as number) <= (Number(p.minStock) || 0)
            );
          }

          if (result.length === 0) return { success: true, count: 0, message: lowStock ? 'No hay productos con stock bajo' : 'No se encontraron productos' };

          const summary = result.slice(0, 15).map((p: Record<string, unknown>) => {
            const stockInfo = warehouse
              ? `${p.warehouseQty} uds en ${warehouse}`
              : `${p.totalStock} uds (mín: ${p.minStock || 0})`;
            return `- ${p.name} [${p.sku || '-'}]: ${stockInfo} — $${(Number(p.price) || 0).toLocaleString('es-CO')}/${p.unit || 'ud'}`;
          }).join('\n');

          const totalValue = result.reduce((s: number, p: Record<string, unknown>) => s + (Number(p.price) || 0) * (p.totalStock as number), 0);
          return {
            success: true,
            count: result.length,
            totalValue,
            message: `${result.length} producto(s) (valor total: $${totalValue.toLocaleString('es-CO')}):\n${summary}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando inventario: ${msg}` };
        }
      },
    }),

    suggestReorder: tool({
      description: 'Analiza el inventario y sugiere productos que necesitan reorden. Úsala para "¿qué debo comprar?" o "alertas de inventario".',
      inputSchema: z.object({
        warehouse: z.string().optional().describe('Filtrar por almacén específico'),
      }),
      execute: async (args) => {
        try {
          const { warehouse } = args as { warehouse?: string };
          const snap = await db.collection('invProducts').orderBy('createdAt', 'desc').limit(100).get();
          const products = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AdminDoc[];

          const alerts: string[] = [];
          let criticalCount = 0;
          let lowCount = 0;

          for (const p of products) {
            const ws = (p.warehouseStock as Record<string, number>) || {};
            const total = Object.values(ws).reduce((s: number, v) => s + (Number(v) || 0), 0);
            const minStock = Number(p.minStock) || 5;

            if (total === 0) {
              criticalCount++;
              alerts.push(`🔴 AGOTADO: ${(p.name as string)} (${(p.sku as string) || '-'}), precio $${(Number(p.price) || 0).toLocaleString('es-CO')}/${(p.unit as string) || 'ud'}`);
            } else if (total <= minStock) {
              lowCount++;
              const deficit = minStock - total;
              const reorderCost = deficit * (Number(p.price) || 0);
              alerts.push(`🟡 STOCK BAJO: ${(p.name as string)} — Stock: ${total}, Mínimo: ${minStock}, Pedir: ${deficit} uds (~$${reorderCost.toLocaleString('es-CO')})`);
            }
          }

          if (alerts.length === 0) return { success: true, criticalCount: 0, lowCount: 0, message: '✅ Inventario saludable — todos los productos están por encima del mínimo de stock.' };

          const totalReorderCost = products.reduce((s, p) => {
            const ws = (p.warehouseStock as Record<string, number>) || {};
            const total = Object.values(ws).reduce((s2: number, v) => s2 + (Number(v) || 0), 0);
            const minStock = Number(p.minStock) || 5;
            if (total < minStock) return s + (minStock - total) * (Number(p.price) || 0);
            return s;
          }, 0);

          return {
            success: true,
            criticalCount,
            lowCount,
            estimatedReorderCost: totalReorderCost,
            message: `${criticalCount + lowCount} alertas (costo estimado de reorden: $${totalReorderCost.toLocaleString('es-CO')}):\n\n${alerts.join('\n')}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error analizando inventario: ${msg}` };
        }
      },
    }),

    /* ==========================================================================
     * NIVEL 3: Facturación — Creación y Consulta
     * ========================================================================== */

    createInvoice: tool({
      description: 'Crea una nueva factura para un proyecto. Úsala para "genera una factura" o "crear factura para el proyecto X".',
      inputSchema: z.object({
        projectId: z.string().describe('ID del proyecto'),
        projectName: z.string().describe('Nombre del proyecto (para el encabezado)'),
        clientName: z.string().describe('Nombre del cliente'),
        items: z.array(z.object({
          concept: z.string().describe('Concepto del ítem'),
          phase: z.string().describe('Fase del proyecto'),
          hours: z.number().describe('Horas trabajadas'),
          rate: z.number().describe('Tarifa por hora en COP'),
        })).describe('Ítems de la factura'),
        notes: z.string().optional().describe('Notas adicionales'),
        dueDate: z.string().optional().describe('Fecha de vencimiento YYYY-MM-DD'),
      }),
      execute: async (args) => {
        try {
          const { projectId, projectName, clientName, items, notes, dueDate } = args as {
            projectId: string; projectName: string; clientName: string;
            items: Array<{ concept: string; phase: string; hours: number; rate: number }>;
            notes?: string; dueDate?: string;
          };
          const invoiceItems = items.map(i => ({
            concept: i.concept,
            phase: i.phase,
            hours: i.hours,
            rate: i.rate,
            amount: i.hours * i.rate,
          }));
          const subtotal = invoiceItems.reduce((s, i) => s + i.amount, 0);
          const tax = Math.round(subtotal * 0.19);
          const total = subtotal + tax;
          const today = new Date().toISOString().split('T')[0];
          const invNumber = `FAC-${Date.now().toString(36).toUpperCase()}`;

          const ref = await db.collection('invoices').add({
            projectId, projectName, clientName, number: invNumber,
            status: 'Borrador', items: invoiceItems,
            subtotal, tax, total,
            notes: notes || '', issueDate: today, dueDate: dueDate || '',
            createdAt: FV.serverTimestamp(), createdBy: userId,
          });

          return {
            success: true, id: ref.id, invoiceNumber: invNumber,
            subtotal, tax, total,
            message: `Factura ${invNumber} creada:\n  Cliente: ${clientName}\n  Subtotal: $${subtotal.toLocaleString('es-CO')}\n  IVA (19%): $${tax.toLocaleString('es-CO')}\n  Total: $${total.toLocaleString('es-CO')}\n  Estado: Borrador — lista para revisar/enviar`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error creando factura: ${msg}` };
        }
      },
    }),

    queryInvoices: tool({
      description: 'Lista facturas con filtros. Úsala para "¿qué facturas hay?", "facturas pendientes", "facturas vencidas".',
      inputSchema: z.object({
        projectId: z.string().optional().describe('Filtrar por proyecto'),
        status: z.string().optional().describe('Filtrar por estado (Borrador, Enviada, Pagada, Vencida, Cancelada)'),
      }),
      execute: async (args) => {
        try {
          const { projectId, status } = args as { projectId?: string; status?: string };
          const snap = await db.collection('invoices').orderBy('createdAt', 'desc').limit(30).get();
          let invoices = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AdminDoc[];
          if (projectId) invoices = invoices.filter((inv: Record<string, unknown>) => inv.projectId === projectId);
          if (status) invoices = invoices.filter((inv: Record<string, unknown>) => inv.status === status);

          if (invoices.length === 0) return { success: true, count: 0, message: 'No se encontraron facturas' };

          const totalAmount = invoices.reduce((s: number, inv: Record<string, unknown>) => s + (Number(inv.total) || 0), 0);
          const summary = invoices.slice(0, 10).map((inv: Record<string, unknown>) => {
            const statusEmoji = inv.status === 'Pagada' ? '✅' : inv.status === 'Vencida' ? '🔴' : inv.status === 'Enviada' ? '📤' : '📝';
            return `${statusEmoji} ${inv.number}: ${inv.clientName || 'N/A'} — $${(Number(inv.total) || 0).toLocaleString('es-CO')} [${inv.status}]`;
          }).join('\n');

          return {
            success: true, count: invoices.length, totalAmount,
            message: `${invoices.length} factura(s) ($${totalAmount.toLocaleString('es-CO')} total):\n${summary}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando facturas: ${msg}` };
        }
      },
    }),

    /* ==========================================================================
     * NIVEL 3: Cotizaciones — Estimación y Creación
     * ========================================================================== */

    estimateCosts: tool({
      description: 'Estima costos de materiales y mano de obra para un alcance de proyecto. Úsala para "¿cuánto costaría...?" o "estima el costo de...".',
      inputSchema: z.object({
        scope: z.string().describe('Descripción del alcance (ej: "remodelación cocina 15m²", "construcción muro de contención 30m")'),
        items: z.array(z.object({
          concept: z.string().describe('Concepto del ítem (ej: "Cemento Portland", "Mano de obra albañil")'),
          unit: z.string().describe('Unidad de medida (Unidad, Metro², Saco, Hora)'),
          quantity: z.number().describe('Cantidad estimada'),
          unitPrice: z.number().describe('Precio unitario estimado en COP'),
        })).describe('Ítems con cantidades y precios estimados'),
      }),
      execute: async (args) => {
        try {
          const { scope, items } = args as {
            scope: string;
            items: Array<{ concept: string; unit: string; quantity: number; unitPrice: number }>;
          };
          const enriched = items.map(i => ({
            ...i,
            subtotal: i.quantity * i.unitPrice,
          }));
          const directCost = enriched.reduce((s, i) => s + i.subtotal, 0);
          const aiu = Math.round(directCost * 0.3); // AIU 30% standard construction
          const vat = Math.round((directCost + aiu) * 0.19);
          const total = directCost + aiu + vat;

          const summary = enriched.map(i =>
            `- ${i.concept}: ${i.quantity} ${i.unit} x $${i.unitPrice.toLocaleString('es-CO')} = $${i.subtotal.toLocaleString('es-CO')}`
          ).join('\n');

          return {
            success: true,
            directCost, aiu, vat, total,
            breakdown: enriched,
            message: `Estimación: "${scope}"\n\nCostos directos:\n${summary}\n\n  Costos directos: $${directCost.toLocaleString('es-CO')}\n  AIU (30%): $${aiu.toLocaleString('es-CO')}\n  IVA (19%): $${vat.toLocaleString('es-CO')}\n  TOTAL ESTIMADO: $${total.toLocaleString('es-CO')}\n\n⚠️ Valores de referencia — confirma con proveedores actuales.`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error estimando costos: ${msg}` };
        }
      },
    }),

    createQuotation: tool({
      description: 'Crea una cotización profesional para un proyecto. Úsala para "genera una cotización" o "crear propuesta para el cliente X".',
      inputSchema: z.object({
        projectId: z.string().describe('ID del proyecto'),
        projectName: z.string().describe('Nombre del proyecto'),
        clientName: z.string().describe('Nombre del cliente'),
        clientEmail: z.string().optional().describe('Email del cliente'),
        clientPhone: z.string().optional().describe('Teléfono del cliente'),
        sections: z.array(z.object({
          name: z.string().describe('Nombre de la sección (ej: "Materiales", "Mano de obra")'),
          items: z.array(z.object({
            concept: z.string().describe('Concepto del ítem'),
            unit: z.string().describe('Unidad (Unidad, Metro², Saco, Hora)'),
            quantity: z.number().describe('Cantidad'),
            unitPrice: z.number().describe('Precio unitario en COP'),
          })).describe('Ítems de la sección'),
        })).describe('Secciones de la cotización'),
        validDays: z.number().optional().describe('Días de vigencia (default 30)'),
        notes: z.string().optional().describe('Notas o condiciones especiales'),
      }),
      execute: async (args) => {
        try {
          const { projectId, projectName, clientName, clientEmail, clientPhone, sections, validDays, notes } = args as {
            projectId: string; projectName: string; clientName: string;
            clientEmail?: string; clientPhone?: string;
            sections: Array<{ name: string; items: Array<{ concept: string; unit: string; quantity: number; unitPrice: number }> }>;
            validDays?: number; notes?: string;
          };

          const quotationSections = sections.map((sec, si) => {
            const sectionItems = sec.items.map((it, ii) => {
              const subtotal = it.quantity * it.unitPrice;
              const vatAmount = Math.round(subtotal * 0.19);
              const discountAmount = 0;
              const total = subtotal + vatAmount - discountAmount;
              return {
                id: `item-${si}-${ii}`,
                concept: it.concept, description: '', unit: it.unit,
                quantity: it.quantity, unitPrice: it.unitPrice,
                vat: 19, discount: 0, subtotal, vatAmount, discountAmount, total,
              };
            });
            const subtotal = sectionItems.reduce((s, i) => s + i.subtotal, 0);
            const vatTotal = sectionItems.reduce((s, i) => s + i.vatAmount, 0);
            const discountTotal = 0;
            return {
              id: `section-${si}`, name: sec.name, items: sectionItems,
              subtotal, vatTotal, discountTotal, total: subtotal + vatTotal - discountTotal,
            };
          });

          const subtotal = quotationSections.reduce((s, sec) => s + sec.subtotal, 0);
          const vatTotal = quotationSections.reduce((s, sec) => s + sec.vatTotal, 0);
          const discountTotal = 0;
          const grandTotal = subtotal + vatTotal - discountTotal;

          // Default payment plan: 50% upfront, 50% on delivery
          const half = Math.round(grandTotal / 2);
          const payments = [
            { id: 'pay-1', label: 'Anticipo', condition: 'Al inicio', percentage: 50, amount: half, paid: false },
            { id: 'pay-2', label: 'Balance', condition: 'Entrega final', percentage: 50, amount: grandTotal - half, paid: false },
          ];

          const validUntil = new Date(Date.now() + (validDays || 30) * 86400000).toISOString().split('T')[0];
          const quotNumber = `COT-${Date.now().toString(36).toUpperCase()}`;

          const ref = await db.collection('quotations').add({
            number: quotNumber, projectId, projectName, clientName,
            clientEmail: clientEmail || '', clientPhone: clientPhone || '', clientAddress: '',
            status: 'Borrador', sections: quotationSections, payments,
            subtotal, vatTotal, discountTotal, grandTotal,
            validUntil, notes: notes || '', internalNotes: '',
            terms: 'La cotización tiene vigencia de 30 días. Precios sujetos a disponibilidad.',
            bankName: '', bankAccount: '', bankAccountType: '', bankHolder: '',
            createdAt: FV.serverTimestamp(), createdBy: userId,
          });

          const secSummary = quotationSections.map(s =>
            `  ${s.name}: $${s.total.toLocaleString('es-CO')}`
          ).join('\n');

          return {
            success: true, id: ref.id, quotationNumber: quotNumber,
            subtotal, vatTotal, grandTotal,
            message: `Cotización ${quotNumber} creada:\n  Cliente: ${clientName}\n  Proyecto: ${projectName}\n  Vigente hasta: ${validUntil}\n\nSecciones:\n${secSummary}\n\n  Subtotal: $${subtotal.toLocaleString('es-CO')}\n  IVA: $${vatTotal.toLocaleString('es-CO')}\n  TOTAL: $${grandTotal.toLocaleString('es-CO')}\n\nPlan de pagos:\n  50% anticipo ($${half.toLocaleString('es-CO')})\n  50% entrega final ($${(grandTotal - half).toLocaleString('es-CO')})`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error creando cotización: ${msg}` };
        }
      },
    }),

    queryQuotations: tool({
      description: 'Lista cotizaciones existentes. Úsala para "¿qué cotizaciones hay?" o "cotizaciones pendientes".',
      inputSchema: z.object({
        projectId: z.string().optional().describe('Filtrar por proyecto'),
        status: z.string().optional().describe('Filtrar por estado (Borrador, Enviada, Aprobada, Rechazada, Convertida, Vencida)'),
      }),
      execute: async (args) => {
        try {
          const { projectId, status } = args as { projectId?: string; status?: string };
          const snap = await db.collection('quotations').orderBy('createdAt', 'desc').limit(20).get();
          let quotations = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AdminDoc[];
          if (projectId) quotations = quotations.filter((q: Record<string, unknown>) => q.projectId === projectId);
          if (status) quotations = quotations.filter((q: Record<string, unknown>) => q.status === status);

          if (quotations.length === 0) return { success: true, count: 0, message: 'No se encontraron cotizaciones' };

          const totalAmount = quotations.reduce((s: number, q: Record<string, unknown>) => s + (Number(q.grandTotal) || 0), 0);
          const summary = quotations.slice(0, 10).map((q: Record<string, unknown>) => {
            const statusEmoji = q.status === 'Aprobada' ? '✅' : q.status === 'Rechazada' ? '❌' : q.status === 'Convertida' ? '🔄' : q.status === 'Vencida' ? '⏰' : '📝';
            return `${statusEmoji} ${q.number}: ${q.clientName || 'N/A'} — $${(Number(q.grandTotal) || 0).toLocaleString('es-CO')} [${q.status}] Vigente: ${q.validUntil || 'N/A'}`;
          }).join('\n');

          return {
            success: true, count: quotations.length, totalAmount,
            message: `${quotations.length} cotización(es) ($${totalAmount.toLocaleString('es-CO')} total):\n${summary}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando cotizaciones: ${msg}` };
        }
      },
    }),

    /* ==========================================================================
     * NIVEL 3: Reuniones — Creación
     * ========================================================================== */

    createMeeting: tool({
      description: 'Programa una reunión. Úsala para "agenda una reunión", "programar visita de obra", "reunión con el cliente mañana".',
      inputSchema: z.object({
        title: z.string().describe('Título de la reunión'),
        projectId: z.string().optional().describe('ID del proyecto relacionado'),
        date: z.string().describe('Fecha YYYY-MM-DD'),
        time: z.string().describe('Hora HH:MM (formato 24h)'),
        duration: z.number().default(60).describe('Duración en minutos'),
        location: z.string().optional().describe('Ubicación física o enlace de videollamada'),
        description: z.string().optional().describe('Descripción o agenda de la reunión'),
        attendees: z.array(z.string()).optional().describe('Lista de IDs de asistentes'),
      }),
      execute: async (args) => {
        try {
          const { title, projectId, date, time, duration, location, description, attendees } = args as {
            title: string; projectId?: string; date: string; time: string;
            duration?: number; location?: string; description?: string; attendees?: string[];
          };
          const ref = await db.collection('meetings').add({
            title, projectId: projectId || '', date, time,
            duration: duration || 60,
            location: location || '',
            description: description || '',
            attendees: attendees || [],
            createdBy: userId,
            createdAt: FV.serverTimestamp(),
            recurrence: 'none',
          });
          const durationStr = duration ? `${duration} min` : '60 min';
          return {
            success: true, id: ref.id,
            message: `Reunión "${title}" programada:\n  Fecha: ${date} a las ${time}\n  Duración: ${durationStr}${location ? `\n  Lugar: ${location}` : ''}${projectId ? '\n  Proyecto vinculado' : ''}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error programando reunión: ${msg}` };
        }
      },
    }),

    queryMeetings: tool({
      description: 'Lista reuniones próximas o pasadas. Úsala para "¿qué reuniones tengo?" o "reuniones de esta semana".',
      inputSchema: z.object({
        projectId: z.string().optional().describe('Filtrar por proyecto'),
        days: z.number().optional().describe('Mostrar reuniones en los próximos N días (default 7)'),
      }),
      execute: async (args) => {
        try {
          const { projectId, days } = args as { projectId?: string; days?: number };
          const snap = await db.collection('meetings').orderBy('date', 'asc').limit(30).get();
          const now = new Date().toISOString().split('T')[0];
          const future = new Date(Date.now() + (days || 7) * 86400000).toISOString().split('T')[0];
          let meetings = (snap.docs.map(d => ({ id: d.id, ...d.data() })) as AdminDoc[])
            .filter((m: Record<string, unknown>) => (m.date as string) >= now && (m.date as string) <= future);
          if (projectId) meetings = meetings.filter((m: Record<string, unknown>) => m.projectId === projectId);

          if (meetings.length === 0) return { success: true, count: 0, message: `Sin reuniones en los próximos ${days || 7} días` };

          const summary = meetings.slice(0, 10).map((m: Record<string, unknown>) => {
            const today = new Date().toISOString().split('T')[0];
            const dayLabel = m.date === today ? ' (HOY)' : '';
            return `- ${m.date}${dayLabel} ${m.time} — "${m.title}" (${m.duration || 60} min)${m.location ? ` @ ${m.location}` : ''}`;
          }).join('\n');

          return {
            success: true, count: meetings.length,
            message: `${meetings.length} reunión(es):\n${summary}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error consultando reuniones: ${msg}` };
        }
      },
    }),

    /* ==========================================================================
     * NIVEL 3: Reporte Global del Proyecto
     * ========================================================================== */

    generateProjectReport: tool({
      description: 'Genera un reporte resumido de un proyecto. Úsala para "dame un resumen del proyecto", "reporte de estado", "¿cómo va el proyecto X?".',
      inputSchema: z.object({
        projectId: z.string().describe('ID del proyecto'),
      }),
      execute: async (args) => {
        try {
          const { projectId } = args as { projectId: string };
          const doc = await db.collection('projects').doc(projectId).get();
          if (!doc.exists) return { success: false, message: 'Proyecto no encontrado' };
          const p = doc.data();

          // Tasks
          const ts = await db.collection('tasks').where('projectId', '==', projectId).get();
          const tasks = ts.docs.map(d => d.data());
          const byStatus: Record<string, number> = {};
          for (const t of tasks) {
            const st = (t as Record<string, unknown>).status as string || 'Sin estado';
            byStatus[st] = (byStatus[st] || 0) + 1;
          }

          // Expenses
          const es = await db.collection('expenses').where('projectId', '==', projectId).get();
          const expenses = es.docs.map(d => d.data());
          const totalSpent = expenses.reduce((s, e) => s + (Number((e as Record<string, unknown>).amount) || 0), 0);
          const byCat: Record<string, number> = {};
          for (const e of expenses) {
            const ed = e as Record<string, unknown>;
            const cat = (ed.category as string) || 'Otro';
            byCat[cat] = (byCat[cat] || 0) + (Number(ed.amount) || 0);
          }

          // Invoices
          const invs = await db.collection('invoices').where('projectId', '==', projectId).get();
          const invoices = invs.docs.map(d => d.data());
          const totalInvoiced = invoices.reduce((s, inv) => s + (Number((inv as Record<string, unknown>).total) || 0), 0);
          const paidInvoices = invoices.filter(inv => (inv as Record<string, unknown>).status === 'Pagada');
          const totalCollected = paidInvoices.reduce((s, inv) => s + (Number((inv as Record<string, unknown>).total) || 0), 0);

          // Quotations
          const quots = await db.collection('quotations').where('projectId', '==', projectId).get();
          const quotations = quots.docs.map(d => d.data());
          const pendingQuots = quotations.filter(q => (q as Record<string, unknown>).status === 'Borrador' || (q as Record<string, unknown>).status === 'Enviada');
          const totalPendingQuots = pendingQuots.reduce((s, q) => s + (Number((q as Record<string, unknown>).grandTotal) || 0), 0);

          const budget = Number(p?.budget) || 0;
          const remaining = budget - totalSpent;
          const budgetPct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
          const progress = Number(p?.progress) || 0;

          const statusByTask = Object.entries(byStatus).map(([s, c]) => `  ${s}: ${c}`).join('\n');
          const catByExpense = Object.entries(byCat)
            .sort(([, a], [, b]) => b - a)
            .map(([c, a]) => `  ${c}: $${a.toLocaleString('es-CO')}`)
            .join('\n');

          return {
            success: true,
            report: {
              project: p?.name, status: p?.status, progress, budget, totalSpent,
              remaining, budgetPct, totalInvoiced, totalCollected,
              tasksTotal: tasks.length, tasksByStatus: byStatus,
              pendingQuotations: pendingQuots.length, pendingQuotationTotal: totalPendingQuots,
            },
            message: `REPORTE: "${p?.name || 'Sin nombre'}"
Estado: ${p?.status || 'N/A'} | Progreso: ${progress}%

TAREAS (${tasks.length}):
${statusByTask}

PRESUPUESTO:
  Asignado: $${budget.toLocaleString('es-CO')}
  Ejecutado: $${totalSpent.toLocaleString('es-CO')} (${budgetPct}%)
  Restante: $${remaining.toLocaleString('es-CO')}

GASTOS POR CATEGORÍA:
${catByExpense || '  Sin gastos'}

FACTURACIÓN:
  Facturado: $${totalInvoiced.toLocaleString('es-CO')}
  Cobrado: $${totalCollected.toLocaleString('es-CO')}
  Por cobrar: $${(totalInvoiced - totalCollected).toLocaleString('es-CO')}

COTIZACIONES:
  Pendientes: ${pendingQuots.length} ($${totalPendingQuots.toLocaleString('es-CO')})`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          return { success: false, message: `Error generando reporte: ${msg}` };
        }
      },
    }),
  };
}

/* ===== System Prompt (Fase 3 — Agente Completo) ===== */
export const AGENT_SYSTEM_PROMPT = `Eres el Asistente Inteligente de ArchiFlow, un gestor integral de proyectos de arquitectura y construcción.

Puedes hacer TODO esto usando herramientas:

GESTIÓN DE TAREAS:
- Crear, actualizar, cambiar estado y eliminar tareas
- Consultar tareas por proyecto, usuario o estado
- Ver vencimientos próximos

PRESUPUESTO Y GASTOS:
- Registrar gastos y consultar presupuestos
- Desglose por categoría, alertas de presupuesto

INVENTARIO:
- Consultar stock de productos por almacén o categoría
- Alertas de stock bajo y sugerencias de reorden
- Buscar materiales por nombre o SKU

FACTURACIÓN:
- Crear facturas profesionales con IVA (19%)
- Consultar facturas por estado (Borrador, Enviada, Pagada, Vencida)

COTIZACIONES:
- Estimar costos de materiales y mano de obra (con AIU 30%)
- Crear cotizaciones con secciones, IVA y plan de pagos
- Consultar cotizaciones existentes

REUNIONES:
- Programar reuniones con fecha, hora, duración y ubicación
- Consultar reuniones próximas

REPORTES:
- Generar reportes completos del proyecto (tareas, presupuesto, facturación, cotizaciones)

REGLAS:
1. SIEMPRE responde en español.
2. Para crear/modificar/eliminar, confirma con el usuario antes de ejecutar.
3. Si no tienes projectId u otro ID necesario, PÍDELO al usuario.
4. Sé conciso pero completo. No inventes datos.
5. Formatea montos en COP con símbolo $ y separadores de miles.
6. Para consultas simples (leer datos), ejecuta directamente sin preguntar.
7. Para eliminar tareas, SIEMPRE pide confirmación.
8. Cuando generes estimaciones, advierte que son valores de referencia y deben confirmarse con proveedores.
9. Para facturas y cotizaciones, incluye siempre el desglose de subtotales, IVA y total.
10. Si el usuario pide algo que no puedes hacer con las herramientas disponibles, explica qué SÍ puedes hacer.`;
