'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuthContext } from './AuthContext';
import { useUIContext } from './UIContext';
import {
  PresenceService,
  subscribeToOnlineUsers,
  type OnlineUserDoc,
  type PresenceData,
} from '@/lib/presence-service';

/* ===== PRESENCE CONTEXT ===== */
interface PresenceContextType {
  /** All users currently online */
  onlineUsers: OnlineUserDoc[];
  /** Current user's presence data (null if not set yet) */
  userPresence: PresenceData | null;
  /** Users viewing the same screen (excluding self) */
  usersOnSameScreen: OnlineUserDoc[];
  /** Users viewing the same project (excluding self) */
  usersOnSameProject: OnlineUserDoc[];
  /** Total online count */
  onlineCount: number;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export default function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { authUser, teamUsers } = useAuthContext();
  const { screen, selectedProjectId } = useUIContext();

  // State
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserDoc[]>([]);
  const serviceRef = useRef<PresenceService | null>(null);

  // Stable references for presence updates
  const screenRef = useRef(screen);
  const projectIdRef = useRef(selectedProjectId);
  screenRef.current = screen;
  projectIdRef.current = selectedProjectId;

  // Get user info from teamUsers (more up-to-date than authUser)
  const currentUserName = useMemo(() => {
    if (!authUser) return '';
    const teamUser = teamUsers.find(u => u.id === authUser.uid);
    return teamUser?.data?.name || authUser.displayName || authUser.email?.split('@')[0] || '';
  }, [authUser, teamUsers]);

  const currentUserPhoto = useMemo(() => {
    if (!authUser) return '';
    const teamUser = teamUsers.find(u => u.id === authUser.uid);
    return teamUser?.data?.photoURL || authUser.photoURL || '';
  }, [authUser, teamUsers]);

  // Initialize presence when authenticated
  useEffect(() => {
    if (!authUser) {
      // Clean up if user logs out
      if (serviceRef.current) {
        serviceRef.current.disconnect();
        serviceRef.current = null;
      }
      setOnlineUsers([]);
      return;
    }

    const service = new PresenceService(authUser.uid, currentUserName, currentUserPhoto);
    serviceRef.current = service;

    // Initialize presence
    service.init(screenRef.current, projectIdRef.current).catch(err => {
      console.warn('[ArchiFlow] Presence init error:', err);
    });

    // Subscribe to online users
    const unsubUsers = subscribeToOnlineUsers((users) => {
      setOnlineUsers(users);
    });

    return () => {
      service.disconnect();
      serviceRef.current = null;
      unsubUsers();
    };
  }, [authUser?.uid]); // Only re-create when auth user ID changes

  // Update presence when screen/project changes
  useEffect(() => {
    if (serviceRef.current && authUser) {
      serviceRef.current.updatePresence(screen, selectedProjectId).catch(err => {
        console.warn('[ArchiFlow] Presence update error:', err);
      });
    }
  }, [screen, selectedProjectId, authUser]);

  // Computed values
  const userPresence = useMemo<PresenceData | null>(() => {
    if (!authUser) return null;
    const me = onlineUsers.find(u => u.id === authUser.uid);
    return me?.data || null;
  }, [onlineUsers, authUser]);

  const usersOnSameScreen = useMemo(() => {
    if (!authUser) return [];
    return onlineUsers.filter(u =>
      u.id !== authUser.uid &&
      u.data.currentScreen === screen &&
      u.data.online
    );
  }, [onlineUsers, authUser, screen]);

  const usersOnSameProject = useMemo(() => {
    if (!authUser || !selectedProjectId) return [];
    return onlineUsers.filter(u =>
      u.id !== authUser.uid &&
      u.data.currentProjectId === selectedProjectId &&
      u.data.online
    );
  }, [onlineUsers, authUser, selectedProjectId]);

  const onlineCount = useMemo(() => onlineUsers.length, [onlineUsers]);

  const value: PresenceContextType = useMemo(() => ({
    onlineUsers,
    userPresence,
    usersOnSameScreen,
    usersOnSameProject,
    onlineCount,
  }), [onlineUsers, userPresence, usersOnSameScreen, usersOnSameProject, onlineCount]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresenceContext() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresenceContext must be used within PresenceProvider');
  return ctx;
}
