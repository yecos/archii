'use client';
import React, { RefObject } from 'react';
import { Search, ChevronLeft, X, Paperclip, Mic, Send } from 'lucide-react';
import { fmtRecTime, fmtSize as fmtFileSize } from '@/lib/helpers';
import MessageBubble from './MessageBubble';
import EmojiPicker from './EmojiPicker';
import type { ChatMessage } from '@/lib/types';

interface MessageListProps {
  chatMobileShow: boolean;
  setChatMobileShow: (v: boolean) => void;
  setShowEmojiPicker: (v: boolean | ((prev: boolean) => boolean)) => void;
  convTitle: string;
  convSubtitle: string;
  chatMsgSearch: string;
  setChatMsgSearch: (v: string) => void;
  filteredMessages: any[];
  messagesByDate: { date: Date; dateLabel: string; messages: any[] }[];
  chatDropActive: boolean;
  setChatDropActive: (v: boolean) => void;
  handleFileSelect: (files: FileList | File[] | null) => void;
  chatProjectId: string | null;
  authUserUid: string | undefined;
  playingAudio: string | null;
  audioProgress: number;
  fileIcon: (fileType: string) => string;
  messageReactions: Record<string, Record<string, string[]>>;
  chatMenuMsg: string | null;
  showReactionPicker: string | null;
  menuRef: RefObject<HTMLDivElement | null>;
  msgsEndRef: RefObject<HTMLDivElement | null>;
  lightboxImg: { src: string; name?: string; size?: number } | null;
  setLightboxImg: (img: { src: string; name?: string; size?: number } | null) => void;
  onToggleAudioPlay: (msgId: string) => void;
  onSetChatMenuMsg: (msgId: string | null) => void;
  onSetShowReactionPicker: (msgId: string | null) => void;
  onSetChatReplyingTo: (msg: ChatMessage) => void;
  onDeleteMessage: (msgId: string) => void;
  onCopyMessageText: (text: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  isRecording: boolean;
  recDuration: number;
  recVolume: number;
  stopRecording: () => Promise<Blob | null>;
  audioPreviewUrl: string | null;
  audioPreviewBlobRef: RefObject<Blob | null>;
  audioPreviewDuration: number;
  setAudioPreviewUrl: (v: string | null) => void;
  setAudioPreviewDuration: (v: number) => void;
  pendingFiles: any[];
  removePendingFile: (id: string) => void;
  showEmojiPicker: boolean;
  emojiSearch: string;
  setEmojiSearch: (v: string) => void;
  activeEmojiCat: string;
  setActiveEmojiCat: (v: string) => void;
  recentEmojis: string[];
  filteredEmojis: string[] | null;
  insertEmoji: (emoji: string) => void;
  chatReplyingTo: any;
  setChatReplyingTo: (msg: ChatMessage | null) => void;
  formsChatInput: string;
  setForms: (updater: (prev: any) => any) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleMicButton: () => void;
  sendAll: () => void;
}

export default function MessageList(props: MessageListProps) {
  const {
    chatMobileShow, setChatMobileShow, setShowEmojiPicker,
    convTitle, convSubtitle, chatMsgSearch, setChatMsgSearch,
    filteredMessages, messagesByDate, chatDropActive, setChatDropActive, handleFileSelect,
    chatProjectId, authUserUid, playingAudio, audioProgress, fileIcon,
    messageReactions, chatMenuMsg, showReactionPicker, menuRef, msgsEndRef,
    lightboxImg, setLightboxImg,
    onToggleAudioPlay, onSetChatMenuMsg, onSetShowReactionPicker,
    onSetChatReplyingTo, onDeleteMessage, onCopyMessageText, onToggleReaction,
    isRecording, recDuration, recVolume, stopRecording,
    audioPreviewUrl, audioPreviewBlobRef, audioPreviewDuration, setAudioPreviewUrl, setAudioPreviewDuration,
    pendingFiles, removePendingFile,
    showEmojiPicker, emojiSearch, setEmojiSearch, activeEmojiCat, setActiveEmojiCat,
    recentEmojis, filteredEmojis, insertEmoji,
    chatReplyingTo, setChatReplyingTo, formsChatInput, setForms,
    fileInputRef, handleMicButton, sendAll,
  } = props;

  return (
    <div className={`${chatMobileShow ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-background`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] flex-shrink-0 backdrop-blur-xl bg-[var(--card)]/80 z-10">
        <button className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg3)] transition-colors lg:hidden" onClick={() => { setChatMobileShow(false); setShowEmojiPicker(false); }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate text-[var(--foreground)]">{convTitle}</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">{convSubtitle}</div>
        </div>
        {/* Message search */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg3)] transition-colors"
            onClick={() => { if (chatMsgSearch) setChatMsgSearch(''); else setChatMsgSearch(' '); }}
            title="Buscar mensajes"
          >
            <Search className={`w-4 h-4 transition-colors ${chatMsgSearch ? 'text-[var(--af-accent)]' : 'text-[var(--muted-foreground)]'}`} />
          </button>
        </div>
      </div>

      {/* Message search bar */}
      {chatMsgSearch !== '' && (
        <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--card)] animate-fadeIn">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg pl-8 pr-8 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] placeholder:text-[var(--af-text3)]"
              placeholder="Buscar en esta conversación..."
              value={chatMsgSearch === ' ' ? '' : chatMsgSearch}
              onChange={e => setChatMsgSearch(e.target.value)}
              autoFocus
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border-none bg-transparent" onClick={() => setChatMsgSearch('')}>
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Messages scroll area */}
      <div
        id="chat-msgs"
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-1 relative"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
        onDragOver={(e) => { e.preventDefault(); setChatDropActive(true); }}
        onDragLeave={() => setChatDropActive(false)}
        onDrop={(e) => { e.preventDefault(); setChatDropActive(false); if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files); }}
        onPaste={(e) => { const items = e.clipboardData?.items; if (items) { const imgs: File[] = []; for (let i = 0; i < items.length; i++) { if (items[i].type.startsWith('image/')) { const f = items[i].getAsFile(); if (f) imgs.push(f); } } if (imgs.length > 0) { e.preventDefault(); handleFileSelect(imgs as unknown as FileList); } } }}
      >
        {/* Drag overlay */}
        {chatDropActive && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--af-accent)]/5 border-2 border-dashed border-[var(--af-accent)]/40 rounded-xl m-4 animate-fadeIn">
            <div className="text-center">
              <div className="text-5xl mb-3">📎</div>
              <div className="text-sm font-semibold text-[var(--af-accent)]">Suelta archivos aquí</div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredMessages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center max-w-[240px]">
              <div className="w-20 h-20 rounded-2xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">{chatProjectId === '__dm__' ? '🤝' : '💬'}</span>
              </div>
              <div className="text-[14px] font-semibold text-[var(--foreground)] mb-1">
                {chatMsgSearch.trim() ? 'Sin resultados' : chatProjectId === '__dm__' ? 'Inicia una conversación' : 'Empieza la conversación'}
              </div>
              <div className="text-[12px] text-[var(--af-text3)] leading-relaxed">
                {chatMsgSearch.trim() ? 'No se encontraron mensajes con ese criterio' : chatProjectId === '__dm__' ? 'Envía el primer mensaje para iniciar el chat directo' : '¡Saluda al equipo y comparte actualizaciones!'}
              </div>
            </div>
          </div>
        )}

        {/* Message groups by date */}
        {messagesByDate.map((group, gi) => (
          <React.Fragment key={gi}>
            {/* Date separator */}
            {gi > 0 && (
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[11px] font-medium text-[var(--muted-foreground)] px-2 bg-background">{group.dateLabel}</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
            )}
            {/* First date separator */}
            {gi === 0 && (
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[11px] font-medium text-[var(--muted-foreground)] px-2 bg-background">{group.dateLabel}</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
            )}

            {/* Messages in group */}
            {group.messages.map((m: any, mi: number) => (
              <MessageBubble
                key={m.id}
                m={m}
                mi={mi}
                groupMessages={group.messages}
                authUserUid={authUserUid}
                playingAudio={playingAudio}
                audioProgress={audioProgress}
                fileIcon={fileIcon}
                messageReactions={messageReactions}
                chatMenuMsg={chatMenuMsg}
                showReactionPicker={showReactionPicker}
                filteredMessages={filteredMessages}
                menuRef={menuRef}
                onToggleAudioPlay={onToggleAudioPlay}
                onSetChatMenuMsg={onSetChatMenuMsg}
                onSetShowReactionPicker={onSetShowReactionPicker}
                onSetChatReplyingTo={onSetChatReplyingTo}
                onDeleteMessage={onDeleteMessage}
                onCopyMessageText={onCopyMessageText}
                onToggleReaction={onToggleReaction}
                onSetLightboxImg={setLightboxImg}
              />
            ))}
          </React.Fragment>
        ))}
        <div ref={msgsEndRef} />
      </div>

      {/* Recording state */}
      {isRecording && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-[var(--border)] bg-red-500/5 flex items-center gap-3 animate-fadeIn">
          <div className="flex items-end gap-[3px]">
            {[recVolume * 28 + 4, recVolume * 22 + 6, recVolume * 32 + 3, recVolume * 18 + 5].map((h, i) => (
              <div key={i} className="w-[3px] bg-red-500 rounded-full animate-pulse" style={{ height: `${Math.max(h, 4)}px` }} />
            ))}
          </div>
          <span className="text-[13px] text-red-500 font-mono font-semibold">{fmtRecTime(recDuration)}</span>
          <button
            className="ml-auto text-[11px] px-4 py-1.5 rounded-full bg-red-500 text-white font-semibold cursor-pointer border-none hover:bg-red-600 transition-colors"
            onClick={async () => { const blob = await stopRecording(); if (blob) { const url = URL.createObjectURL(blob); setAudioPreviewUrl(url); setAudioPreviewDuration(recDuration); audioPreviewBlobRef.current = blob; } }}
          >
            Detener
          </button>
        </div>
      )}

      {/* Audio preview */}
      {audioPreviewUrl && !isRecording && (
        <div className="flex-shrink-0 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--af-accent)]/5 flex items-center gap-3 animate-fadeIn">
          <div className="w-10 h-10 rounded-full bg-[var(--af-accent)]/15 flex items-center justify-center text-lg">🎙️</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-[var(--muted-foreground)]">Nota de voz ({fmtRecTime(audioPreviewDuration)})</div>
          </div>
          <button className="text-[11px] px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent transition-colors" onClick={() => { setAudioPreviewUrl(null); audioPreviewBlobRef.current = null; }}>
            Descartar
          </button>
        </div>
      )}

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--af-bg3)] animate-fadeIn">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {pendingFiles.map(f => (
              <div key={f.id} className="flex-shrink-0 w-[72px] h-[72px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 relative overflow-hidden shadow-sm">
                {f.preview ? <img src={f.preview} className="w-full h-full object-cover rounded-lg" alt={f.name || "Vista previa"} loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{fileIcon(f.type)}</div>}
                <button className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center cursor-pointer border-none leading-none shadow-md" onClick={() => removePendingFile(f.id)}>✕</button>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white truncate px-0.5 py-px rounded-b-lg">{f.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMOJI PICKER */}
      {showEmojiPicker && (
        <EmojiPicker
          emojiSearch={emojiSearch}
          setEmojiSearch={setEmojiSearch}
          activeEmojiCat={activeEmojiCat}
          setActiveEmojiCat={setActiveEmojiCat}
          recentEmojis={recentEmojis}
          filteredEmojis={filteredEmojis}
          insertEmoji={insertEmoji}
          onClose={() => { setShowEmojiPicker(false); setEmojiSearch(''); }}
        />
      )}

      {/* INPUT AREA */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--card)]">
        {/* Reply indicator */}
        {chatReplyingTo && (
          <div className="px-3 pt-2.5 pb-1 animate-fadeIn" style={{ animationDuration: '0.15s' }}>
            <div className="flex items-center gap-2 bg-[var(--af-bg3)] rounded-lg px-3 py-2 border-l-2 border-l-[var(--af-accent)]">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-[var(--af-accent)]">Respondiendo a {chatReplyingTo.userName || 'Usuario'}</div>
                <div className="text-[11px] text-[var(--af-text3)] truncate">{(chatReplyingTo.text || '').substring(0, 100)}</div>
              </div>
              <button
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-pointer border-none bg-transparent flex-shrink-0"
                onClick={() => setChatReplyingTo(null)}
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1 items-end px-2.5 py-2.5 safe-bottom">
          <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => { if (e.target.files) handleFileSelect(e.target.files); }} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.dwg,.txt,.csv" />
          <button className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer border-none bg-transparent hover:bg-[var(--af-bg3)] transition-colors flex-shrink-0" onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo">
            <Paperclip className="w-[18px] h-[18px] text-[var(--muted-foreground)]" strokeWidth={1.75} />
          </button>
          <input
            id="chat-input-field"
            className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-[15px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] min-w-0 transition-colors placeholder:text-[var(--af-text3)]"
            placeholder="Escribe un mensaje..."
            value={formsChatInput || ''}
            onChange={e => setForms((p: any) => ({ ...p, chatInput: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAll(); } }}
          />
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer border-none bg-transparent hover:bg-[var(--af-bg3)] transition-colors flex-shrink-0"
            onClick={() => setShowEmojiPicker(p => !p)}
            title="Emojis"
          >
            <span className="text-[20px]" role="img" aria-label="emojis">😀</span>
          </button>
          <button
            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer border-none flex-shrink-0 transition-all ${isRecording ? 'bg-red-500 animate-pulse' : audioPreviewUrl ? 'bg-[var(--af-accent)]' : 'bg-transparent hover:bg-[var(--af-bg3)]'}`}
            onClick={handleMicButton}
            title={isRecording ? 'Detener grabación' : audioPreviewUrl ? 'Descartar nota' : 'Grabar nota de voz'}
          >
            {isRecording ? (
              <div className="w-3 h-3 bg-white rounded-sm" />
            ) : (
              <Mic className="w-[18px] h-[18px]" />
            )}
          </button>
          <button
            className="w-10 h-10 rounded-xl bg-[var(--af-accent)] flex items-center justify-center cursor-pointer border-none flex-shrink-0 active:scale-95 transition-transform hover:opacity-90 shadow-md"
            onClick={sendAll}
            title="Enviar"
          >
            <Send className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* IMAGE LIGHTBOX */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer border-none text-white z-10 transition-colors"
            onClick={() => setLightboxImg(null)}
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <img
            src={lightboxImg.src}
            alt={lightboxImg.name || 'Imagen'}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl animate-fadeIn"
            style={{ animationDuration: '0.2s' }}
            onClick={e => e.stopPropagation()}
          />
          {(lightboxImg.name || lightboxImg.size) && (
            <div className="absolute bottom-6 text-center text-white/70 text-[12px]">
              {lightboxImg.name}{lightboxImg.size ? ` · ${fmtFileSize(lightboxImg.size)}` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
