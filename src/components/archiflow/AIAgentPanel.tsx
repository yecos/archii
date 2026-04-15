'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2, CheckCircle, AlertCircle, RefreshCw, Trash2, MessageSquarePlus, ChevronDown } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestoreContext } from '@/contexts/FirestoreContext';
import { useUIStore } from '@/stores/ui-store';
import { getFirebase } from '@/lib/firebase-service';

/* ===== Types ===== */
interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result?: string }>;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: AgentMessage[];
  projectContext: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DebugInfo {
  ok: boolean;
  summary: string;
  checks?: Array<{ name: string; ok: boolean; message: string }>;
}

interface AIAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  '¿Cuál es el estado del proyecto?',
  '¿Qué tareas vencen esta semana?',
  '¿Qué materiales tienen stock bajo?',
  '¿Cuánto presupuesto queda?',
  'Dame el reporte del proyecto',
  '¿Qué facturas están pendientes?',
];

const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 50;

/* ===== Helpers ===== */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function generateTitle(firstMessage: string): string {
  const clean = firstMessage.trim();
  if (clean.length <= 40) return clean;
  return clean.substring(0, 40) + '...';
}

/** Renderiza markdown básico en el contenido del asistente */
function renderMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/20 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-black/20 px-1.5 py-0.5 rounded text-xs">$1</code>')
    // Bullet lists
    .replace(/^• (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Newlines
    .replace(/\n/g, '<br/>');
}

/* ===== Storage Keys ===== */
const STORAGE_KEY_SESSIONS = 'archiflow-ai-sessions';
const STORAGE_KEY_ACTIVE = 'archiflow-ai-active-session';

/** Load sessions from localStorage */
function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []).map((s: Record<string, unknown>) => ({
      id: (s.id as string) || generateId(),
      title: (s.title as string) || 'Conversación',
      projectContext: (s.projectContext as string) || '',
      ...s,
      createdAt: new Date(s.createdAt as string | number),
      updatedAt: new Date(s.updatedAt as string | number),
      messages: (s.messages as Array<Record<string, unknown>> || []).map((m) => ({
        ...m,
        id: (m.id as string) || generateId(),
        role: (m.role as 'user' | 'assistant') || 'user',
        content: (m.content as string) || '',
        timestamp: new Date(m.timestamp as string | number),
      })),
    }));
  } catch {
    return [];
  }
}

/** Save sessions to localStorage */
function saveSessions(sessions: ChatSession[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch { /* noop — storage full */ }
}

/** Load active session ID */
function loadActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE);
  } catch {
    return null;
  }
}

/** Save active session ID */
function saveActiveSessionId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, id);
  } catch { /* noop */ }
}

/* ===== Component ===== */
export default function AIAgentPanel({ isOpen, onClose }: AIAgentPanelProps) {
  const { authUser } = useAuthContext();
  const { projects } = useFirestoreContext();
  const aiProjectContext = useUIStore((s) => s.aiProjectContext);
  const currentScreen = useUIStore((s) => s.currentScreen);

  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionListOpen, setSessionListOpen] = useState(false);

  // UI
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasCheckedDebug = useRef(false);
  const sessionsInitialized = useRef(false);

  // Derived
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];
  const projectContext = activeSession?.projectContext || '';

  /* ===== Initialize Sessions ===== */
  useEffect(() => {
    if (sessionsInitialized.current) return;
    sessionsInitialized.current = true;

    const loaded = loadSessions();
    if (loaded.length > 0) {
      setSessions(loaded);
      const savedActive = loadActiveSessionId();
      setActiveSessionId(savedActive && loaded.some(s => s.id === savedActive) ? savedActive : loaded[0].id);
    } else {
      // Create first session
      const newSession: ChatSession = {
        id: generateId(),
        title: 'Nueva conversación',
        messages: [],
        projectContext: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      saveSessions([newSession]);
      saveActiveSessionId(newSession.id);
    }
  }, []);

  /* ===== Auto-set project context ===== */
  useEffect(() => {
    if (!activeSessionId || !aiProjectContext) return;
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId || s.projectContext) return s;
      return { ...s, projectContext: aiProjectContext, updatedAt: new Date() };
    }));
  }, [aiProjectContext, activeSessionId]);

  /* ===== Persist sessions ===== */
  useEffect(() => {
    if (sessions.length === 0) return;
    saveSessions(sessions);
  }, [sessions]);

  /* ===== Persist active session ===== */
  useEffect(() => {
    if (activeSessionId) saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  /* ===== Scroll ===== */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  /* ===== Debug ===== */
  const runDebug = useCallback(async () => {
    if (hasCheckedDebug.current) return;
    hasCheckedDebug.current = true;
    setDebugLoading(true);
    try {
      const fb = getFirebase();
      const currentUser = fb.auth().currentUser;
      if (!currentUser) {
        setDebugInfo({ ok: false, summary: 'No hay sesión de Firebase activa.' });
        setDebugLoading(false);
        return;
      }
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/ai-debug', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setDebugInfo(data);
    } catch {
      setDebugInfo({ ok: false, summary: 'No se pudo verificar el estado de la IA.' });
    } finally {
      setDebugLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) runDebug();
  }, [isOpen, runDebug]);

  /* ===== Session Management ===== */
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'Nueva conversación',
      messages: [],
      projectContext: aiProjectContext || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions(prev => {
      const updated = [newSession, ...prev].slice(0, MAX_SESSIONS);
      saveSessions(updated);
      return updated;
    });
    setActiveSessionId(newSession.id);
    saveActiveSessionId(newSession.id);
    setSessionListOpen(false);
  }, [aiProjectContext]);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setSessionListOpen(false);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSessions(updated);
      return updated;
    });
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        saveActiveSessionId(remaining[0].id);
      } else {
        createNewSession();
      }
    }
  }, [activeSessionId, sessions, createNewSession]);

  const clearAllSessions = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'Nueva conversación',
      messages: [],
      projectContext: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions([newSession]);
    setActiveSessionId(newSession.id);
    saveSessions([newSession]);
    saveActiveSessionId(newSession.id);
  }, []);

  const updateSessionProjectContext = useCallback((context: string) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return { ...s, projectContext: context, updatedAt: new Date() };
    }));
  }, [activeSessionId]);

  /* ===== Send Message ===== */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !activeSessionId) return;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: AgentMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    // Update session with user message + assistant placeholder
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const updatedMessages = [...s.messages, userMsg, assistantMsg]
        .slice(-MAX_MESSAGES_PER_SESSION);
      const isFirstMessage = s.messages.length === 0;
      return {
        ...s,
        title: isFirstMessage ? generateTitle(content) : s.title,
        messages: updatedMessages,
        updatedAt: new Date(),
      };
    }));

    setInput('');
    setIsLoading(true);

    // Build messages array for the API (only previous messages, not the placeholder)
    const currentSession = sessions.find(s => s.id === activeSessionId);
    const apiMessages = [...(currentSession?.messages || []), userMsg]
      .slice(-30)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      if (!authUser) throw new Error('No autenticado');
      const fb = getFirebase();
      const currentUser = fb.auth().currentUser;
      if (!currentUser) throw new Error('No hay sesión activa. Recarga la página e intenta de nuevo.');
      const token = await currentUser.getIdToken();

      abortRef.current = new AbortController();

      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          projectContext: projectContext || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Error de conexión' }));
        const errMsg = errData.error || `Error ${response.status}`;
        let helpfulMsg = errMsg;
        if (errMsg.includes('API keys') || errMsg.includes('api keys')) {
          helpfulMsg = 'No hay API keys configuradas. Configura GROQ_API_KEY, MISTRAL_API_KEY u OPENAI_API_KEY en Vercel.';
        } else if (errMsg.includes('límite de tasa') || errMsg.includes('rate limit')) {
          helpfulMsg = 'Proveedores en límite de tasa. Espera unos segundos.';
        } else if (response.status === 401) {
          helpfulMsg = 'Sesión expirada. Recarga la página.';
        }
        throw new Error(helpfulMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo leer la respuesta del servidor.');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        // Update session with streaming content
        const capturedContent = fullContent;
        setSessions(prev => prev.map(s => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === assistantId ? { ...m, content: capturedContent } : m
            ),
            updatedAt: new Date(),
          };
        }));
      }

      // Finalize
      setSessions(prev => prev.map(s => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map(m =>
            m.id === assistantId ? { ...m, content: fullContent, isStreaming: false } : m
          ),
          updatedAt: new Date(),
        };
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Respuesta cancelada.'
        : err instanceof Error ? `Error: ${err.message}`
        : 'Error desconocido';

      setSessions(prev => prev.map(s => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map(m =>
            m.id === assistantId ? { ...m, content: msg, isStreaming: false } : m
          ),
          updatedAt: new Date(),
        };
      }));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, activeSessionId, sessions, authUser, projectContext]);

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

  const isAIOK = debugInfo?.ok === true;

  return (
    <div className="fixed inset-0 z-[150] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[460px] bg-[var(--background)] border-l border-[var(--border)] flex flex-col shadow-2xl animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--af-accent)]/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[var(--af-accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Agente IA</h3>
                <div className={`w-1.5 h-1.5 rounded-full ${debugLoading ? 'bg-yellow-400 animate-pulse' : isAIOK ? 'bg-emerald-400' : debugInfo ? 'bg-red-400' : 'bg-[var(--muted-foreground)]'}`} />
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {debugLoading ? 'Verificando...' : isAIOK ? 'Conectado' : debugInfo ? 'Sin conexión' : `${sessions.length} sesión(es)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              onClick={createNewSession}
              title="Nueva conversación"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            <button
              className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Session List Toggle + Project Context */}
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--af-bg3)] space-y-2">
          {/* Session selector */}
          <div className="relative">
            <button
              className="w-full flex items-center justify-between bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] hover:border-[var(--af-accent)]/30 transition-colors cursor-pointer"
              onClick={() => setSessionListOpen(!sessionListOpen)}
            >
              <span className="truncate">{activeSession?.title || 'Nueva conversación'}</span>
              <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ml-2 transition-transform ${sessionListOpen ? 'rotate-180' : ''}`} />
            </button>

            {sessionListOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg z-10 max-h-[200px] overflow-y-auto">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--af-bg3)] cursor-pointer ${session.id === activeSessionId ? 'bg-[var(--af-accent)]/10' : ''}`}
                    onClick={() => switchSession(session.id)}
                  >
                    <span className="truncate flex-1">{session.title}</span>
                    <button
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-[var(--muted-foreground)] hover:text-red-400 ml-2 flex-shrink-0 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="px-3 py-2 border-t border-[var(--border)]">
                  <button
                    className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                    onClick={clearAllSessions}
                  >
                    Borrar todo el historial
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Project context */}
          <select
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none cursor-pointer hover:border-[var(--af-accent)]/30 transition-colors"
            value={projectContext}
            onChange={e => updateSessionProjectContext(e.target.value)}
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
              <p className="text-xs text-[var(--muted-foreground)] mb-3 max-w-[280px] mx-auto">
                Tareas, inventario, facturación, cotizaciones, reuniones y reportes. Todo desde este chat.
              </p>

              {/* Debug status */}
              {debugLoading && (
                <div className="flex items-center justify-center gap-2 text-xs text-yellow-400 mb-3">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Verificando conexión...
                </div>
              )}

              {!debugLoading && debugInfo && !isAIOK && (
                <div className="mx-auto max-w-[300px] mb-3">
                  <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-left leading-relaxed mb-2">
                    <div className="flex items-center gap-1.5 mb-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      IA no disponible
                    </div>
                    <p>{debugInfo.summary}</p>
                  </div>
                  {debugInfo.checks && (
                    <div className="space-y-1 text-left">
                      {debugInfo.checks.map(c => (
                        <div key={c.name} className="flex items-center gap-1.5 text-[10px]">
                          {c.ok ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-[var(--muted-foreground)]">
                            <span className="font-mono">{c.name}</span>: {c.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { hasCheckedDebug.current = false; runDebug(); }}
                    className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--af-accent)] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reintentar
                  </button>
                </div>
              )}

              {!debugLoading && isAIOK && (
                <div className="mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
                    <CheckCircle className="w-3 h-3" />
                    {debugInfo.summary}
                  </div>
                </div>
              )}

              {/* Quick prompts */}
              {isAIOK && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_PROMPTS.slice(0, 6).map((prompt, i) => (
                    <button
                      key={i}
                      className="px-3 py-1.5 rounded-lg text-[11px] bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/30 transition-colors cursor-pointer"
                      onClick={() => sendMessage(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[var(--af-accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[var(--af-accent)]" />
                </div>
              )}
              <div className={`max-w-[82%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--af-accent)] text-background'
                  : 'bg-[var(--af-bg3)] border border-[var(--border)]'
              }`}>
                {msg.role === 'assistant' && msg.content.startsWith('Error:') ? (
                  <span className="text-red-400 text-xs">{msg.content}</span>
                ) : msg.role === 'assistant' ? (
                  <span className={msg.isStreaming ? 'opacity-80' : ''} dangerouslySetInnerHTML={{
                    __html: msg.content
                      ? renderMarkdown(msg.content)
                      : `<span class="flex items-center gap-2 text-[var(--muted-foreground)]"><svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Pensando...</span>`,
                  }} />
                ) : (
                  <span>{msg.content}</span>
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
