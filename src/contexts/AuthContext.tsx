'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useUIContext } from './UIContext';
import { getFirebase, serverTimestamp, snapToDocs, QuerySnapshot } from '@/lib/firebase-service';
import { ADMIN_EMAILS } from '@/lib/types';
import type { TeamUser, Project, Task } from '@/lib/types';
import { getInitials } from '@/lib/helpers';
import { confirm } from '@/hooks/useConfirmDialog';

export interface FirebaseUserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerData: Array<{ providerId: string }>;
  updateProfile: (profile: { displayName?: string | null; photoURL?: string | null }) => Promise<void>;
}

/* ===== AUTH CONTEXT ===== */
interface AuthContextType {
  // State
  ready: boolean;
  setReady: React.Dispatch<React.SetStateAction<boolean>>;
  authUser: FirebaseUserInfo | null;
  setAuthUser: React.Dispatch<React.SetStateAction<FirebaseUserInfo | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  teamUsers: TeamUser[];

  // Functions
  doLogin: () => Promise<void>;
  doRegister: () => Promise<void>;
  doGoogleLogin: () => Promise<void>;
  doMicrosoftLogin: () => Promise<void>;
  doLogout: () => Promise<void>;
  doPasswordReset: (email: string) => Promise<void>;
  getMyRole: () => string;
  getMyCompanyId: () => string | null;
  visibleProjects: (projects: Project[]) => Project[];
  getUserName: (uid: string) => string;
  updateUserRole: (uid: string, newRole: string) => Promise<void>;
  updateUserCompany: (uid: string, companyId: string) => Promise<void>;

  // Computed
  userName: string;
  initials: string;
  myRole: string;
  isAdmin: boolean;
  isEmailAdmin: boolean;
  getUserRole: (uid: string) => string;

  // MS auth bridge (for OneDriveContext to register)
  msAuthCallbackRef: React.MutableRefObject<((token: string, refreshToken: string | null) => void) | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast, forms } = useUIContext();

  // State
  const [ready, setReady] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  // MS auth callback bridge (OneDriveContext registers here)
  const msAuthCallbackRef = useRef<((token: string, refreshToken: string | null) => void) | null>(null);

  // ===== EFFECTS =====

  // Wait for Firebase to be ready (initialized in layout.tsx)
  useEffect(() => {
    let attempts = 0;
    const MAX = 50; // 50 × 100ms = 5 seconds max wait
    const iv = setInterval(() => {
      attempts++;
      try {
        const fb = getFirebase();
        if (fb && fb.apps && fb.apps.length > 0) {
          clearInterval(iv);
          setReady(true);
        } else if (attempts >= MAX) {
          clearInterval(iv);
          console.error('[ArchiFlow Auth] Firebase init timed out after 5s');
          setLoading(false);
        }
      } catch (e) {
        if (attempts >= MAX) {
          clearInterval(iv);
          console.error('[ArchiFlow Auth] Firebase not available after 5s');
          setLoading(false);
        }
      }
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // Auth state
  useEffect(() => {
    if (!ready) return;
    const fb = getFirebase();
    const auth = fb.auth();

    // Set auth persistence to LOCAL (survives browser restart)
    try {
      const w = window as any;
      if (w.firebase?.auth?.Auth?.Persistence?.LOCAL) {
        auth.setPersistence(w.firebase.auth.Auth.Persistence.LOCAL).catch(err => console.warn('[ArchiFlow] Auth: set persistence failed:', err));
      }
    } catch (err) {
      // Ignore persistence errors — default behavior is fine
      console.warn('[ArchiFlow] Auth: persistence setup failed:', err);
    }

    // Handle redirect results (for signInWithRedirect fallback)
    auth.getRedirectResult().then((result) => {
      const cred = (result as any)?.credential as { accessToken?: string; refreshToken?: string } | undefined;
      if (cred) {
        // Handle Microsoft redirect tokens
        if (cred.accessToken) {
          if (msAuthCallbackRef.current) {
            msAuthCallbackRef.current(cred.accessToken, cred.refreshToken || null);
          }
          localStorage.setItem('msAccessToken', cred.accessToken);
          localStorage.setItem('msConnected', 'true');
          if (cred.refreshToken) localStorage.setItem('msRefreshToken', cred.refreshToken);
        }
      }
    }).catch((err: unknown) => {
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message;
      if (code !== 'auth/no-pending-redirect') {
        console.error('[ArchiFlow Auth] Redirect result error:', code, message);
        setTimeout(() => showToast(`Error de autenticación: ${code || message}`, 'error'), 500);
      }
    });

    const unsubscribe = auth.onAuthStateChanged(async (user: FirebaseUserInfo | null) => {
      setAuthUser(user || null);
      if (user) {
        try {
          const db = fb.firestore();
          const ref = db.collection('users').doc(user.uid);
          const snap = await ref.get();
          const isAdminEmail = ADMIN_EMAILS.includes(user.email || '');
          if (!snap.exists) {
            await ref.set({ name: user.displayName || (user.email || '').split('@')[0], email: user.email, photoURL: user.photoURL || '', role: isAdminEmail ? 'Admin' : 'Miembro', createdAt: serverTimestamp() });
          } else if (isAdminEmail) {
            const current = snap.data()?.role;
            if (current !== 'Admin') {
              await ref.update({ role: 'Admin' });
            }
          }
        } catch (err) {
          console.error('[ArchiFlow Auth] Error creando/cargando documento de usuario:', err);
        }
      }
      setLoading(false);
    }, (authErr: unknown) => {
      // onAuthStateChanged error handler — ensure loading is always cleared
      console.error('[ArchiFlow Auth] onAuthStateChanged error:', authErr);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [ready, showToast]);

  // Load team
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('users').onSnapshot((snap: QuerySnapshot) => {
      setTeamUsers(snapToDocs(snap));
    }, (err: unknown) => { console.error('[ArchiFlow] Error escuchando users:', err); });
    return () => unsub();
  }, [ready, authUser]);

  // ===== FUNCTIONS =====

  // Use ref for forms to avoid recreating callbacks on every keystroke
  const formsRef = useRef(forms);
  formsRef.current = forms;

  const doLogin = useCallback(async () => {
    const email = formsRef.current.loginEmail || '', pass = formsRef.current.loginPass || '';
    if (!email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    try {
      await getFirebase().auth().signInWithEmailAndPassword(email, pass);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error('[ArchiFlow Auth] Login error:', err.code, err.message, e);
      const msgs: Record<string, string> = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos',
        'auth/user-not-found': 'No existe cuenta con ese correo',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentar.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      };
      showToast(msgs[err.code || ''] || `Error: ${err.code || err.message || 'No se pudo iniciar sesión'}`, 'error');
    }
  }, [showToast]);

  const doRegister = useCallback(async () => {
    const name = formsRef.current.regName || '', email = formsRef.current.regEmail || '', pass = formsRef.current.regPass || '';
    if (!name || !email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    try {
      const cred = await getFirebase().auth().createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      const db = getFirebase().firestore();
      await db.collection('users').doc(cred.user.uid).set({ name, email, photoURL: '', role: 'Miembro', createdAt: serverTimestamp() });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error('[ArchiFlow Auth] Register error:', err.code, err.message, e);
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Ese correo ya está registrado. Intenta iniciar sesión.',
        'auth/weak-password': 'La contraseña es muy débil. Mínimo 6 caracteres.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'auth/operation-not-allowed': 'Registro con email/contraseña deshabilitado. Verifica Firebase Console.',
      };
      showToast(msgs[err.code || ''] || `Error al registrar: ${err.code || err.message || ''}`, 'error');
    }
  }, [showToast]);

  const doGoogleLogin = useCallback(async () => {
    try {
      const fb = getFirebase();
      const authNS = (fb as any).auth;
      const authInstance = fb.auth();
      const provider = new authNS.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await authInstance.signInWithRedirect(provider);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error('[ArchiFlow Auth] Google login error:', err.code, err.message, e);
      if (err.code === 'auth/popup-closed-by-user') return;
      const msgs: Record<string, string> = {
        'auth/popup-blocked': 'Ventana emergente bloqueada. Permite popups para este sitio.',
        'auth/cancelled-popup-request': 'Se canceló la solicitud de inicio de sesión.',
        'auth/unauthorized-domain': 'Dominio no autorizado en Firebase Console > Authentication > Settings > Authorized domains.',
        'auth/invalid-credential': 'Credenciales de Google inválidas.',
        'auth/account-exists-with-different-credential': 'Este correo ya está registrado con otro método (Microsoft o Email). Intenta con ese método.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'auth/internal-error': 'Error interno de Firebase. Verifica que Google esté habilitado en Firebase Console > Authentication > Sign-in method.',
      };
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/unauthorized-domain') {
        try {
          const fb2 = getFirebase();
          const authNS2 = (fb2 as any).auth;
          const authInstance2 = fb2.auth();
          const provider2 = new authNS2.GoogleAuthProvider();
          provider2.setCustomParameters({ prompt: 'select_account' });
          await authInstance2.signInWithRedirect(provider2);
          return;
        } catch (redirectErr: unknown) {
          const redErr = redirectErr as { code?: string; message?: string };
          console.error('[ArchiFlow Auth] Google redirect also failed:', redErr.code, redErr.message);
        }
      }
      showToast(msgs[err.code || ''] || `Error con Google: ${err.code || err.message || 'Verifica Firebase Console > Authentication > Google'}`, 'error');
    }
  }, [showToast]);

  const doMicrosoftLogin = useCallback(async () => {
    try {
      const fb = getFirebase();
      const authNS = (fb as any).auth;
      const authInstance = fb.auth();

      // First try with minimal scopes (User.Read only) to avoid consent screen issues
      let result: { credential?: { accessToken?: string; refreshToken?: string }; user?: FirebaseUserInfo };
      try {
        const provider = new authNS.OAuthProvider('microsoft.com');
        provider.addScope('User.Read');
        provider.setCustomParameters({ prompt: 'select_account' });
        result = await authInstance.signInWithPopup(provider);
      } catch (popupErr: unknown) {
        const popErr = popupErr as { code?: string; message?: string };
        if (popErr.code === 'auth/popup-blocked') {
          // Fallback to redirect flow
          const redirectProvider = new authNS.OAuthProvider('microsoft.com');
          redirectProvider.addScope('User.Read');
          redirectProvider.setCustomParameters({ prompt: 'select_account' });
          await authInstance.signInWithRedirect(redirectProvider);
          return;
        }
        throw popupErr;
      }

      const credential = result.credential;
      if (credential?.accessToken) {
        // Use callback bridge for OneDriveContext
        if (msAuthCallbackRef.current) {
          msAuthCallbackRef.current(credential.accessToken, credential.refreshToken || null);
        }
        localStorage.setItem('msAccessToken', credential.accessToken);
        localStorage.setItem('msConnected', 'true');
        if (credential.refreshToken) localStorage.setItem('msRefreshToken', credential.refreshToken);
        showToast('Conectado con Microsoft y OneDrive');
      } else {
        showToast('Autenticado con Microsoft, pero sin acceso a OneDrive', 'warning');
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'auth/popup-closed-by-user') return;
      console.error('[ArchiFlow Auth] Microsoft login error:', err.code, err.message, e);
      const msgs: Record<string, string> = {
        'auth/popup-blocked': 'Ventana emergente bloqueada. Permite popups para este sitio.',
        'auth/cancelled-popup-request': 'Se canceló la solicitud de inicio de sesión.',
        'auth/invalid-credential': 'Credenciales de Microsoft inválidas.',
        'auth/unauthorized-domain': 'Dominio no autorizado en Firebase Console > Authentication > Settings > Authorized domains.',
        'auth/internal-error': 'Error de autenticación Microsoft. Verifica que Microsoft esté habilitado en Firebase Console > Authentication > Sign-in method.',
        'auth/oauth_error': 'Error de OAuth con Microsoft. Verifica Azure Portal > App registrations.',
        'auth/account-exists-with-different-credential': 'Este correo ya está registrado con otro método (Google o Email). Intenta con ese método.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      };
      showToast(msgs[err.code || ''] || `Microsoft: ${err.code || err.message || 'Verifica Firebase Console > Authentication > Microsoft'}`, 'error');
    }
  }, [showToast]);

  const doPasswordReset = useCallback(async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Ingresa un correo electrónico válido', 'error');
      return;
    }
    try {
      await getFirebase().auth().sendPasswordResetEmail(email);
      showToast('Se envió un correo para restablecer tu contraseña. Revisa tu bandeja de entrada y spam.');
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error('[ArchiFlow Auth] Password reset error:', err.code, err.message, e);
      const msgs: Record<string, string> = {
        'auth/user-not-found': 'No existe cuenta con ese correo.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      };
      showToast(msgs[err.code || ''] || `Error al enviar correo: ${err.code || err.message || ''}`, 'error');
    }
  }, [showToast]);

  const doLogout = useCallback(async () => { if (!(await confirm({ title: 'Cerrar sesión', description: '¿Cerrar sesión de ArchiFlow?' }))) return; getFirebase().auth().signOut(); }, [confirm]);

  const updateUserRole = useCallback(async (uid: string, newRole: string) => {
    try {
      await getFirebase().firestore().collection('users').doc(uid).update({ role: newRole });
      showToast(`Rol actualizado a ${newRole}`);
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al cambiar rol', 'error'); }
  }, [showToast]);

  const updateUserCompany = useCallback(async (uid: string, companyId: string) => {
    try {
      await getFirebase().firestore().collection('users').doc(uid).update({ companyId: companyId || null });
      showToast(companyId ? 'Empresa asignada' : 'Empresa removida');
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al asignar empresa', 'error'); }
  }, [showToast]);

  const getMyCompanyId = useCallback(() => {
    if (!authUser) return null;
    const me = teamUsers.find(u => u.id === authUser.uid);
    return me?.data?.companyId || null;
  }, [authUser, teamUsers]);

  const getMyRole = useCallback(() => {
    if (!authUser) return 'Miembro';
    const me = teamUsers.find(u => u.id === authUser.uid);
    return me?.data?.role || 'Miembro';
  }, [authUser, teamUsers]);

  const visibleProjects = useCallback((projects: Project[]) => {
    const myRole = getMyRole();
    const myComp = getMyCompanyId();
    if (myRole === 'Admin' || myRole === 'Director') {
      return projects;
    }
    if (myComp) {
      return projects.filter(p => !p.data?.companyId || p.data.companyId === myComp);
    }
    return projects;
  }, [getMyRole, getMyCompanyId]);

  const getUserName = useCallback((uid: string) => { if (!uid) return 'Sin asignar'; const u = teamUsers.find(x => x.id === uid); return u ? u.data.name : uid.substring(0, 8) + '...'; }, [teamUsers]);

  // Computed
  const getUserRole = useCallback((uid: string) => { const u = teamUsers.find(x => x.id === uid); return u?.data?.role || 'Miembro'; }, [teamUsers]);
  const userName = authUser?.displayName || authUser?.email?.split('@')[0] || '';
  const initials = getInitials(userName);
  const myRole = getUserRole(authUser?.uid || '');
  const isEmailAdmin = authUser ? ADMIN_EMAILS.includes(authUser.email || '') : false;
  const isAdmin = myRole === 'Admin' || myRole === 'Director' || isEmailAdmin;

  const value: AuthContextType = useMemo(() => ({
    ready, setReady,
    authUser, setAuthUser,
    loading, setLoading,
    teamUsers,
    doLogin, doRegister, doGoogleLogin, doMicrosoftLogin, doLogout, doPasswordReset,
    getMyRole, getMyCompanyId, visibleProjects, getUserName,
    updateUserRole, updateUserCompany,
    userName, initials, myRole, isAdmin, isEmailAdmin, getUserRole,
    msAuthCallbackRef,
  }), [ready, authUser, loading, teamUsers, doLogin, doRegister, doGoogleLogin, doMicrosoftLogin, doLogout, doPasswordReset, getMyRole, getMyCompanyId, visibleProjects, getUserName, updateUserRole, updateUserCompany, userName, initials, myRole, isAdmin, isEmailAdmin, getUserRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
