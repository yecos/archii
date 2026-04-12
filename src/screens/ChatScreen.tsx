'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import { REACTION_EMOJIS, statusColor, avatarColor } from '@/lib/constants';
import { getInitials, fmtRecTime, fmtSize as fmtFileSize, fileIcon } from '@/lib/helpers';

export default function ChatScreen() {
  const {
    chatMobileShow, setChatMobileShow,
    chatTab, setChatTab,
    forms, setForms,
    chatProjectId, setChatProjectId,
    projects,
    showNewDMModal, setShowNewDMModal,
    dmChats, directChatId, setDirectChatId,
    authUser,
    onlineUsers,
    startDM,
    chatSearchMsg, setChatSearchMsg,
    replyingTo, setReplyingTo,
    chatDropActive, setChatDropActive,
    handleFileSelect,
    teamUsers,
    messages,
    aiChatHistory, setAiChatHistory,
    aiLoading,
    playingAudio, toggleAudioPlay, audioProgress,
    reactionPickerMsg, setReactionPickerMsg,
    toggleReaction,
    deleteMessage,
    isRecording, recDuration, recVolume,
    cancelRecording,
    audioPreviewUrl, setAudioPreviewUrl, audioPreviewDuration, audioPreviewBlobRef,
    sendVoiceNote,
    pendingFiles, removePendingFile,
    fileInputRef,
    sendAll,
    handleMicButton,
    sendAIChat,
  } = useApp();

  return (<div className="animate-fadeIn flex flex-col md:h-full pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0" style={{ minHeight: 0, flex: 1 }}>

    {/* Lista de conversaciones */}
    <div className={`${chatMobileShow ? 'hidden' : 'flex'} flex-col flex-1 md:w-[300px] md:flex-shrink-0 border-r border-[var(--border)] overflow-hidden bg-[var(--card)] md:bg-transparent`}>
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {([
          { key: 'channels' as const, label: 'Canales', icon: '#' },
          { key: 'direct' as const, label: 'Directos', icon: '@' },
          { key: 'ai' as const, label: 'IA', icon: '✨' },
        ]).map(tab => (
          <button key={tab.key} className={`flex-1 py-3 text-[13px] font-bold cursor-pointer border-none transition-colors ${chatTab === tab.key ? 'text-[var(--af-accent)] border-b-2 border-b-[var(--af-accent)] bg-[var(--af-accent)]/8' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--af-bg3)]'}`} onClick={() => setChatTab(tab.key)}>
            <span className="mr-1">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>
      {/* Search */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none flex-shrink-0 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder={chatTab === 'direct' ? 'Buscar conversaciones...' : chatTab === 'ai' ? 'Historial IA...' : 'Buscar canales...'} value={forms.chatSearch || ''} onChange={e => setForms(p => ({ ...p, chatSearch: e.target.value }))} />
        </div>
      </div>

      {/* Channel list */}
      {chatTab === 'channels' && (<div className="flex-1 overflow-y-auto">
        {/* Chat General */}
        <div className={`p-3 border-b border-[var(--border)] cursor-pointer transition-colors flex items-center gap-3 ${chatProjectId === '__general__' ? 'bg-[var(--af-accent)]/10 border-l-2 border-l-[var(--af-accent)]' : 'hover:bg-[var(--af-bg3)]'}`} onClick={() => { setChatProjectId('__general__'); setChatMobileShow(true); }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--af-accent)] to-purple-500 flex items-center justify-center text-lg flex-shrink-0 shadow-md">💬</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between"><div className="text-[13px] font-semibold">Chat General</div></div>
            <div className="text-[12px] text-[var(--muted-foreground)] truncate">Canal de todo el equipo</div>
          </div>
        </div>
        {/* Project chats */}
        {projects.length === 0 ? <div className="p-6 text-center text-[var(--af-text3)] text-sm">Crea un proyecto primero</div> :
        projects.filter(p => !forms.chatSearch || p.data.name.toLowerCase().includes((forms.chatSearch || '').toLowerCase())).map(p => (
          <div key={p.id} className={`p-3 border-b border-[var(--border)] cursor-pointer transition-colors flex items-center gap-3 ${p.id === chatProjectId ? 'bg-[var(--af-accent)]/10 border-l-2 border-l-[var(--af-accent)]' : 'hover:bg-[var(--af-bg3)]'}`} onClick={() => { setChatProjectId(p.id); setChatMobileShow(true); }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${p.data.status === 'Ejecucion' ? '#f59e0b, #ef4444' : p.data.status === 'Diseno' ? '#3b82f6, #8b5cf6' : p.data.status === 'Terminado' ? '#10b981, #06b6d4' : 'var(--af-bg4), var(--border)'})` }}>🏗️</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2"><div className="text-[13px] font-medium truncate">{p.data.name}</div><span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColor(p.data.status)}`}>{p.data.status}</span></div>
              <div className="text-[12px] text-[var(--muted-foreground)] truncate">{p.data.client || 'Canal del equipo'}</div>
            </div>
          </div>
        ))}
      </div>)}

      {/* Direct messages list */}
      {chatTab === 'direct' && (<div className="flex-1 overflow-y-auto">
        <button className="w-full p-3 text-[13px] text-[var(--af-accent)] font-medium cursor-pointer border-none bg-transparent hover:bg-[var(--af-bg3)] text-left flex items-center gap-2" onClick={() => setShowNewDMModal(true)}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo mensaje directo
        </button>
        {dmChats.length === 0 ? <div className="p-6 text-center text-[var(--muted-foreground)] text-[13px]"><div className="text-2xl mb-2">💬</div>Sin conversaciones</div> :
        dmChats.filter(dm => { const myUid = authUser?.uid; const otherId = dm.data.participants?.find((p: string) => p !== myUid) || ''; const otherName = dm.data.participantNames?.[otherId] || ''; return !forms.chatSearch || otherName.toLowerCase().includes((forms.chatSearch || '').toLowerCase()); }).map(dm => {
          const myUid = authUser?.uid;
          const otherId = dm.data.participants?.find((p: string) => p !== myUid) || '';
          const otherName = dm.data.participantNames?.[otherId] || 'Usuario';
          const otherPhoto = dm.data.participantPhotos?.[otherId] || '';
          const isOtherOnline = onlineUsers.includes(otherId);
          const lastMsg = dm.data.lastMessage;
          return (
            <div key={dm.id} className={`p-3 border-b border-[var(--border)] cursor-pointer transition-colors flex items-center gap-3 ${dm.id === directChatId ? 'bg-[var(--af-accent)]/10 border-l-2 border-l-[var(--af-accent)]' : 'hover:bg-[var(--af-bg3)]'}`} onClick={() => { setDirectChatId(dm.id); setChatMobileShow(true); }}>
              <div className="relative flex-shrink-0">
                {otherPhoto ? <img src={otherPhoto} className="w-10 h-10 rounded-full object-cover" alt="" /> : <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold ${avatarColor(otherId)}`}>{getInitials(otherName)}</div>}
                {isOtherOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--card)]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between"><div className="text-[13px] font-medium">{otherName}</div><span className="text-[11px] text-[var(--muted-foreground)]">{lastMsg?.createdAt?.toDate ? lastMsg.createdAt.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
                {lastMsg && <div className="text-[12px] text-[var(--muted-foreground)] truncate">{lastMsg.userName ? lastMsg.userName + ': ' : ''}{lastMsg.type === 'IMAGE' ? '📷 Foto' : lastMsg.type === 'AUDIO' ? '🎤 Nota de voz' : lastMsg.type === 'FILE' ? '📎 Archivo' : lastMsg.text || ''}</div>}
              </div>
            </div>
          );
        })}
      </div>)}

      {/* AI Chat */}
      {chatTab === 'ai' && (<div className="flex-1 overflow-y-auto p-4">
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--af-accent)] to-purple-500 flex items-center justify-center text-3xl mb-3 shadow-lg">✨</div>
          <div className="text-[14px] font-semibold">ArchiFlow IA</div>
          <div className="text-[12px] text-[var(--muted-foreground)] mt-1">Asistente inteligente para arquitectura y construccion</div>
        </div>
        <div className="space-y-2">
          {['¿Cuáles son los acabados más usados en interiorismo?', '¿Cómo calculo el presupuesto de una obra?', '¿Qué fases sigue un proyecto de arquitectura?', '¿Cómo optimizo la gestión de inventario?'].map((suggestion, i) => (
            <button key={i} className="w-full text-left text-[13px] text-[var(--muted-foreground)] p-2.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:border-[var(--af-accent)]/30 hover:text-[var(--foreground)] transition-all" onClick={() => { setForms(p => ({ ...p, chatInput: suggestion })); setChatMobileShow(true); setChatTab('ai'); }}>{suggestion}</button>
          ))}
        </div>
        {aiChatHistory.length > 0 && (<div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="text-[12px] text-[var(--muted-foreground)] mb-2">Historial reciente ({aiChatHistory.length} mensajes)</div>
          <button className="text-[11px] text-red-400 cursor-pointer hover:underline bg-transparent border-none" onClick={() => { if (confirm('¿Limpiar historial de la IA?')) setAiChatHistory([]); }}>Limpiar historial</button>
        </div>)}
      </div>)}

      {/* New DM Modal */}
      {showNewDMModal && (<div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewDMModal(false)}>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-[var(--border)]">
            <div className="text-[15px] font-semibold">Nuevo mensaje directo</div>
            <div className="text-[12px] text-[var(--muted-foreground)]">Selecciona un miembro del equipo</div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {teamUsers.filter(u => u.id !== authUser?.uid).map(u => (
              <button key={u.id} className="w-full flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border-none bg-transparent hover:bg-[var(--af-bg3)] transition-colors text-left" onClick={() => startDM(u.id)}>
                <div className="relative flex-shrink-0">
                  {u.data.photoURL ? <img src={u.data.photoURL} className="w-9 h-9 rounded-full object-cover" alt="" /> : <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold ${avatarColor(u.id)}`}>{getInitials(u.data.name)}</div>}
                  {onlineUsers.includes(u.id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--card)]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{u.data.name}</div>
                  <div className="text-[12px] text-[var(--muted-foreground)]">{u.data.role || 'Miembro'}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-[var(--border)]"><button className="w-full py-2 text-[13px] rounded-lg bg-[var(--af-bg3)] text-[var(--muted-foreground)] cursor-pointer border-none hover:bg-[var(--af-bg4)]" onClick={() => setShowNewDMModal(false)}>Cancelar</button></div>
        </div>
      </div>)}
    </div>

    {/* Area de mensajes */}
    <div className={`${chatMobileShow ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-background`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)] flex-shrink-0 bg-[var(--card)]">
        <button className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg3)]" onClick={() => setChatMobileShow(false)}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" style={{stroke:'currentColor',fill:'none'}} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          {chatTab === 'ai' ? (<div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--af-accent)] to-purple-500 flex items-center justify-center text-sm">✨</div>
            <div><div className="text-sm font-semibold">ArchiFlow IA</div><div className="text-[10px] text-emerald-400">En línea</div></div>
          </div>) : chatTab === 'direct' && directChatId ? (() => {
            const dm = dmChats.find(d => d.id === directChatId);
            const myUid = authUser?.uid;
            const otherId = dm?.data?.participants?.find((p: string) => p !== myUid) || '';
            const otherName = dm?.data?.participantNames?.[otherId] || 'Usuario';
            const otherPhoto = dm?.data?.participantPhotos?.[otherId] || '';
            const isOnline = onlineUsers.includes(otherId);
            return (<div className="flex items-center gap-2">
              <div className="relative">{otherPhoto ? <img src={otherPhoto} className="w-8 h-8 rounded-full object-cover" alt="" /> : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold ${avatarColor(otherId)}`}>{getInitials(otherName)}</div>}{isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--card)]" />}</div>
              <div><div className="text-sm font-semibold">{otherName}</div><div className="text-[10px]">{isOnline ? <span className="text-emerald-400">En línea</span> : 'Desconectado'}</div></div>
            </div>);
          })() : (<div>
            <div className="text-sm font-semibold truncate">{chatProjectId === '__general__' ? '💬 Chat General' : projects.find(p => p.id === chatProjectId)?.data.name || 'Selecciona un proyecto'}</div>
            <div className="text-[12px] text-[var(--muted-foreground)]">{chatProjectId === '__general__' ? 'Canal de todo el equipo' : chatProjectId ? 'Canal del equipo' : ''}</div>
          </div>)}
        </div>
        {/* Search messages */}
        <div className="relative">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg3)] bg-transparent border-none" onClick={() => { const el = document.getElementById('chat-search-input'); if (el) el.focus(); }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <input id="chat-search-input" className="absolute right-0 top-10 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] shadow-lg z-10 hidden" placeholder="Buscar en mensajes..." value={chatSearchMsg} onChange={e => setChatSearchMsg(e.target.value)} onBlur={() => setTimeout(() => setChatSearchMsg(''), 300)} />
        </div>
      </div>

      {/* Reply preview */}
      {replyingTo && (<div className="flex items-center gap-2 px-4 py-2 bg-[var(--af-accent)]/10 border-b border-[var(--af-accent)]/20 flex-shrink-0">
        <div className="flex-1 min-w-0 border-l-2 border-[var(--af-accent)] pl-2">
          <div className="text-[11px] font-semibold text-[var(--af-accent)]">{replyingTo.userName || 'Usuario'}</div>
          <div className="text-[11px] text-[var(--muted-foreground)] truncate">{replyingTo.text?.substring(0, 80) || '...'}</div>
        </div>
        <button className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--af-bg3)] bg-transparent border-none text-[var(--muted-foreground)]" onClick={() => setReplyingTo(null)}>✕</button>
      </div>)}

      {/* Messages area */}
      <div id="chat-msgs" className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-1"
        onDragOver={(e) => { e.preventDefault(); setChatDropActive(true); }}
        onDragLeave={() => setChatDropActive(false)}
        onDrop={(e) => { e.preventDefault(); setChatDropActive(false); if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files); }}
        onPaste={(e) => { const items = e.clipboardData?.items; if (items) { const imgs: File[] = []; for (let i = 0; i < items.length; i++) { if (items[i].type.startsWith('image/')) { const f = items[i].getAsFile(); if (f) imgs.push(f); } } if (imgs.length > 0) { e.preventDefault(); handleFileSelect(imgs as unknown as FileList); } } }}
      >
        {chatDropActive && (<div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--af-accent)]/5 border-2 border-dashed border-[var(--af-accent)]/40 rounded-xl m-4"><div className="text-center"><div className="text-4xl mb-2">📎</div><div className="text-sm font-medium text-[var(--af-accent)]">Suelta archivos aquí</div></div></div>)}

        {/* AI Chat Messages */}
        {chatTab === 'ai' && (<div className="flex flex-col gap-3">
          {aiChatHistory.length === 0 && (<div className="text-center py-10"><div className="text-4xl mb-3">✨</div><div className="text-[15px] font-semibold mb-1">ArchiFlow IA</div><div className="text-[13px] text-[var(--muted-foreground)]">Pregúntame sobre arquitectura, presupuestos, materiales o gestión de proyectos</div></div>)}
          {aiChatHistory.map((msg, i) => (
            <div key={i} className={`max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
              {msg.role === 'assistant' && (<div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--af-accent)] to-purple-500 flex items-center justify-center text-[10px]">✨</div><span className="text-[11px] text-[var(--muted-foreground)] font-semibold">ArchiFlow IA</span></div>)}
              <div className={`px-4 py-3 text-[14px] font-medium leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[var(--af-accent)] text-[#1a1a1a] border border-[var(--af-accent)]/20 rounded-2xl rounded-br-sm' : 'bg-[var(--af-bg3)] text-[var(--foreground)] rounded-2xl rounded-bl-sm'}`}>{msg.content}</div>
            </div>
          ))}
          {aiLoading && (<div className="self-start"><div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--af-accent)] to-purple-500 flex items-center justify-center text-[10px]">✨</div><span className="text-[11px] text-[var(--muted-foreground)] font-semibold">ArchiFlow IA</span></div><div className="bg-[var(--af-bg3)] px-4 py-3 rounded-2xl rounded-bl-sm"><div className="flex gap-1.5"><div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{animationDelay:'0ms'}}/><div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{animationDelay:'150ms'}}/><div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{animationDelay:'300ms'}}/></div></div></div>)}
        </div>)}

        {/* Regular chat messages */}
        {chatTab !== 'ai' && (<>
          {messages.length === 0 ? <div className="text-center py-10 text-[var(--muted-foreground)] text-[14px]"><div className="text-3xl mb-2">💬</div>Sin mensajes. ¡Saluda al equipo!</div> :
          (() => {
            let lastDate = '';
            return messages.filter(m => !chatSearchMsg || (m.text || '').toLowerCase().includes(chatSearchMsg.toLowerCase()) || (m.userName || '').toLowerCase().includes(chatSearchMsg.toLowerCase())).map(m => {
              const isMe = m.uid === authUser?.uid;
              const ts = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
              const msgType = m.type || 'TEXT';
              const dateStr = ts.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
              const showDate = dateStr !== lastDate;
              if (showDate) lastDate = dateStr;
              const reactions = m.reactions || {};
              const hasReactions = Object.keys(reactions).length > 0;
              const otherUser = teamUsers.find(u => u.id === m.uid);
              const senderPhoto = m.userPhoto || otherUser?.data?.photoURL || '';
              return (<div key={m.id}>
                {/* Date separator */}
                {showDate && (<div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-[var(--border)]" /><span className="text-[11px] text-[var(--muted-foreground)] font-medium flex-shrink-0">{dateStr === new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) ? 'Hoy' : dateStr}</span><div className="flex-1 h-px bg-[var(--border)]" /></div>)}
                <div className={`group max-w-[80%] ${isMe ? 'self-end' : 'self-start'} flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`} onContextMenu={(e) => { e.preventDefault(); setReactionPickerMsg(reactionPickerMsg === m.id ? null : m.id); }} onClick={() => { if (reactionPickerMsg && reactionPickerMsg !== m.id) setReactionPickerMsg(null); }}>
                  {/* Avatar for other users */}
                  {!isMe && chatTab !== 'ai' && (<div className="flex-shrink-0 mt-auto">
                    {senderPhoto ? <img src={senderPhoto} className="w-7 h-7 rounded-full object-cover" alt="" /> : <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${avatarColor(m.uid || '')}`}>{getInitials(m.userName || '?')}</div>}
                  </div>)}
                  <div className="min-w-0">
                    <div className={`text-[11px] mb-0.5 font-medium text-[var(--muted-foreground)] ${isMe ? 'text-right' : ''}`}>{isMe ? '' : (m.userName || 'Equipo')} · {ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                    {/* Reply reference */}
                    {m.replyTo && (<div className={`mb-1 px-2.5 py-1.5 rounded-lg border-l-2 ${isMe ? 'bg-[var(--af-accent)]/10 border-[var(--af-accent)]' : 'bg-[var(--af-bg4)] border-[var(--muted-foreground)]'}`}>
                      <div className="text-[11px] font-semibold">{m.replyTo.userName}</div>
                      <div className="text-[11px] text-[var(--muted-foreground)] truncate">{m.replyTo.text}</div>
                    </div>)}
                    {/* Message content */}
                    {msgType === 'TEXT' && m.text && (<div className={`px-3.5 py-2.5 text-[14px] font-medium leading-relaxed relative ${isMe ? 'bg-[var(--af-accent)] text-[#1a1a1a] border border-[var(--af-accent)]/20 rounded-2xl rounded-br-sm' : 'bg-[var(--af-bg3)] text-[var(--foreground)] rounded-2xl rounded-bl-sm'}`}>
                      {m.text.split('\n').map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
                      {/* Read receipt */}
                      {isMe && m.readBy && (<div className="absolute -bottom-1 right-1 text-[9px]">{m.readBy[authUser?.uid] ? (Object.keys(m.readBy).length > 1 ? '✓✓' : '✓') : '⏳'}</div>)}
                    </div>)}
                    {msgType === 'AUDIO' && m.audioData && (<div className={`flex items-center gap-2.5 px-3 py-2.5 relative ${isMe ? 'bg-[var(--af-accent)] border border-[var(--af-accent)]/20 rounded-2xl rounded-br-sm' : 'bg-[var(--af-bg3)] rounded-2xl rounded-bl-sm'}`}>
                      <audio id={'audio-' + m.id} src={m.audioData} preload="metadata" className="hidden" />
                      <button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer border-none transition-transform active:scale-95" style={{ background: playingAudio === m.id ? 'var(--af-accent)' : 'var(--af-bg4)' }} onClick={() => toggleAudioPlay(m.id)}>
                        {playingAudio === m.id ? (<svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>) : (<svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>)}
                      </button>
                      <div className="flex-1 min-w-0"><div className="flex gap-0.5 items-end h-5">{Array.from({ length: 28 }).map((_, i) => (<div key={i} className="w-[3px] rounded-full transition-all duration-100" style={{ height: (i % 3 === 0 ? '6px' : i % 3 === 1 ? '12px' : '18px'), backgroundColor: playingAudio === m.id && ((i / 28) * 100 <= audioProgress) ? 'var(--af-accent)' : 'var(--border)' }} />))}</div><div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{m.audioDuration ? fmtRecTime(m.audioDuration) : '0:00'}</div></div>
                      <div className="text-[11px]">🎙️</div>
                    </div>)}
                    {msgType === 'IMAGE' && m.fileData && (<div className={`rounded-2xl overflow-hidden ${isMe ? 'border border-[var(--af-accent)]/20' : 'border border-[var(--border)]'}`}><img src={m.fileData} alt={m.fileName || 'Imagen'} className="max-w-full max-h-[300px] object-cover cursor-pointer" onClick={() => { if (m.fileData) { const w = window.open(''); if (w) w.document.write(`<img src="${m.fileData}" style="max-width:100vw;max-height:100vh;" />`); } }} />{m.fileName && <div className="text-[11px] text-[var(--muted-foreground)] px-2 py-1 bg-[var(--af-bg3)]">{m.fileName}{m.fileSize ? ` · ${fmtFileSize(m.fileSize)}` : ''}</div>}</div>)}
                    {msgType === 'FILE' && m.fileData && (<div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl ${isMe ? 'bg-[var(--af-accent)] border border-[var(--af-accent)]/20' : 'bg-[var(--af-bg3)] border border-[var(--border)]'}`}>
                      <div className="text-2xl flex-shrink-0">{fileIcon(m.fileType || '')}</div>
                      <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate">{m.fileName || 'Archivo'}</div>{m.fileSize && <div className="text-[11px] text-[var(--muted-foreground)]">{fmtFileSize(m.fileSize)}</div>}</div>
                      <a href={m.fileData} download={m.fileName || 'archivo'} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--af-bg4)] hover:bg-[var(--af-accent)]/10 transition-colors flex-shrink-0" title="Descargar"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>
                    </div>)}
                    {/* Reactions */}
                    {hasReactions && (<div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                      {Object.entries(reactions).filter(([, users]) => (users as string[]).length > 0).map(([emoji, users]) => {
                        const uArr = users as string[];
                        return (<button key={emoji} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[12px] cursor-pointer border transition-all ${uArr.includes(authUser?.uid) ? 'bg-[var(--af-accent)]/15 border-[var(--af-accent)]/30' : 'bg-[var(--af-bg4)] border-[var(--border)] hover:border-[var(--af-accent)]/30'}`} onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }}>
                          <span>{emoji}</span><span className="text-[11px] text-[var(--muted-foreground)] font-medium">{uArr.length > 1 ? uArr.length : ''}</span>
                        </button>);
                      })}
                    </div>)}
                  </div>
                  {/* Action buttons on hover (desktop) */}
                  <div className={`absolute ${isMe ? 'left-0 -translate-x-full mr-2' : 'right-0 translate-x-full ml-2'} top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
                    <button className="w-7 h-7 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center cursor-pointer shadow-md hover:bg-[var(--af-bg3)] transition-colors" onClick={(e) => { e.stopPropagation(); setReactionPickerMsg(reactionPickerMsg === m.id ? null : m.id); }} title="Reaccionar"><span className="text-[13px]">😊</span></button>
                    <button className="w-7 h-7 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center cursor-pointer shadow-md hover:bg-[var(--af-bg3)] transition-colors" onClick={(e) => { e.stopPropagation(); setReplyingTo(m); }} title="Responder"><svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg></button>
                    {isMe && <button className="w-7 h-7 rounded-full bg-[var(--card)] border border-red-500/20 flex items-center justify-center cursor-pointer shadow-md hover:bg-red-500/10 transition-colors" onClick={(e) => { e.stopPropagation(); deleteMessage(m.id); }} title="Eliminar"><svg viewBox="0 0 24 24" className="w-3 h-3 stroke-red-400 fill-none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>}
                  </div>
                </div>
                {/* Reaction picker */}
                {reactionPickerMsg === m.id && (<div className={`flex gap-1 p-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl ${isMe ? 'self-end' : 'self-start'}`}>
                  {REACTION_EMOJIS.map(emoji => (<button key={emoji} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-none bg-transparent hover:bg-[var(--af-bg3)] transition-colors text-[16px]" onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }}>{emoji}</button>))}
                </div>)}
              </div>);
            });
          })()}
        </>)}
      </div>

      {/* Recording indicator */}
      {isRecording && (<div className="flex-shrink-0 px-4 py-2.5 border-t border-[var(--border)] bg-red-500/5 flex items-center gap-3"><div className="flex items-end gap-[3px]">{[recVolume * 28 + 4, recVolume * 22 + 6, recVolume * 32 + 3, recVolume * 18 + 5].map((h, i) => (<div key={i} className="w-[3px] bg-red-500 rounded-full animate-pulse" style={{ height: `${Math.max(h, 4)}px` }} />))}</div><span className="text-[13px] text-red-500 font-mono font-medium">{fmtRecTime(recDuration)}</span><button className="ml-auto text-[12px] px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent font-medium" onClick={cancelRecording}>Cancelar</button></div>)}

      {/* Audio preview */}
      {audioPreviewUrl && !isRecording && (<div className="flex-shrink-0 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--af-accent)]/5 flex items-center gap-3"><div className="text-[20px]">🎙️</div><div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-[var(--foreground)]">Nota de voz</div><div className="text-[11px] text-[var(--muted-foreground)]">{fmtRecTime(audioPreviewDuration)}</div></div><button className="text-[12px] px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent font-medium" onClick={() => { setAudioPreviewUrl(null); audioPreviewBlobRef.current = null; }}>Descartar</button><button className="text-[12px] px-4 py-1.5 rounded-full bg-[var(--af-accent)] text-[#1a1a1a] font-semibold cursor-pointer border-none" onClick={sendVoiceNote}>Enviar</button></div>)}

      {/* Pending files */}
      {pendingFiles.length > 0 && (<div className="flex-shrink-0 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--af-bg3)]"><div className="flex gap-2 overflow-x-auto pb-1">{pendingFiles.map(f => (<div key={f.id} className="flex-shrink-0 w-[72px] h-[72px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 relative overflow-hidden">{f.preview ? <img src={f.preview} className="w-full h-full object-cover rounded" alt="" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{fileIcon(f.type)}</div>}<button className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full text-[11px] flex items-center justify-center cursor-pointer border-none leading-none" onClick={() => removePendingFile(f.id)}>✕</button><div className="absolute bottom-0 inset-x-0 bg-black/50 text-[8px] text-white truncate px-0.5 py-px">{f.name}</div></div>))}</div></div>)}

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--card)]">
        <div className="flex gap-1.5 items-end px-2.5 py-2.5 safe-bottom">
          <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => handleFileSelect(e.target.files)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.dwg,.txt,.csv" />
          <button className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none bg-transparent hover:bg-[var(--af-bg3)] transition-colors flex-shrink-0" onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo"><svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-[var(--muted-foreground)] fill-none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49 0L2 12.05"/><circle cx="17" cy="5" r="3"/></svg></button>
          <input id="chat-input-field" className="flex-1 bg-[var(--af-bg3)] border border-[var(--border)] rounded-full px-4 py-2.5 text-[16px] text-[var(--foreground)] outline-none focus:border-[var(--input)] min-w-0" placeholder={chatTab === 'ai' ? 'Pregúntale a ArchiFlow IA...' : 'Escribe un mensaje...'} value={forms.chatInput || ''} onChange={e => setForms(p => ({ ...p, chatInput: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (chatTab === 'ai') { sendAIChat(); } else { sendAll(); } } }} />
          <button className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none flex-shrink-0 transition-all ${isRecording ? 'bg-red-500 animate-pulse' : audioPreviewUrl ? 'bg-[var(--af-accent)]' : 'bg-transparent hover:bg-[var(--af-bg3)]'}`} onClick={handleMicButton} title={isRecording ? 'Detener grabación' : audioPreviewUrl ? 'Descartar nota' : 'Grabar nota de voz'}>
            {isRecording ? (<div className="w-3 h-3 bg-white rounded-sm" />) : (<svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={audioPreviewUrl ? 'var(--background)' : 'none'} stroke={audioPreviewUrl ? 'none' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>)}
          </button>
          <button className="w-9 h-9 rounded-full bg-[var(--af-accent)] flex items-center justify-center cursor-pointer border-none flex-shrink-0 active:scale-95 transition-transform disabled:opacity-50" onClick={() => { if (chatTab === 'ai') { sendAIChat(); } else { sendAll(); } }} disabled={chatTab === 'ai' ? aiLoading || !(forms.chatInput?.trim()) : false} title="Enviar">
            {chatTab === 'ai' && aiLoading ? (<div className="w-4 h-4 border-2 border-[#1a1a1a]/30 border-t-[#1a1a1a] rounded-full animate-spin" />) : (<svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#1a1a1a] fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>)}
          </button>
        </div>
      </div>
    </div>
  </div>);
}
