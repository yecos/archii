/**
 * ApiWebhooksScreen.tsx — Public API & Webhooks management screen.
 * Allows managing API keys, webhooks, and viewing integration documentation.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useFirestore, useUI } from '@/hooks/useDomain';
import { getFirebase, serverTimestamp, snapToDocs, type QuerySnapshot } from '@/lib/firebase-service';
import { useTenantId } from '@/hooks/useTenantId';
import { confirm } from '@/hooks/useConfirmDialog';
import {
  Key, Globe, Send, Shield, Clock, CheckCircle, XCircle,
  RefreshCw, Copy, Eye, Plus, Trash2, Webhook, ExternalLink, Lock
} from 'lucide-react';

/* ===== TYPES ===== */

interface ApiKeyDoc {
  id: string;
  data: {
    name: string;
    keyHash: string;
    keyPrefix: string;
    lastUsed: unknown;
    requestCount: number;
    isActive: boolean;
    createdAt: unknown;
    createdBy: string;
    expiresAt?: unknown;
  };
}

interface WebhookDoc {
  id: string;
  data: {
    name: string;
    url: string;
    secret: string;
    events: string[];
    isActive: boolean;
    lastDeliveryAt: unknown;
    lastDeliveryStatus: string;
    deliveryCount: number;
    failureCount: number;
    createdAt: unknown;
    createdBy: string;
  };
}

const WEBHOOK_EVENTS = [
  { id: 'task.created', label: 'Tarea creada' },
  { id: 'task.completed', label: 'Tarea completada' },
  { id: 'project.created', label: 'Proyecto creado' },
  { id: 'project.updated', label: 'Proyecto actualizado' },
  { id: 'expense.added', label: 'Gasto registrado' },
  { id: 'invoice.created', label: 'Factura creada' },
  { id: 'photo.uploaded', label: 'Foto subida' },
  { id: 'inspection.completed', label: 'Inspección completada' },
];

export default function ApiWebhooksScreen() {
  const { authUser, isAdmin } = useAuth();
  const tenantId = useTenantId();
  const { showToast } = useUI();
  const [tab, setTab] = useState<'keys' | 'webhooks' | 'docs'>('keys');
  const [apiKeys, setApiKeys] = useState<ApiKeyDoc[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state for new API key
  const [keyName, setKeyName] = useState('');
  const [newKeyDisplay, setNewKeyDisplay] = useState('');

  // Form state for new webhook
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>([]);
  const [newWhSecret, setNewWhSecret] = useState('');

  // Load data
  useEffect(() => {
    if (!authUser || !tenantId) return;
    const db = getFirebase().firestore();

    const unsub1 = db.collection('apiKeys')
      .where('createdBy', '==', authUser.uid)
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc').onSnapshot(
        (snap: QuerySnapshot) => { setApiKeys(snapToDocs(snap) as ApiKeyDoc[]); setLoading(false); },
        (err: unknown) => { console.error('[ArchiFlow] Error loading API keys:', err); setLoading(false); }
      );

    const unsub2 = db.collection('webhooks')
      .where('createdBy', '==', authUser.uid)
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc').onSnapshot(
        (snap: QuerySnapshot) => { setWebhooks(snapToDocs(snap) as WebhookDoc[]); },
        (err: unknown) => { console.error('[ArchiFlow] Error loading webhooks:', err); }
      );

    return () => { unsub1(); unsub2(); };
  }, [authUser, tenantId]);

  // Generate random API key
  const generateApiKey = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const segments: string[] = [];
    for (let i = 0; i < 4; i++) {
      let seg = '';
      for (let j = 0; j < 8; j++) seg += chars[Math.floor(Math.random() * chars.length)];
      segments.push(seg);
    }
    return `afk_${segments.join('_')}`;
  }, []);

  // Generate random secret
  const generateSecret = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) secret += chars[Math.floor(Math.random() * chars.length)];
    return secret;
  }, []);

  // Create API key
  const createApiKey = useCallback(async () => {
    if (!keyName.trim()) { showToast('El nombre es obligatorio', 'error'); return; }
    setCreating(true);
    try {
      const fullKey = generateApiKey();
      const keyPrefix = fullKey.slice(0, 12) + '...';
      // Simple hash for display (in production, use proper crypto)
      const keyHash = btoa(fullKey).slice(0, 32);

      await getFirebase().firestore().collection('apiKeys').add({
        name: keyName.trim(),
        keyHash,
        keyPrefix,
        tenantId,
        lastUsed: null,
        requestCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy: authUser?.uid,
      });

      setNewKeyDisplay(fullKey);
      setKeyName('');
      showToast('API Key creada — copia la clave ahora, no se mostrará de nuevo');
    } catch (err) {
      console.error('[ArchiFlow] Error creating API key:', err);
      showToast('Error al crear API Key', 'error');
    } finally {
      setCreating(false);
    }
  }, [keyName, generateApiKey, authUser, showToast]);

  // Revoke API key
  const revokeKey = useCallback(async (id: string) => {
    if (!(await confirm({ title: 'Revocar API Key', description: '¿Revocar esta API Key? Las integraciones que la usen dejarán de funcionar.', confirmText: 'Revocar', variant: 'destructive' }))) return;
    try {
      await getFirebase().firestore().collection('apiKeys').doc(id).update({ isActive: false });
      showToast('API Key revocada');
    } catch (err) { console.error('[ArchiFlow]', err); }
  }, [showToast]);

  // Create webhook
  const createWebhook = useCallback(async () => {
    if (!whName.trim() || !whUrl.trim()) { showToast('Nombre y URL son obligatorios', 'error'); return; }
    if (whEvents.length === 0) { showToast('Selecciona al menos un evento', 'error'); return; }

    try {
      const secret = generateSecret();
      await getFirebase().firestore().collection('webhooks').add({
        name: whName.trim(),
        url: whUrl.trim(),
        secret,
        tenantId,
        events: whEvents,
        isActive: true,
        lastDeliveryAt: null,
        lastDeliveryStatus: '',
        deliveryCount: 0,
        failureCount: 0,
        createdAt: serverTimestamp(),
        createdBy: authUser?.uid,
      });

      setNewWhSecret(secret);
      setWhName('');
      setWhUrl('');
      setWhEvents([]);
      showToast('Webhook creado');
    } catch (err) {
      console.error('[ArchiFlow] Error creating webhook:', err);
      showToast('Error al crear webhook', 'error');
    }
  }, [whName, whUrl, whEvents, generateSecret, authUser, showToast]);

  // Test webhook
  const testWebhook = useCallback(async (id: string) => {
    setTesting(id);
    try {
      const token = await getFirebase().auth().currentUser?.getIdToken();
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ webhookId: id }),
      });
      const data = await res.json();
      if (data.success) showToast('Ping enviado exitosamente');
      else showToast(`Error: ${data.error || 'Falló el envío'}`, 'error');
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setTesting(null);
    }
  }, [showToast]);

  // Delete webhook
  const deleteWebhook = useCallback(async (id: string) => {
    if (!(await confirm({ title: 'Eliminar Webhook', description: '¿Eliminar este webhook?', confirmText: 'Eliminar', variant: 'destructive' }))) return;
    try {
      await getFirebase().firestore().collection('webhooks').doc(id).delete();
      showToast('Webhook eliminado');
    } catch (err) { console.error('[ArchiFlow]', err); }
  }, [showToast]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    showToast('Copiado al portapapeles');
  }, [showToast]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--af-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center">
            <Webhook size={18} className="stroke-[var(--af-accent)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            API & Webhooks
          </h1>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)] ml-[42px]">
          Integra ArchiFlow con servicios externos mediante API y webhooks
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 mb-6">
        {[
          { id: 'keys' as const, label: 'API Keys', icon: <Key size={14} /> },
          { id: 'webhooks' as const, label: 'Webhooks', icon: <Send size={14} /> },
          { id: 'docs' as const, label: 'Documentación', icon: <Eye size={14} /> },
        ].map(t => (
          <button
            key={t.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all flex-1 justify-center ${
              tab === t.id ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)]'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* === API KEYS TAB === */}
      {tab === 'keys' && (
        <>
          {/* New key alert */}
          {newKeyDisplay && (
            <div className="card-elevated rounded-xl p-4 mb-4 border-2 border-amber-500/30 animate-fadeIn">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={16} className="text-amber-400" />
                <span className="text-[13px] font-semibold text-amber-400">Guarda esta clave — no se mostrará de nuevo</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--af-bg2)] rounded-lg p-2">
                <code className="flex-1 text-[12px] text-[var(--foreground)] break-all font-mono">{newKeyDisplay}</code>
                <button onClick={() => copyToClipboard(newKeyDisplay)} className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20 border-none">
                  <Copy size={14} />
                </button>
              </div>
              <button onClick={() => setNewKeyDisplay('')} className="mt-2 text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:underline bg-transparent border-none">
                Cerrar
              </button>
            </div>
          )}

          {/* Create form */}
          <div className="card-elevated rounded-xl p-4 mb-4">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Plus size={15} /> Nueva API Key
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre (ej: Integración CRM)..."
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                className="flex-1 text-[13px] skeuo-input px-3 py-2"
              />
              <button
                onClick={createApiKey}
                disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--af-accent)] text-background cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors disabled:opacity-50"
              >
                <Key size={14} /> {creating ? 'Creando...' : 'Crear Key'}
              </button>
            </div>
          </div>

          {/* Key list */}
          <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3">API Keys ({apiKeys.length})</h2>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-[13px]">No hay API keys creadas</div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map(k => (
                <div key={k.id} className="card-glass-subtle rounded-lg p-3 flex items-center gap-3">
                  <Key size={16} className={k.data.isActive ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[var(--foreground)]">{k.data.name}</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">
                      <code className="font-mono">{k.data.keyPrefix}</code>
                      {k.data.lastUsed ? <span> · Último uso: {(() => { try { return (k.data.lastUsed as unknown as { toDate: () => Date }).toDate().toLocaleDateString(); } catch { return 'Nunca'; }})()}</span> : null}
                    </div>
                    <div className="text-[10px] text-[var(--af-text3)]">
                      {k.data.requestCount} peticiones
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${k.data.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {k.data.isActive ? 'Activa' : 'Revocada'}
                  </span>
                  {k.data.isActive && (
                    <button onClick={() => revokeKey(k.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent border-none">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === WEBHOOKS TAB === */}
      {tab === 'webhooks' && (
        <>
          {/* New webhook secret alert */}
          {newWhSecret && (
            <div className="card-elevated rounded-xl p-4 mb-4 border-2 border-amber-500/30 animate-fadeIn">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={16} className="text-amber-400" />
                <span className="text-[13px] font-semibold text-amber-400">Guarda este secreto de firma</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--af-bg2)] rounded-lg p-2">
                <code className="flex-1 text-[12px] text-[var(--foreground)] break-all font-mono">{newWhSecret}</code>
                <button onClick={() => copyToClipboard(newWhSecret)} className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20 border-none">
                  <Copy size={14} />
                </button>
              </div>
              <button onClick={() => setNewWhSecret('')} className="mt-2 text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:underline bg-transparent border-none">
                Cerrar
              </button>
            </div>
          )}

          {/* Create form */}
          <div className="card-elevated rounded-xl p-4 mb-4">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Plus size={15} /> Nuevo Webhook
            </h2>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre..." value={whName} onChange={e => setWhName(e.target.value)} className="w-full text-[13px] skeuo-input px-3 py-2" />
              <input type="url" placeholder="https://tu-servidor.com/webhook" value={whUrl} onChange={e => setWhUrl(e.target.value)} className="w-full text-[13px] skeuo-input px-3 py-2" />
              <div>
                <label className="text-[12px] text-[var(--muted-foreground)] mb-1 block">Eventos a escuchar:</label>
                <div className="flex flex-wrap gap-1">
                  {WEBHOOK_EVENTS.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => setWhEvents(prev => prev.includes(ev.id) ? prev.filter(e => e !== ev.id) : [...prev, ev.id])}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer border transition-all ${
                        whEvents.includes(ev.id)
                          ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/30'
                          : 'skeuo-btn text-[var(--muted-foreground)]'
                      }`}
                    >
                      {ev.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createWebhook} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--af-accent)] text-background cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors">
                <Send size={14} /> Crear Webhook
              </button>
            </div>
          </div>

          {/* Webhook list */}
          <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3">Webhooks ({webhooks.length})</h2>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-[var(--af-text3)] text-[13px]">No hay webhooks configurados</div>
          ) : (
            <div className="space-y-2">
              {webhooks.map(wh => (
                <div key={wh.id} className="card-glass-subtle rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <Send size={16} className={wh.data.isActive ? 'text-[var(--af-accent)]' : 'text-[var(--af-text3)]'} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--foreground)]">{wh.data.name}</div>
                      <div className="text-[11px] text-[var(--muted-foreground)] truncate">{wh.data.url}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${wh.data.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {wh.data.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--af-text3)] mb-2 ml-7">
                    <span>{wh.data.events.length} eventos</span>
                    <span>·</span>
                    <span>{wh.data.deliveryCount} entregas exitosas</span>
                    {wh.data.failureCount > 0 && (
                      <><span>·</span><span className="text-red-400">{wh.data.failureCount} fallas</span></>
                    )}
                  </div>
                  <div className="flex gap-2 ml-7">
                    <button
                      onClick={() => testWebhook(wh.id)}
                      disabled={testing === wh.id}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 cursor-pointer hover:bg-blue-500/20 transition-colors disabled:opacity-50 border-none"
                    >
                      {testing === wh.id ? 'Enviando...' : 'Test Ping'}
                    </button>
                    <button onClick={() => deleteWebhook(wh.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent border-none">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === DOCS TAB === */}
      {tab === 'docs' && (
        <div className="space-y-4">
          <div className="card-elevated rounded-xl p-4">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Globe size={15} /> Endpoint Público
            </h2>
            <div className="bg-[var(--af-bg2)] rounded-lg p-3 font-mono text-[12px] text-[var(--af-accent)] mb-3">
              GET {typeof window !== 'undefined' ? window.location.origin : 'https://tu-app.vercel.app'}/api/external/projects
            </div>
            <div className="text-[12px] text-[var(--muted-foreground)] space-y-1">
              <p><strong>Colecciones disponibles:</strong> projects, tasks, expenses</p>
              <p><strong>Autenticación:</strong> Header <code className="bg-[var(--af-bg3)] px-1 rounded">Authorization: Bearer afk_xxxx</code></p>
              <p><strong>Rate limit:</strong> 100 peticiones/minuto por API Key</p>
              <p><strong>Formato respuesta:</strong> JSON con paginación (limit, offset)</p>
            </div>
          </div>

          <div className="card-elevated rounded-xl p-4">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Send size={15} /> Payload del Webhook
            </h2>
            <div className="bg-[var(--af-bg2)] rounded-lg p-3 font-mono text-[11px] text-[var(--foreground)] overflow-x-auto">
              <pre>{`{
  "event": "task.completed",
  "timestamp": "2026-04-16T12:00:00Z",
  "data": {
    "id": "task_123",
    "title": "Instalar ventanas",
    "status": "Completado",
    "projectId": "proj_456",
    "projectName": "Edificio Central"
  },
  "signature": "sha256=abc123..."
}`}</pre>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-2">
              Cada webhook incluye una firma HMAC-SHA256 para verificar la autenticidad del payload.
              Usa tu secreto para verificar: <code className="bg-[var(--af-bg3)] px-1 rounded">hmac(secret, body)</code>
            </p>
          </div>

          <div className="card-elevated rounded-xl p-4">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <ExternalLink size={15} /> Ejemplo de Integración
            </h2>
            <div className="bg-[var(--af-bg2)] rounded-lg p-3 font-mono text-[11px] text-[var(--foreground)] overflow-x-auto">
              <pre>{`// Node.js - Obtener proyectos
const res = await fetch(
  '/api/external/projects?limit=10',
  {
    headers: {
      'Authorization': 'Bearer afk_YOUR_KEY'
    }
  }
);
const { data, total } = await res.json();`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
