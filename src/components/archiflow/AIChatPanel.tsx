'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectContext?: string;
}

const QUICK_PROMPTS = [
  '¿Cómo organizar las fases de obra?',
  'Sugiere tareas para mi proyecto',
  '¿Cómo optimizar el presupuesto?',
  'Mejores prácticas para supervisión',
];

export default function AIChatPanel({ isOpen, onClose, projectContext }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asistente ArchiFlow AI. Puedo ayudarte con:\n\n• Planificación de proyectos de arquitectura\n• Sugerencias de tareas y cronogramas\n• Optimización de presupuestos\n• Recomendaciones de materiales\n• Consultas sobre normativas\n\n¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
              .filter((m) => m.id !== 'welcome')
              .map((m) => ({ role: m.role, content: m.content })),
            { role: userMessage.role, content: userMessage.content },
          ],
          projectContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del asistente');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
        timestamp: new Date(),
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

  const formatMessage = (content: string) => {
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-black/20 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/20 px-1.5 py-0.5 rounded text-xs">$1</code>')
      .replace(/^• (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n/g, '<br/>');
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
              <svg className="w-5 h-5 text-[var(--af-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2Z" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" />
              </svg>
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
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
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
                    : 'bg-[var(--af-bg3)] text-foreground rounded-bl-md'
                )}
              >
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--af-bg3)] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
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
            ArchiFlow AI puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}
