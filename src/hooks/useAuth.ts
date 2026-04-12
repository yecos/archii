/**
 * useAuth.ts
 * Hook de autenticación Firebase con login, registro, Google y Microsoft OAuth.
 * Usa getFirebase() en vez de (window as any).firebase.
 */

import { useEffect, useState, useCallback } from 'react';
import { getFirebase } from '@/lib/firebase-service';
import { ADMIN_EMAILS } from '@/lib/types';

interface UseAuthReturn {
  authUser: any;
  loading: boolean;
  doLogin: (email: string, password: string) => Promise<void>;
  doRegister: (email: string, password: string, name: string) => Promise<void>;
  doGoogleLogin: () => Promise<void>;
  doMicrosoftLogin: () => Promise<void>;
  doLogout: () => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  changeUserRole: (userId: string, role: string) => Promise<void>;
  disconnectMicrosoft: () => void;
  msAccessToken: string | null;
  msConnected: boolean;
  msLoading: boolean;
}

export function useAuth(ready: boolean, showToast: (msg: string, type?: string) => void): UseAuthReturn {
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msAccessToken, setMsAccessToken] = useState<string | null>(null);
  const [msConnected, setMsConnected] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  /* ===== Auth state listener ===== */
  useEffect(() => {
    if (!ready) return;
    try {
      const fb = getFirebase();
      const auth = fb.auth();
      const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
        setAuthUser(user || null);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('[ArchiFlow] Auth state error:', err);
      setLoading(false);
    }
  }, [ready]);

  /* ===== Restore Microsoft session ===== */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('archiflow-ms-token');
      if (saved) {
        setMsAccessToken(saved);
        setMsConnected(true);
      }
    } catch {}
  }, []);

  /* ===== Auth actions ===== */

  const doLogin = useCallback(async (email: string, password: string) => {
    try {
      const fb = getFirebase();
      await fb.auth().signInWithEmailAndPassword(email, password);
    } catch (err: any) {
      console.error('[ArchiFlow] Login error:', err);
      const msg = err.code === 'auth/user-not-found' ? 'Usuario no encontrado'
        : err.code === 'auth/wrong-password' ? 'Contraseña incorrecta'
        : err.code === 'auth/invalid-email' ? 'Email inválido'
        : err.code === 'auth/invalid-credential' ? 'Credenciales inválidas'
        : 'Error al iniciar sesión';
      showToast(msg, 'error');
    }
  }, [showToast]);

  const doRegister = useCallback(async (email: string, password: string, name: string) => {
    try {
      const fb = getFirebase();
      const cred = await fb.auth().createUserWithEmailAndPassword(email, password);
      const db = fb.firestore();
      await db.collection('users').doc(cred.user.uid).set({
        name, email, photoURL: '', role: 'Miembro',
        createdAt: fb.FieldValue.serverTimestamp(),
      });
      showToast('✅ Cuenta creada exitosamente');
    } catch (err: any) {
      console.error('[ArchiFlow] Register error:', err);
      const msg = err.code === 'auth/email-already-in-use' ? 'Este email ya está registrado'
        : err.code === 'auth/weak-password' ? 'La contraseña es muy débil (mín. 6 caracteres)'
        : 'Error al crear cuenta';
      showToast(msg, 'error');
    }
  }, [showToast]);

  const doGoogleLogin = useCallback(async () => {
    try {
      const fb = getFirebase();
      const provider = new fb.auth.GoogleAuthProvider();
      await fb.auth().signInWithPopup(provider);
    } catch (err: any) {
      console.error('[ArchiFlow] Google login error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Error al conectar con Google', 'error');
      }
    }
  }, [showToast]);

  const doMicrosoftLogin = useCallback(async () => {
    try {
      const fb = getFirebase();
      const provider = new fb.auth.OAuthProvider('microsoft.com');
      provider.addScope('Files.ReadWrite.All');
      provider.addScope('Sites.ReadWrite.All');
      const result = await fb.auth().signInWithPopup(provider);
      // Get access token for OneDrive
      setMsLoading(true);
      try {
        const credential = result.credential as any;
        if (credential?.accessToken) {
          setMsAccessToken(credential.accessToken);
          setMsConnected(true);
          sessionStorage.setItem('archiflow-ms-token', credential.accessToken);
          showToast('🔗 Microsoft OneDrive conectado');
        }
      } catch (odErr) {
        console.error('[ArchiFlow] OneDrive token error:', odErr);
      }
      setMsLoading(false);
    } catch (err: any) {
      console.error('[ArchiFlow] Microsoft login error:', err);
      setMsLoading(false);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Error al conectar con Microsoft', 'error');
      }
    }
  }, [showToast]);

  const doLogout = useCallback(async () => {
    try {
      const fb = getFirebase();
      await fb.auth().signOut();
      showToast('Sesión cerrada');
    } catch (err) {
      console.error('[ArchiFlow] Logout error:', err);
      showToast('Error al cerrar sesión', 'error');
    }
  }, [showToast]);

  const updateUserName = useCallback(async (name: string) => {
    try {
      const fb = getFirebase();
      const user = fb.auth().currentUser;
      if (!user) throw new Error('No hay usuario autenticado');
      await user.updateProfile({ displayName: name });
      await fb.firestore().collection('users').doc(user.uid).update({ name });
      showToast('Nombre actualizado');
    } catch (err) {
      console.error('[ArchiFlow] Update name error:', err);
      showToast('Error al actualizar nombre', 'error');
    }
  }, [showToast]);

  const changeUserRole = useCallback(async (userId: string, role: string) => {
    try {
      const fb = getFirebase();
      await fb.firestore().collection('users').doc(userId).update({ role });
      showToast(`Rol cambiado a ${role}`);
    } catch (err) {
      console.error('[ArchiFlow] Change role error:', err);
      showToast('Error al cambiar rol', 'error');
    }
  }, [showToast]);

  const disconnectMicrosoft = useCallback(() => {
    setMsAccessToken(null);
    setMsConnected(false);
    sessionStorage.removeItem('archiflow-ms-token');
    showToast('Microsoft OneDrive desconectado');
  }, [showToast]);

  return {
    authUser, loading,
    doLogin, doRegister, doGoogleLogin, doMicrosoftLogin, doLogout,
    updateUserName, changeUserRole, disconnectMicrosoft,
    msAccessToken, msConnected, msLoading,
  };
}
