'use client';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase, serverTimestamp, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import { confirm } from '@/hooks/useConfirmDialog';
import { expandMeetingForMonth } from '@/lib/recurrence';
import type { Meeting } from '@/lib/types';

/* ===== CALENDAR + MEETINGS CONTEXT ===== */
interface CalendarContextType {
  // Calendar UI state
  calMonth: number; setCalMonth: React.Dispatch<React.SetStateAction<number>>;
  calYear: number; setCalYear: React.Dispatch<React.SetStateAction<number>>;
  calSelectedDate: string | null; setCalSelectedDate: React.Dispatch<React.SetStateAction<string | null>>;
  calFilterProject: string; setCalFilterProject: React.Dispatch<React.SetStateAction<string>>;
  // Meetings collection
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  // Expanded meetings for the currently viewed month (includes recurring occurrences)
  expandedMeetings: Array<{ date: string; meeting: Meeting; isRecurring: boolean }>;
  // CRUD
  saveMeeting: () => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  openEditMeeting: (m: Meeting) => void;
}

const CalendarContext = createContext<CalendarContextType | null>(null);

export default function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms, setForms, openModal, closeModal, editingId, setEditingId } = useUIContext();
  const { ready, authUser } = useAuthContext();

  // ===== CALENDAR UI STATE =====
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);
  const [calFilterProject, setCalFilterProject] = useState<string>('all');

  // ===== MEETINGS COLLECTION =====
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // ===== EFFECTS =====

  // Load meetings
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('meetings').orderBy('date', 'asc').onSnapshot((snap: QuerySnapshot) => {
      setMeetings(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando meetings:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // ===== COMPUTED: Expanded meetings for current month =====
  const expandedMeetings = useMemo(() => {
    const results: Array<{ date: string; meeting: any; isRecurring: boolean }> = [];
    for (const m of meetings) {
      const expanded = expandMeetingForMonth(m as { id: string; data: Record<string, any> }, calYear, calMonth);
      results.push(...expanded.map(e => ({ date: e.date, meeting: e.meeting, isRecurring: e.isRecurring })));
    }
    return results;
  }, [meetings, calYear, calMonth]);

  // ===== CRUD FUNCTIONS =====

  const saveMeeting = async () => {
    const title = forms.meetTitle || '';
    if (!title) { showToast('El título es obligatorio', 'error'); return; }
    try {
      const db = getFirebase().firestore();
      const ts = serverTimestamp();
      const recurrence = forms.meetRecurrence || 'none';
      const recurrenceEnd = recurrence !== 'none' && forms.meetRecurrenceEnd ? forms.meetRecurrenceEnd : null;
      const data: Record<string, any> = {
        title,
        description: forms.meetDesc || '',
        projectId: forms.meetProject || '',
        date: forms.meetDate || '',
        time: forms.meetTime || '09:00',
        duration: Number(forms.meetDuration) || 60,
        attendees: forms.meetAttendees ? forms.meetAttendees.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        createdAt: ts,
        createdBy: authUser?.uid,
      };
      if (recurrence && recurrence !== 'none') {
        data.recurrence = recurrence;
      }
      if (recurrenceEnd) {
        data.recurrenceEnd = recurrenceEnd;
      }
      if (editingId) { await db.collection('meetings').doc(editingId).update(data); showToast('Reunión actualizada'); }
      else { await db.collection('meetings').add(data); showToast('Reunión creada'); }
      closeModal('meeting'); setEditingId(null); setForms(p => ({ ...p, meetTitle: '', meetProject: '', meetDate: '', meetTime: '09:00', meetDuration: '60', meetDesc: '', meetAttendees: '', meetRecurrence: 'none', meetRecurrenceEnd: '' }));
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error', 'error'); }
  };

  const deleteMeeting = async (id: string) => {
    if (!(await confirm({ title: 'Eliminar reunión', description: '¿Eliminar reunión?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try { await getFirebase().firestore().collection('meetings').doc(id).delete(); showToast('Reunión eliminada'); } catch (err) { console.error("[ArchiFlow]", err); }
  };

  const openEditMeeting = (m: any) => {
    setEditingId(m.id);
    setForms(f => ({
      ...f,
      meetTitle: m.data.title,
      meetProject: m.data.projectId || '',
      meetDate: m.data.date || '',
      meetTime: m.data.time || '09:00',
      meetDuration: String(m.data.duration || 60),
      meetDesc: m.data.description || '',
      meetAttendees: (m.data.attendees || []).join(', '),
      meetRecurrence: m.data.recurrence || 'none',
      meetRecurrenceEnd: m.data.recurrenceEnd || '',
    }));
    openModal('meeting');
  };

  // ===== PROVIDER =====

  const value: CalendarContextType = useMemo(() => ({
    calMonth, setCalMonth, calYear, setCalYear,
    calSelectedDate, setCalSelectedDate, calFilterProject, setCalFilterProject,
    meetings, setMeetings,
    expandedMeetings,
    saveMeeting, deleteMeeting, openEditMeeting,
  }), [calMonth, calYear, calSelectedDate, calFilterProject, meetings, expandedMeetings, saveMeeting, deleteMeeting, openEditMeeting]);

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendarContext() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendarContext must be used within CalendarProvider');
  return ctx;
}
