'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { useUIContext } from '@/contexts/UIContext';
import { useUIStore } from '@/stores/ui-store';

/**
 * FloatingChatBubble — Draggable floating bubble for quick chat access.
 * Shows unread count, persists position in localStorage, hides when on chat screen.
 */
export default React.memo(function FloatingChatBubble() {
  const { screen, navigateTo } = useUIContext();
  const chatUnread = useUIStore((s) => s.chatUnread);

  // Position state (bottom-right by default)
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Default position: bottom-right
  const getDefaultPos = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: vw - 72,
      y: vh - 140,
    };
  }, []);

  // Load position from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('archiflow-chat-bubble-pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clamp to viewport
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const x = Math.max(20, Math.min(parsed.x, vw - 56));
        const y = Math.max(80, Math.min(parsed.y, vh - 100));
        setPos({ x, y });
      } else {
        setPos(getDefaultPos());
      }
    } catch {
      setPos(getDefaultPos());
    }
    setInitialized(true);
  }, [getDefaultPos]);

  // Save position to localStorage on change (throttled)
  useEffect(() => {
    if (!initialized || isDragging) return;
    try { localStorage.setItem('archiflow-chat-bubble-pos', JSON.stringify(pos)); } catch { /* noop */ }
  }, [pos, initialized, isDragging]);

  // Reposition on resize
  useEffect(() => {
    const handler = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos(prev => ({
        x: Math.max(20, Math.min(prev.x, vw - 56)),
        y: Math.max(80, Math.min(prev.y, vh - 100)),
      }));
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Don't render when on chat screen
  if (screen === 'chat') return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPressed(true);
    setWasDragged(false);
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const rect = bubble.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: rect.left,
      posY: rect.top,
    };
    bubble.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      // Only start drag if moved more than 5px
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setIsDragging(true);
        setWasDragged(true);
      }
      if (isDragging || Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const newX = Math.max(20, Math.min(dragStartRef.current.posX + dx, vw - 56));
        const newY = Math.max(80, Math.min(dragStartRef.current.posY + dy, vh - 100));
        setPos({ x: newX, y: newY });
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      setIsPressed(false);
      bubble.releasePointerCapture(e.pointerId);
      bubble.removeEventListener('pointermove', onPointerMove);
      bubble.removeEventListener('pointerup', onPointerUp);
      bubble.removeEventListener('pointercancel', onPointerUp);

      // If barely moved, treat as click → open chat
      if (!wasDragged) {
        navigateTo('chat', null);
      }

      // Snap to nearest edge (left or right) for clean look
      const vw = window.innerWidth;
      setPos(prev => ({
        x: prev.x < vw / 2 ? 20 : vw - 72,
        y: prev.y,
      }));
    };

    bubble.addEventListener('pointermove', onPointerMove);
    bubble.addEventListener('pointerup', onPointerUp);
    bubble.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <div
      ref={bubbleRef}
      onPointerDown={handlePointerDown}
      className="fixed z-[200] touch-none select-none"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: initialized ? 1 : 0,
        transition: isDragging
          ? 'none'
          : 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.15s ease-out, opacity 0.3s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isPressed && !isDragging
          ? 'scale(0.9)'
          : isDragging
            ? 'scale(1.1)'
            : 'scale(1)',
      }}
    >
      {/* Shadow layer */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,0,0,0.15) 0%, transparent 70%)',
          transform: 'translateY(4px) scale(0.9)',
          filter: 'blur(8px)',
          opacity: isDragging ? 0.3 : 0.6,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Main bubble */}
      <div
        className="relative flex items-center justify-center rounded-full cursor-pointer"
        style={{
          width: 56,
          height: 56,
          background: 'linear-gradient(135deg, var(--af-accent), var(--af-accent2, var(--af-accent)))',
          boxShadow: isDragging
            ? '0 8px 32px rgba(0,0,0,0.3), 0 0 0 4px var(--af-accent)/20'
            : '0 4px 16px rgba(0,0,0,0.2), 0 0 0 0px var(--af-accent)/0',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        {/* Pulse ring when unread */}
        {chatUnread > 0 && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: 'var(--af-accent)',
              opacity: 0.25,
              animationDuration: '2s',
            }}
          />
        )}

        {/* Glow ring */}
        <div
          className="absolute inset-[-2px] rounded-full"
          style={{
            background: 'linear-gradient(135deg, var(--af-accent)/40, transparent)',
            opacity: isDragging ? 0.6 : 0.3,
          }}
        />

        {/* Chat icon */}
        <MessageCircle
          size={24}
          className="stroke-background relative z-10"
          strokeWidth={2}
        />

        {/* Unread badge */}
        {chatUnread > 0 && (
          <div
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full z-20"
            style={{
              minWidth: 20,
              height: 20,
              padding: '0 5px',
              background: '#ef4444',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
              border: '2px solid var(--background)',
              lineHeight: 1,
              transform: isDragging ? 'scale(0.9)' : 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {chatUnread > 99 ? '99+' : chatUnread}
          </div>
        )}
      </div>

      {/* Label tooltip (appears on first load) */}
      {!isDragging && !isPressed && chatUnread === 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-background bg-[var(--foreground)]/90 px-2.5 py-1 rounded-lg pointer-events-none"
          style={{
            left: pos.x < window.innerWidth / 2 ? 'auto' : undefined,
            right: pos.x < window.innerWidth / 2 ? 'calc(100% + 8px)' : undefined,
            opacity: 0.7,
            transition: 'opacity 0.2s ease',
          }}
        >
          Chat
        </div>
      )}
    </div>
  );
});
