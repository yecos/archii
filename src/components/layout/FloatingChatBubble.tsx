'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageCircle, Plus, Sparkles, X, Send, CornerDownRight, FolderPlus, ClipboardList, Receipt, CreditCard, Users, Briefcase, Camera } from 'lucide-react';
import { useUIContext } from '@/contexts/UIContext';
import { useChatContext } from '@/contexts/ChatContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUIStore } from '@/stores/ui-store';
import type { ChatMessage, FirestoreTimestamp } from '@/lib/types';

/* ===== Constants ===== */
const BTN_SIZE = 48;
const BAR_GAP = 10;
const BAR_PADDING = 8;
const BAR_WIDTH = BTN_SIZE + BAR_PADDING * 2;
const BAR_HEIGHT = BTN_SIZE * 3 + BAR_GAP * 2 + BAR_PADDING * 2;
const POPUP_WIDTH = 340;
const POPUP_MAX_HEIGHT = 420;
const EDGE_MARGIN = 12;
const STORAGE_POS_KEY = 'archiflow-fab-pos-v3';
const MAX_PREVIEW_MSGS = 8;

/* ===== Helpers ===== */
function fmtTime(ts: FirestoreTimestamp | string | Date): string {
  if (!ts) return '';
  try {
    const d = typeof ts === 'string' || ts instanceof Date
      ? new Date(ts)
      : 'seconds' in ts ? new Date(ts.seconds * 1000) : new Date(ts);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch { return ''; }
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

/* ===== Quick Create Menu Items ===== */
const QUICK_CREATE_ITEMS = [
  { id: 'project', label: 'Proyecto', icon: Briefcase, screen: 'projects', modal: 'project' },
  { id: 'task', label: 'Tarea', icon: ClipboardList, screen: 'tasks', modal: 'task' },
  { id: 'expense', label: 'Gasto', icon: Receipt, screen: 'budget', modal: 'expense' },
  { id: 'invoice', label: 'Factura', icon: CreditCard, screen: 'invoices', modal: null },
  { id: 'supplier', label: 'Proveedor', icon: Users, screen: 'suppliers', modal: 'supplier' },
  { id: 'photo', label: 'Foto', icon: Camera, screen: 'photoLog', modal: null },
];

/* ===== Mini Message Bubble ===== */
function MiniMsg({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const isAudio = msg.type === 'AUDIO';
  const isImage = msg.type === 'IMAGE';
  const isFile = msg.type === 'FILE';

  const preview = useMemo(() => {
    if (isAudio) return { icon: '\uD83C\uDFA4', text: 'Nota de voz' };
    if (isImage) return { icon: '\uD83D\uDDBC\uFE0F', text: 'Foto' };
    if (isFile) return { icon: '\uD83D\uDCE4', text: msg.fileName || 'Archivo' };
    return { icon: null, text: typeof msg.text === 'string' ? msg.text : (msg.text != null ? String(msg.text) : '') };
  }, [msg, isAudio, isImage, isFile]);

  const time = fmtTime(msg.createdAt);

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white/90 mt-0.5"
          style={{ background: `hsl(${avatarHue(msg.userName || '?')}, 55%, 45%)` }}
        >
          {getInitials(msg.userName)}
        </div>
      )}
      <div className={`flex flex-col ${isOwn ? 'items-end max-w-[75%]' : 'max-w-[80%]'}`}>
        {!isOwn && (
          <span className="text-[10px] font-semibold text-[var(--af-text3)] mb-0.5 px-1">{typeof msg.userName === 'string' ? msg.userName : 'Usuario'}</span>
        )}
        <div
          className="rounded-2xl px-3 py-1.5 text-[13px] leading-relaxed"
          style={{
            background: isOwn ? 'var(--af-accent)' : 'var(--af-bg3, var(--muted))',
            color: isOwn ? 'var(--background)' : 'var(--foreground)',
            borderTopRightRadius: isOwn ? 4 : undefined,
            borderTopLeftRadius: isOwn ? undefined : 4,
          }}
        >
          {preview.icon && <span className="mr-1">{preview.icon}</span>}
          {preview.text?.slice(0, 120)}
          {preview.text?.length > 120 ? '...' : ''}
        </div>
        <span className="text-[9px] text-[var(--af-text3)] mt-0.5 px-1">{time}</span>
      </div>
      {isOwn && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white/90 mt-0.5" style={{ background: 'var(--af-accent)' }}>
          Yo
        </div>
      )}
    </div>
  );
}

/* ===== Main Component ===== */
export default React.memo(function FloatingChatBubble() {
  const { screen, navigateTo, openModal, openModal: ctxOpenModal } = useUIContext();
  const { messages, sendMessage } = useChatContext();
  const { authUser } = useAuthContext();
  const chatUnread = useUIStore((s) => s.chatUnread);
  const setAIAgentOpen = useUIStore((s) => s.setAIAgentOpen);
  const aiAgentOpen = useUIStore((s) => s.aiAgentOpen);

  // ─── State ───
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const barRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Derived ───
  const isOnLeft = pos.x < window.innerWidth / 2;

  // ─── Popup position ───
  const popupStyle = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left: number | undefined;
    let right: number | undefined;
    if (isOnLeft) {
      left = BAR_WIDTH + EDGE_MARGIN;
    } else {
      right = BAR_WIDTH + EDGE_MARGIN;
    }
    const top = Math.max(EDGE_MARGIN, Math.min(pos.y + BTN_SIZE, vh - POPUP_MAX_HEIGHT - EDGE_MARGIN));
    return { left, right, top, maxHeight: Math.min(POPUP_MAX_HEIGHT, vh - top - EDGE_MARGIN) };
  }, [pos, isOnLeft]);

  // ─── Create menu position ───
  const createMenuStyle = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left: number | undefined;
    let right: number | undefined;
    const menuWidth = 200;
    if (isOnLeft) {
      left = BAR_WIDTH + EDGE_MARGIN;
    } else {
      right = BAR_WIDTH + EDGE_MARGIN;
    }
    // Position aligned with the middle button
    const btnOffset = BTN_SIZE + BAR_GAP + BAR_PADDING;
    const top = Math.max(EDGE_MARGIN, Math.min(pos.y + btnOffset, vh - 320 - EDGE_MARGIN));
    return { left, right, top };
  }, [pos, isOnLeft]);

  // ─── Auto-scroll messages in popup ───
  useEffect(() => {
    if (popupOpen && msgsEndRef.current) {
      msgsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, popupOpen]);

  // ─── Focus input when popup opens ───
  useEffect(() => {
    if (popupOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [popupOpen]);

  // ─── Auto-open on first unread ───
  useEffect(() => {
    if (chatUnread > 0 && !popupOpen && initialized && !justOpened) {
      const timer = setTimeout(() => {
        setPopupOpen(true);
        setJustOpened(true);
        const autoClose = setTimeout(() => { setPopupOpen(false); }, 4000);
        return () => clearTimeout(autoClose);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chatUnread > 0 ? 'new' : '']); // eslint-disable-line

  // ─── Load position ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPos({
          x: Math.max(EDGE_MARGIN, Math.min(p.x, vw - BAR_WIDTH - EDGE_MARGIN)),
          y: Math.max(EDGE_MARGIN, Math.min(p.y, vh - BAR_HEIGHT - EDGE_MARGIN)),
        });
      } else {
        setPos({ x: window.innerWidth - BAR_WIDTH - EDGE_MARGIN - 8, y: window.innerHeight - BAR_HEIGHT - 80 });
      }
    } catch {
      setPos({ x: window.innerWidth - BAR_WIDTH - EDGE_MARGIN - 8, y: window.innerHeight - BAR_HEIGHT - 80 });
    }
    setInitialized(true);
  }, []);

  // ─── Save position ───
  useEffect(() => {
    if (!initialized || isDragging) return;
    try { localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(pos)); } catch { /* noop */ }
  }, [pos, initialized, isDragging]);

  // ─── Resize ───
  useEffect(() => {
    const handler = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos(prev => ({
        x: Math.max(EDGE_MARGIN, Math.min(prev.x, vw - BAR_WIDTH - EDGE_MARGIN)),
        y: Math.max(EDGE_MARGIN, Math.min(prev.y, vh - BAR_HEIGHT - EDGE_MARGIN)),
      }));
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ─── Close menus on outside click ───
  useEffect(() => {
    if (!popupOpen && !createMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current?.contains(e.target as Node)) return;
      if (popupRef.current?.contains(e.target as Node)) return;
      if (createMenuRef.current?.contains(e.target as Node)) return;
      if (popupOpen) setPopupOpen(false);
      if (createMenuOpen) setCreateMenuOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 80);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [popupOpen, createMenuOpen]);

  // ─── Close menus when screen changes ───
  useEffect(() => {
    setPopupOpen(false);
    setCreateMenuOpen(false);
  }, [screen]);

  // ─── Don't render on chat screen ───
  if (screen === 'chat') return null;

  // ─── Quick send from popup ───
  const handleQuickSend = useCallback(async () => {
    const text = replyText.trim();
    if (!text) return;
    setReplyText('');
    try { await sendMessage(text); } catch { /* noop */ }
  }, [replyText, sendMessage]);

  // ─── Handle chat button click ───
  const handleChatClick = useCallback(() => {
    setCreateMenuOpen(false);
    setPopupOpen(prev => !prev);
  }, []);

  // ─── Handle create button click ───
  const handleCreateClick = useCallback(() => {
    setPopupOpen(false);
    setCreateMenuOpen(prev => !prev);
  }, []);

  // ─── Handle sparkle button click ───
  const handleSparkleClick = useCallback(() => {
    setPopupOpen(false);
    setCreateMenuOpen(false);
    setAIAgentOpen(!aiAgentOpen);
  }, [aiAgentOpen, setAIAgentOpen]);

  // ─── Handle quick create item click ───
  const handleCreateItem = useCallback((item: typeof QUICK_CREATE_ITEMS[0]) => {
    setCreateMenuOpen(false);
    if (item.modal) {
      navigateTo(item.screen, null);
      setTimeout(() => ctxOpenModal(item.modal!), 200);
    } else {
      navigateTo(item.screen, null);
    }
  }, [navigateTo, ctxOpenModal]);

  // ─── Pointer events for drag ───
  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't capture if clicking inside popup or create menu
    if (popupRef.current?.contains(e.target as Node)) return;
    if (createMenuRef.current?.contains(e.target as Node)) return;

    e.preventDefault();
    e.stopPropagation();
    setWasDragged(false);
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: rect.left, posY: rect.top };
    bar.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        setIsDragging(true);
        setWasDragged(true);
      }
      if (isDragging || Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPos({
          x: Math.max(EDGE_MARGIN, Math.min(dragStartRef.current.posX + dx, vw - BAR_WIDTH - EDGE_MARGIN)),
          y: Math.max(EDGE_MARGIN, Math.min(dragStartRef.current.posY + dy, vh - BAR_HEIGHT - EDGE_MARGIN)),
        });
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      bar.releasePointerCapture(e.pointerId);
      bar.removeEventListener('pointermove', onPointerMove);
      bar.removeEventListener('pointerup', onPointerUp);
      bar.removeEventListener('pointercancel', onPointerUp);

      if (!wasDragged) {
        // Determine which button was clicked based on click position relative to bar
        const rect = bar.getBoundingClientRect();
        const relY = e.clientY - rect.top - BAR_PADDING;
        if (relY >= 0 && relY < BTN_SIZE) {
          handleChatClick();
        } else if (relY >= BTN_SIZE + BAR_GAP && relY < BTN_SIZE * 2 + BAR_GAP) {
          handleCreateClick();
        } else if (relY >= BTN_SIZE * 2 + BAR_GAP * 2 && relY < BTN_SIZE * 3 + BAR_GAP * 2) {
          handleSparkleClick();
        }
      }

      // Snap to nearest edge
      const vw = window.innerWidth;
      setPos(prev => ({
        x: prev.x < vw / 2 ? EDGE_MARGIN : vw - BAR_WIDTH - EDGE_MARGIN,
        y: prev.y,
      }));
    };

    bar.addEventListener('pointermove', onPointerMove);
    bar.addEventListener('pointerup', onPointerUp);
    bar.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <>
      {/* ===== CSS Animations ===== */}
      <style>{`
        @keyframes fabBarIn {
          0% { opacity: 0; transform: translateY(20px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatPopupIn {
          0% { opacity: 0; transform: scale(0.85) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes createMenuIn {
          0% { opacity: 0; transform: scale(0.9) translateX(${isOnLeft ? '-8px' : '8px'}); }
          100% { opacity: 1; transform: scale(1) translateX(0); }
        }
        @keyframes chatBubbleShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes chatBadgeBounce {
          0% { transform: scale(0); }
          60% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 2px 12px var(--af-accent)/20; }
          50% { box-shadow: 0 2px 20px var(--af-accent)/40, 0 0 0 4px var(--af-accent)/10; }
        }
        @keyframes itemSlideIn {
          0% { opacity: 0; transform: translateX(${isOnLeft ? '-8px' : '8px'}); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* ===== Chat Popup Panel ===== */}
      {popupOpen && (
        <div
          ref={popupRef}
          className="fixed z-[201] flex flex-col overflow-hidden rounded-2xl"
          style={{
            ...popupStyle,
            width: `min(${POPUP_WIDTH}px, calc(100vw - ${BAR_WIDTH + EDGE_MARGIN * 3}px))`,
            background: 'var(--skeuo-raised)',
            border: '1px solid var(--skeuo-edge-light)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px var(--skeuo-edge-dark)/20',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            animation: 'chatPopupIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: isOnLeft ? 'top left' : 'top right',
          }}
        >
          {/* Popup Header */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 border-b"
            style={{ borderColor: 'var(--skeuo-edge-light)', background: 'var(--af-accent)/5' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--af-accent)', boxShadow: '0 2px 8px var(--af-accent)/30' }}
            >
              <MessageCircle size={16} className="stroke-background" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Chat General
              </div>
              <div className="text-[10px] text-[var(--af-text3)]">
                {chatUnread > 0
                  ? `${chatUnread} mensaje${chatUnread > 1 ? 's' : ''} nuevo${chatUnread > 1 ? 's' : ''}`
                  : `${messages.length} mensaje${messages.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigateTo('chat', null); }}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg hover:bg-[var(--af-accent)]/10 text-[var(--af-accent)] transition-colors cursor-pointer bg-transparent border-none"
            >
              Abrir <CornerDownRight size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPopupOpen(false); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg4)] text-[var(--af-text3)] cursor-pointer bg-transparent border-none transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5" style={{ maxHeight: (popupStyle.maxHeight || POPUP_MAX_HEIGHT) - 120 }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle size={32} className="stroke-[var(--af-text3)] mx-auto mb-2 opacity-40" />
                <div className="text-[12px] text-[var(--af-text3)]">No hay mensajes todavia</div>
              </div>
            ) : (
              messages.slice(-MAX_PREVIEW_MSGS).map((msg) => (
                <MiniMsg key={msg.id} msg={msg} isOwn={msg.uid === authUser?.uid} />
              ))
            )}
            <div ref={msgsEndRef} />
          </div>

          {/* Quick reply input */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 border-t"
            style={{ borderColor: 'var(--skeuo-edge-light)', background: 'var(--af-accent)/3' }}
          >
            <input
              ref={inputRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSend(); }}
              placeholder="Responder rapido..."
              className="flex-1 bg-transparent text-[13px] placeholder:text-[var(--af-text3)] outline-none border-none"
              style={{ color: 'var(--foreground)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleQuickSend(); }}
              disabled={!replyText.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer border-none disabled:opacity-30"
              style={{
                background: replyText.trim() ? 'var(--af-accent)' : 'var(--af-bg4)',
                color: replyText.trim() ? 'var(--background)' : 'var(--af-text3)',
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ===== Create Menu ===== */}
      {createMenuOpen && (
        <div
          ref={createMenuRef}
          className="fixed z-[201] rounded-2xl overflow-hidden"
          style={{
            ...createMenuStyle,
            width: 200,
            background: 'var(--skeuo-raised)',
            border: '1px solid var(--skeuo-edge-light)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px var(--skeuo-edge-dark)/20',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            animation: 'createMenuIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--skeuo-edge-light)' }}>
            <div className="text-[11px] font-semibold text-[var(--af-text3)] uppercase tracking-wider">Crear nuevo</div>
          </div>
          <div className="p-1.5">
            {QUICK_CREATE_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); handleCreateItem(item); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left cursor-pointer border-none transition-all duration-150 group"
                  style={{
                    background: 'transparent',
                    color: 'var(--foreground)',
                    animation: `itemSlideIn 0.2s ease ${i * 40}ms both`,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--af-accent)/8'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: 'var(--af-accent)/12', color: 'var(--af-accent)' }}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <span className="text-[13px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Floating Action Bar ===== */}
      <div
        className="fixed z-[200] touch-none select-none"
        style={{
          left: pos.x,
          top: pos.y,
          opacity: initialized ? 1 : 0,
          transition: isDragging
            ? 'none'
            : 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.25s ease-out, opacity 0.5s ease',
          filter: isDragging ? 'drop-shadow(0 16px 32px rgba(0,0,0,0.3))' : undefined,
          animation: initialized && !isDragging ? 'fabBarIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
        }}
      >
        <div
          ref={barRef}
          onPointerDown={handlePointerDown}
          className="relative flex flex-col items-center gap-[10px] rounded-2xl p-2 cursor-grab active:cursor-grabbing"
          style={{
            width: BAR_WIDTH,
            background: isDragging
              ? 'var(--skeuo-raised)'
              : 'var(--skeuo-sunken, var(--skeuo-raised))',
            border: '1px solid var(--skeuo-edge-light)',
            boxShadow: isDragging
              ? '0 16px 48px rgba(0,0,0,0.2)'
              : '0 4px 24px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            transition: 'box-shadow 0.2s ease, background 0.3s ease',
          }}
        >
          {/* ─── Chat Button ─── */}
          <button
            className="relative flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer border-none outline-none"
            style={{
              width: BTN_SIZE,
              height: BTN_SIZE,
              background: chatUnread > 0
                ? 'linear-gradient(135deg, var(--af-accent), var(--af-accent2, var(--af-accent)))'
                : hoveredBtn === 'chat'
                  ? 'var(--af-accent)/12'
                  : 'var(--af-bg3, transparent)',
              border: chatUnread > 0 ? '1.5px solid var(--af-accent)/40' : '1.5px solid transparent',
              boxShadow: chatUnread > 0
                ? '0 2px 12px var(--af-accent)/25'
                : hoveredBtn === 'chat'
                  ? '0 2px 8px rgba(0,0,0,0.06)'
                  : 'none',
              transform: hoveredBtn === 'chat' && !isDragging ? 'scale(1.08)' : 'scale(1)',
              animation: chatUnread > 0 ? 'fabPulse 2.5s ease-in-out infinite' : undefined,
            }}
            onMouseEnter={() => setHoveredBtn('chat')}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (!wasDragged) handleChatClick();
            }}
          >
            {/* Shimmer when unread */}
            {chatUnread > 0 && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.18) 37%, transparent 50%)',
                  backgroundSize: '200% 100%',
                  animation: 'chatBubbleShimmer 2.5s ease-in-out infinite',
                }}
              />
            )}
            <MessageCircle
              size={20}
              className="relative z-10"
              style={{
                stroke: chatUnread > 0 ? 'var(--background)' : 'var(--af-accent)',
                strokeWidth: 2,
                transition: 'stroke 0.2s ease',
              }}
            />
            {/* Unread badge */}
            {chatUnread > 0 && (
              <div
                className="absolute flex items-center justify-center rounded-full z-20"
                style={{
                  top: -4,
                  right: -4,
                  minWidth: 20,
                  height: 20,
                  padding: '0 5px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 800,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  boxShadow: '0 2px 6px rgba(239,68,68,0.5), 0 0 0 2px var(--skeuo-raised)',
                  lineHeight: 1,
                  letterSpacing: '-0.3px',
                  animation: 'chatBadgeBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {chatUnread > 99 ? '99+' : chatUnread}
              </div>
            )}
          </button>

          {/* ─── Create / + Button ─── */}
          <button
            className="relative flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer border-none outline-none"
            style={{
              width: BTN_SIZE,
              height: BTN_SIZE,
              background: createMenuOpen
                ? 'var(--af-accent)'
                : hoveredBtn === 'create'
                  ? 'var(--af-accent)/15'
                  : 'var(--af-bg2, var(--skeuo-raised))',
              border: createMenuOpen
                ? '1.5px solid var(--af-accent)/50'
                : hoveredBtn === 'create'
                  ? '1.5px solid var(--af-accent)/25'
                  : '1.5px solid var(--skeuo-edge-light)',
              boxShadow: hoveredBtn === 'create' || createMenuOpen
                ? '0 2px 12px var(--af-accent)/15'
                : '0 1px 4px rgba(0,0,0,0.06)',
              transform: createMenuOpen
                ? 'rotate(45deg) scale(1.05)'
                : hoveredBtn === 'create' && !isDragging
                  ? 'scale(1.08)'
                  : 'scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={() => setHoveredBtn('create')}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (!wasDragged) handleCreateClick();
            }}
          >
            <Plus
              size={22}
              className="relative z-10"
              style={{
                stroke: createMenuOpen ? 'var(--background)' : 'var(--af-accent)',
                strokeWidth: 2.5,
                transition: 'stroke 0.2s ease',
              }}
            />
          </button>

          {/* ─── Sparkle / AI Button ─── */}
          <button
            className="relative flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer border-none outline-none"
            style={{
              width: BTN_SIZE,
              height: BTN_SIZE,
              background: aiAgentOpen
                ? 'linear-gradient(135deg, var(--af-accent), var(--af-accent2, var(--af-accent)))'
                : hoveredBtn === 'sparkle'
                  ? 'var(--af-accent)/12'
                  : 'var(--af-bg3, transparent)',
              border: aiAgentOpen
                ? '1.5px solid var(--af-accent)/40'
                : hoveredBtn === 'sparkle'
                  ? '1.5px solid var(--af-accent)/25'
                  : '1.5px solid transparent',
              boxShadow: aiAgentOpen
                ? '0 2px 12px var(--af-accent)/25'
                : hoveredBtn === 'sparkle'
                  ? '0 2px 8px rgba(0,0,0,0.06)'
                  : 'none',
              transform: hoveredBtn === 'sparkle' && !isDragging ? 'scale(1.08)' : aiAgentOpen ? 'scale(0.95)' : 'scale(1)',
            }}
            onMouseEnter={() => setHoveredBtn('sparkle')}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (!wasDragged) handleSparkleClick();
            }}
          >
            <Sparkles
              size={20}
              className="relative z-10"
              style={{
                stroke: aiAgentOpen ? 'var(--background)' : 'var(--af-accent)',
                strokeWidth: 2,
                transition: 'stroke 0.2s ease',
              }}
            />
          </button>
        </div>
      </div>
    </>
  );
});
