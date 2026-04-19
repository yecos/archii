'use client';

import { useState, useEffect } from 'react';
import { getFirebase, getFirebaseIdToken } from '@/lib/firebase-service';

interface Tenant {
  id: string;
  name: string;
  code: string;
  createdBy?: string;
  createdAt?: any;
  members?: string[];
}

interface TenantSelectionScreenProps {
  onSelectTenant: (tenantId: string, tenantName: string) => void;
  showToast: (msg: string, type?: string) => void;
}

export default function TenantSelectionScreen({ onSelectTenant, showToast }: TenantSelectionScreenProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState<'select' | 'create' | 'join'>('select');
  const [error, setError] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const fb = getFirebase();
      const db = fb.firestore();
      const user = fb.auth().currentUser;
      if (!user) return;

      const snap = await db.collection('tenants').where('members', 'array-contains', user.uid).get();
      const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setTenants(list);
    } catch (err: any) {
      console.error('[Tenant] Error loading:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || newName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const fb = getFirebase();
      const db = fb.firestore();
      const ts = fb.firestore.FieldValue.serverTimestamp();

      // Generate unique code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

      // Ensure unique
      let unique = false;
      let attempts = 0;
      while (!unique && attempts < 20) {
        const snap = await db.collection('tenants').where('code', '==', code).limit(1).get();
        if (snap.empty) unique = true;
        else {
          code = '';
          for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        }
        attempts++;
      }

      const ref = await db.collection('tenants').add({
        name: newName.trim(),
        code,
        members: [fb.auth().currentUser?.uid],
        createdBy: fb.auth().currentUser?.uid,
        createdAt: ts,
      });

      // Auto-select the new tenant
      onSelectTenant(ref.id, newName.trim());
    } catch (err: any) {
      console.error('[Tenant] Error creating:', err);
      setError('Error al crear el espacio de trabajo');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || joinCode.trim().length < 4) {
      setError('Ingresa un código válido');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const fb = getFirebase();
      const db = fb.firestore();
      const uid = fb.auth().currentUser?.uid;

      const snap = await db.collection('tenants').where('code', '==', joinCode.trim().toUpperCase()).limit(1).get();

      if (snap.empty) {
        setError('Código no encontrado. Verifica e intenta de nuevo.');
        setJoining(false);
        return;
      }

      const doc = snap.docs[0];
      const data = doc.data();

      if (data.members?.includes(uid)) {
        onSelectTenant(doc.id, data.name);
        setJoining(false);
        return;
      }

      // Add user to members
      await db.collection('tenants').doc(doc.id).update({
        members: fb.firestore.FieldValue.arrayUnion(uid),
      });

      onSelectTenant(doc.id, data.name);
    } catch (err: any) {
      console.error('[Tenant] Error joining:', err);
      setError('Error al unirse. Intenta de nuevo.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 af-noise" style={{ background: 'var(--af-bg1)' }}>
      {/* Ambient background */}
      <div className="af-ambient-bg" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--af-accent)] to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[var(--af-accent)]/20">
            <svg className="w-8 h-8 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl font-bold text-foreground mb-1">
            ArchiFlow
          </h1>
          <p className="text-sm text-muted-foreground">Selecciona o crea tu espacio de trabajo</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--af-bg4)] bg-[var(--af-bg2)]/80 backdrop-blur-xl p-6 shadow-2xl animate-slideUp">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--af-bg3)] mb-6">
            <button
              onClick={() => { setTab('select'); setError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none"
              style={tab === 'select' ? { background: 'var(--af-accent)', color: '#000' } : { background: 'transparent', color: 'var(--muted-foreground)' }}
            >
              Mis espacios
            </button>
            <button
              onClick={() => { setTab('create'); setError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none"
              style={tab === 'create' ? { background: 'var(--af-accent)', color: '#000' } : { background: 'transparent', color: 'var(--muted-foreground)' }}
            >
              Crear nuevo
            </button>
            <button
              onClick={() => { setTab('join'); setError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none"
              style={tab === 'join' ? { background: 'var(--af-accent)', color: '#000' } : { background: 'transparent', color: 'var(--muted-foreground)' }}
            >
              Unirme
            </button>
          </div>

          {/* SELECT TAB */}
          {tab === 'select' && (
            <div>
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-8 h-8 border-2 border-[var(--af-accent)]/30 border-t-[var(--af-accent)] rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                </div>
              ) : tenants.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-40">🏗️</div>
                  <p className="text-sm text-muted-foreground mb-4">No tienes espacios de trabajo</p>
                  <button
                    onClick={() => setTab('create')}
                    className="px-4 py-2 rounded-xl bg-[var(--af-accent)] text-black text-sm font-semibold cursor-pointer hover:opacity-90 transition-colors border-none"
                  >
                    Crear mi primer espacio
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onSelectTenant(t.id, t.name)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--af-bg4)] bg-[var(--af-bg3)] hover:border-[var(--af-accent)]/30 hover:bg-[var(--af-accent)]/5 transition-all cursor-pointer text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--af-accent)]/15 flex items-center justify-center text-lg font-bold text-[var(--af-accent)] shrink-0 group-hover:scale-105 transition-transform">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="font-mono bg-[var(--af-bg4)] px-1.5 py-0.5 rounded text-[10px]">{t.code}</span>
                          <span>{t.members?.length || 1} miembro{(t.members?.length || 1) > 1 ? 's' : ''}</span>
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground group-hover:text-[var(--af-accent)] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREATE TAB */}
          {tab === 'create' && (
            <div>
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Nombre del espacio</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setError(''); }}
                  placeholder="Ej: Constructora López"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--af-bg3)] border border-[var(--af-bg4)] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--af-accent)]/40 focus:border-[var(--af-accent)]/40 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>

              <div className="mb-4 p-3 rounded-xl bg-[var(--af-bg3)] border border-[var(--af-bg4)]">
                <p className="text-xs text-muted-foreground mb-1">Se generará un código de invitación automático para que otros se unan</p>
                <p className="text-xs text-muted-foreground">Ejemplo: <span className="font-mono text-[var(--af-accent)] font-semibold">ARCHI1</span></p>
              </div>

              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={creating || newName.trim().length < 2}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--af-accent)] to-amber-600 text-black text-sm font-semibold cursor-pointer hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed border-none shadow-lg shadow-[var(--af-accent)]/20"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Creando...
                  </span>
                ) : 'Crear espacio de trabajo'}
              </button>
            </div>
          )}

          {/* JOIN TAB */}
          {tab === 'join' && (
            <div>
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Código de invitación</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="Ej: ARCHI1"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--af-bg3)] border border-[var(--af-bg4)] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--af-accent)]/40 focus:border-[var(--af-accent)]/40 transition-all font-mono tracking-widest text-center text-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  autoFocus
                />
              </div>

              <div className="mb-4 p-3 rounded-xl bg-[var(--af-bg3)] border border-[var(--af-bg4)]">
                <p className="text-xs text-muted-foreground">Pide el código al administrador del espacio de trabajo al que quieres unirte</p>
              </div>

              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

              <button
                onClick={handleJoin}
                disabled={joining || joinCode.trim().length < 4}
                className="w-full py-3 rounded-xl bg-[var(--af-bg3)] border border-[var(--af-accent)]/30 text-[var(--af-accent)] text-sm font-semibold cursor-pointer hover:bg-[var(--af-accent)]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[var(--af-accent)]/30 border-t-[var(--af-accent)] rounded-full animate-spin" />
                    Uniéndose...
                  </span>
                ) : 'Unirme al espacio'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
          ArchiFlow Premium — Multi-tenancy habilitado
        </p>
      </div>
    </div>
  );
}
