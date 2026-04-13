'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
  timestamp: Date;
  isError?: boolean;
  isSetupRequired?: boolean;
  helpText?: boolean;
  isTyping?: boolean;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'Resumen de mis proyectos',
  'Tareas vencidas',
  'Análisis de presupuesto',
  'Productividad del equipo',
  'Recomendaciones para mejorar',
];

/** Sanitiza HTML generado */
function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*["']?javascript:[^"'>]*/gi, '$1="#"')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<(iframe|embed|object|form|input|select|textarea)\b[^>]*>/gi, '')
    .replace(/<(meta|link|base)\b[^>]*>/gi, '')
    .replace(/<(?!\/?(br|p|div|span|strong|b|em|i|u|s|ul|ol|li|code|pre|blockquote|h[1-6]|a|table|tr|td|th|thead|tbody|hr))\b[^>]*>/gi, '');
}

const formatMessage = (content: string): string => {
  const html = content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-black/20 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/20 px-1.5 py-0.5 rounded text-xs">$1</code>')
    .replace(/^• (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n/g, '<br/>');
  return sanitizeHTML(html);
};

/* ─── Typewriter Hook ─── */
function useTypewriter(messages: Message[], setMessages: React.Dispatch<React.SetStateAction<Message[]>>) {
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingMsg = useMemo(() => {
    for (const m of messages) {
      if (m.isTyping && m.displayContent !== m.content) return m;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!pendingMsg) return;
    const msgId = pendingMsg.id;

    const tick = () => {
      setMessages(prev => {
        const msg = prev.find(m => m.id === msgId && m.isTyping);
        if (!msg || !msg.isTyping) return prev;
        const full = msg.content;
        const current = msg.displayContent || '';
        if (current.length >= full.length) {
          return prev.map(m => m.id === msgId ? { ...m, displayContent: full, isTyping: false } : m);
        }
        const nextChar = full[current.length];
        let chunkSize = 1;
        if ('.!?;:'.includes(nextChar)) chunkSize = 1;
        else chunkSize = 2;
        const newIndex = Math.min(current.length + chunkSize, full.length);
        return prev.map(m => m.id === msgId ? { ...m, displayContent: full.slice(0, newIndex) } : m);
      });

      const delay = 12 + Math.random() * 8;
      typingRef.current = setTimeout(tick, delay);
    };

    typingRef.current = setTimeout(tick, 60);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [pendingMsg?.id]);

  const scrollContainer = document.querySelector('[data-ai-messages]');
  if (pendingMsg && scrollContainer) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }
}

function TypingCursor() {
  return <span className="inline-block w-[2px] h-[1.1em] bg-[var(--af-accent)] ml-0.5 align-text-bottom animate-pulse" />;
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente **ArchiFlow AI**. Puedo ayudarte con:\n\n• Resumen de proyectos y tareas\n• Análisis de presupuesto y gastos\n• Productividad del equipo\n• Recomendaciones de mejora\n• Consultas sobre tus datos\n\nPrueba los botones rápidos de abajo o pregúntame lo que necesites.',
      displayContent: '¡Hola! Soy tu asistente **ArchiFlow AI**. Puedo ayudarte con:\n\n• Resumen de proyectos y tareas\n• Análisis de presupuesto y gastos\n• Productividad del equipo\n• Recomendaciones de mejora\n• Consultas sobre tus datos\n\nPrueba los botones rápidos de abajo o pregúntame lo que necesites.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useTypewriter(messages, setMessages);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const isTypingActive = useMemo(() => messages.some(m => m.isTyping), [messages]);

  useEffect(() => { scrollToBottom(); }, [messages, isTypingActive, scrollToBottom]);
  useEffect(() => {
    if (isOpen && inputRef.current && window.innerWidth >= 768) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  /* ─── Smart Data Analysis (Client-side) ─── */
  const analyzeUserData = useCallback((query: string): string => {
    // Access global store for project data
    const store = (globalThis as any).__archiflow_context;
    if (!store) return 'Para darte análisis personalizados, necesito acceso a tus datos. Asegúrate de haber iniciado sesión y tener proyectos creados.';

    const { projects, tasks, expenses, teamUsers, invoices } = store;
    const q = query.toLowerCase();

    // ── Resumen de proyectos ──
    if (q.includes('proyecto') || q.includes('resumen')) {
      if (projects.length === 0) return 'No tienes proyectos creados aún. Puedes crear uno desde la sección **Proyectos** en el menú lateral.';
      const ejecucion = projects.filter((p: any) => p.data.status === 'Ejecucion');
      const terminados = projects.filter((p: any) => p.data.status === 'Terminado');
      const conceptos = projects.filter((p: any) => p.data.status === 'Concepto');
      const totalBudget = projects.reduce((s: number, p: any) => s + (Number(p.data.budget) || 0), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
      let resp = `**Tienes ${projects.length} proyectos:**\n\n`;
      ejecucion.forEach((p: any) => {
        const prog = Number(p.data.progress) || 0;
        const pExp = expenses.filter((e: any) => e.data.projectId === p.id).reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
        resp += `• **${p.data.name}** — ${prog}% completado, ${fmtCOP(pExp)} gastados de ${fmtCOP(Number(p.data.budget) || 0)}\n`;
      });
      if (conceptos.length > 0) resp += `\n**En concepto:** ${conceptos.map((p: any) => p.data.name).join(', ')}`;
      if (terminados.length > 0) resp += `\n**Terminados:** ${terminados.map((p: any) => p.data.name).join(', ')}`;
      resp += `\n\n**Presupuesto total:** ${fmtCOP(totalBudget)}\n**Gastado en total:** ${fmtCOP(totalExpenses)} (${totalBudget > 0 ? Math.round(totalExpenses / totalBudget * 100) : 0}% ejecutado)`;
      return resp;
    }

    // ── Tareas vencidas ──
    if (q.includes('vencid') || q.includes('tarea') || q.includes('pendiente')) {
      const now = new Date();
      const overdue = tasks.filter((t: any) => t.data.status !== 'Completado' && t.data.dueDate && new Date(t.data.dueDate) < now);
      const pending = tasks.filter((t: any) => t.data.status !== 'Completado');
      const completed = tasks.filter((t: any) => t.data.status === 'Completado');
      if (tasks.length === 0) return 'No tienes tareas registradas. Crea tareas desde la sección **Tareas** del menú.';
      let resp = `**Resumen de tareas:**\n\n`;
      resp += `• Total: ${tasks.length}\n• Completadas: ${completed.length}\n• Pendientes: ${pending.length}\n• **Vencidas: ${overdue.length}**\n\n`;
      if (overdue.length > 0) {
        resp += `**Tareas vencidas que requieren atención:**\n\n`;
        overdue.slice(0, 5).forEach((t: any) => {
          const proj = projects.find((p: any) => p.id === t.data.projectId);
          const days = Math.floor((now.getTime() - new Date(t.data.dueDate).getTime()) / 86400000);
          resp += `• **${t.data.title}** — ${days} días de retraso · ${proj?.data?.name || 'Sin proyecto'} · Prioridad: ${t.data.priority}\n`;
        });
        if (overdue.length > 5) resp += `... y ${overdue.length - 5} más.`;
        resp += '\n\n**Recomendación:** Revisa la prioridad de estas tareas y reasigna fechas si es necesario.';
      } else {
        resp += 'No tienes tareas vencidas. ¡Buen trabajo!';
      }
      return resp;
    }

    // ── Análisis de presupuesto ──
    if (q.includes('presupuesto') || q.includes('gasto') || q.includes('financier') || q.includes('costo')) {
      const totalBudget = projects.reduce((s: number, p: any) => s + (Number(p.data.budget) || 0), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
      const totalInvoiced = invoices.reduce((s: number, inv: any) => s + (Number(inv.data.total) || 0), 0);
      if (totalBudget === 0 && totalExpenses === 0) return 'No hay datos financieros registrados. Agrega presupuestos a tus proyectos y registra gastos para que pueda analizarlos.';
      let resp = `**Análisis Financiero:**\n\n`;
      resp += `• Presupuesto total: ${fmtCOP(totalBudget)}\n• Gastos registrados: ${fmtCOP(totalExpenses)}\n• Facturado: ${fmtCOP(totalInvoiced)}\n• Balance: ${fmtCOP(totalInvoiced - totalExpenses)}\n\n`;
      if (totalBudget > 0) {
        const pct = Math.round(totalExpenses / totalBudget * 100);
        resp += `**Ejecución presupuestal: ${pct}%**\n\n`;
        if (pct > 90) resp += '⚠️ **Alerta:** Has ejecutado más del 90% del presupuesto. Revisa los gastos pendientes y ajusta si es necesario.';
        else if (pct > 70) resp += 'Llevas más del 70% del presupuesto ejecutado. Monitorea de cerca los gastos restantes.';
        else resp += 'Vas por buen camino con la ejecución presupuestal.';
      }
      // Category breakdown
      const catBreakdown: Record<string, number> = {};
      expenses.forEach((e: any) => { catBreakdown[e.data.category] = (catBreakdown[e.data.category] || 0) + (Number(e.data.amount) || 0); });
      const topCats = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4);
      if (topCats.length > 0) {
        resp += '\n\n**Top categorías de gasto:**\n\n';
        topCats.forEach(([cat, amount]) => {
          resp += `• ${cat}: ${fmtCOP(amount)} (${Math.round(amount / totalExpenses * 100)}%)\n`;
        });
      }
      return resp;
    }

    // ── Productividad del equipo ──
    if (q.includes('equipo') || q.includes('productiv') || q.includes('miembro')) {
      if (teamUsers.length === 0) return 'No hay miembros en el equipo. Invita miembros desde la sección **Equipo** del menú.';
      let resp = `**Productividad del Equipo (${teamUsers.length} miembros):**\n\n`;
      teamUsers.forEach((u: any) => {
        const userTasks = tasks.filter((t: any) => t.data.assigneeId === u.id);
        const done = userTasks.filter((t: any) => t.data.status === 'Completado').length;
        const inProgress = userTasks.filter((t: any) => t.data.status === 'En progreso').length;
        const rate = userTasks.length > 0 ? Math.round((done / userTasks.length) * 100) : 0;
        resp += `• **${u.data?.name || u.data?.email}** — ${done}/${userTasks.length} tareas completadas (${rate}% efectividad), ${inProgress} en curso\n`;
      });
      resp += '\n\n**Recomendaciones:**\n';
      const avgRate = teamUsers.length > 0 ? teamUsers.reduce((s: number, u: any) => {
        const ut = tasks.filter((t: any) => t.data.assigneeId === u.id);
        return s + (ut.length > 0 ? (ut.filter((t: any) => t.data.status === 'Completado').length / ut.length) * 100 : 0);
      }, 0) / teamUsers.length : 0;
      if (avgRate < 50) resp += 'El equipo tiene una efectividad baja. Considera redistribuir tareas o ajustar plazos realistas.';
      else if (avgRate < 75) resp += 'La productividad es acceptable. Identifica cuellos de botella y prioriza tareas clave.';
      else resp += 'El equipo tiene una buena productividad. Mantén el ritmo y celebra los logros.';
      return resp;
    }

    // ── Recomendaciones ──
    if (q.includes('recomend') || q.includes('mejor') || q.includes('suger') || q.includes('consejo')) {
      const now = new Date();
      const overdue = tasks.filter((t: any) => t.data.status !== 'Completado' && t.data.dueDate && new Date(t.data.dueDate) < now);
      const pending = tasks.filter((t: any) => t.data.status !== 'Completado');
      const totalBudget = projects.reduce((s: number, p: any) => s + (Number(p.data.budget) || 0), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
      let resp = '**Recomendaciones para ArchiFlow:**\n\n';
      const recs: string[] = [];
      if (overdue.length > 0) recs.push(`🔴 Tienes **${overdue.length} tareas vencidas**. Revisa prioridades y reasigna fechas para evitar retrasos acumulados.`);
      if (pending.length > 20) recs.push(`🟡 Tienes **${pending.length} tareas pendientes**. Considera usar el **Tablero Kanban** para visualizar y priorizar mejor.`);
      if (totalBudget > 0 && totalExpenses / totalBudget > 0.85) recs.push(`🟠 El presupuesto está al **${Math.round(totalExpenses / totalBudget * 100)}%**. Revisa los gastos y ajusta las proyecciones."));
      if (teamUsers.length < 3 && projects.length > 2) recs.push('🔵 Considera agregar más miembros al equipo para distribuir la carga de trabajo.');
      recs.push('📝 Usa la **Bitácora de Obra** para documentar el progreso diario y tener un historial completo.');
      recs.push('✅ Los **Checklists de Obra** te ayudan a no olvidar detalles en inspecciones y entregas.');
      recs.push('📊 Revisa el **Diagrama Gantt** para visualizar dependencias y cronogramas de tus proyectos.');
      return resp + recs.map(r => `${r}\n`).join('');
    }

    // ── Default smart response ──
    return `Entendido tu consulta sobre "${query.slice(0, 50)}". Para darte la mejor respuesta, puedo analizar:\n\n• **Resumen de proyectos** — Estado general de todos tus proyectos\n• **Tareas vencidas** — Identificar tareas que necesitan atención\n• **Análisis de presupuesto** — Control de gastos vs presupuesto\n• **Productividad del equipo** — Rendimiento de cada miembro\n• **Recomendaciones** — Sugerencias personalizadas\n\n¿Sobre cuál tema quieres información?`;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Try API first
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.id !== 'welcome' && !m.isError)
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content })),
            query: content.trim(),
        }),
      });

      const data = await response.json();

      let assistantContent = '';

      // Check if API returned a real response or fallback to local analysis
      if (data.message && !data.isPlaceholder) {
        assistantContent = data.message;
      } else {
        // Smart local analysis
        assistantContent = analyzeUserData(content.trim());
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: assistantContent,
        displayContent: '',
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Fallback to local analysis on error
      const fallbackContent = analyzeUserData(content.trim());
      const fallbackMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: fallbackContent,
        displayContent: '',
        timestamp: new Date(),
        isTyping: true,
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 bottom-20 w-[400px] max-w-[calc(100vw-32px)] h-[560px] max-h-[70dvh] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-[150] flex flex-col animate-fadeIn overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-gradient-to-r from-[var(--af-accent)]/10 to-transparent flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--af-accent)] flex items-center justify-center">
            <span className="text-sm font-bold text-background">AI</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold">ArchiFlow AI</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              En línea — Análisis inteligente
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[var(--af-bg3)] flex items-center justify-center text-[var(--muted-foreground)] cursor-pointer transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Messages */}
      <div data-ai-messages className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                msg.role === 'user'
                  ? 'bg-[var(--af-accent)] text-background'
                  : 'bg-blue-500/20 text-blue-400'
              )}
            >
              {msg.role === 'user' ? 'Tú' : 'AI'}
            </div>
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[var(--af-accent)] text-background'
                  : 'bg-[var(--af-bg3)] text-[var(--foreground)]',
                msg.isError && 'border border-red-500/30'
              )}
            >
              {msg.role === 'assistant' ? (
                <span dangerouslySetInnerHTML={{ __html: msg.isTyping
                  ? formatMessage(msg.displayContent || '') + (msg.displayContent !== msg.content ? '' : '')
                  : formatMessage(msg.content)
                }} />
              ) : (
                msg.content
              )}
              {msg.isTyping && msg.displayContent !== msg.content && <TypingCursor />}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">AI</div>
            <div className="bg-[var(--af-bg3)] rounded-xl px-4 py-3 text-[13px] text-[var(--muted-foreground)]">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-2 text-[11px]">Analizando datos...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:bg-[var(--af-bg4)] hover:text-[var(--foreground)] cursor-pointer transition-colors border-none"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)] flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre tus proyectos..."
            rows={1}
            className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-xl px-3.5 py-2.5 text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--af-accent)] resize-none max-h-[80px]"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-[var(--af-accent)] text-background flex items-center justify-center cursor-pointer hover:bg-[var(--af-accent2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-none flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
        <div className="text-[9px] text-[var(--af-text3)] mt-1.5 text-center">
          ArchiFlow AI analiza tus datos de proyectos, tareas y presupuesto
        </div>
      </div>
    </div>
  );
}

function fmtCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
