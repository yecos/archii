'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2, CheckCircle, AlertCircle, RefreshCw, Trash2, MessageSquarePlus, ChevronDown, ChevronRight, Copy, Check, Paperclip, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestoreContext } from '@/contexts/FirestoreContext';
import { useUIContext } from '@/contexts/UIContext';
import { useUIStore } from '@/stores/ui-store';
import { getFirebase } from '@/lib/firebase-service';

/* ===== Types ===== */
interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status?: 'running' | 'success' | 'error';
}

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
  images?: string[]; // base64 or URLs
}

interface ChatSession {
  id: string;
  title: string;
  messages: AgentMessage[];
  projectContext: string;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  synced?: boolean; // has been synced to Firestore
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
  'Cual es el estado del proyecto?',
  'Que tareas vencen esta semana?',
  'Que materiales tienen stock bajo?',
  'Cuanto presupuesto queda?',
  'Dame el reporte del proyecto',
  'Que facturas estan pendientes?',
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

/* ===== Storage Keys (localStorage fallback) ===== */
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
      title: (s.title as string) || 'Conversacion',
      projectContext: (s.projectContext as string) || '',
      projectId: (s.projectId as string) || undefined,
      createdAt: new Date(s.createdAt as string | number),
      updatedAt: new Date(s.updatedAt as string | number),
      messages: (s.messages as Array<Record<string, unknown>> || []).map((m) => ({
        ...m,
        id: (m.id as string) || generateId(),
        role: (m.role as 'user' | 'assistant') || 'user',
        content: (m.content as string) || '',
        timestamp: new Date(m.timestamp as string | number),
        images: (m.images as string[]) || undefined,
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

/* ===== Markdown Components ===== */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none
      prose-p:my-1 prose-p:leading-relaxed
      prose-headings:my-2 prose-headings:text-[var(--foreground)]
      prose-h1:text-base prose-h2:text-sm prose-h3:text-xs
      prose-li:my-0.5
      prose-pre:bg-black/30 prose-pre:rounded-lg prose-pre:p-2 prose-pre:my-2 prose-pre:text-xs
      prose-code:text-xs prose-code:bg-black/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
      prose-pre:code:bg-transparent prose-pre:code:px-0 prose-pre:code:py-0
      prose-strong:text-[var(--foreground)]
      prose-table:text-xs prose-th:text-[var(--foreground)] prose-td:text-[var(--muted-foreground)]
      prose-a:text-[var(--af-accent)]
      prose-blockquote:border-[var(--af-accent)]/30 prose-blockquote:text-[var(--muted-foreground)]
      [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ===== ToolCallBadge Component ===== */
function ToolCallBadge({ toolCall }: { toolCall: ToolCallInfo }) {
  const [expanded, setExpanded] = useState(false);
  if (!toolCall) return null;

  const statusIcon = toolCall.status === 'running'
    ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
    : toolCall.status === 'error'
      ? <AlertCircle className="w-3 h-3 text-red-400" />
      : <CheckCircle className="w-3 h-3 text-emerald-400" />;

  const statusLabel = toolCall.status === 'running'
    ? 'Ejecutando...'
    : toolCall.status === 'error'
      ? 'Error'
      : 'Completado';

  return (
    <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/50 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-[var(--muted-foreground)] hover:bg-[var(--af-bg3)] transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {statusIcon}
        <span className="font-medium text-[var(--foreground)]">{toolCall.name}</span>
        <span className="truncate text-[10px] opacity-70">
          {JSON.stringify(toolCall.args).substring(0, 50)}...
        </span>
        <span className="ml-auto text-[10px]">{statusLabel}</span>
        {toolCall.result && (
          <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
      </button>
      {expanded && toolCall.result && (
        <div className="px-2.5 pb-2 text-[10px] text-[var(--muted-foreground)] bg-black/10 border-t border-[var(--border)] whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {typeof toolCall.result === 'string' ? toolCall.result : String(toolCall.result)}
        </div>
      )}
    </div>
  );
}

/* ===== Component ===== */
export default function AIAgentPanel({ isOpen, onClose }: AIAgentPanelProps) {
  const { authUser } = useAuthContext();
  const { projects } = useFirestoreContext();
  const aiProjectContext = useUIStore((s) => s.aiProjectContext);
  const currentScreen = useUIStore((s) => s.currentScreen);
  const { selectedProjectId } = useUIContext();

  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionListOpen, setSessionListOpen] = useState(false);

  // UI
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasCheckedDebug = useRef(false);
  const sessionsInitialized = useRef(false);

  // Derived
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];
  const projectContext = activeSession?.projectContext || '';
  const activeProject = useMemo(() =>
    projects.find(p => p.id === (activeSession?.projectId || selectedProjectId)),
    [projects, activeSession?.projectId, selectedProjectId]
  );

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
      const newSession: ChatSession = {
        id: generateId(),
        title: 'Nueva conversacion',
        messages: [],
        projectContext: aiProjectContext || '',
        projectId: selectedProjectId || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      saveSessions([newSession]);
      saveActiveSessionId(newSession.id);
    }

    // Load sessions from Firestore (cloud backup — merge with localStorage)
    const loadFromFirestore = async () => {
      try {
        const fb = getFirebase();
        const currentUser = fb.auth().currentUser;
        if (!currentUser) return;
        const token = await currentUser.getIdToken();

        const res = await fetch('/api/ai-chat-history', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const cloudSessions: Array<Record<string, unknown>> = data.sessions || [];
        if (cloudSessions.length === 0) return;

        setSessions(prev => {
          // Merge: cloud sessions overwrite local if newer or not present
          const localMap = new Map(prev.map(s => [s.id, s]));
          const merged: ChatSession[] = [];

          // Add all cloud sessions
          for (const cs of cloudSessions) {
            const cloudSession: ChatSession = {
              id: cs.id as string || generateId(),
              title: (cs.title as string) || 'Conversacion',
              messages: ((cs.messages || []) as Array<Record<string, unknown>>).map(m => ({
                ...m,
                id: (m.id as string) || generateId(),
                role: (m.role as 'user' | 'assistant') || 'user',
                content: (m.content as string) || '',
                timestamp: new Date(m.timestamp as string),
                images: (m.images as string[]) || undefined,
                toolCalls: (m.toolCalls as ToolCallInfo[]) || undefined,
              })),
              projectContext: (cs.projectContext as string) || '',
              projectId: (cs.projectId as string) || undefined,
              createdAt: new Date(cs.createdAt as string),
              updatedAt: new Date(cs.updatedAt as string),
            };

            const local = localMap.get(cloudSession.id);
            if (!local || new Date(cloudSession.updatedAt) > new Date(local.updatedAt)) {
              merged.push(cloudSession);
              localMap.delete(cloudSession.id);
            } else {
              merged.push(local);
              localMap.delete(cloudSession.id);
            }
          }

          // Add remaining local sessions not in cloud
          for (const local of localMap.values()) {
            merged.push(local);
          }

          // Sort by updatedAt desc, limit to MAX_SESSIONS
          merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          const finalSessions = merged.slice(0, MAX_SESSIONS);
          saveSessions(finalSessions);

          // Keep active session if it still exists
          const activeId = activeSessionId || loadActiveSessionId();
          if (activeId && finalSessions.some(s => s.id === activeId)) {
            return finalSessions;
          }
          if (finalSessions.length > 0) {
            setActiveSessionId(finalSessions[0].id);
            saveActiveSessionId(finalSessions[0].id);
          }
          return finalSessions;
        });
      } catch (err) {
        // Silent fail — localStorage is the primary store
        console.warn('[Agent] Could not load history from Firestore:', err instanceof Error ? err.message : err);
      }
    };

    // Delay Firestore load slightly to not block UI
    setTimeout(loadFromFirestore, 1500);
  }, []);

  /* ===== Auto-set project context from active project ===== */
  useEffect(() => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      if (s.projectContext) return s; // don't override if already set
      if (!aiProjectContext) return s;
      return { ...s, projectContext: aiProjectContext, projectId: selectedProjectId || s.projectId, updatedAt: new Date() };
    }));
  }, [aiProjectContext, activeSessionId, selectedProjectId]);

  /* ===== Persist sessions to localStorage ===== */
  useEffect(() => {
    if (sessions.length === 0) return;
    saveSessions(sessions);
  }, [sessions]);

  /* ===== Persist active session ===== */
  useEffect(() => {
    if (activeSessionId) saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  /* ===== Sync session to Firestore (debounced) ===== */
  useEffect(() => {
    if (!activeSessionId || !authUser || !activeSession || activeSession.messages.length === 0) return;
    const timeoutId = setTimeout(async () => {
      try {
        const fb = getFirebase();
        const currentUser = fb.auth().currentUser;
        if (!currentUser) return;
        const token = await currentUser.getIdToken();

        await fetch('/api/ai-chat-history', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId: activeSessionId,
            title: activeSession.title,
            messages: activeSession.messages.slice(-30).map(m => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp.toISOString(),
              images: m.images,
              toolCalls: m.toolCalls,
            })),
            projectContext: activeSession.projectContext,
            projectId: activeSession.projectId,
          }),
        });
      } catch {
        // Silent fail — localStorage is the primary store
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [sessions, activeSessionId, authUser, activeSession]);

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

  /* ===== Autogrow textarea ===== */
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [input]);

  /* ===== Debug ===== */
  const runDebug = useCallback(async () => {
    if (hasCheckedDebug.current) return;
    hasCheckedDebug.current = true;
    setDebugLoading(true);
    try {
      const fb = getFirebase();
      const currentUser = fb.auth().currentUser;
      if (!currentUser) {
        setDebugInfo({ ok: false, summary: 'No hay sesion de Firebase activa.' });
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

  /* ===== Copy message ===== */
  const copyMessage = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  /* ===== Image handling ===== */
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) return; // 5MB limit
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPendingImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removePendingImage = useCallback((index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  /* ===== Session Management ===== */
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'Nueva conversacion',
      messages: [],
      projectContext: aiProjectContext || '',
      projectId: selectedProjectId || undefined,
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
    setPendingImages([]);
  }, [aiProjectContext, selectedProjectId]);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setSessionListOpen(false);
    setPendingImages([]);
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
      title: 'Nueva conversacion',
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
    const selectedProject = projects.find(p => `${p.data.name} (ID: ${p.id})` === context);
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return {
        ...s,
        projectContext: context,
        projectId: selectedProject?.id || undefined,
        updatedAt: new Date(),
      };
    }));
  }, [activeSessionId, projects]);

  /* ===== Send Message ===== */
  const sendMessage = useCallback(async (content: string, images?: string[]) => {
    if (!content.trim() && (!images || images.length === 0)) return;
    if (isLoading || !activeSessionId) return;

    // Build user message with optional image references
    const userContent = content.trim();
    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date(),
      images: images && images.length > 0 ? images : undefined,
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
    setPendingImages([]);
    setIsLoading(true);

    // Build messages array for the API
    const currentSession = sessions.find(s => s.id === activeSessionId);
    const apiMessages = [...(currentSession?.messages || []), userMsg]
      .slice(-30)
      .map(m => ({
        role: m.role,
        content: m.content,
        images: m.images,
      }));

    try {
      if (!authUser) throw new Error('No autenticado');
      const fb = getFirebase();
      const currentUser = fb.auth().currentUser;
      if (!currentUser) throw new Error('No hay sesion activa. Recarga la pagina e intenta de nuevo.');
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
          projectId: activeSession?.projectId || selectedProjectId || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Error de conexion' }));
        const errMsg = errData.error || `Error ${response.status}`;
        let helpfulMsg = errMsg;
        if (errMsg.includes('API keys') || errMsg.includes('api keys')) {
          helpfulMsg = 'No hay API keys configuradas. Configura GROQ_API_KEY, MISTRAL_API_KEY u OPENAI_API_KEY en Vercel.';
        } else if (errMsg.includes('limite de tasa') || errMsg.includes('rate limit')) {
          helpfulMsg = 'Proveedores en limite de tasa. Espera unos segundos.';
        } else if (response.status === 401) {
          helpfulMsg = 'Sesion expirada. Recarga la pagina.';
        }
        throw new Error(helpfulMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo leer la respuesta del servidor.');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      const liveToolCalls: ToolCallInfo[] = [];

      // Helper: update session with current content and tool calls
      const updateStream = (text: string, toolCalls: ToolCallInfo[]) => {
        setSessions(prev => prev.map(s => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === assistantId
                ? { ...m, content: text, toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined }
                : m
            ),
            updatedAt: new Date(),
          };
        }));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Try parsing as JSON event (new format with tool calls)
          try {
            const ev = JSON.parse(line);

            if (ev.t === 'text') {
              // Text delta from the AI
              fullContent += ev.c || '';
              updateStream(fullContent, liveToolCalls);
            } else if (ev.t === 'tc') {
              // Tool call started — show as "running"
              liveToolCalls.push({
                name: typeof ev.n === 'string' ? ev.n : String(ev.n ?? 'herramienta'),
                args: ev.a || {},
                status: 'running',
              });
              updateStream(fullContent, liveToolCalls);
            } else if (ev.t === 'tr') {
              // Tool result received — update status
              const lastRunning = [...liveToolCalls].reverse().find(tc => tc.status === 'running');
              if (lastRunning) {
                lastRunning.status = ev.e ? 'error' : 'success';
                lastRunning.result = typeof ev.r === 'string' ? ev.r : ev.r != null ? String(ev.r) : '';
              } else {
                // No matching running call, add as new
                liveToolCalls.push({
                  name: typeof ev.n === 'string' ? ev.n : String(ev.n ?? 'herramienta'),
                  args: {},
                  status: ev.e ? 'error' : 'success',
                  result: typeof ev.r === 'string' ? ev.r : ev.r != null ? String(ev.r) : '',
                });
              }
              updateStream(fullContent, liveToolCalls);
            } else if (ev.t === 'err') {
              console.error('[Agent] Stream error event:', ev.m);
            }
            // 'done' event — ignore, handled by loop exit
          } catch {
            // If not JSON, treat as plain text (backward compatibility)
            fullContent += line;
            updateStream(fullContent, liveToolCalls);
          }
        }
      }

      // Finalize — mark streaming as complete
      setSessions(prev => prev.map(s => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map(m =>
            m.id === assistantId
              ? { ...m, content: fullContent, isStreaming: false, toolCalls: liveToolCalls.length > 0 ? [...liveToolCalls] : undefined }
              : m
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
  }, [isLoading, activeSessionId, sessions, authUser, projectContext, activeSession?.projectId, selectedProjectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, pendingImages.length > 0 ? pendingImages : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input, pendingImages.length > 0 ? pendingImages : undefined);
    }
  };

  if (!isOpen) return null;

  const isAIOK = debugInfo?.ok === true;

  return (
    <div className="fixed inset-0 z-[150] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] bg-[var(--background)] border-l border-[var(--border)] flex flex-col shadow-2xl animate-slideInRight">
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
                {debugLoading ? 'Verificando...' : isAIOK ? 'Conectado' : debugInfo ? 'Sin conexion' : `${sessions.length} sesion(es)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 rounded-lg bg-[var(--af-bg3)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              onClick={createNewSession}
              title="Nueva conversacion"
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
              <span className="truncate">{activeSession?.title || 'Nueva conversacion'}</span>
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

          {/* Project context with auto-detect */}
          <div className="flex items-center gap-2">
            {activeProject && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20 text-[10px] text-[var(--af-accent)]">
                <Sparkles className="w-2.5 h-2.5" />
                <span className="truncate max-w-[120px]">{activeProject.data.name}</span>
              </div>
            )}
            <select
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] outline-none cursor-pointer hover:border-[var(--af-accent)]/30 transition-colors"
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
                Tareas, inventario, facturacion, cotizaciones, reuniones y reportes. Todo desde este chat.
              </p>

              {/* Debug status */}
              {debugLoading && (
                <div className="flex items-center justify-center gap-2 text-xs text-yellow-400 mb-3">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Verificando conexion...
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
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[var(--af-accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[var(--af-accent)]" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed relative ${
                msg.role === 'user'
                  ? 'bg-[var(--af-accent)] text-[var(--background)]'
                  : 'bg-[var(--af-bg3)] border border-[var(--border)]'
              }`}>
                {/* Message images */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {msg.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Adjunto ${i + 1}`}
                        className="max-h-[120px] max-w-[160px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                )}

                {msg.role === 'assistant' && msg.content.startsWith('Error:') ? (
                  <span className="text-red-400 text-xs">{msg.content}</span>
                ) : msg.role === 'assistant' ? (
                  msg.content ? (
                    <span className={msg.isStreaming ? 'opacity-80' : ''}>
                      <MarkdownContent content={msg.content} />
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Pensando...
                    </span>
                  )
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}

                {/* Tool calls badges */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {msg.toolCalls.map((tc, i) => (
                      <ToolCallBadge key={i} toolCall={tc} />
                    ))}
                  </div>
                )}

                {/* Copy button */}
                {msg.role === 'assistant' && !msg.isStreaming && msg.content && !msg.content.startsWith('Error:') && (
                  <button
                    className="absolute -bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                    onClick={() => copyMessage(msg.id, msg.content)}
                    title="Copiar mensaje"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[var(--af-accent)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-[var(--background)]" />
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Pending images preview */}
        {pendingImages.length > 0 && (
          <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--af-bg3)]">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative flex-shrink-0 group">
                  <img src={img} alt={`Pendiente ${i + 1}`} className="w-16 h-16 rounded-lg object-cover" />
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => removePendingImage(i)}
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border)]">
          <div className="flex gap-2 items-end">
            {/* Attach image button */}
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-[var(--af-bg3)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen"
              disabled={isLoading}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
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
              className="w-10 h-10 rounded-xl bg-[var(--af-accent)] text-[var(--background)] flex items-center justify-center hover:bg-[var(--af-accent2)] transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
              disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[var(--muted-foreground)]">
              Enter para enviar · Shift+Enter nueva linea
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
