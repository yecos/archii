/**
 * presence-service.ts
 * Real-time presence system for ArchiFlow.
 *
 * Uses Firestore `presence/{userId}` documents with `onDisconnect()`
 * to track who is online and what they are viewing.
 *
 * IMPORTANT: Client-side only. Uses getFirebase() (CDN compat SDK).
 */

import { getFirebase, serverTimestamp } from '@/lib/firebase-service';

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

export interface PresenceData {
  userId: string;
  userName: string;
  userPhoto: string;
  currentScreen: string;
  currentProjectId: string | null;
  lastSeen: unknown; // Firestore server timestamp sentinel
  online: boolean;
}

/* ========================================================================== */
/*  PresenceService class                                                      */
/* ========================================================================== */

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const PRESENCE_COLLECTION = 'presence';

export class PresenceService {
  private userId: string;
  private userName: string;
  private userPhoto: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private unsubSnapshot: (() => void) | null = null;
  private _currentScreen = 'dashboard';
  private _currentProjectId: string | null = null;

  constructor(userId: string, userName: string, userPhoto: string) {
    this.userId = userId;
    this.userName = userName;
    this.userPhoto = userPhoto;
  }

  /* --- Public API --- */

  get currentScreen() { return this._currentScreen; }
  get currentProjectId() { return this._currentProjectId; }

  /** Set presence for the first time, register onDisconnect + heartbeat */
  async init(screen: string = 'dashboard', projectId: string | null = null): Promise<void> {
    this._currentScreen = screen;
    this._currentProjectId = projectId;

    const db = getFirebase().firestore();
    const ref = db.collection(PRESENCE_COLLECTION).doc(this.userId);

    // Register onDisconnect cleanup — runs when client disconnects gracefully or ungracefully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ref as any).onDisconnect().set({
      userId: this.userId,
      userName: this.userName,
      userPhoto: this.userPhoto,
      currentScreen: '',
      currentProjectId: null,
      lastSeen: serverTimestamp(),
      online: false,
    }, { merge: true }).catch((err: unknown) => {
      console.warn('[ArchiFlow] Presence onDisconnect set failed:', err);
    });

    // Set initial presence
    await ref.set({
      userId: this.userId,
      userName: this.userName,
      userPhoto: this.userPhoto,
      currentScreen: screen,
      currentProjectId: projectId,
      lastSeen: serverTimestamp(),
      online: true,
    }, { merge: true }).catch((err: unknown) => {
      console.warn('[ArchiFlow] Presence init set failed:', err);
    });

    // Start heartbeat
    this.startHeartbeat();
  }

  /** Update what screen/project the user is viewing */
  async updatePresence(screen: string, projectId: string | null = null): Promise<void> {
    this._currentScreen = screen;
    this._currentProjectId = projectId;

    try {
      const db = getFirebase().firestore();
      await db.collection(PRESENCE_COLLECTION).doc(this.userId).update({
        currentScreen: screen,
        currentProjectId: projectId,
        lastSeen: serverTimestamp(),
        online: true,
      });
    } catch (err) {
      console.warn('[ArchiFlow] Presence update failed:', err);
    }
  }

  /** Start periodic heartbeat to keep presence alive */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(async () => {
      try {
        const db = getFirebase().firestore();
        await db.collection(PRESENCE_COLLECTION).doc(this.userId).update({
          lastSeen: serverTimestamp(),
          online: true,
          currentScreen: this._currentScreen,
          currentProjectId: this._currentProjectId,
        });
      } catch (err) {
        console.warn('[ArchiFlow] Presence heartbeat failed:', err);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /** Stop heartbeat and clean up presence document */
  async disconnect(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Unsubscribe from snapshot listener
    if (this.unsubSnapshot) {
      this.unsubSnapshot();
      this.unsubSnapshot = null;
    }

    // Remove presence document
    try {
      const db = getFirebase().firestore();
      await db.collection(PRESENCE_COLLECTION).doc(this.userId).delete();
    } catch (err) {
      console.warn('[ArchiFlow] Presence disconnect cleanup failed:', err);
    }
  }
}

/* ========================================================================== */
/*  Firestore realtime listener helpers                                         */
/* ========================================================================== */

export interface OnlineUserDoc {
  id: string;
  data: PresenceData;
}

/**
 * Subscribe to all online users in the `presence` collection.
 * Calls `callback` with an array of online user documents on every change.
 * Returns an unsubscribe function.
 */
export function subscribeToOnlineUsers(callback: (users: OnlineUserDoc[]) => void): () => void {
  try {
    const db = getFirebase().firestore();
    // Only query users that are actually online
    return db.collection(PRESENCE_COLLECTION)
      .where('online', '==', true)
      .onSnapshot((snap: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const querySnap = snap as any;
        const users: OnlineUserDoc[] = [];
        if (querySnap.docs && Array.isArray(querySnap.docs)) {
          querySnap.docs.forEach((doc: { id: string; data: () => PresenceData }) => {
            users.push({ id: doc.id, data: doc.data() });
          });
        }
        callback(users);
      }, (err: unknown) => {
        console.warn('[ArchiFlow] Presence snapshot error:', err);
      });
  } catch (err) {
    console.warn('[ArchiFlow] subscribeToOnlineUsers failed:', err);
    return () => {};
  }
}
