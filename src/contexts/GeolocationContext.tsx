'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuthContext } from './AuthContext';
import { useUIContext } from './UIContext';
import { useFirestoreContext } from './FirestoreContext';
import { getDb, getFirebase } from '@/lib/firebase-service';
import {
  getCurrentPosition,
  watchPosition,
  clearWatchPosition,
  reverseGeocode,
  calculateDistance,
  isWithinGeofence,
  type GeoPosition,
  type GeoFence,
  type LocationHistoryEntry,
} from '@/lib/geolocation-service';

/* ===== TYPES ===== */

interface TeamMemberLocation {
  uid: string;
  userName: string;
  userPhoto?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  timestamp: number;
}

interface GeofenceAlert {
  fenceName: string;
  fenceId: string;
  type: 'enter' | 'exit';
  timestamp: number;
}

/* ===== CONTEXT ===== */

interface GeolocationContextType {
  currentPosition: GeoPosition | null;
  currentAddress: string;
  isTracking: boolean;
  locationError: string | null;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unavailable';
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestPermission: () => Promise<void>;
  refreshPosition: () => Promise<void>;
  teamLocations: TeamMemberLocation[];
  locationHistory: LocationHistoryEntry[];
  loadHistory: (limit?: number) => Promise<void>;
  projectGeofences: GeoFence[];
  geofenceAlerts: GeofenceAlert[];
  trackingEnabled: boolean;
  setTrackingEnabled: (enabled: boolean) => void;
}

const GeolocationContext = createContext<GeolocationContextType | null>(null);

const TRACK_INTERVAL_MS = 5 * 60 * 1000;
const HISTORY_KEY = 'archiflow-geo-tracking';

export default function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const { authUser, teamUsers } = useAuthContext();
  const { showToast } = useUIContext();
  const { projects } = useFirestoreContext();

  const [currentPosition, setCurrentPosition] = useState<GeoPosition | null>(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');
  const [teamLocations, setTeamLocations] = useState<TeamMemberLocation[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>([]);
  const [geofenceAlerts, setGeofenceAlerts] = useState<GeofenceAlert[]>([]);
  const [trackingEnabled, setTrackingEnabledState] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(HISTORY_KEY) === 'true';
  });

  const watchIdRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<number>(0);
  const lastFencesRef = useRef<Set<string>>(new Set());
  const authUserRef = useRef(authUser);
  authUserRef.current = authUser;
  const teamUsersRef = useRef(teamUsers);
  teamUsersRef.current = teamUsers;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Project geofences (default 500m radius for each project)
  const projectGeofences = useMemo<GeoFence[]>(() => {
    return projects
      .filter(p => p.data?.location && p.data.location.includes(','))
      .map(p => {
        const loc = p.data.location || '';
        const parts = loc.split(',').map(s => parseFloat(s.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const fence: GeoFence = {
            id: p.id,
            name: p.data.name || 'Proyecto',
            latitude: parts[0],
            longitude: parts[1],
            radiusMeters: 500,
          };
          if (p.data.color) fence.color = p.data.color;
          return fence;
        }
        return null;
      })
      .filter((f): f is GeoFence => f !== null);
  }, [projects]);

  const setTrackingEnabled = useCallback((enabled: boolean) => {
    setTrackingEnabledState(enabled);
    localStorage.setItem(HISTORY_KEY, enabled ? 'true' : 'false');
  }, []);

  // Save location to Firestore
  const saveLocationToFirestore = useCallback(async (pos: GeoPosition, address: string) => {
    const user = authUserRef.current;
    if (!user) return;

    try {
      const db = getDb();
      const historyRef = db.collection('users').doc(user.uid).collection('locationHistory');

      await historyRef.add({
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        altitude: pos.altitude,
        heading: pos.heading,
        speed: pos.speed,
        address,
        timestamp: pos.timestamp,
        uid: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || '',
      });

      // Update latest location on user doc
      await db.collection('users').doc(user.uid).update({
        lastLocation: {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          address,
          timestamp: pos.timestamp,
        },
        locationTrackingEnabled: true,
      });

      lastSavedRef.current = Date.now();
    } catch (err) {
      console.warn('[ArchiFlow] Failed to save location:', err);
    }
  }, []);

  // Check geofence crossings
  const checkGeofences = useCallback((pos: GeoPosition) => {
    if (projectGeofences.length === 0) return;

    const newFences = new Set<string>();
    const newAlerts: GeofenceAlert[] = [];

    for (const fence of projectGeofences) {
      const inside = isWithinGeofence(pos.latitude, pos.longitude, fence.latitude, fence.longitude, fence.radiusMeters);
      const key = fence.id;

      if (inside) {
        newFences.add(key);
        if (!lastFencesRef.current.has(key)) {
          newAlerts.push({
            fenceName: fence.name,
            fenceId: fence.id,
            type: 'enter',
            timestamp: pos.timestamp,
          });
        }
      } else if (lastFencesRef.current.has(key)) {
        newAlerts.push({
          fenceName: fence.name,
          fenceId: fence.id,
          type: 'exit',
          timestamp: pos.timestamp,
        });
      }
    }

    lastFencesRef.current = newFences;

    if (newAlerts.length > 0) {
      setGeofenceAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
      for (const alert of newAlerts) {
        const emoji = alert.type === 'enter' ? '📍' : '🚪';
        const action = alert.type === 'enter' ? 'Entraste a' : 'Saliste de';
        showToastRef.current(`${emoji} ${action} ${alert.fenceName}`);
      }
    }
  }, [projectGeofences]);

  // Handle position update
  const handlePositionUpdate = useCallback(async (pos: GeoPosition) => {
    setCurrentPosition(pos);
    setLocationError(null);

    const timeSinceLastSave = Date.now() - lastSavedRef.current;
    if (timeSinceLastSave < TRACK_INTERVAL_MS) {
      checkGeofences(pos);
      return;
    }

    reverseGeocode(pos.latitude, pos.longitude).then(address => {
      setCurrentAddress(address || 'Ubicación desconocida');
      saveLocationToFirestore(pos, address || 'Ubicación desconocida');
    }).catch(() => {
      setCurrentAddress('Ubicación desconocida');
      saveLocationToFirestore(pos, 'Ubicación desconocida');
    });

    checkGeofences(pos);
  }, [saveLocationToFirestore, checkGeofences]);

  const startTracking = useCallback(async () => {
    if (!authUser) return;

    try {
      const pos = await getCurrentPosition();
      await handlePositionUpdate(pos);
      setIsTracking(true);
      setLocationError(null);
      setPermissionState('granted');

      if (watchIdRef.current !== 0) {
        clearWatchPosition(watchIdRef.current);
      }
      watchIdRef.current = watchPosition(
        handlePositionUpdate,
        (err) => {
          setLocationError(err.message);
          if (err.message.includes('denegado') || err.message.includes('denied')) {
            setPermissionState('denied');
            setIsTracking(false);
          }
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        getCurrentPosition().then(handlePositionUpdate).catch(() => {});
      }, TRACK_INTERVAL_MS);

    } catch (err) {
      const error = err as Error;
      setLocationError(error.message);
      if (error.message.includes('denegado') || error.message.includes('denied')) {
        setPermissionState('denied');
      }
      setIsTracking(false);
    }
  }, [authUser, handlePositionUpdate]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== 0) {
      clearWatchPosition(watchIdRef.current);
      watchIdRef.current = 0;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);

    try {
      const user = authUserRef.current;
      if (!user) return;
      getDb().collection('users').doc(user.uid).update({
        locationTrackingEnabled: false,
      }).catch(() => {});
    } catch { /* ignore */ }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      await getCurrentPosition({ timeout: 5000 });
      setPermissionState('granted');
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('denegado') || error.message.includes('denied')) {
        setPermissionState('denied');
      }
    }
  }, []);

  const refreshPosition = useCallback(async () => {
    try {
      const pos = await getCurrentPosition();
      setCurrentPosition(pos);
      setLocationError(null);

      const address = await reverseGeocode(pos.latitude, pos.longitude);
      setCurrentAddress(address || 'Ubicación desconocida');
    } catch (err) {
      const error = err as Error;
      setLocationError(error.message);
    }
  }, []);

  // Load location history from Firestore
  const loadHistory = useCallback(async (limit = 50) => {
    const user = authUserRef.current;
    if (!user) return;

    try {
      const db = getDb();
      const snap = await db
        .collection('users').doc(user.uid).collection('locationHistory')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const entries: LocationHistoryEntry[] = snap.docs.map(doc => {
        const d = doc.data() as Record<string, unknown>;
        let ts = 0;
        if (d.timestamp) {
          if (typeof d.timestamp === 'object' && d.timestamp !== null && 'seconds' in d.timestamp) {
            ts = (d.timestamp as { seconds: number }).seconds * 1000;
          } else if (typeof d.timestamp === 'number') {
            ts = d.timestamp;
          }
        }
        return {
          id: doc.id,
          uid: String(d.uid || user.uid),
          userName: String(d.userName || ''),
          latitude: Number(d.latitude) || 0,
          longitude: Number(d.longitude) || 0,
          accuracy: Number(d.accuracy) || 0,
          address: String(d.address || ''),
          timestamp: ts,
          heading: d.heading != null ? Number(d.heading) : null,
          speed: d.speed != null ? Number(d.speed) : null,
        };
      });

      setLocationHistory(entries);
    } catch (err) {
      console.warn('[ArchiFlow] Failed to load location history:', err);
    }
  }, []);

  // Subscribe to team member locations
  useEffect(() => {
    if (!authUser) return;

    try {
      const db = getDb();
      const unsub = db.collection('users').onSnapshot((snap) => {
        const locations: TeamMemberLocation[] = [];
        snap.docs.forEach(doc => {
          const d = doc.data() as Record<string, unknown>;
          const lastLoc = d.lastLocation as Record<string, unknown> | undefined;
          if (lastLoc && doc.id !== authUser.uid) {
            let ts = 0;
            if (lastLoc.timestamp) {
              if (typeof lastLoc.timestamp === 'object' && lastLoc.timestamp !== null && 'seconds' in lastLoc.timestamp) {
                ts = (lastLoc.timestamp as { seconds: number }).seconds * 1000;
              } else if (typeof lastLoc.timestamp === 'number') {
                ts = lastLoc.timestamp;
              }
            }
            locations.push({
              uid: doc.id,
              userName: String((d.name as string) || (d.email as string)?.split('@')[0] || doc.id),
              userPhoto: (d.photoURL as string) || undefined,
              latitude: Number(lastLoc.latitude) || 0,
              longitude: Number(lastLoc.longitude) || 0,
              accuracy: Number(lastLoc.accuracy) || 0,
              address: String(lastLoc.address || ''),
              timestamp: ts,
            });
          }
        });
        setTeamLocations(locations);
      });

      return () => unsub();
    } catch {
      // ignore
    }
  }, [authUser?.uid]);

  // Auto-start tracking when trackingEnabled and user is authenticated
  useEffect(() => {
    if (trackingEnabled && authUser && !isTracking) {
      startTracking().catch(() => {});
    }
    if (!trackingEnabled && isTracking) {
      stopTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingEnabled, authUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== 0) {
        clearWatchPosition(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const value = useMemo<GeolocationContextType>(() => ({
    currentPosition,
    currentAddress,
    isTracking,
    locationError,
    permissionState,
    startTracking,
    stopTracking,
    requestPermission,
    refreshPosition,
    teamLocations,
    locationHistory,
    loadHistory,
    projectGeofences,
    geofenceAlerts,
    trackingEnabled,
    setTrackingEnabled,
  }), [
    currentPosition, currentAddress, isTracking, locationError, permissionState,
    startTracking, stopTracking, requestPermission, refreshPosition,
    teamLocations, locationHistory, loadHistory, projectGeofences, geofenceAlerts,
    trackingEnabled, setTrackingEnabled,
  ]);

  return (
    <GeolocationContext.Provider value={value}>
      {children}
    </GeolocationContext.Provider>
  );
}

export function useGeolocationContext() {
  const ctx = useContext(GeolocationContext);
  if (!ctx) throw new Error('useGeolocationContext must be used within GeolocationProvider');
  return ctx;
}
