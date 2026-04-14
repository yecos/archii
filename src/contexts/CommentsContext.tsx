'use client';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase, serverTimestamp, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import type { Comment, DailyLog } from '@/lib/types';
import * as fbActions from '@/lib/firestore-actions';

/* ===== COMMENTS CONTEXT ===== */
interface CommentsContextType {
  // Collection state
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  dailyLogs: DailyLog[];
  setDailyLogs: React.Dispatch<React.SetStateAction<DailyLog[]>>;

  // Domain UI state — Comments
  commentText: string; setCommentText: React.Dispatch<React.SetStateAction<string>>;
  replyingTo: string | null; setReplyingTo: React.Dispatch<React.SetStateAction<string | null>>;

  // Domain UI state — Daily Logs
  dailyLogTab: string; setDailyLogTab: React.Dispatch<React.SetStateAction<string>>;
  selectedLogId: string | null; setSelectedLogId: React.Dispatch<React.SetStateAction<string | null>>;
  logForm: Record<string, any>; setLogForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;

  // CRUD Functions — Daily Logs
  saveDailyLog: () => Promise<void>;
  deleteDailyLog: (logId: string) => Promise<void>;
  openEditLog: (log: DailyLog) => void;
  resetLogForm: () => void;

  // CRUD Functions — Comments
  postComment: (taskId: string, projectId: string) => void;
}

const CommentsContext = createContext<CommentsContextType | null>(null);

export default function CommentsProvider({ children }: { children: React.ReactNode }) {
  const { showToast, selectedProjectId } = useUIContext();
  const { ready, authUser, teamUsers } = useAuthContext();

  // ===== COLLECTION STATE =====
  const [comments, setComments] = useState<Comment[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);

  // ===== DOMAIN UI STATE — Comments =====
  const [commentText, setCommentText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // ===== DOMAIN UI STATE — Daily Logs =====
  const [dailyLogTab, setDailyLogTab] = useState<string>('list');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState<Record<string, any>>({
    date: new Date().toISOString().split('T')[0], weather: '', temperature: '',
    activities: [''], laborCount: '', equipment: [''], materials: [''],
    observations: '', photos: [], supervisor: '',
  });

  // ===== EFFECTS =====

  // Load comments
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('comments').orderBy('createdAt', 'asc').limit(300).onSnapshot((snap: QuerySnapshot) => {
      setComments(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando comments:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Load daily logs
  useEffect(() => {
    if (!ready || !authUser || !selectedProjectId) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('projects').doc(selectedProjectId).collection('dailyLogs').orderBy('date', 'desc').limit(100).onSnapshot((snap: QuerySnapshot) => {
      setDailyLogs(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando dailyLogs:', err); });
    return () => { unsub(); setDailyLogs([]); };
  }, [ready, authUser, selectedProjectId]);

  // ===== CRUD FUNCTIONS =====

  // --- Daily Logs ---
  const saveDailyLog = async () => {
    if (!selectedProjectId) { showToast('Selecciona un proyecto', 'error'); return; }
    const lf = logForm;
    if (!lf.date) { showToast('La fecha es obligatoria', 'error'); return; }
    const db = getFirebase().firestore();
    const data: Record<string, any> = {
      projectId: selectedProjectId, date: lf.date, weather: lf.weather || '', temperature: Number(lf.temperature) || 0,
      activities: (lf.activities || ['']).filter((a: string) => a.trim()), laborCount: Number(lf.laborCount) || 0,
      equipment: (lf.equipment || ['']).filter((e: string) => e.trim()), materials: (lf.materials || ['']).filter((m: string) => m.trim()),
      observations: lf.observations || '', photos: lf.photos || [], supervisor: lf.supervisor || authUser?.displayName || authUser?.email?.split('@')[0] || '',
      createdBy: authUser?.uid, updatedAt: serverTimestamp(),
    };
    try {
      if (selectedLogId) { await db.collection('projects').doc(selectedProjectId).collection('dailyLogs').doc(selectedLogId).update(data); showToast('Bitácora actualizada'); }
      else { data.createdAt = serverTimestamp(); await db.collection('projects').doc(selectedProjectId).collection('dailyLogs').add(data); showToast('Bitácora creada'); }
      setDailyLogTab('list'); setSelectedLogId(null); resetLogForm();
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al guardar', 'error'); }
  };

  const deleteDailyLog = async (logId: string) => {
    if (!selectedProjectId) return;
    try { await getFirebase().firestore().collection('projects').doc(selectedProjectId).collection('dailyLogs').doc(logId).delete(); showToast('Bitácora eliminada'); if (selectedLogId === logId) { setDailyLogTab('list'); setSelectedLogId(null); } }
    catch (err) { console.error('[ArchiFlow] Comments: delete daily log failed:', err); showToast('Error al eliminar', 'error'); }
  };

  const openEditLog = (log: any) => {
    setSelectedLogId(log.id);
    setLogForm({ date: log.data.date || '', weather: log.data.weather || '', temperature: log.data.temperature || '', activities: log.data.activities?.length > 0 ? log.data.activities : [''], laborCount: log.data.laborCount || '', equipment: log.data.equipment?.length > 0 ? log.data.equipment : [''], materials: log.data.materials?.length > 0 ? log.data.materials : [''], observations: log.data.observations || '', photos: log.data.photos || [], supervisor: log.data.supervisor || '' });
    setDailyLogTab('create');
  };

  const resetLogForm = () => {
    setLogForm({ date: new Date().toISOString().split('T')[0], weather: '', temperature: '', activities: [''], laborCount: '', equipment: [''], materials: [''], observations: '', photos: [], supervisor: '' });
  };

  // --- Comments ---
  const postComment = (taskId: string, projectId: string) => {
    if (!commentText.trim()) return;
    const mentions: string[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(commentText)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = teamUsers.find(u => u.data.name.toLowerCase().includes(mentionedName.toLowerCase()));
      if (mentionedUser) mentions.push(mentionedUser.id);
    }
    fbActions.saveComment({ taskId, projectId, text: commentText.trim(), mentions, parentId: replyingTo }, showToast, authUser);
    setCommentText('');
    setReplyingTo(null);
  };

  // ===== PROVIDER =====

  const value: CommentsContextType = useMemo(() => ({
    comments, setComments, dailyLogs, setDailyLogs,
    commentText, setCommentText, replyingTo, setReplyingTo,
    dailyLogTab, setDailyLogTab, selectedLogId, setSelectedLogId, logForm, setLogForm,
    saveDailyLog, deleteDailyLog, openEditLog, resetLogForm,
    postComment,
  }), [comments, dailyLogs, commentText, replyingTo, dailyLogTab, selectedLogId, logForm, saveDailyLog, deleteDailyLog, openEditLog, resetLogForm, postComment]);

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
}

export function useCommentsContext() {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error('useCommentsContext must be used within CommentsProvider');
  return ctx;
}
