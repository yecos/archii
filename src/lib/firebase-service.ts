/**
 * firebase-service.ts
 * Capa de abstracción limpia sobre Firebase.
 * Reemplaza TODOS los (window as any).firebase del componente.
 *
 * Exporta una función `getFirebase()` que devuelve la instancia de Firebase
 * cargada por el script en layout.tsx, con tipado y manejo de errores.
 *
 * IMPORTANTE: NO importamos de 'firebase/auth' ni ningún paquete 'firebase'
 * porque Turbopack puede incluir el SDK modular en el bundle del cliente,
 * causando conflictos con el SDK compat cargado via <script> en layout.tsx.
 * Todos los tipos se definen localmente.
 */

/* ========================================================================== */
/*  Base / Utility types                                                      */
/* ========================================================================== */

/** Arbitrary JSON-serialisable document data stored in Firestore.
 *  Uses `any` in the index signature because Firestore documents are dynamic
 *  by nature — field names and types are only known at runtime. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DocumentData {
  [field: string]: any;
}

/** Union of valid where-operator strings accepted by Firestore. */
export type FirestoreWhereOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'array-contains'
  | 'array-contains-any'
  | 'in'
  | 'not-in';

/** Options accepted by `set()` / `batch.set()`. */
export interface SetOptions {
  merge?: boolean;
  mergeFields?: string[];
}

/* ========================================================================== */
/*  FieldValue sentinel (returned by serverTimestamp, arrayUnion, etc.)       */
/* ========================================================================== */

/** Sentinel object returned by FieldValue factory helpers. */
export interface FieldValueSentinel {
  /** Internal tag – never meaningful to application code. */
  _isFieldValue: true;
}

/** Static FieldValue helpers available on the Firestore namespace. */
export interface FieldValues {
  serverTimestamp(): FieldValueSentinel;
  arrayUnion(...elements: unknown[]): FieldValueSentinel;
  arrayRemove(...elements: unknown[]): FieldValueSentinel;
  increment(n: number): FieldValueSentinel;
  deleteField(): FieldValueSentinel;
}

/* ========================================================================== */
/*  Auth types                                                                 */
/* ========================================================================== */

/** Minimal shape of a single provider-user-info entry. */
export interface UserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerId: string;
}

/** Firebase Auth user object (compat). */
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerData: UserInfo[];
  updateProfile(profile: { displayName?: string | null; photoURL?: string | null }): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

/** Result of signIn / createUserWithEmailAndPassword. */
export interface UserCredential {
  user: FirebaseUser;
}

/** Firebase Auth instance (compat) returned by `firebase.auth()`. */
export interface FirebaseAuth {
  currentUser: FirebaseUser | null;
  onAuthStateChanged(
    nextOrObserver: (user: FirebaseUser | null) => void,
    error?: (error: Error) => void,
  ): () => void;
  signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;
  createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;
  signInWithPopup(provider: unknown): Promise<UserCredential>;
  signInWithRedirect(provider: unknown): Promise<void>;
  getRedirectResult(): Promise<UserCredential | null>;
  setPersistence(persistence: unknown): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
}

/* ========================================================================== */
/*  Firestore types                                                            */
/* ========================================================================== */

/** A single document snapshot returned by `doc.get()` or `tx.get()`. */
export interface DocumentSnapshot<T extends DocumentData = DocumentData> {
  readonly id: string;
  readonly exists: boolean;
  /** Returns document data. Throws if the document does not exist. */
  data(): T;
  get(field: string): unknown;
}

/** A query-document snapshot (always exists) inside a QuerySnapshot. */
export interface QueryDocSnapshot<T extends DocumentData = DocumentData> {
  readonly id: string;
  readonly exists: boolean;
  data(): T;
  get(field: string): unknown;
  ref: DocRef<T>;
}

/** Result of a collection query (`.get()` or `onSnapshot()` callback). */
export interface QuerySnapshot<T extends DocumentData = DocumentData> {
  readonly docs: QueryDocSnapshot<T>[];
  readonly empty: boolean;
  readonly size: number;
  forEach(cb: (doc: QueryDocSnapshot<T>) => void): void;
}

/** A write transaction passed to `runTransaction()`. */
export interface Transaction {
  get<T extends DocumentData = DocumentData>(ref: DocRef<T>): Promise<DocumentSnapshot<T>>;
  set<T extends DocumentData = DocumentData>(ref: DocRef<T>, data: T, opts?: SetOptions): Transaction;
  update<T extends DocumentData = DocumentData>(ref: DocRef<T>, data: Partial<T>): Transaction;
  delete<T extends DocumentData = DocumentData>(ref: DocRef<T>): Transaction;
}

/** A batched write – collect operations, then `commit()`. */
export interface BatchWriter {
  set<T extends DocumentData = DocumentData>(ref: DocRef<T>, data: T, opts?: SetOptions): BatchWriter;
  update<T extends DocumentData = DocumentData>(ref: DocRef<T>, data: Partial<T>): BatchWriter;
  delete<T extends DocumentData = DocumentData>(ref: DocRef<T>): BatchWriter;
  commit(): Promise<void>;
}

/** A Firestore collection reference. */
export interface CollectionRef<T extends DocumentData = DocumentData> {
  doc(id?: string): DocRef<T>;
  where(field: string, op: FirestoreWhereOp, value: unknown): CollectionRef<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): CollectionRef<T>;
  limit(n: number): CollectionRef<T>;
  limitToLast(n: number): CollectionRef<T>;
  onSnapshot(observer: (snap: QuerySnapshot<T>) => void, error?: (err: Error) => void): () => void;
  get(): Promise<QuerySnapshot<T>>;
  add(data: T): Promise<DocRef<T>>;
}

/** A Firestore document reference. */
export interface DocRef<T extends DocumentData = DocumentData> {
  readonly id: string;
  collection<U extends DocumentData = DocumentData>(name: string): CollectionRef<U>;
  get(): Promise<DocumentSnapshot<T>>;
  set(data: T, opts?: SetOptions): Promise<void>;
  update(data: Partial<T>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(observer: (snap: DocumentSnapshot<T>) => void, error?: (err: Error) => void): () => void;
}

/** Firestore database instance returned by `firebase.firestore()`. */
export interface FirestoreDB {
  collection<T extends DocumentData = DocumentData>(name: string): CollectionRef<T>;
  collectionGroup<T extends DocumentData = DocumentData>(id: string): CollectionRef<T>;
  doc<T extends DocumentData = DocumentData>(path: string): DocRef<T>;
  batch(): BatchWriter;
  runTransaction<T = unknown>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

/* ========================================================================== */
/*  Storage types                                                              */
/* ========================================================================== */

/** Firebase Storage instance returned by `firebase.storage()`. */
export interface FirebaseStorage {
  ref(path?: string): StorageReference;
}

/** A reference to a location in Firebase Storage. */
export interface StorageReference {
  child(path: string): StorageReference;
  name: string;
  fullPath: string;
  put(data: Blob | Uint8Array | ArrayBuffer, metadata?: Record<string, unknown>): UploadTask;
  delete(): Promise<void>;
  getDownloadURL(): Promise<string>;
  getMetadata(): Promise<StorageMetadata>;
}

/** Metadata about an object in Firebase Storage. */
export interface StorageMetadata {
  name: string;
  size: number;
  contentType: string | null;
  updated: string | null;
  timeCreated: string | null;
  [key: string]: unknown;
}

/** An upload task returned by `ref.put()`. */
export interface UploadTask {
  then<F = unknown, R = unknown>(
    onFulfilled?: (snapshot: unknown) => F | PromiseLike<F>,
    onRejected?: (error: Error) => R | PromiseLike<R>,
  ): Promise<F | R>;
  catch<R = unknown>(onRejected: (error: Error) => R | PromiseLike<R>): Promise<R>;
  on(event: string, next: (snapshot: unknown) => void, error?: (err: Error) => void): () => void;
}

/* ========================================================================== */
/*  Firebase App (top-level compat namespace)                                  */
/* ========================================================================== */

/**
 * The Firestore static namespace – both callable (`firebase.firestore()`)
 * and a holder for static members like `FieldValue`.
 */
export interface FirestoreNamespace {
  (): FirestoreDB;
  FieldValue: FieldValues;
}

/**
 * The Auth static namespace – callable (`firebase.auth()`).
 */
export interface AuthNamespace {
  (): FirebaseAuth;
}

/**
 * The top-level Firebase compat object loaded via `<script>`.
 * Mirrors the shape of the global `firebase` object from the compat SDK.
 */
export interface FirebaseApp {
  auth: AuthNamespace;
  firestore: FirestoreNamespace;
  storage: () => FirebaseStorage;
  apps: FirebaseApp[];
}

/* ========================================================================== */
/*  Singleton accessor & convenience helpers                                   */
/* ========================================================================== */

let _fb: FirebaseApp | null = null;

/**
 * Returns the Firebase instance loaded by the script tag in layout.tsx.
 * Throws a clear error if Firebase hasn't loaded yet.
 */
export function getFirebase(): FirebaseApp {
  if (_fb) {
    try {
      if (_fb.apps && _fb.apps.length > 0) return _fb;
    } catch { /* stale reference */ }
    _fb = null;
  }
  // Acceso seguro a window.firebase (SDK compat via CDN)
  const w = typeof window !== 'undefined' ? window : null;
  if (!w) {
    throw new Error('[ArchiFlow] No estamos en el navegador.');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fb = (w as any).firebase as FirebaseApp | undefined;
  if (!fb || !fb.apps || fb.apps.length === 0) {
    throw new Error('[ArchiFlow] Firebase no está inicializado. Verifica que los scripts en layout.tsx cargaron correctamente.');
  }
  _fb = fb;
  return _fb;
}

/** Check if Firebase is ready (non-throwing). */
export function isFirebaseReady(): boolean {
  try {
    getFirebase();
    return true;
  } catch {
    return false;
  }
}

/** Convenience: get Firestore database. */
export function getDb(): FirestoreDB {
  return getFirebase().firestore();
}

/** Convenience: get Auth. */
export function getAuth(): FirebaseAuth {
  return getFirebase().auth();
}

/** Convenience: FieldValue helpers namespace. */
export function FieldValue(): FieldValues {
  return getFirebase().firestore.FieldValue;
}

/** Convenience: serverTimestamp() without `as any`. Returns a Firestore server timestamp sentinel. */
export function serverTimestamp(): FieldValueSentinel {
  return getFirebase().firestore.FieldValue.serverTimestamp();
}

/** Convenience: Storage reference. */
export function getStorage(): FirebaseStorage {
  return getFirebase().storage();
}

/** Type-safe snapshot mapper: converts Firestore QuerySnapshot to typed array. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function snapToDocs<T = Record<string, any>>(snap: QuerySnapshot): Array<{ id: string; data: T }> {
  return snap.docs.map((d: QueryDocSnapshot) => ({ id: d.id, data: (d.data() || {}) as T }));
}


