'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { getFirebaseIdToken } from '@/lib/firebase-service';
import { getInitials } from '@/lib/helpers';

interface ManageMembersModalProps {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
  isCreator: boolean;
}

export default function ManageMembersModal({ tenantId, tenantName, onClose, isCreator }: ManageMembersModalProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantCode, setTenantCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchAvailable, setSearchAvailable] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [tab, setTab] = useState<'members' | 'add' | 'code'>('members');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const apiCall = useCallback(async (body: any) => {
    const token = await getFirebaseIdToken();
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall({ action: 'get-members', tenantId });
      if (data.error) {
        showToast(data.error, 'error');
        return;
      }
      setMembers(data.members || []);
      setAvailableUsers(data.availableUsers || []);
      setTenantCode(data.tenantCode || '');
    } catch (err: any) {
      showToast('Error cargando miembros: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [tenantId, apiCall]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleAddAllUsers = async () => {
    if (!confirm('Se agregaran TODOS los usuarios registrados al tenant. Continuar?')) return;
    setActionLoading(true);
    try {
      const data = await apiCall({ action: 'add-all-users', tenantId });
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast(`${data.added} usuarios agregados. Total: ${data.newTotalMembers}`);
      await loadMembers();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddSelected = async () => {
    if (selectedUsers.size === 0) { showToast('Selecciona al menos un usuario', 'warning'); return; }
    setActionLoading(true);
    try {
      const emails = availableUsers
        .filter(u => selectedUsers.has(u.uid))
        .map(u => u.email);
      const data = await apiCall({ action: 'add-members', tenantId, emails });
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast(`${data.added} miembros agregados`);
      setSelectedUsers(new Set());
      await loadMembers();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddByEmail = async () => {
    const emails = emailInput.split(',').map(e => e.trim()).filter(e => e.length > 0);
    if (emails.length === 0) { showToast('Ingresa al menos un email', 'warning'); return; }
    setActionLoading(true);
    try {
      const data = await apiCall({ action: 'add-members', tenantId, emails });
      if (data.error) { showToast(data.error, 'error'); return; }
      let msg = `${data.added} miembros agregados`;
      if (data.notFound?.length > 0) msg += `. No encontrados: ${data.notFound.join(', ')}`;
      if (data.alreadyMembers?.length > 0) msg += `. Ya miembros: ${data.alreadyMembers.join(', ')}`;
      showToast(msg);
      setEmailInput('');
      await loadMembers();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (uid: string, name: string) => {
    if (!confirm(`Eliminar a ${name} del tenant?`)) return;
    setActionLoading(true);
    try {
      const data = await apiCall({ action: 'remove-member', tenantId, memberUid: uid });
      if (data.error) { showToast(data.error, 'error'); return; }
      showToast(`${name} eliminado del tenant`);
      await loadMembers();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelect = (uid: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const selectAllVisible = () => {
    const filtered = filteredAvailable.map(u => u.uid);
    setSelectedUsers(prev => {
      const next = new Set(prev);
      filtered.forEach(uid => next.add(uid));
      return next;
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(tenantCode).then(() => showToast('Codigo copiado al portapapeles'));
  };

  const filteredAvailable = availableUsers.filter(u =>
    `${u.name} ${u.email}`.toLowerCase().includes(searchAvailable.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">Gestionar Miembros</h2>
            <p className="text-sm text-gray-400">{tenantName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl p-1">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { key: 'members' as const, label: `Miembros (${members.length})` },
            { key: 'add' as const, label: `Agregar (${availableUsers.length})` },
            { key: 'code' as const, label: 'Codigo' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'members' ? (
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay miembros en este tenant</p>
              ) : (
                members.map((m: any) => (
                  <div key={m.uid} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={m.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {getInitials(m.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{m.name}</p>
                      <p className="text-gray-400 text-xs truncate">{m.email}</p>
                    </div>
                    {m.isCreator && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex-shrink-0">
                        ADMIN
                      </span>
                    )}
                    {isCreator && !m.isCreator && (
                      <button
                        onClick={() => handleRemoveMember(m.uid, m.name)}
                        disabled={actionLoading}
                        className="text-gray-500 hover:text-red-400 text-sm p-1 flex-shrink-0 transition-colors"
                        title="Eliminar del tenant"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
              {isCreator && availableUsers.length > 0 && (
                <button
                  onClick={handleAddAllUsers}
                  disabled={actionLoading}
                  className="w-full mt-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Agregando...' : `Agregar todos los usuarios (${availableUsers.length})`}
                </button>
              )}
            </div>
          ) : tab === 'add' ? (
            <div className="space-y-4">
              {/* Add by selecting from available users */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Usuarios disponibles</label>
                  <button onClick={selectAllVisible} className="text-xs text-blue-400 hover:text-blue-300">
                    Seleccionar todos los visibles
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchAvailable}
                  onChange={e => setSearchAvailable(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-2"
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredAvailable.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No hay usuarios disponibles</p>
                  ) : (
                    filteredAvailable.map(u => (
                      <label
                        key={u.uid}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.has(u.uid) ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-gray-800/50 border border-transparent hover:bg-gray-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(u.uid)}
                          onChange={() => toggleSelect(u.uid)}
                          className="rounded border-gray-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{u.name}</p>
                          <p className="text-gray-400 text-xs truncate">{u.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {selectedUsers.size > 0 && (
                  <button
                    onClick={handleAddSelected}
                    disabled={actionLoading}
                    className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Agregando...' : `Agregar ${selectedUsers.size} seleccionado(s)`}
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-xs text-gray-500">o agregar por email</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              {/* Add by email */}
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">Emails (separados por coma)</label>
                <input
                  type="text"
                  placeholder="correo@ejemplo.com, otro@ejemplo.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAddByEmail}
                  disabled={actionLoading || !emailInput.trim()}
                  className="w-full mt-2 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Agregando...' : 'Agregar por email'}
                </button>
              </div>
            </div>
          ) : (
            /* Code tab */
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-4">Comparte este codigo para que otros se unan al tenant:</p>
              <div className="flex items-center justify-center gap-3">
                <div className="px-6 py-4 rounded-xl bg-gray-800 border border-gray-600">
                  <span className="text-3xl font-bold text-white tracking-[0.3em]">{tenantCode}</span>
                </div>
                <button
                  onClick={copyCode}
                  className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  title="Copiar codigo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-4">Los nuevos miembros entraran como Miembro</p>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mx-4 mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            toast.type === 'error' ? 'bg-red-600/90 text-white' :
            toast.type === 'warning' ? 'bg-yellow-600/90 text-white' :
            'bg-green-600/90 text-white'
          }`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
