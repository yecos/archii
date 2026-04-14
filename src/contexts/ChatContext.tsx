'use client';
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase } from '@/lib/firebase-service';
import { fmtSize } from '@/lib/helpers';

/* ===== CHAT CONTEXT ===== */
interface ChatContextType {
  // State
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  chatProjectId: string | null;
  setChatProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  chatDmUser: string | null;
  setChatDmUser: React.Dispatch<React.SetStateAction<string | null>>;

  // Voice recording state
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingTask: boolean;
  setIsSavingTask: React.Dispatch<React.SetStateAction<boolean>>;
  recDuration: number;
  setRecDuration: React.Dispatch<React.SetStateAction<number>>;
  recVolume: number;
  setRecVolume: React.Dispatch<React.SetStateAction<number>>;
  audioPreviewUrl: string | null;
  setAudioPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  audioPreviewDuration: number;
  setAudioPreviewDuration: React.Dispatch<React.SetStateAction<number>>;
  pendingFiles: any[];
  setPendingFiles: React.Dispatch<React.SetStateAction<any[]>>;
  chatDropActive: boolean;
  setChatDropActive: React.Dispatch<React.SetStateAction<boolean>>;

  // Refs
  mediaRecRef: React.MutableRefObject<any>;
  audioChunksRef: React.MutableRefObject<any[]>;
  audioStreamRef: React.MutableRefObject<any>;
  analyserRef: React.MutableRefObject<any>;
  recTimerRef: React.MutableRefObject<any>;
  recAnimRef: React.MutableRefObject<any>;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  audioPreviewBlobRef: React.MutableRefObject<Blob | null>;
  playingAudioRef: React.MutableRefObject<string | null>;

  // Audio player state
  playingAudio: string | null;
  setPlayingAudio: React.Dispatch<React.SetStateAction<string | null>>;
  audioProgress: number;
  setAudioProgress: React.Dispatch<React.SetStateAction<number>>;
  audioCurrentTime: number;
  setAudioCurrentTime: React.Dispatch<React.SetStateAction<number>>;

  // Emoji, Reply, Reactions, Typing, Menu
  showEmojiPicker: boolean;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  chatReplyingTo: any;
  setChatReplyingTo: React.Dispatch<React.SetStateAction<any>>;
  messageReactions: Record<string, Record<string, string[]>>;
  setMessageReactions: React.Dispatch<React.SetStateAction<Record<string, Record<string, string[]>>>>;
  typingUsers: string[];
  setTypingUsers: React.Dispatch<React.SetStateAction<string[]>>;
  chatMenuMsg: string | null;
  setChatMenuMsg: React.Dispatch<React.SetStateAction<string | null>>;
  chatMsgSearch: string;
  setChatMsgSearch: React.Dispatch<React.SetStateAction<string>>;

  // Functions
  sendMessage: (textOverride?: string, audioData?: string, audioDur?: number, fileData?: any) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  handleMicButton: () => Promise<void>;
  sendVoiceNote: () => Promise<void>;
  handleFileSelect: (files: FileList | null) => void;
  removePendingFile: (id: string) => void;
  sendPendingFiles: () => Promise<void>;
  sendAll: () => Promise<void>;
  toggleReaction: (msgId: string, emoji: string) => Promise<void>;
  deleteMessage: (msgId: string) => Promise<void>;
  copyMessageText: (text: string) => void;
  toggleAudioPlay: (msgId: string) => void;

  // Helpers
  fmtRecTime: (s: number) => string;
  fileIcon: (type: string) => string;
  fmtFileSize: (bytes: number) => string;
}

const ChatContext = createContext<ChatContextType | null>(null);

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms, setForms } = useUIContext();
  const { ready, authUser } = useAuthContext();

  // State
  const [messages, setMessages] = useState<any[]>([]);
  const [chatProjectId, setChatProjectId] = useState<string | null>(null);
  const [chatDmUser, setChatDmUser] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [recVolume, setRecVolume] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioPreviewDuration, setAudioPreviewDuration] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [chatDropActive, setChatDropActive] = useState(false);

  // Refs
  const mediaRecRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const audioStreamRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const recTimerRef = useRef<any>(null);
  const recAnimRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewBlobRef = useRef<Blob | null>(null);
  const playingAudioRef = useRef<string | null>(null);

  // Audio player state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  // Emoji, Reply, Reactions, Typing, Menu
  const [showEmojiPicker, setShowEmojiPicker2] = useState(false);
  const [chatReplyingTo, setChatReplyingTo] = useState<any>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [chatMenuMsg, setChatMenuMsg] = useState<string | null>(null);
  const [chatMsgSearch, setChatMsgSearch] = useState('');

  // ===== EFFECTS =====

  // Load chat messages
  useEffect(() => {
    if (!ready || !chatProjectId) return;
    const db = getFirebase().firestore();
    let unsub: any;
    if (chatProjectId === '__general__') {
      unsub = db.collection('generalMessages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(snap => {
        setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }, () => {});
    } else if (chatProjectId === '__dm__' && chatDmUser && authUser) {
      const ids = [authUser.uid, chatDmUser].sort();
      const dmId = `dm_${ids[0]}_${ids[1]}`;
      unsub = db.collection('directMessages').doc(dmId).collection('messages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(snap => {
        setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }, () => {});
    } else {
      unsub = db.collection('projects').doc(chatProjectId).collection('messages').orderBy('createdAt', 'asc').limitToLast(60).onSnapshot(snap => {
        setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      }, () => {});
    }
    return () => { unsub(); setMessages([]); };
  }, [ready, chatProjectId, chatDmUser, authUser]);

  // Auto-scroll chat
  useEffect(() => {
    const el = document.getElementById('chat-msgs');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ===== FUNCTIONS =====

  const sendMessage = async (textOverride?: string, audioData?: string, audioDur?: number, fileData?: any) => {
    const text = textOverride || forms.chatInput || '';
    if (!text && !audioData && !fileData) return;
    if (!chatProjectId) return;
    try {
      const db = getFirebase().firestore();
      const msgData: any = { text, uid: authUser?.uid, userName: authUser?.displayName || authUser?.email.split('@')[0], createdAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp() };
      if (audioData) { msgData.audioData = audioData; msgData.audioDuration = audioDur || 0; msgData.type = 'AUDIO'; }
      if (fileData) { msgData.fileData = fileData.data; msgData.fileName = fileData.name; msgData.fileType = fileData.type; msgData.fileSize = fileData.size; msgData.type = fileData.type.startsWith('image/') ? 'IMAGE' : 'FILE'; }
      if (!msgData.type) msgData.type = 'TEXT';
      if (chatReplyingTo) { msgData.replyTo = { id: chatReplyingTo.id, text: chatReplyingTo.text, userName: chatReplyingTo.userName, uid: chatReplyingTo.uid }; }
      if (chatProjectId === '__general__') { await db.collection('generalMessages').add(msgData); }
      else if (chatProjectId === '__dm__' && chatDmUser && authUser) {
        const ids = [authUser.uid, chatDmUser].sort();
        const dmId = `dm_${ids[0]}_${ids[1]}`;
        msgData.recipientId = chatDmUser;
        await db.collection('directMessages').doc(dmId).collection('messages').add(msgData);
      }
      else { await db.collection('projects').doc(chatProjectId).collection('messages').add(msgData); }
      setForms(p => ({ ...p, chatInput: '' }));
      setChatReplyingTo(null);
    } catch { showToast('Error al enviar', 'error'); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e: any) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);
      mediaRecRef.current = recorder;
      setIsRecording(true);
      let sec = 0;
      recTimerRef.current = setInterval(() => setRecDuration(++sec), 1000);
      const monitorVol = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        setRecVolume(Math.min(Math.sqrt(sum / data.length) * 4, 1));
        recAnimRef.current = requestAnimationFrame(monitorVol);
      };
      monitorVol();
    } catch { showToast('No se pudo acceder al microfono', 'error'); }
  };

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecRef.current;
      if (!recorder) { resolve(null); return; }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioStreamRef.current?.getTracks().forEach((t: any) => t.stop());
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        if (recAnimRef.current) cancelAnimationFrame(recAnimRef.current);
        setIsRecording(false); setRecDuration(0); setRecVolume(0);
        resolve(blob);
      };
      recorder.stop();
    });
  };

  const cancelRecording = () => {
    mediaRecRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    if (recAnimRef.current) cancelAnimationFrame(recAnimRef.current);
    setIsRecording(false); setRecDuration(0); setRecVolume(0);
  };

  const handleMicButton = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setAudioPreviewUrl(url);
      setAudioPreviewDuration(recDuration);
      audioPreviewBlobRef.current = blob;
    } else if (audioPreviewUrl) {
      setAudioPreviewUrl(null); setAudioPreviewDuration(0);
      audioPreviewBlobRef.current = null;
    } else {
      await startRecording();
    }
  };

  const sendVoiceNote = async () => {
    if (!audioPreviewBlobRef.current) return;
    showToast('Enviando nota de voz...');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await sendMessage('', base64, audioPreviewDuration);
      setAudioPreviewUrl(null); setAudioPreviewDuration(0);
      audioPreviewBlobRef.current = null;
    };
    reader.readAsDataURL(audioPreviewBlobRef.current);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 25 * 1024 * 1024) { showToast(`${file.name} excede 25MB`, 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const newFile = { id: Date.now() + '-' + Math.random().toString(36).slice(2,6), name: file.name, type: file.type, size: file.size, data: reader.result as string, preview: file.type.startsWith('image/') ? reader.result as string : null };
        setPendingFiles(prev => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePendingFile = (id: string) => { setPendingFiles(prev => prev.filter(f => f.id !== id)); };

  const sendPendingFiles = async () => {
    for (const f of pendingFiles) {
      await sendMessage('', undefined, undefined, { name: f.name, type: f.type, size: f.size, data: f.data });
    }
    setPendingFiles([]);
  };

  const sendAll = async () => {
    setShowEmojiPicker2(false);
    if (audioPreviewBlobRef.current) { await sendVoiceNote(); return; }
    if (pendingFiles.length > 0) { await sendPendingFiles(); }
    if (forms.chatInput?.trim()) { await sendMessage(); }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!authUser) return;
    const uid = authUser.uid;
    setMessageReactions(prev => {
      const msgReactions = { ...prev[msgId] };
      const users = msgReactions[emoji] || [];
      if (users.includes(uid)) {
        msgReactions[emoji] = users.filter((u: string) => u !== uid);
        if (msgReactions[emoji].length === 0) delete msgReactions[emoji];
      } else {
        msgReactions[emoji] = [...users, uid];
      }
      return { ...prev, [msgId]: msgReactions };
    });
    try {
      const db = getFirebase().firestore();
      let collection: string;
      if (chatProjectId === '__general__') collection = 'generalMessages';
      else if (chatProjectId === '__dm__' && chatDmUser && authUser) {
        const ids = [authUser.uid, chatDmUser].sort();
        collection = `directMessages/dm_${ids[0]}_${ids[1]}/messages`;
      } else {
        collection = `projects/${chatProjectId}/messages`;
      }
      const reactionRef = db.collection(collection).doc(msgId).collection('reactions').doc(emoji);
      const snap = await reactionRef.get();
      if (snap.exists) {
        const data = snap.data();
        const users: string[] = data.users || [];
        if (users.includes(uid)) {
          if (users.length <= 1) await reactionRef.delete();
          else await reactionRef.update({ users: users.filter((u: string) => u !== uid) });
        } else {
          await reactionRef.update({ users: [...users, uid] });
        }
      } else {
        await reactionRef.set({ users: [uid] });
      }
    } catch (err) { console.error('[ArchiFlow] Reaction error:', err); }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      const db = getFirebase().firestore();
      let collection: string;
      if (chatProjectId === '__general__') collection = 'generalMessages';
      else if (chatProjectId === '__dm__' && chatDmUser && authUser) {
        const ids = [authUser.uid, chatDmUser].sort();
        collection = `directMessages/dm_${ids[0]}_${ids[1]}/messages`;
      } else {
        collection = `projects/${chatProjectId}/messages`;
      }
      await db.collection(collection).doc(msgId).delete();
      setChatMenuMsg(null);
      showToast('Mensaje eliminado');
    } catch { showToast('Error al eliminar', 'error'); }
  };

  const copyMessageText = (text: string) => {
    navigator.clipboard.writeText(text);
    setChatMenuMsg(null);
    showToast('Texto copiado');
  };

  const toggleAudioPlay = (msgId: string) => {
    const audioEl = document.getElementById('audio-' + msgId) as HTMLAudioElement;
    if (!audioEl) return;
    if (playingAudio === msgId) {
      audioEl.pause(); setPlayingAudio(null); setAudioProgress(0);
    } else {
      if (playingAudio) { const prev = document.getElementById('audio-' + playingAudio) as HTMLAudioElement; if (prev) prev.pause(); }
      audioEl.play(); setPlayingAudio(msgId);
      const onTime = () => { if (audioEl.duration) { setAudioProgress((audioEl.currentTime / audioEl.duration) * 100); setAudioCurrentTime(audioEl.currentTime); } };
      const onEnd = () => { setPlayingAudio(null); setAudioProgress(0); };
      audioEl.addEventListener('timeupdate', onTime);
      audioEl.addEventListener('ended', onEnd);
      audioEl.addEventListener('pause', onEnd);
    }
  };

  // Helpers
  const fmtRecTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`; };
  const fileIcon = (type: string) => { if (type.startsWith('image/')) return '🖼️'; if (type.includes('pdf')) return '📄'; if (type.startsWith('audio/')) return '🎵'; if (type.startsWith('video/')) return '🎬'; if (type.includes('word') || type.includes('document')) return '📝'; if (type.includes('sheet') || type.includes('excel')) return '📊'; if (type.includes('zip') || type.includes('rar')) return '📦'; return '📎'; };
  const fmtFileSize = fmtSize;

  const value: ChatContextType = {
    messages, setMessages, chatProjectId, setChatProjectId, chatDmUser, setChatDmUser,
    isRecording, setIsRecording, isSavingTask, setIsSavingTask,
    recDuration, setRecDuration, recVolume, setRecVolume,
    audioPreviewUrl, setAudioPreviewUrl, audioPreviewDuration, setAudioPreviewDuration,
    pendingFiles, setPendingFiles, chatDropActive, setChatDropActive,
    mediaRecRef, audioChunksRef, audioStreamRef, analyserRef, recTimerRef, recAnimRef, fileInputRef, audioPreviewBlobRef, playingAudioRef,
    playingAudio, setPlayingAudio, audioProgress, setAudioProgress, audioCurrentTime, setAudioCurrentTime,
    showEmojiPicker, setShowEmojiPicker: setShowEmojiPicker2,
    chatReplyingTo, setChatReplyingTo,
    messageReactions, setMessageReactions,
    typingUsers, setTypingUsers,
    chatMenuMsg, setChatMenuMsg,
    chatMsgSearch, setChatMsgSearch,
    sendMessage, startRecording, stopRecording, cancelRecording,
    handleMicButton, sendVoiceNote, handleFileSelect, removePendingFile,
    sendPendingFiles, sendAll, toggleReaction, deleteMessage, copyMessageText,
    toggleAudioPlay,
    fmtRecTime, fileIcon, fmtFileSize,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
