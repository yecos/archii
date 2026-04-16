'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useChat } from '@/hooks/useDomain';
import type { ChatMessage, FirestoreTimestamp } from '@/lib/types';
import { formatDateLabel, EMOJI_CATEGORIES, QUICK_REACTIONS, searchEmojis } from '@/components/features/chat/chat-helpers';
import ChatSidebar from '@/components/features/chat/ChatSidebar';
import MessageList from '@/components/features/chat/MessageList';

export default function ChatScreen() {
  const { forms, setForms, showToast, chatMobileShow, setChatMobileShow } = useUI();
  const { authUser, teamUsers } = useAuth();
  const { projects } = useFirestore();
  const {
    audioPreviewBlobRef, audioPreviewDuration, audioPreviewUrl, audioProgress,
    chatDmUser, chatDropActive, chatProjectId, fileIcon,
    fileInputRef, handleFileSelect, handleMicButton, isRecording,
    messages, pendingFiles, playingAudio,
    recDuration, recVolume, removePendingFile, sendAll, setAudioPreviewDuration, setAudioPreviewUrl,
    setChatDmUser, setChatDropActive, setChatProjectId,
    setShowEmojiPicker, showEmojiPicker, stopRecording, toggleAudioPlay,
    chatReplyingTo, setChatReplyingTo,
    messageReactions, toggleReaction,
    chatMenuMsg, setChatMenuMsg,
    chatMsgSearch, setChatMsgSearch,
    deleteMessage, copyMessageText,
  } = useChat();

  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeEmojiCat, setActiveEmojiCat] = useState('Frecuentes');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(QUICK_REACTIONS.slice(0, 8));
  const [lightboxImg, setLightboxImg] = useState<{ src: string; name?: string; size?: number } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Close menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setChatMenuMsg(null);
        setShowReactionPicker(null);
      }
    };
    if (chatMenuMsg || showReactionPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [chatMenuMsg, showReactionPicker]);

  // Filter emojis by search (uses keyword mapping for Spanish & English)
  const filteredEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return null;
    return searchEmojis(emojiSearch);
  }, [emojiSearch]);

  // Track recent emoji usage
  const addRecentEmoji = (emoji: string) => {
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      return [emoji, ...filtered].slice(0, 15);
    });
  };

  const insertEmoji = (emoji: string) => {
    addRecentEmoji(emoji);
    setForms(p => ({ ...p, chatInput: (p.chatInput || '') + emoji }));
    document.getElementById('chat-input-field')?.focus();
  };

  // Filter messages by search
  const filteredMessages = useMemo(() => {
    if (!chatMsgSearch.trim()) return messages;
    const q = chatMsgSearch.toLowerCase();
    return messages.filter(m => {
      const text = (m.text || '').toLowerCase();
      const name = (m.userName || '').toLowerCase();
      return text.includes(q) || name.includes(q);
    });
  }, [messages, chatMsgSearch]);

  // Group messages by date
  const messagesByDate = useMemo(() => {
    const groups: { date: Date; dateLabel: string; messages: ChatMessage[] }[] = [];
    let currentGroup: { date: Date; dateLabel: string; messages: ChatMessage[] } | null = null;

    for (const m of filteredMessages) {
      const ts = (m.createdAt as FirestoreTimestamp)?.toDate?.() || new Date();
      const label = formatDateLabel(ts);
      if (!currentGroup || currentGroup.dateLabel !== label) {
        currentGroup = { date: ts, dateLabel: label, messages: [m] };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(m);
      }
    }
    return groups;
  }, [filteredMessages]);

  // Conversation title/subtitle
  const convTitle = chatProjectId === '__general__' ? '💬 Chat General' : chatProjectId === '__dm__' ? (() => { const u = teamUsers.find(x => x.id === chatDmUser); return (u?.data.name || u?.data.email || 'Chat directo'); })() : projects.find(p => p.id === chatProjectId)?.data.name || 'Selecciona un proyecto';
  const convSubtitle = chatProjectId === '__general__' ? 'Canal de todo el equipo' : chatProjectId === '__dm__' ? (() => { const u = teamUsers.find(x => x.id === chatDmUser); return u?.data.role || 'Colaborador'; })() : chatProjectId ? 'Canal del equipo' : '';

  // Sidebar handler
  const handleSelectGeneral = () => {
    setChatProjectId('__general__');
    setChatDmUser(null);
    setChatMobileShow(true);
    setShowEmojiPicker(false);
  };

  const handleSelectDm = (userId: string) => {
    setChatProjectId('__dm__');
    setChatDmUser(userId);
    setChatMobileShow(true);
    setShowEmojiPicker(false);
  };

  const handleSelectProject = (projectId: string) => {
    setChatProjectId(projectId);
    setChatDmUser(null);
    setChatMobileShow(true);
    setShowEmojiPicker(false);
  };

  return (
    <div className="animate-fadeIn flex flex-col md:h-full pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0" style={{ minHeight: 0, flex: 1 }}>

      {/* ===== SIDEBAR ===== */}
      <ChatSidebar
        chatMobileShow={chatMobileShow}
        chatSearch={forms.chatSearch || ''}
        onChatSearchChange={(value: string) => setForms(p => ({ ...p, chatSearch: value }))}
        chatProjectId={chatProjectId}
        chatDmUser={chatDmUser}
        authUserUid={authUser?.uid}
        teamUsers={teamUsers}
        projects={projects}
        onSelectGeneral={handleSelectGeneral}
        onSelectDm={handleSelectDm}
        onSelectProject={handleSelectProject}
      />

      {/* ===== MESSAGE AREA ===== */}
      <MessageList
        chatMobileShow={chatMobileShow}
        setChatMobileShow={setChatMobileShow}
        setShowEmojiPicker={setShowEmojiPicker}
        convTitle={convTitle}
        convSubtitle={convSubtitle}
        chatMsgSearch={chatMsgSearch}
        setChatMsgSearch={setChatMsgSearch}
        filteredMessages={filteredMessages}
        messagesByDate={messagesByDate}
        chatDropActive={chatDropActive}
        setChatDropActive={setChatDropActive}
        handleFileSelect={(files: FileList | File[] | null) => { if (files) handleFileSelect(files as FileList); }}
        chatProjectId={chatProjectId}
        authUserUid={authUser?.uid}
        playingAudio={playingAudio}
        audioProgress={audioProgress}
        fileIcon={fileIcon}
        messageReactions={messageReactions}
        chatMenuMsg={chatMenuMsg}
        showReactionPicker={showReactionPicker}
        menuRef={menuRef}
        msgsEndRef={msgsEndRef}
        lightboxImg={lightboxImg}
        setLightboxImg={setLightboxImg}
        onToggleAudioPlay={toggleAudioPlay}
        onSetChatMenuMsg={setChatMenuMsg}
        onSetShowReactionPicker={setShowReactionPicker}
        onSetChatReplyingTo={setChatReplyingTo}
        onDeleteMessage={deleteMessage}
        onCopyMessageText={copyMessageText}
        onToggleReaction={toggleReaction}
        isRecording={isRecording}
        recDuration={recDuration}
        recVolume={recVolume}
        stopRecording={stopRecording}
        audioPreviewUrl={audioPreviewUrl}
        audioPreviewBlobRef={audioPreviewBlobRef}
        audioPreviewDuration={audioPreviewDuration}
        setAudioPreviewUrl={setAudioPreviewUrl}
        setAudioPreviewDuration={setAudioPreviewDuration}
        pendingFiles={pendingFiles}
        removePendingFile={removePendingFile}
        showEmojiPicker={showEmojiPicker}
        emojiSearch={emojiSearch}
        setEmojiSearch={setEmojiSearch}
        activeEmojiCat={activeEmojiCat}
        setActiveEmojiCat={setActiveEmojiCat}
        recentEmojis={recentEmojis}
        filteredEmojis={filteredEmojis}
        insertEmoji={insertEmoji}
        chatReplyingTo={chatReplyingTo}
        setChatReplyingTo={setChatReplyingTo}
        formsChatInput={forms.chatInput || ''}
        setForms={setForms}
        fileInputRef={fileInputRef}
        handleMicButton={handleMicButton}
        sendAll={sendAll}
      />
    </div>
  );
}
