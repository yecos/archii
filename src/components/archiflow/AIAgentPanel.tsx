'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestoreContext } from '@/contexts/FirestoreContext';
import { useUIStore } from '@/stores/ui-store';
import { getFirebase } from '@/lib/firebase-service';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result?: string }>;
  isStreaming?: boolean;
}

interface AIAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'Crear tarea para revisar planos',
  '¿Qué tareas vencen esta semana?',
  'Registrar gasto de materiales',
  '¿Cuál es el estado del proyecto?',
  'Listar tareas pendientes',
  '¿Qué presupuestos están en riesgo?',
];

export default function AIAgentPanel({ isOpen, onClose }: AIAgentPanelProps) {
  const { authUser } = useAuthContext();
  const { projects } = useFirestoreContext();
  const aiProjectContext = useUIStore((s) => s.aiProjectContext);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectContext, setProjectContext] = useState(aiProjectContext || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Send message to AI agent
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Create assistant placeholder for streaming
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      // Get Firebase ID token
      if (!authUser) throw new Error('No autenticado');
      const fb = getFirebase();
      const currentUser = fb.auth().currentUser;
      if (!currentUser) throw new Error('No hay sesión activa');
      const token = await currentUser.getIdToken();

      abortRef.current = new AbortController();

      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          projectContext: projectContext || undefined,
          taskType: 'chat',
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Error de conexión' }));
        throw new Error(errData.error || `Error ${response.status}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo leer la respuesta');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE-like data stream from Vercel AI SDK
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2));
              fullContent += text;
            } catch {
              // Skip malformed chunks
            }
          } else if (line.startsWith('9:')) {
            // Tool call indicator
            try {
              const toolData = JSON.parse(line.slice(2));
              if (toolData.toolName) {
                // Update messages with tool call info
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...(m.toolCalls || []), { name: toolData.toolName, args: toolData.args || {} }] }
                    : m
                ));
              }
            } catch {
              // Skip
            }
          }
        }

        // Update streaming content
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: fullContent } : m
        ));
      }

      // Finalize
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: '⚠️ Respuesta cancelada', isStreaming: false } : m
        ));
      } else {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: `❌ Error: ${msg}`, isStreaming: false } : m
        ));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, messages, authUser, projectContext]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[440px] bg-[var(--background)] border-l border-[var(--border)] flex flex-col shadow-2xl animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--af-accent)]/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[var(--af-accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Agente IA</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">Groq — Gratis</p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project Context Selector */}
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--af-bg3)]">
          <select
            className="w-full bg-transparent text-xs text-[var(--foreground)] outline-none cursor-pointer"
            value={projectContext}
            onChange={e => setProjectContext(e.target.value)}
          >
            <option value="">Sin contexto de proyecto</option>
            {projects.map(p => (
              <option key={p.id} value={`${p.data.name} (ID: ${p.id})`}>
                {p.data.name || 'Sin nombre'}
              </option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--af-accent)]/10 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-7 h-7 text-[var(--af-accent)]" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Agente IA de ArchiFlow</h3>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Puedo crear tareas, registrar gastos, consultar proyectos y más. Todo gratis con IA.
              </p>
              {/* Quick prompts */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {QUICK_PROMPTS.slice(0, 4).map((prompt, i) => (
                  <button
                    key={i}
                    className="px-3 py-1.5 rounded-lg text-[11px] bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/30 transition-colors cursor-pointer"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[var(--af-accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[var(--af-accent)]" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-[var(--af-accent)] text-background'
                  : 'bg-[var(--af-bg3)] border border-[var(--border)]'
              }`}>
                {msg.role === 'assistant' && msg.content.startsWith('❌') ? (
                  <span className="text-red-400 text-xs">{msg.content}</span>
                ) : (
                  <span className={msg.isStreaming ? 'opacity-80' : ''}>
                    {msg.content || (
                      <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Pensando...
                      </span>
                    )}
                  </span>
                )}

                {/* Tool calls badges */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.toolCalls.map((tc, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>{tc.name}: {JSON.stringify(tc.args).substring(0, 60)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[var(--af-accent)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-background" />
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] outline-none resize-none min-h-[40px] max-h-[120px] focus:border-[var(--af-accent)]"
              placeholder="Pide algo al agente IA..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-xl bg-[var(--af-accent)] text-background flex items-center justify-center hover:bg-[var(--af-accent2)] transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[var(--muted-foreground)]">
              Enter para enviar · Shift+Enter nueva línea
            </span>
            {isLoading && (
              <button
                type="button"
                className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                onClick={() => abortRef.current?.abort()}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
