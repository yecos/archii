'use client';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useUIContext } from './UIContext';
import { useAuthContext } from './AuthContext';
import { getFirebase } from '@/lib/firebase-service';
import * as fbActions from '@/lib/firestore-actions';

/* ===== TIME TRACKING CONTEXT ===== */
interface TimeTrackingContextType {
  // Collection state
  timeEntries: any[];
  setTimeEntries: React.Dispatch<React.SetStateAction<any[]>>;

  // Domain UI state
  timeTab: string; setTimeTab: React.Dispatch<React.SetStateAction<string>>;
  timeFilterProject: string; setTimeFilterProject: React.Dispatch<React.SetStateAction<string>>;
  timeFilterDate: string; setTimeFilterDate: React.Dispatch<React.SetStateAction<string>>;
  timeSession: any; setTimeSession: React.Dispatch<React.SetStateAction<any>>;
  timeTimerMs: number; setTimeTimerMs: React.Dispatch<React.SetStateAction<number>>;

  // CRUD Functions
  startTimeTracking: () => void;
  stopTimeTracking: () => Promise<void>;
  saveManualTimeEntry: () => void;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | null>(null);

export default function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const { forms, closeModal, editingId, showToast } = useUIContext();
  const { ready, authUser } = useAuthContext();

  // ===== COLLECTION STATE =====
  const [timeEntries, setTimeEntries] = useState<any[]>([]);

  // ===== DOMAIN UI STATE =====
  const [timeTab, setTimeTab] = useState<string>('tracker');
  const [timeFilterProject, setTimeFilterProject] = useState<string>('all');
  const [timeFilterDate, setTimeFilterDate] = useState<string>('');
  const [timeSession, setTimeSession] = useState<{ entryId: string | null; startTime: number | null; description: string; projectId: string; phaseName: string; isRunning: boolean }>({ entryId: null, startTime: null, description: '', projectId: '', phaseName: '', isRunning: false });
  const [timeTimerMs, setTimeTimerMs] = useState<number>(0);

  // ===== EFFECTS =====

  // Load time entries
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('timeEntries').orderBy('createdAt', 'desc').limit(200).onSnapshot((snap: any) => {
      setTimeEntries(snap.docs.map((d: any) => ({ id: d.id, data: d.data() || {} })));
    }, (err: any) => { console.error('[ArchiFlow] Error escuchando timeEntries:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // Time tracker: live timer update
  useEffect(() => {
    if (!timeSession.isRunning || !timeSession.startTime) return;
    const interval = setInterval(() => {
      setTimeTimerMs(Date.now() - timeSession.startTime!);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeSession.isRunning, timeSession.startTime]);

  // ===== CRUD FUNCTIONS =====

  const startTimeTracking = () => {
    if (timeSession.isRunning) return;
    const desc = forms.teDescription || forms.teQuickDesc || 'Trabajo en proyecto';
    const projId = forms.teProject || '';
    const phase = forms.tePhase || '';
    if (!projId) { showToast('Selecciona un proyecto', 'error'); return; }
    setTimeSession({ entryId: null, startTime: Date.now(), description: desc, projectId: projId, phaseName: phase, isRunning: true });
    setTimeTimerMs(0);
  };

  const stopTimeTracking = async () => {
    if (!timeSession.isRunning || !timeSession.startTime) return;
    const endTime = new Date();
    const startTime = new Date(timeSession.startTime);
    const durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    if (durationMin < 1) { showToast('Mínimo 1 minuto', 'error'); return; }
    const dateStr = startTime.toISOString().split('T')[0];
    const startStr = startTime.toTimeString().substring(0, 5);
    const endStr = endTime.toTimeString().substring(0, 5);
    await fbActions.saveTimeEntry({ teProject: timeSession.projectId, tePhase: timeSession.phaseName, teDescription: timeSession.description, teStartTime: startStr, teEndTime: endStr, teDuration: durationMin, teBillable: true, teRate: Number(forms.teRate) || 50000, teDate: dateStr }, null, showToast, authUser);
    setTimeSession({ entryId: null, startTime: null, description: '', projectId: '', phaseName: '', isRunning: false });
    setTimeTimerMs(0);
  };

  const saveManualTimeEntry = () => {
    const dur = Number(forms.teManualDuration) || 0;
    if (dur < 1) { showToast('Mínimo 1 minuto', 'error'); return; }
    if (!forms.teProject) { showToast('Selecciona un proyecto', 'error'); return; }
    fbActions.saveTimeEntry({ teProject: forms.teProject, tePhase: forms.tePhase || '', teDescription: forms.teDescription || '', teStartTime: forms.teStartTime || '08:00', teEndTime: forms.teEndTime || '17:00', teDuration: dur, teBillable: forms.teBillable !== false, teRate: Number(forms.teRate) || 50000, teDate: forms.teDate || new Date().toISOString().split('T')[0] }, editingId, showToast, authUser);
    closeModal('timeEntry');
  };

  // ===== PROVIDER =====

  const value: TimeTrackingContextType = useMemo(() => ({
    timeEntries, setTimeEntries,
    timeTab, setTimeTab, timeFilterProject, setTimeFilterProject,
    timeFilterDate, setTimeFilterDate, timeSession, setTimeSession, timeTimerMs, setTimeTimerMs,
    startTimeTracking, stopTimeTracking, saveManualTimeEntry,
  }), [timeEntries, timeTab, timeFilterProject, timeFilterDate, timeSession, timeTimerMs, startTimeTracking, stopTimeTracking, saveManualTimeEntry]);

  return <TimeTrackingContext.Provider value={value}>{children}</TimeTrackingContext.Provider>;
}

export function useTimeTrackingContext() {
  const ctx = useContext(TimeTrackingContext);
  if (!ctx) throw new Error('useTimeTrackingContext must be used within TimeTrackingProvider');
  return ctx;
}
