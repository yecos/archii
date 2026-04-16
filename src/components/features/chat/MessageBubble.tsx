'use client';
import React, { RefObject } from 'react';
import { Pause, Play, Download, MoreVertical } from 'lucide-react';
import { getAvatarHSL, QUICK_REACTIONS } from './chat-helpers';
import { fmtRecTime, fmtSize as fmtFileSize } from '@/lib/helpers';
import type { ChatMessage, FirestoreTimestamp } from '@/lib/types';

interface MessageBubbleProps {
  m: ChatMessage;
  mi: number;
  groupMessages: ChatMessage[];
  authUserUid: string | undefined;
  playingAudio: string | null;
  audioProgress: number;
  fileIcon: (fileType: string) => string;
  messageReactions: Record<string, Record<string, string[]>>;
  chatMenuMsg: string | null;
  showReactionPicker: string | null;
  filteredMessages: ChatMessage[];
  menuRef: RefObject<HTMLDivElement | null>;
  onToggleAudioPlay: (msgId: string) => void;
  onSetChatMenuMsg: (msgId: string | null) => void;
  onSetShowReactionPicker: (msgId: string | null) => void;
  onSetChatReplyingTo: (msg: ChatMessage) => void;
  onDeleteMessage: (msgId: string) => void;
  onCopyMessageText: (text: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onSetLightboxImg: (img: { src: string; name?: string; size?: number } | null) => void;
}

export default function MessageBubble({
  m,
  mi,
  groupMessages,
  authUserUid,
  playingAudio,
  audioProgress,
  fileIcon,
  messageReactions,
  chatMenuMsg,
  showReactionPicker,
  filteredMessages,
  menuRef,
  onToggleAudioPlay,
  onSetChatMenuMsg,
  onSetShowReactionPicker,
  onSetChatReplyingTo,
  onDeleteMessage,
  onCopyMessageText,
  onToggleReaction,
  onSetLightboxImg,
}: MessageBubbleProps) {
  const isMe = m.uid === authUserUid;
  const ts = m.createdAt
    ? (m.createdAt instanceof Date
      ? m.createdAt
      : typeof m.createdAt === 'string'
        ? new Date(m.createdAt)
        : typeof m.createdAt === 'object' && 'toDate' in (m.createdAt as object)
          ? (m.createdAt as { toDate: () => Date }).toDate()
          : new Date())
    : new Date();
  const msgType = m.type || 'TEXT';
  const prevMsg = mi > 0 ? groupMessages[mi - 1] : null;
  const isSameSender = prevMsg && prevMsg.uid === m.uid;
  const reactions = messageReactions[m.id] || {};
  const reactionKeys = Object.keys(reactions);
  const hasReactions = reactionKeys.length > 0;
  const isMenuOpen = chatMenuMsg === m.id;
  const isReactionOpen = showReactionPicker === m.id;

  return (
    <div
      key={m.id}
      className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSameSender ? 'mt-0.5' : 'mt-3'} animate-fadeIn`}
      style={{ animationDuration: '0.2s' }}
      onContextMenu={(e) => { e.preventDefault(); onSetChatMenuMsg(m.id); onSetShowReactionPicker(null); }}
    >
      {/* Sender info (show for new sender groups) */}
      {!isSameSender && !isMe && (
        <div className="flex items-center gap-2 mb-1 ml-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: getAvatarHSL(m.uid || ''), color: '#fff' }}
          >
            {(typeof m.userName === 'string' ? m.userName : 'Usuario')[0].toUpperCase()}
          </div>
          <span className="text-[11px] font-semibold text-[var(--foreground)]">{typeof m.userName === 'string' ? m.userName : 'Equipo'}</span>
          <span className="text-[10px] text-[var(--af-text3)]">{ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
      {/* Timestamp for own messages */}
      {!isSameSender && isMe && (
        <div className="flex items-center gap-2 mb-1 mr-1">
          <span className="text-[10px] text-[var(--af-text3)]">{ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-[11px] font-semibold text-[var(--foreground)]">Tú</span>
        </div>
      )}

      {/* Reply reference */}
      {m.replyTo && (
        <div className={`mb-1 ml-1 max-w-[260px] px-2.5 py-1.5 rounded-lg border-l-2 border-l-[var(--af-accent)] bg-[var(--skeuo-raised)] shadow-[var(--skeuo-shadow-raised-sm)] cursor-pointer transition-all hover:shadow-[var(--skeuo-shadow-raised)] ${isMe ? 'mr-1' : ''}`} onClick={() => {
          const replyObj = typeof m.replyTo === 'object' && m.replyTo !== null ? m.replyTo : null;
          const target = replyObj ? filteredMessages.find(msg => msg.id === replyObj.id) : undefined;
          if (target) {
            const el = document.getElementById(`msg-${target.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}>
          <div className="text-[10px] font-semibold text-[var(--af-accent)]">{typeof m.replyTo === 'object' && m.replyTo !== null ? (typeof m.replyTo.userName === 'string' ? m.replyTo.userName : 'Usuario') : 'Usuario'}</div>
          <div className="text-[11px] text-[var(--af-text3)] truncate">{(typeof m.replyTo === 'object' && m.replyTo !== null ? (typeof m.replyTo.text === 'string' ? m.replyTo.text : '') : '').substring(0, 80)}</div>
        </div>
      )}

      {/* Message bubble */}
      <div
        id={`msg-${m.id}`}
        className={`relative max-w-[80%] rounded-2xl shadow-[var(--skeuo-shadow-raised-sm)] transition-shadow hover:shadow-[var(--skeuo-shadow-raised)] ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}`}
      >
        {/* TEXT */}
        {msgType === 'TEXT' && m.text && (
          <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${isMe ? 'bg-[var(--accent)] text-[var(--af-accent2)] border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)] text-[var(--foreground)]'}`}>
            {(typeof m.text === 'string' ? m.text : '').split('\n').map((l: string, i: number) => <span key={i}>{l}{i < (typeof m.text === 'string' ? m.text : '').split('\n').length - 1 ? <br /> : ''}</span>)}
          </div>
        )}

        {/* AUDIO */}
        {msgType === 'AUDIO' && m.audioData && (
          <div className={`flex items-center gap-2.5 px-3 py-2.5 ${isMe ? 'bg-[var(--accent)] border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)]'}`}>
            <audio id={'audio-' + m.id} src={m.audioData} preload="metadata" className="hidden" />
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer border-none transition-transform active:scale-95"
              style={{ background: playingAudio === m.id ? 'var(--af-accent)' : 'var(--af-bg4)' }}
              onClick={() => onToggleAudioPlay(m.id)}
            >
              {playingAudio === m.id ? (
                <Pause className="w-3.5 h-3.5" fill="currentColor" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex gap-0.5 items-end h-5">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="w-[3px] rounded-full transition-all duration-100" style={{ height: (i % 3 === 0 ? '6px' : i % 3 === 1 ? '12px' : '18px'), backgroundColor: playingAudio === m.id && ((i / 28) * 100 <= audioProgress) ? 'var(--af-accent)' : 'var(--border)' }} />
                ))}
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{m.audioDuration ? fmtRecTime(m.audioDuration) : '0:00'}</div>
            </div>
            <div className="text-[9px]">🎙️</div>
          </div>
        )}

        {/* IMAGE */}
        {msgType === 'IMAGE' && m.fileData && (
          <div className={`rounded-2xl overflow-hidden ${isMe ? 'border border-[var(--af-accent)]/20' : 'border border-[var(--border)]'}`}>
            <img src={m.fileData!} alt={m.fileName || 'Imagen'} className="max-w-full max-h-[300px] object-cover cursor-pointer rounded-2xl" loading="lazy" onClick={() => onSetLightboxImg({ src: m.fileData!, name: m.fileName, size: m.fileSize })} />
            {m.fileName && <div className="text-[10px] text-[var(--muted-foreground)] px-2.5 py-1 bg-[var(--af-bg3)]">{m.fileName}{m.fileSize ? ` · ${fmtFileSize(m.fileSize)}` : ''}</div>}
          </div>
        )}

        {/* FILE */}
        {msgType === 'FILE' && m.fileData && (
          <div className={`flex items-center gap-3 px-3.5 py-2.5 ${isMe ? 'bg-[var(--accent)] border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)] border border-[var(--border)]'}`}>
            <div className="text-2xl flex-shrink-0">{fileIcon(m.fileType || '')}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{m.fileName || 'Archivo'}</div>
              {m.fileSize && <div className="text-[10px] text-[var(--muted-foreground)]">{fmtFileSize(m.fileSize)}</div>}
            </div>
            <a href={m.fileData} download={m.fileName || 'archivo'} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--af-bg4)] hover:bg-[var(--af-accent)]/10 transition-colors flex-shrink-0" title="Descargar">
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Action button (3 dots) */}
        <button
          className={`absolute -top-2 ${isMe ? '-left-8' : '-right-8'} w-7 h-7 rounded-full flex items-center justify-center bg-[var(--af-bg4)] hover:bg-[var(--af-bg3)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none`}
          style={{ top: -4, [isMe ? 'left' : 'right']: -32 }}
          onClick={(e) => { e.stopPropagation(); onSetChatMenuMsg(chatMenuMsg === m.id ? null : m.id); onSetShowReactionPicker(null); }}
        >
          <MoreVertical className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
        </button>

        {/* Context menu */}
        {isMenuOpen && (
          <div ref={menuRef} className={`absolute z-20 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl py-1 min-w-[160px] animate-fadeIn ${isMe ? 'right-0 mr-8' : 'left-0 ml-8'}`} style={{ bottom: 0, animationDuration: '0.12s' }}>
            <button className="w-full px-3.5 py-2 text-[12px] text-left hover:bg-[var(--af-bg3)] transition-colors flex items-center gap-2.5 cursor-pointer border-none bg-transparent text-[var(--foreground)]" onClick={() => { onSetChatReplyingTo({ id: m.id, text: m.text || '', userName: m.userName, uid: m.uid } as ChatMessage); onSetChatMenuMsg(null); }}>
              <span className="text-sm">↩️</span> Responder
            </button>
            {m.text && (
              <button className="w-full px-3.5 py-2 text-[12px] text-left hover:bg-[var(--af-bg3)] transition-colors flex items-center gap-2.5 cursor-pointer border-none bg-transparent text-[var(--foreground)]" onClick={() => onCopyMessageText(m.text)}>
                <span className="text-sm">📋</span> Copiar texto
              </button>
            )}
            <button className="w-full px-3.5 py-2 text-[12px] text-left hover:bg-[var(--af-bg3)] transition-colors flex items-center gap-2.5 cursor-pointer border-none bg-transparent text-[var(--foreground)]" onClick={() => { onSetShowReactionPicker(m.id); onSetChatMenuMsg(null); }}>
              <span className="text-sm">😊</span> Reaccionar
            </button>
            {isMe && (
              <div className="border-t border-[var(--border)] my-1" />
            )}
            {isMe && (
              <button className="w-full px-3.5 py-2 text-[12px] text-left hover:bg-red-500/10 transition-colors flex items-center gap-2.5 cursor-pointer border-none bg-transparent text-red-400" onClick={() => onDeleteMessage(m.id)}>
                <span className="text-sm">🗑️</span> Eliminar
              </button>
            )}
          </div>
        )}

        {/* Reaction picker */}
        {isReactionOpen && (
          <div ref={menuRef} className={`absolute z-20 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl px-2 py-1.5 flex gap-0.5 animate-fadeIn ${isMe ? 'right-0 mr-8' : 'left-0 ml-8'}`} style={{ bottom: 0, animationDuration: '0.12s' }}>
            {QUICK_REACTIONS.map(e => (
              <button key={e} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg3)] transition-transform hover:scale-125 cursor-pointer border-none bg-transparent text-lg" onClick={() => { onToggleReaction(m.id, e); onSetShowReactionPicker(null); }}>{e}</button>
            ))}
          </div>
        )}
      </div>

      {/* Reactions row */}
      {(hasReactions) && (
        <div className={`flex flex-wrap gap-1 mt-0.5 ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
          {reactionKeys.map(emoji => (
            <button
              key={emoji}
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[12px] border cursor-pointer transition-all hover:scale-105 ${reactions[emoji].includes(authUserUid || '') ? 'bg-[var(--af-accent)]/15 border-[var(--af-accent)]/30' : 'bg-[var(--af-bg3)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`}
              onClick={() => onToggleReaction(m.id!, emoji)}
            >
              <span>{emoji}</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{reactions[emoji].length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
