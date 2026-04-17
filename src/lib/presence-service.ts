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
  tenantId: string;
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
  private tenantId: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private unsubSnapshot: (() => void) | null = null;
  private _currentScreen = 'dashboard';
  private _currentProjectId: string | null = null;

  constructor(userId: string, userName: string, userPhoto: string, tenantId: string) {
    this.userId = userId;
    this.userName = userName;
    this.userPhoto = userPhoto;
    this.tenantId = tenantId;
  }

  /* --- Public API --- */

  get currentScreen() { return this._currentScreen; }
  get currentProjectId() { return this._currentProjectId; }

  /** Set presence for the first time, register onDisconnect + heartbeat */
  async init(screen: string = 'dashboard', projectId: string | null = null): Promise<void> {
    this._currentScreen = screen;
    this._currentProjectId = projectId;

    if (!this.tenantId) {
      console.warn('[ArchiFlow] Presence init skipped: no tenantId');
      return;
    }

    const db = getFirebase().firestore();
    // Use tenantId + userId as doc ID for multi-tenant isolation
    const docId = `${this.tenantId}_${this.userId}`;
    const ref = db.collection(PRESENCE_COLLECTION).doc(docId);

    // Register onDisconnect cleanup — runs when client disconnects gracefully or ungracefully
    // Compat SDK DocumentReference lacks onDisconnect in npm types
    (ref as unknown as { onDisconnect(): { set(data: unknown, options?: unknown): Promise<unknown> } }).onDisconnect().set({
      userId: this.userId,
      userName: this.userName,
      userPhoto: this.userPhoto,
      tenantId: this.tenantId,
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
      tenantId: this.tenantId,
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

    if (!this.tenantId) return;

    try {
      const db = getFirebase().firestore();
      const docId = `${this.tenantId}_${this.userId}`;
      await db.collection(PRESENCE_COLLECTION).doc(docId).update({
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
      if (!this.tenantId) return;
      try {
        const db = getFirebase().firestore();
        const docId = `${this.tenantId}_${this.userId}`;
        await db.collection(PRESENCE_COLLECTION).doc(docId).update({
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
      if (this.tenantId) {
        const docId = `${this.tenantId}_${this.userId}`;
        await db.collection(PRESENCE_COLLECTION).doc(docId).delete();
      }
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
 * Filters by tenantId for multi-tenant isolation.
 * Calls `callback` with an array of online user documents on every change.
 * Returns an unsubscribe function.
 */
export function subscribeToOnlineUsers(tenantId: string, callback: (users: OnlineUserDoc[]) => void): () => void {
  if (!tenantId) {
    console.warn('[ArchiFlow] subscribeToOnlineUsers skipped: no tenantId');
    return () => {};
  }
  try {
    const db = getFirebase().firestore();
    // Only query users that are actually online AND in the same tenant
    return db.collection(PRESENCE_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('online', '==', true)
      .onSnapshot((snap: unknown) => {
        const querySnap = snap as { docs?: Array<{ id: string; data: () => PresenceData }> };
        const users: OnlineUserDoc[] = [];
        if (querySnap.docs && Array.isArray(querySnap.docs)) {
          querySnap.docs.forEach((doc) => {
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
