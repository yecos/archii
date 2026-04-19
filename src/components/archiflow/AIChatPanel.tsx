'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

interface ExecutedAction {
  type: string;
  label: string;
  icon: string;
  details: string;
  success: boolean;
  error?: string;
}

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
  actions?: ExecutedAction[];
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  { text: 'Crea una tarea', icon: '📋' },
  { text: 'Resume mi proyecto', icon: '🏗️' },
  { text: 'Registra un gasto', icon: '💰' },
  { text: 'Programa una reunión', icon: '📅' },
  { text: 'Optimiza mi presupuesto', icon: '📊' },
  { text: 'Agrega un proveedor', icon: '🤝' },
  { text: '¿Qué tareas tengo?', icon: '✅' },
  { text: 'Planifica las fases de obra', icon: '📐' },
];

/** Sanitiza HTML generado por la IA */
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
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-sm mt-2 mb-1">$1</h3>')
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
        if (nextChar === ' ' || nextChar === '\n') chunkSize = 1;
        else if ('.!?;:,'.includes(nextChar)) chunkSize = 1;
        else chunkSize = 3;
        const newIndex = Math.min(current.length + chunkSize, full.length);
        return prev.map(m => m.id === msgId ? { ...m, displayContent: full.slice(0, newIndex) } : m);
      });
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return;
      const currentLen = (msg.displayContent || '').length;
      const nextChar = msg.content[currentLen];
      let delay = 8;
      if (nextChar === '\n') delay = 20;
      else if ('.!?'.includes(nextChar)) delay = 60;
      else if (';:,'.includes(nextChar)) delay = 30;
      else if (nextChar === ' ') delay = 10;
      else delay = 6 + Math.random() * 6;
      typingRef.current = setTimeout(tick, delay);
    };

    typingRef.current = setTimeout(tick, 40);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [pendingMsg?.id]);

  const scrollContainer = document.querySelector('[data-ai-messages]');
  if (pendingMsg && scrollContainer) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }
}

/* ─── Typing Cursor ─── */
function TypingCursor() {
  return (
    <span className="inline-block w-[2px] h-[1.1em] bg-[var(--af-accent)] ml-0.5 align-text-bottom animate-af-blink" />
  );
}

/* ─── Action Card Component ─── */
function ActionCard({ action }: { action: ExecutedAction }) {
  return (
    <div className={cn(
      'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs',
      action.success
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
        : 'bg-red-500/10 border-red-500/20 text-red-300'
    )}>
      <span className="text-base leading-none mt-0.5 shrink-0">{action.icon}</span>
      <div className="min-w-0">
        <p className="font-semibold text-xs">{action.label}</p>
        <p className="text-[11px] opacity-80 mt-0.5 break-words">{action.details}</p>
      </div>
      {action.success && (
        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy tu **Super IA** de ArchiFlow. 🚀\n\nPuedo **hacer cosas reales** por ti:\n\n• ✅ **Crear tareas** y asignarlas a tu equipo\n• 🏗️ **Crear proyectos** con fases de obra automáticas\n• 💰 **Registrar gastos** y analizar presupuestos\n• 🤝 **Agregar proveedores** al directorio\n• 📅 **Programar reuniones** para tu equipo\n• 📊 **Consultar datos** de tus proyectos y equipo\n• 🔄 **Actualizar estados** de tareas\n\n**Ejemplos:**\n"Crea una tarea para revisar los planos eléctricos"\n"¿Cuánto he gastado en materiales?"\n"Programa una reunión de obra para mañana a las 9am"\n"Agrega el proveedor Cementos Argos"\n\n¿En qué te ayudo hoy?',
      displayContent: '¡Hola! Soy tu **Super IA** de ArchiFlow. 🚀\n\nPuedo **hacer cosas reales** por ti:\n\n• ✅ **Crear tareas** y asignarlas a tu equipo\n• 🏗️ **Crear proyectos** con fases de obra automáticas\n• 💰 **Registrar gastos** y analizar presupuestos\n• 🤝 **Agregar proveedores** al directorio\n• 📅 **Programar reuniones** para tu equipo\n• 📊 **Consultar datos** de tus proyectos y equipo\n• 🔄 **Actualizar estados** de tareas\n\n**Ejemplos:**\n"Crea una tarea para revisar los planos eléctricos"\n"¿Cuánto he gastado en materiales?"\n"Programa una reunión de obra para mañana a las 9am"\n"Agrega el proveedor Cementos Argos"\n\n¿En qué te ayudo hoy?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingTools, setExecutingTools] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const projectContext = useUIStore((s) => s.aiProjectContext);

  useTypewriter(messages, setMessages);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const isTypingActive = useMemo(() => messages.some(m => m.isTyping), [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTypingActive, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current && window.innerWidth >= 768) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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
    setExecutingTools(true);

    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages
              .filter((m) => m.id !== 'welcome' && !m.isError)
              .slice(-20)
              .map((m) => ({ role: m.role, content: m.content })),
            { role: userMessage.role, content: userMessage.content },
          ],
          projectContext: projectContext || undefined,
        }),
      });

      const data = await response.json();
      setExecutingTools(false);

      if (!response.ok) {
        if (data.setupRequired) {
          const errorMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: `⚠️ ${data.error}\n\n${data.help}`,
            timestamp: new Date(),
            isError: true,
            isSetupRequired: true,
            helpText: data.help,
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          const errorMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: `⚠️ ${data.error || 'Error desconocido'}`,
            timestamp: new Date(),
            isError: true,
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
        return;
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.message,
        displayContent: '',
        timestamp: new Date(),
        isTyping: true,
        actions: data.actions || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[ArchiFlow AI] Error en chat:', error);
      setExecutingTools(false);
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '⚠️ Error de conexión. Verifica tu internet e intenta de nuevo.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full sm:max-w-lg h-[100dvh] sm:h-[80vh] max-h-[100dvh] sm:max-h-[700px] flex flex-col',
          'bg-[var(--af-bg1)] border border-[var(--af-bg4)] sm:rounded-2xl rounded-t-2xl shadow-2xl',
          'animate-slideUp overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--af-bg4)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--af-accent)] to-amber-600 flex items-center justify-center shadow-lg shadow-[var(--af-accent)]/20">
                <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2Z" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <circle cx="12" cy="17" r="0.5" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--af-bg1)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground">Super IA</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--af-accent)]/15 text-[var(--af-accent)] font-semibold">AGENT</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Puedo crear, editar y gestionar tu proyecto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-[var(--af-bg4)] active:bg-[var(--af-bg4)] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin" data-ai-messages>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-[var(--af-accent)] to-amber-600 text-black rounded-br-md shadow-md shadow-[var(--af-accent)]/10'
                    : msg.isError
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-bl-md'
                    : 'bg-[var(--af-bg3)] text-foreground rounded-bl-md'
                )}
              >
                {msg.role === 'assistant' && !msg.isError ? (
                  <div className="relative">
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.displayContent || msg.content) }} />
                    {msg.isTyping && <TypingCursor />}

                    {/* Action Cards */}
                    {msg.actions && msg.actions.length > 0 && !msg.isTyping && (
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                          Acciones ejecutadas
                        </p>
                        {msg.actions.map((action, i) => (
                          <ActionCard key={`${msg.id}-action-${i}`} action={action} />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isLoading && !isTypingActive && (
            <div className="flex justify-start">
              <div className="bg-[var(--af-bg3)] rounded-2xl rounded-bl-md px-4 py-3">
                {executingTools ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <svg className="w-3.5 h-3.5 animate-spin text-[var(--af-accent)]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-[var(--af-accent)]">Ejecutando acciones...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[var(--af-accent)]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[var(--af-accent)]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[var(--af-accent)]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 sm:px-5 pb-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 px-1">Acciones rápidas</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => sendMessage(prompt.text)}
                  className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl bg-[var(--af-bg3)] text-muted-foreground hover:text-foreground active:bg-[var(--af-bg4)] transition-all duration-200 border border-transparent hover:border-[var(--af-bg4)] text-left"
                >
                  <span className="text-sm">{prompt.icon}</span>
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-4 border-t border-[var(--af-bg4)]">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Dime qué necesitas... ej: crea una tarea, consulta presupuesto"
                rows={1}
                className={cn(
                  'w-full resize-none rounded-xl bg-[var(--af-bg3)] border border-[var(--af-bg4)]',
                  'px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--af-accent)]/40 focus:border-[var(--af-accent)]/40',
                  'transition-all duration-200',
                  'max-h-32 scrollbar-thin'
                )}
                style={{ minHeight: '44px' }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0',
                input.trim() && !isLoading
                  ? 'bg-gradient-to-br from-[var(--af-accent)] to-amber-600 text-black hover:opacity-90 shadow-lg shadow-[var(--af-accent)]/20'
                  : 'bg-[var(--af-bg4)] text-muted-foreground cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1 text-center pb-[env(safe-area-inset-bottom,0px)]">
            Super IA puede ejecutar acciones reales en tu proyecto. Verifica los resultados.
          </p>
        </div>
      </div>
    </div>
  );
}
