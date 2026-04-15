'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageCircle, X, Send, CornerDownRight } from 'lucide-react';
import { useUIContext } from '@/contexts/UIContext';
import { useChatContext } from '@/contexts/ChatContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUIStore } from '@/stores/ui-store';
import type { ChatMessage } from '@/lib/types';

/* ===== Bubble Constants ===== */
const BUBBLE_SIZE = 54;
const POPUP_WIDTH = 340;
const POPUP_MAX_HEIGHT = 420;
const EDGE_MARGIN = 12;
const STORAGE_POS_KEY = 'archiflow-chat-bubble-pos-v2';
const STORAGE_OPEN_KEY = 'archiflow-chat-popup-open';
const MAX_PREVIEW_MSGS = 8;

/* ===== Helpers ===== */
function fmtTime(ts: any): string {
  if (!ts) return '';
  try {
    const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
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

/* ===== Color from string (deterministic avatar color) ===== */
function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

/* ===== Mini Message Bubble (inside popup) ===== */
function MiniMsg({ msg, isOwn, authUid }: { msg: ChatMessage; isOwn: boolean; authUid?: string }) {
  const isAudio = msg.type === 'AUDIO';
  const isImage = msg.type === 'IMAGE';
  const isFile = msg.type === 'FILE';

  const preview = useMemo(() => {
    if (isAudio) return { icon: '\uD83C\uDFA4', text: 'Nota de voz' };
    if (isImage) return { icon: '\uD83D\uDDBC\uFE0F', text: 'Foto' };
    if (isFile) return { icon: '\uD83D\uDCE4', text: msg.fileName || 'Archivo' };
    return { icon: null, text: msg.text || '' };
  }, [msg, isAudio, isImage, isFile]);

  const time = fmtTime(msg.createdAt);

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isOwn && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white/90 mt-0.5"
          style={{ background: `hsl(${avatarHue(msg.userName || '?')}, 55%, 45%)` }}
        >
          {getInitials(msg.userName)}
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col ${isOwn ? 'items-end max-w-[75%]' : 'max-w-[80%]'}`}>
        {!isOwn && (
          <span className="text-[10px] font-semibold text-[var(--af-text3)] mb-0.5 px-1">
            {msg.userName}
          </span>
        )}
        <div
          className="rounded-2xl px-3 py-1.5 text-[13px] leading-relaxed"
          style={{
            background: isOwn
              ? 'var(--af-accent)'
              : 'var(--af-bg3, var(--muted))',
            color: isOwn ? 'var(--background)' : 'var(--foreground)',
            borderTopRightRadius: isOwn ? 4 : undefined,
            borderTopLeftRadius: isOwn ? undefined : 4,
          }}
        >
          {preview.icon && <span className="mr-1">{preview.icon}</span>}
          {preview.text?.slice(0, 120)}
          {preview.text?.length > 120 ? '...' : ''}
        </div>
        <span className="text-[9px] text-[var(--af-text3)] mt-0.5 px-1">
          {time}
        </span>
      </div>

      {isOwn && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white/90 mt-0.5"
          style={{ background: 'var(--af-accent)' }}
        >
          Yo
        </div>
      )}
    </div>
  );
}

/* ===== Main Component ===== */
export default React.memo(function FloatingChatBubble() {
  const { screen, navigateTo, forms, setForms } = useUIContext();
  const { messages, sendMessage } = useChatContext();
  const { authUser } = useAuthContext();
  const chatUnread = useUIStore((s) => s.chatUnread);

  // ─── State ───
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const [replyText, setReplyText] = useState('');

  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Derived ───
  const isOnLeft = pos.x < window.innerWidth / 2;

  // ─── Popup position ───
  const popupStyle = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Horizontal: follow bubble side, clamp to viewport
    let left: number | undefined;
    let right: number | undefined;
    if (isOnLeft) {
      left = BUBBLE_SIZE + EDGE_MARGIN;
    } else {
      right = BUBBLE_SIZE + EDGE_MARGIN;
    }
    // Vertical: bottom-aligned with bubble, but clamp
    const top = Math.max(EDGE_MARGIN, Math.min(pos.y - 10, vh - POPUP_MAX_HEIGHT - EDGE_MARGIN));
    return { left, right, top, maxHeight: Math.min(POPUP_MAX_HEIGHT, vh - top - EDGE_MARGIN) };
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [popupOpen]);

  // ─── Auto-open on first unread ───
  useEffect(() => {
    if (chatUnread > 0 && !popupOpen && initialized && !justOpened) {
      // Only auto-open on the first new message batch
      const timer = setTimeout(() => {
        setPopupOpen(true);
        setJustOpened(true);
        // Close after 4 seconds if user didn't interact
        const autoClose = setTimeout(() => {
          setPopupOpen(false);
        }, 4000);
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
          x: Math.max(EDGE_MARGIN, Math.min(p.x, vw - BUBBLE_SIZE - EDGE_MARGIN)),
          y: Math.max(EDGE_MARGIN, Math.min(p.y, vh - BUBBLE_SIZE - EDGE_MARGIN)),
        });
      } else {
        setPos({ x: window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN - 8, y: window.innerHeight - 140 });
      }
    } catch {
      setPos({ x: window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN - 8, y: window.innerHeight - 140 });
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
        x: Math.max(EDGE_MARGIN, Math.min(prev.x, vw - BUBBLE_SIZE - EDGE_MARGIN)),
        y: Math.max(EDGE_MARGIN, Math.min(prev.y, vh - BUBBLE_SIZE - EDGE_MARGIN)),
      }));
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ─── Close popup on outside click ───
  useEffect(() => {
    if (!popupOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        bubbleRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      ) return;
      setPopupOpen(false);
    };
    // Delay to avoid immediate close from the toggle click
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [popupOpen]);

  // ─── Don't render on chat screen ───
  if (screen === 'chat') return null;

  // ─── Quick send from popup ───
  const handleQuickSend = useCallback(async () => {
    const text = replyText.trim();
    if (!text) return;
    setReplyText('');
    try { await sendMessage(text); } catch { /* noop */ }
  }, [replyText, sendMessage]);

  // ─── Pointer events ───
  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't capture if clicking inside popup
    if (popupRef.current?.contains(e.target as Node)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsPressed(true);
    setWasDragged(false);
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const rect = bubble.getBoundingClientRect();
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: rect.left, posY: rect.top };
    bubble.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        setIsDragging(true);
        setWasDragged(true);
      }
      if (isDragging || Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPos({
          x: Math.max(EDGE_MARGIN, Math.min(dragStartRef.current.posX + dx, vw - BUBBLE_SIZE - EDGE_MARGIN)),
          y: Math.max(EDGE_MARGIN, Math.min(dragStartRef.current.posY + dy, vh - BUBBLE_SIZE - EDGE_MARGIN)),
        });
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      setIsPressed(false);
      bubble.releasePointerCapture(e.pointerId);
      bubble.removeEventListener('pointermove', onPointerMove);
      bubble.removeEventListener('pointerup', onPointerUp);
      bubble.removeEventListener('pointercancel', onPointerUp);

      if (!wasDragged) {
        // Toggle popup
        setPopupOpen(prev => !prev);
      }

      // Snap to nearest edge
      const vw = window.innerWidth;
      setPos(prev => ({
        x: prev.x < vw / 2 ? EDGE_MARGIN : vw - BUBBLE_SIZE - EDGE_MARGIN,
        y: prev.y,
      }));
    };

    bubble.addEventListener('pointermove', onPointerMove);
    bubble.addEventListener('pointerup', onPointerUp);
    bubble.addEventListener('pointercancel', onPointerUp);
  };

  // ─── Last message preview (for bubble) ───
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div
      className="fixed z-[200] touch-none select-none"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: initialized ? 1 : 0,
        transition: isDragging
          ? 'none'
          : 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.2s ease-out, opacity 0.4s ease',
        transform: isPressed && !isDragging
          ? 'scale(0.88)'
          : isDragging
            ? 'scale(1.08)'
            : popupOpen
              ? 'scale(0.92)'
              : 'scale(1)',
        filter: isDragging ? 'drop-shadow(0 12px 24px rgba(0,0,0,0.3))' : undefined,
      }}
    >
      {/* ===== Popup Panel ===== */}
      {popupOpen && (
        <div
          ref={popupRef}
          className="absolute flex flex-col overflow-hidden rounded-2xl"
          style={{
            ...popupStyle,
            width: `min(${POPUP_WIDTH}px, calc(100vw - ${BUBBLE_SIZE + EDGE_MARGIN * 3}px))`,
            background: 'var(--skeuo-raised)',
            border: '1px solid var(--skeuo-edge-light)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px var(--skeuo-edge-dark)/20',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            animation: 'chatPopupIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: isOnLeft ? 'bottom left' : 'bottom right',
          }}
        >
          {/* CSS animation injected inline to avoid globals */}
          <style>{`
            @keyframes chatPopupIn {
              0% { opacity: 0; transform: scale(0.8) translateY(10px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>

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
                <div className="text-2xl mb-2 opacity-40">
                  <MessageCircle size={32} className="stroke-[var(--af-text3)] mx-auto" />
                </div>
                <div className="text-[12px] text-[var(--af-text3)]">No hay mensajes todavia</div>
              </div>
            ) : (
              messages.slice(-MAX_PREVIEW_MSGS).map((msg) => (
                <MiniMsg key={msg.id} msg={msg} isOwn={msg.uid === authUser?.uid} authUid={authUser?.uid} />
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
                transform: replyText.trim() ? 'scale(1)' : 'scale(0.9)',
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ===== Bubble ===== */}
      <div
        ref={bubbleRef}
        onPointerDown={handlePointerDown}
        className="relative cursor-pointer"
        style={{
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
        }}
      >
        {/* Outer glow when unread */}
        {chatUnread > 0 && (
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              inset: -6,
              background: 'radial-gradient(circle, var(--af-accent)/25 0%, transparent 70%)',
              animationDuration: '2.5s',
            }}
          />
        )}

        {/* Bubble body */}
        <div
          className="relative flex items-center justify-center rounded-full overflow-hidden"
          style={{
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            background: chatUnread > 0
              ? 'linear-gradient(135deg, var(--af-accent), var(--af-accent2, var(--af-accent)))'
              : 'var(--skeuo-raised)',
            border: chatUnread > 0
              ? '1px solid var(--af-accent)/30'
              : '1px solid var(--skeuo-edge-light)',
            boxShadow: isDragging
              ? '0 12px 36px rgba(0,0,0,0.25)'
              : chatUnread > 0
                ? '0 4px 20px var(--af-accent)/25, 0 2px 8px rgba(0,0,0,0.1)'
                : '0 2px 10px rgba(0,0,0,0.08)',
            transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.2s ease',
          }}
        >
          {/* Animated shimmer */}
          {chatUnread > 0 && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.15) 37%, transparent 50%)',
                backgroundSize: '200% 100%',
                animation: 'chatBubbleShimmer 2.5s ease-in-out infinite',
              }}
            />
          )}

          {/* Icon */}
          <MessageCircle
            size={22}
            className="relative z-10 transition-colors"
            style={{
              stroke: chatUnread > 0 ? 'var(--background)' : 'var(--af-accent)',
              strokeWidth: 2,
            }}
          />
        </div>

        {/* Unread badge */}
        {chatUnread > 0 && (
          <div
            className="absolute flex items-center justify-center rounded-full z-20"
            style={{
              top: -3,
              right: -3,
              minWidth: 21,
              height: 21,
              padding: '0 5px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              boxShadow: '0 2px 8px rgba(239,68,68,0.5), 0 0 0 2px var(--background)',
              lineHeight: 1,
              letterSpacing: '-0.3px',
              animation: 'chatBadgeBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {chatUnread > 99 ? '99+' : chatUnread}
          </div>
        )}

        {/* Online indicator dot (bottom-left) */}
        <div
          className="absolute z-20 rounded-full"
          style={{
            bottom: 1,
            left: 1,
            width: 12,
            height: 12,
            background: '#22c55e',
            border: '2px solid var(--background)',
            boxShadow: '0 0 6px rgba(34,197,94,0.5)',
          }}
        />
      </div>

      {/* Inline CSS animations */}
      <style>{`
        @keyframes chatBubbleShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes chatBadgeBounce {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
});
