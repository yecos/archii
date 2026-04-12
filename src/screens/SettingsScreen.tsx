'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import { avatarColor } from '@/lib/helpers';
import { ROLE_ICONS } from '@/lib/constants';

export default function SettingsScreen() {
  const {
    authUser,
    userName,
    initials,
    teamUsers,
    isEmailAdmin,
    darkMode,
    toggleTheme,
    notifPermission,
    notifPrefs,
    toggleNotifPref,
    requestNotifPermission,
    notifSound,
    setNotifSound,
    msConnected,
    disconnectMicrosoft,
    doMicrosoftLogin,
    forms,
    setForms,
    updateUserName,
    projects,
    tasks,
    expenses,
    isStandalone,
    showToast,
  } = useApp();

  return (<div className="animate-fadeIn space-y-5">
    {/* Account */}
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="text-[15px] font-semibold mb-4">👤 Cuenta</div>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 flex-shrink-0 ${avatarColor(authUser?.uid)}`} style={authUser?.photoURL ? { backgroundImage: `url(${authUser.photoURL})`, backgroundSize: 'cover' } : {}}>{authUser?.photoURL ? '' : initials}</div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold">{userName}</div>
          <div className="text-sm text-[var(--muted-foreground)]">{authUser?.email}</div>
          <div className="text-xs text-[var(--af-text3)] mt-0.5">{(() => { const myRole = teamUsers.find(u => u.id === authUser?.uid)?.data?.role || 'Miembro'; return `${ROLE_ICONS[isEmailAdmin ? 'Admin' : myRole] || '👤'} ${isEmailAdmin ? 'Admin' : myRole}`; })()}</div>
        </div>
      </div>
      {/* Edit name */}
      {forms.editingName ? (
        <div className="flex gap-2 items-center mb-3">
          <input className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" value={forms.editNameVal || userName} onChange={e => setForms(p => ({ ...p, editNameVal: e.target.value }))} onKeyDown={e => e.key === 'Enter' && updateUserName()} autoFocus />
          <button className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={updateUserName}>Guardar</button>
          <button className="px-3 py-2 bg-[var(--af-bg3)] text-[var(--muted-foreground)] rounded-lg text-xs cursor-pointer border-none" onClick={() => setForms(p => ({ ...p, editingName: false }))}>X</button>
        </div>
      ) : (
        <button className="text-xs text-[var(--af-accent)] cursor-pointer hover:underline mb-3 block" onClick={() => setForms(p => ({ ...p, editingName: true, editNameVal: userName }))}>✏️ Cambiar nombre</button>
      )}
    </div>

    {/* Appearance */}
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="text-[15px] font-semibold mb-4">🎨 Apariencia</div>
      <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
        <div>
          <div className="text-sm font-medium">Modo oscuro</div>
          <div className="text-xs text-[var(--muted-foreground)]">Cambiar entre tema claro y oscuro</div>
        </div>
        <button onClick={toggleTheme} className={`w-12 h-7 rounded-full transition-colors relative ${darkMode ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`}>
          <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${darkMode ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      <div className="flex items-center justify-between py-3">
        <div>
          <div className="text-sm font-medium">Atajos de teclado</div>
          <div className="text-xs text-[var(--muted-foreground)]">Usa Ctrl+D para cambiar tema</div>
        </div>
        <div className="text-[10px] px-2 py-1 bg-[var(--af-bg3)] rounded text-[var(--muted-foreground)]">Ctrl+D</div>
      </div>
    </div>

    {/* Notifications */}
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-semibold">🔔 Notificaciones</div>
        {notifPermission === 'default' && <button onClick={requestNotifPermission} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg cursor-pointer border-none hover:bg-blue-600 transition-colors">Activar</button>}
        {notifPermission === 'granted' && <span className="text-[10px] px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded-full">Activadas</span>}
        {notifPermission === 'denied' && <span className="text-[10px] px-2 py-1 bg-red-500/15 text-red-400 rounded-full">Bloqueadas</span>}
      </div>
      <div className="space-y-3">
        {Object.entries(notifPrefs).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between py-2">
            <div className="text-sm capitalize">{key === 'chat' ? '💬 Chat' : key === 'tasks' ? '📋 Tareas' : key === 'meetings' ? '📅 Reuniones' : key === 'approvals' ? '✅ Aprobaciones' : key === 'inventory' ? '📦 Inventario' : key === 'projects' ? '🏗️ Proyectos' : `🔔 ${key}`}</div>
            <button onClick={() => toggleNotifPref(key)} className={`w-10 h-6 rounded-full transition-colors relative ${val ? 'bg-emerald-500' : 'bg-[var(--af-bg4)]'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${val ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
        <div>
          <div className="text-sm font-medium">🔊 Sonido de alerta</div>
          <div className="text-xs text-[var(--muted-foreground)]">Tono diferente por tipo de notificación</div>
        </div>
        <button onClick={() => setNotifSound(!notifSound)} className={`w-10 h-6 rounded-full transition-colors relative ${notifSound ? 'bg-emerald-500' : 'bg-[var(--af-bg4)]'}`}>
          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notifSound ? 'left-5' : 'left-1'}`} />
        </button>
      </div>
    </div>

    {/* OneDrive */}
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="text-[15px] font-semibold mb-4">☁️ OneDrive</div>
      {msConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm"><span className="text-emerald-400">✓</span> Conectado con Microsoft</div>
          <button className="text-xs text-red-400 hover:text-red-300 cursor-pointer hover:underline" onClick={disconnectMicrosoft}>Desconectar cuenta</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-[var(--muted-foreground)]">No conectado</div>
          <button className="text-xs bg-[#0078d4] text-white px-3 py-1.5 rounded-lg cursor-pointer border-none hover:bg-[#106ebe] transition-colors" onClick={() => doMicrosoftLogin()}>Conectar OneDrive</button>
        </div>
      )}
    </div>

    {/* Data & Cache */}
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="text-[15px] font-semibold mb-4">💾 Datos y almacenamiento</div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Limpiar caché local</div>
            <div className="text-xs text-[var(--muted-foreground)]">Libera espacio de almacenamiento del navegador</div>
          </div>
          <button onClick={() => { if (confirm('¿Limpiar caché? La app se recargará.')) { localStorage.clear(); caches.keys().then(names => names.forEach(n => caches.delete(n))); window.location.reload(); } }} className="text-xs px-3 py-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] rounded-lg cursor-pointer border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors">Limpiar</button>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div>
            <div className="text-sm font-medium">Exportar datos (CSV)</div>
            <div className="text-xs text-[var(--muted-foreground)]">Descarga proyectos, tareas y gastos</div>
          </div>
          <button onClick={() => {
            const data = { projects: projects.map(p => ({ id: p.id, ...p.data })), tasks: tasks.map(t => ({ id: t.id, ...t.data })), expenses: expenses.map(e => ({ id: e.id, ...e.data })) };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `archiflow-data-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
            showToast('Datos exportados');
          }} className="text-xs px-3 py-1.5 bg-[var(--af-bg3)] text-[var(--foreground)] rounded-lg cursor-pointer border border-[var(--border)] hover:bg-[var(--af-bg4)] transition-colors">Exportar</button>
        </div>
      </div>
    </div>

    {/* About */}
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="text-[15px] font-semibold mb-4">ℹ️ Acerca de</div>
      <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
        <div className="flex justify-between"><span>ArchiFlow</span><span className="font-mono text-xs">v1.2.0</span></div>
        <div className="flex justify-between"><span>Plataforma</span><span>Next.js + Firebase</span></div>
        <div className="flex justify-between"><span>PWA</span><span>{isStandalone ? 'Instalada' : 'No instalada'}</span></div>
        <div className="flex justify-between"><span>Notificaciones</span><span>{notifPermission === 'granted' ? 'Activadas' : 'Inactivas'}</span></div>
      </div>
    </div>
  </div>);
}
