'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { HelpCircle, X, Loader2, Send } from 'lucide-react';
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
  '¿Cómo organizar las fases de obra?',
  'Sugiere tareas para mi proyecto',
  '¿Cómo optimizar el presupuesto?',
  'Mejores prácticas para supervisión',
];

/** Sanitiza HTML generado por la IA — elimina scripts, events handlers, y estilos peligrosos */
function sanitizeHTML(html: string): string {
  return html
    // Eliminar etiquetas script y su contenido
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Eliminar atributos de evento (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Eliminar javascript: en href/src
    .replace(/(href|src)\s*=\s*["']?javascript:[^"'>]*/gi, '$1="#"')
    // Eliminar etiquetas style con contenido
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Eliminar etiquetas iframe/embed/object
    .replace(/<(iframe|embed|object|form|input|select|textarea)\b[^>]*>/gi, '')
    // Eliminar etiquetas meta/link
    .replace(/<(meta|link|base)\b[^>]*>/gi, '')
    // Mantener solo etiquetas seguras
    .replace(/<(?!\/?(br|p|div|span|strong|b|em|i|u|s|ul|ol|li|code|pre|blockquote|h[1-6]|a|table|tr|td|th|thead|tbody|hr))\b[^>]*>/gi, '');
}

const formatMessage = (content: string): string => {
  const html = content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-black/20 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/20 px-1.5 py-0.5 rounded text-xs">$1</code>')
    .replace(/^• (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br/>');

  return sanitizeHTML(html);
};

/* ─── Typewriter Hook ─── */
function useTypewriter(messages: Message[], setMessages: React.Dispatch<React.SetStateAction<Message[]>>) {
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgIdxRef = useRef(0);
  const charIdxRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);

  // Find the first message that needs typing animation
  const pendingMsg = useMemo(() => {
    for (const m of messages) {
      if (m.isTyping && m.displayContent !== m.content) return m;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!pendingMsg) return;
    const msgId = pendingMsg.id;
    activeIdRef.current = msgId;

    const tick = () => {
      setMessages(prev => {
        const msg = prev.find(m => m.id === msgId && m.isTyping);
        if (!msg || !msg.isTyping) { activeIdRef.current = null; return prev; }
        const full = msg.content;
        const current = msg.displayContent || '';
        if (current.length >= full.length) {
          // Done typing this message
          return prev.map(m => m.id === msgId ? { ...m, displayContent: full, isTyping: false } : m);
        }
        // Determine how many chars to add (speed varies: faster for spaces/newlines, slower for punctuation)
        const nextChar = full[current.length];
        let chunkSize = 1;
        if (nextChar === ' ' || nextChar === '\n') chunkSize = 1;
        else if ('.!?;:,'.includes(nextChar)) chunkSize = 1;
        else chunkSize = 2;
        const newIndex = Math.min(current.length + chunkSize, full.length);
        return prev.map(m => m.id === msgId ? { ...m, displayContent: full.slice(0, newIndex) } : m);
      });
      // Variable delay: pause longer at punctuation
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return;
      const currentLen = (msg.displayContent || '').length;
      const nextChar = msg.content[currentLen];
      let delay = 12;
      if (nextChar === '\n') delay = 30;
      else if ('.!?'.includes(nextChar)) delay = 80;
      else if (';:,'.includes(nextChar)) delay = 40;
      else if (nextChar === ' ') delay = 16;
      else delay = 12 + Math.random() * 8;
      typingRef.current = setTimeout(tick, delay);
    };

    typingRef.current = setTimeout(tick, 60);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [pendingMsg?.id]);

  // Scroll while typing (useEffect to avoid document access during SSR)
  useEffect(() => {
    if (!pendingMsg) return;
    const scrollContainer = document.querySelector('[data-ai-messages]');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [pendingMsg]);
}

/* ─── Typing Cursor Component ─── */
function TypingCursor() {
  return (
    <span className="inline-block w-[2px] h-[1.1em] bg-[var(--af-accent)] ml-0.5 align-text-bottom animate-af-blink" />
  );
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente ArchiFlow AI. Puedo ayudarte con:\n\n• Planificación de proyectos de arquitectura\n• Sugerencias de tareas y cronogramas\n• Optimización de presupuestos\n• Recomendaciones de materiales\n• Consultas sobre normativas\n\n¿En qué puedo ayudarte hoy?',
      displayContent: '¡Hola! Soy tu asistente ArchiFlow AI. Puedo ayudarte con:\n\n• Planificación de proyectos de arquitectura\n• Sugerencias de tareas y cronogramas\n• Optimización de presupuestos\n• Recomendaciones de materiales\n• Consultas sobre normativas\n\n¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const projectContext = useUIStore((s) => s.aiProjectContext);

  // Typewriter effect
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

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages
              .filter((m) => m.id !== 'welcome' && !m.isError)
              .slice(-20) // Limitar historial a 20 mensajes
              .map((m) => ({ role: m.role, content: m.content })),
            { role: userMessage.role, content: userMessage.content },
          ],
          projectContext: projectContext || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Si es error de configuración, mostrar ayuda detallada
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
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[ArchiFlow AI] Error en chat:', error);
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
            <div className="w-9 h-9 rounded-xl bg-[var(--af-accent)]/15 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-[var(--af-accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">ArchiFlow AI</h3>
              <p className="text-xs text-muted-foreground">Asistente de proyectos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-[var(--af-bg4)] active:bg-[var(--af-bg4)] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
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
                    ? 'bg-[var(--af-accent)] text-black rounded-br-md'
                    : msg.isError
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-bl-md'
                    : 'bg-[var(--af-bg3)] text-foreground rounded-bl-md'
                )}
              >
                {msg.role === 'assistant' && !msg.isError ? (
                  <div className="relative">
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatMessage(msg.displayContent || msg.content)) }} />
                    {msg.isTyping && <TypingCursor />}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator (only when loading AND not yet typing) */}
          {isLoading && !isTypingActive && (
            <div className="flex justify-start">
              <div className="bg-[var(--af-bg3)] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--af-accent)]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--af-accent)]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--af-accent)]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 sm:px-5 pb-2 flex flex-wrap gap-2 max-h-[80px] overflow-y-auto scrollbar-none">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs px-3 py-2 rounded-full bg-[var(--af-bg3)] text-muted-foreground hover:text-foreground active:bg-[var(--af-bg4)] transition-colors border border-transparent hover:border-[var(--af-bg4)] whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
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
                placeholder="Escribe tu pregunta..."
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
                  ? 'bg-[var(--af-accent)] text-black hover:opacity-90 shadow-lg shadow-[var(--af-accent)]/20'
                  : 'bg-[var(--af-bg4)] text-muted-foreground cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1 text-center pb-[env(safe-area-inset-bottom,0px)]">
            ArchiFlow AI puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}
