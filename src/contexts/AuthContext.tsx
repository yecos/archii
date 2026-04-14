'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useUIContext } from './UIContext';
import { getFirebase } from '@/lib/firebase-service';
import { ADMIN_EMAILS } from '@/lib/types';
import type { TeamUser, Project, Task } from '@/lib/types';
import { getInitials } from '@/lib/helpers';
import { confirm } from '@/hooks/useConfirmDialog';

/* ===== AUTH CONTEXT ===== */
interface AuthContextType {
  // State
  ready: boolean;
  setReady: React.Dispatch<React.SetStateAction<boolean>>;
  authUser: any;
  setAuthUser: React.Dispatch<React.SetStateAction<any>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  teamUsers: TeamUser[];

  // Functions
  doLogin: () => Promise<void>;
  doRegister: () => Promise<void>;
  doGoogleLogin: () => Promise<void>;
  doMicrosoftLogin: () => Promise<void>;
  doLogout: () => Promise<void>;
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
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  // MS auth callback bridge (OneDriveContext registers here)
  const msAuthCallbackRef = useRef<((token: string, refreshToken: string | null) => void) | null>(null);

  // ===== EFFECTS =====

  // Wait for Firebase to be ready (initialized in layout.tsx)
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const fb = getFirebase();
        if (fb && fb.apps && fb.apps.length > 0) {
          clearInterval(iv);
          setReady(true);
        }
      } catch (e) {
        // Firebase not loaded yet, keep waiting
      }
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // Auth state
  useEffect(() => {
    if (!ready) return;
    const fb = getFirebase();
    const auth = fb.auth();

    // Handle redirect results (for signInWithRedirect fallback)
    auth.getRedirectResult().then((result: any) => {
      if (result?.credential) {
        console.log('[ArchiFlow Auth] Redirect sign-in successful:', result.user?.email);
        // Handle Microsoft redirect tokens
        if (result.credential.accessToken) {
          if (msAuthCallbackRef.current) {
            msAuthCallbackRef.current(result.credential.accessToken, result.credential.refreshToken || null);
          }
          localStorage.setItem('msAccessToken', result.credential.accessToken);
          localStorage.setItem('msConnected', 'true');
          if (result.credential.refreshToken) localStorage.setItem('msRefreshToken', result.credential.refreshToken);
        }
      }
    }).catch((err: any) => {
      if (err.code !== 'auth/no-pending-redirect') {
        console.error('[ArchiFlow Auth] Redirect result error:', err.code, err.message);
        setTimeout(() => showToast(`Error de autenticación: ${err.code || err.message}`, 'error'), 500);
      }
    });

    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      setAuthUser(user || null);
      if (user) {
        const db = fb.firestore();
        const ref = db.collection('users').doc(user.uid);
        const snap = await ref.get();
        const isAdminEmail = ADMIN_EMAILS.includes(user.email);
        console.log('[ArchiFlow Auth]', { email: user.email, isAdminEmail, currentRole: snap.exists ? snap.data()?.role : 'new' });
        if (!snap.exists) {
          await ref.set({ name: user.displayName || user.email.split('@')[0], email: user.email, photoURL: user.photoURL || '', role: isAdminEmail ? 'Admin' : 'Miembro', createdAt: (fb as any).firestore.FieldValue.serverTimestamp() });
        } else if (isAdminEmail) {
          const current = snap.data()?.role;
          if (current !== 'Admin') {
            console.log('[ArchiFlow] Promoting', user.email, 'from', current, 'to Admin');
            await ref.update({ role: 'Admin' });
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [ready, showToast]);

  // Load team
  useEffect(() => {
    if (!ready || !authUser) return;
    const db = getFirebase().firestore();
    const unsub = db.collection('users').onSnapshot(snap => {
      setTeamUsers(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    }, () => {});
    return () => unsub();
  }, [ready, authUser]);

  // ===== FUNCTIONS =====

  const doLogin = async () => {
    const email = forms.loginEmail || '', pass = forms.loginPass || '';
    if (!email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    try {
      console.log('[ArchiFlow Auth] Attempting email/password login for:', email);
      await getFirebase().auth().signInWithEmailAndPassword(email, pass);
      console.log('[ArchiFlow Auth] Email/password login successful');
    } catch (e: any) {
      console.error('[ArchiFlow Auth] Login error:', e.code, e.message, e);
      const msgs: Record<string, string> = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos',
        'auth/user-not-found': 'No existe cuenta con ese correo',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentar.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      };
      showToast(msgs[e.code] || `Error: ${e.code || e.message || 'No se pudo iniciar sesión'}`, 'error');
    }
  };

  const doRegister = async () => {
    const name = forms.regName || '', email = forms.regEmail || '', pass = forms.regPass || '';
    if (!name || !email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    try {
      console.log('[ArchiFlow Auth] Attempting registration for:', email);
      const cred = await getFirebase().auth().createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      const db = getFirebase().firestore();
      await db.collection('users').doc(cred.user.uid).set({ name, email, photoURL: '', role: 'Miembro', createdAt: (getFirebase() as any).firestore.FieldValue.serverTimestamp() });
      console.log('[ArchiFlow Auth] Registration successful for:', email);
    } catch (e: any) {
      console.error('[ArchiFlow Auth] Register error:', e.code, e.message, e);
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Ese correo ya está registrado. Intenta iniciar sesión.',
        'auth/weak-password': 'La contraseña es muy débil. Mínimo 6 caracteres.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'auth/operation-not-allowed': 'Registro con email/contraseña deshabilitado. Verifica Firebase Console.',
      };
      showToast(msgs[e.code] || `Error al registrar: ${e.code || e.message || ''}`, 'error');
    }
  };

  const doGoogleLogin = async () => {
    try {
      console.log('[ArchiFlow Auth] Attempting Google login...');
      const fb = getFirebase();
      const provider = new (fb as any).auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await fb.auth().signInWithPopup(provider);
      console.log('[ArchiFlow Auth] Google login successful:', result.user?.email);
    } catch (e: any) {
      console.error('[ArchiFlow Auth] Google login error:', e.code, e.message, e);
      if (e.code === 'auth/popup-closed-by-user') return;
      const msgs: Record<string, string> = {
        'auth/popup-blocked': 'Ventana emergente bloqueada. Permite popups para este sitio.',
        'auth/cancelled-popup-request': 'Se canceló la solicitud de inicio de sesión.',
        'auth/unauthorized-domain': 'Dominio no autorizado en Firebase Console > Authentication > Settings > Authorized domains.',
        'auth/invalid-credential': 'Credenciales de Google inválidas.',
        'auth/account-exists-with-different-credential': 'Este correo ya está registrado con otro método (Microsoft o Email). Intenta con ese método.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'auth/internal-error': 'Error interno de Firebase. Verifica que Google esté habilitado en Firebase Console > Authentication > Sign-in method.',
      };
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/unauthorized-domain') {
        console.log('[ArchiFlow Auth] Popup failed, trying redirect fallback for Google...');
        try {
          const fb2 = getFirebase();
          const provider2 = new (fb2 as any).auth.GoogleAuthProvider();
          provider2.setCustomParameters({ prompt: 'select_account' });
          await fb2.auth().signInWithRedirect(provider2);
          return;
        } catch (redirectErr: any) {
          console.error('[ArchiFlow Auth] Google redirect also failed:', redirectErr.code, redirectErr.message);
        }
      }
      showToast(msgs[e.code] || `Error con Google: ${e.code || e.message || 'Verifica Firebase Console > Authentication > Google'}`, 'error');
    }
  };

  const doMicrosoftLogin = async () => {
    try {
      console.log('[ArchiFlow Auth] Attempting Microsoft login...');
      const fb = getFirebase();
      const authNS = fb.auth;
      const authInstance = fb.auth();
      const provider = new (authNS as any).OAuthProvider('microsoft.com');
      provider.addScope('Files.ReadWrite.All');
      provider.addScope('Sites.ReadWrite.All');
      provider.addScope('User.Read');
      provider.setCustomParameters({ prompt: 'select_account' });

      let result: any;
      try {
        result = await authInstance.signInWithPopup(provider);
      } catch (popupErr: any) {
        if (popupErr.code === 'auth/internal-error' || popupErr.code === 'auth/oauth_error') {
          console.warn('[ArchiFlow Auth] Microsoft login con scopes falló, intentando login básico:', popupErr.code);
          const basicProvider = new (authNS as any).OAuthProvider('microsoft.com');
          basicProvider.setCustomParameters({ prompt: 'select_account' });
          try {
            result = await authInstance.signInWithPopup(basicProvider);
          } catch (basicErr: any) {
            if (basicErr.code === 'auth/popup-blocked') {
              console.log('[ArchiFlow Auth] Microsoft popup blocked, trying redirect fallback...');
              const redirectProvider = new (authNS as any).OAuthProvider('microsoft.com');
              redirectProvider.setCustomParameters({ prompt: 'select_account' });
              await authInstance.signInWithRedirect(redirectProvider);
              return;
            }
            throw basicErr;
          }
        } else if (popupErr.code === 'auth/popup-blocked') {
          console.log('[ArchiFlow Auth] Microsoft popup blocked, trying redirect fallback...');
          const redirectProvider = new (authNS as any).OAuthProvider('microsoft.com');
          redirectProvider.setCustomParameters({ prompt: 'select_account' });
          await authInstance.signInWithRedirect(redirectProvider);
          return;
        } else {
          throw popupErr;
        }
      }

      console.log('[ArchiFlow Auth] Microsoft login successful');
      const credential = result.credential as any;
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
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user') return;
      console.error('[ArchiFlow Auth] Microsoft login error:', e.code, e.message, e);
      const msgs: Record<string, string> = {
        'auth/popup-blocked': 'Ventana emergente bloqueada. Permite popups para este sitio.',
        'auth/cancelled-popup-request': 'Se canceló la solicitud de inicio de sesión.',
        'auth/invalid-credential': 'Credenciales de Microsoft inválidas.',
        'auth/unauthorized-domain': 'Dominio no autorizado en Firebase Console > Authentication > Settings > Authorized domains. Agrega archii-theta.vercel.app.',
        'auth/internal-error': 'Error de autenticación Microsoft. Verifica Azure Portal > API permissions.',
        'auth/account-exists-with-different-credential': 'Este correo ya está registrado con otro método (Google o Email). Intenta con ese método.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      };
      showToast(msgs[e.code] || `Microsoft: ${e.code || e.message || 'Verifica Firebase Console > Authentication > Microsoft'}`, 'error');
    }
  };

  const doLogout = async () => { if (!(await confirm({ title: 'Cerrar sesión', description: '¿Cerrar sesión de ArchiFlow?' }))) return; getFirebase().auth().signOut(); };

  const updateUserRole = async (uid: string, newRole: string) => {
    try {
      await getFirebase().firestore().collection('users').doc(uid).update({ role: newRole });
      showToast(`Rol actualizado a ${newRole}`);
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al cambiar rol', 'error'); }
  };

  const updateUserCompany = async (uid: string, companyId: string) => {
    try {
      await getFirebase().firestore().collection('users').doc(uid).update({ companyId: companyId || null });
      showToast(companyId ? 'Empresa asignada' : 'Empresa removida');
    } catch (err) { console.error('[ArchiFlow]', err); showToast('Error al asignar empresa', 'error'); }
  };

  const getMyCompanyId = () => {
    if (!authUser) return null;
    const me = teamUsers.find(u => u.id === authUser.uid);
    return me?.data?.companyId || null;
  };

  const getMyRole = () => {
    if (!authUser) return 'Miembro';
    const me = teamUsers.find(u => u.id === authUser.uid);
    return me?.data?.role || 'Miembro';
  };

  const visibleProjects = (projects: Project[]) => {
    const myRole = getMyRole();
    const myComp = getMyCompanyId();
    if (myRole === 'Admin' || myRole === 'Director') {
      return projects;
    }
    if (myComp) {
      return projects.filter(p => !p.data.companyId || p.data.companyId === myComp);
    }
    return projects;
  };

  const getUserName = (uid: string) => { if (!uid) return 'Sin asignar'; const u = teamUsers.find(x => x.id === uid); return u ? u.data.name : uid.substring(0, 8) + '...'; };

  // Computed
  const getUserRole = (uid: string) => { const u = teamUsers.find(x => x.id === uid); return u?.data?.role || 'Miembro'; };
  const userName = authUser?.displayName || authUser?.email?.split('@')[0] || '';
  const initials = getInitials(userName);
  const myRole = getUserRole(authUser?.uid || '');
  const isEmailAdmin = authUser ? ADMIN_EMAILS.includes(authUser.email || '') : false;
  const isAdmin = myRole === 'Admin' || myRole === 'Director' || isEmailAdmin;

  const value: AuthContextType = {
    ready, setReady,
    authUser, setAuthUser,
    loading, setLoading,
    teamUsers,
    doLogin, doRegister, doGoogleLogin, doMicrosoftLogin, doLogout,
    getMyRole, getMyCompanyId, visibleProjects, getUserName,
    updateUserRole, updateUserCompany,
    userName, initials, myRole, isAdmin, isEmailAdmin, getUserRole,
    msAuthCallbackRef,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
