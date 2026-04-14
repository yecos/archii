'use client';
import React from 'react';
import { useUI } from '@/hooks/useDomain';
import { useNotif } from '@/hooks/useDomain';
import { Bell, MessageCircle, ClipboardList, Calendar, Package, Folder, CheckCircle, Clock, Volume2, Check, Loader, XCircle } from 'lucide-react';

export default React.memo(function NotifPanel() {
  const ui = useUI();
  const notif = useNotif();

  if (!notif.showNotifPanel) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => notif.setShowNotifPanel(false)} />
      <div className="absolute right-2 sm:right-4 top-[60px] z-[60] w-[calc(100vw-16px)] sm:w-[400px] max-h-[85dvh] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col" style={{ animation: 'fadeIn 0.2s ease' }}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-[15px] font-semibold">Notificaciones</div>
              {notif.unreadCount > 0 && <span className="min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{notif.unreadCount}</span>}
            </div>
            <div className="flex items-center gap-2">
              {notif.unreadCount > 0 && (
                <button className="text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline" onClick={notif.markAllNotifRead}>
                  Leer todas
                </button>
              )}
              <button className="text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:text-red-400" onClick={notif.clearNotifHistory}>
                Limpiar
              </button>
            </div>
          </div>
          {/* Category filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            {[
              { key: 'all', label: 'Todo', Icon: Bell },
              { key: 'chat', label: 'Chat', Icon: MessageCircle },
              { key: 'task', label: 'Tareas', Icon: ClipboardList },
              { key: 'meeting', label: 'Reuniones', Icon: Calendar },
              { key: 'inventory', label: 'Inventario', Icon: Package },
              { key: 'project', label: 'Proyectos', Icon: Folder },
              { key: 'approval', label: 'Aprob.', Icon: CheckCircle },
              { key: 'reminder', label: 'Record.', Icon: Clock },
            ].map(f => (
              <button
                key={f.key}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${notif.notifFilterCat === f.key ? 'bg-[var(--af-accent)] text-background' : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                onClick={() => notif.setNotifFilterCat(f.key)}
              ><f.Icon size={12} /> {f.label}</button>
            ))}
          </div>
        </div>

        {/* Permission prompt */}
        {notif.notifPermission !== 'granted' && (
          <div className="p-4 bg-amber-500/5 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <Bell size={20} className="stroke-[var(--af-accent)]" />
              <div className="flex-1">
                <div className="text-[13px] font-medium">Activar notificaciones del sistema</div>
                <div className="text-[11px] text-[var(--muted-foreground)]">Para recibir alertas incluso con la app cerrada</div>
              </div>
              <button className="px-3 py-1.5 bg-[var(--af-accent)] text-background rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors border-none flex-shrink-0" onClick={notif.requestNotifPermission}>
                Activar
              </button>
            </div>
          </div>
        )}

        {/* Notification list */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {(() => {
            const filtered = notif.notifFilterCat === 'all' ? notif.notifHistory : notif.notifHistory.filter(n => n.type === notif.notifFilterCat);
            if (filtered.length === 0) return (
              <div className="p-8 text-center">
                <Bell size={28} className="stroke-[var(--muted-foreground)] mb-2" />
                <div className="text-sm text-[var(--muted-foreground)]">{notif.notifFilterCat === 'all' ? 'Sin notificaciones' : 'Sin notificaciones de esta categoría'}</div>
                <div className="text-[11px] text-[var(--af-text3)] mt-1">Las alertas aparecerán aquí</div>
              </div>
            );
            return filtered.slice(0, 50).map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-[var(--af-bg3)] border-b border-[var(--border)]/50 ${!n.read ? 'bg-[var(--af-accent)]/5' : ''}`}
                onClick={() => {
                  notif.markNotifRead(n.id);
                  if (n.screen) {
                    ui.navigateTo(n.screen, n.itemId);
                    notif.setShowNotifPanel(false);
                  }
                }}
              >
                <div className="flex-shrink-0 mt-0.5"><Bell size={16} className="stroke-[var(--muted-foreground)]" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className={`text-[13px] leading-snug ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</div>
                    {n.type && <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${({chat:'bg-blue-500/10 text-blue-400',task:'bg-purple-500/10 text-purple-400',meeting:'bg-amber-500/10 text-amber-400',inventory:'bg-emerald-500/10 text-emerald-400',project:'bg-cyan-500/10 text-cyan-400',approval:'bg-pink-500/10 text-pink-400',reminder:'bg-red-500/10 text-red-400'} as any)[n.type] || 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{n.type}</span>}
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{n.body}</div>
                  <div className="text-[10px] text-[var(--af-text3)] mt-1">
                    {(() => {
                      const d = new Date(n.timestamp);
                      const now = new Date();
                      const diff = now.getTime() - d.getTime();
                      if (diff < 60000) return 'Ahora mismo';
                      if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
                      if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
                      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
                    })()}
                  </div>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--af-accent)] flex-shrink-0 mt-2" />}
              </div>
            ));
          })()}
        </div>

        {/* Settings footer */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--af-bg3)] flex-shrink-0">
          <div className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Configurar alertas</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { key: 'chat', label: 'Chat', Icon: MessageCircle },
              { key: 'tasks', label: 'Tareas', Icon: ClipboardList },
              { key: 'meetings', label: 'Reuniones', Icon: Calendar },
              { key: 'approvals', label: 'Aprobaciones', Icon: CheckCircle },
              { key: 'inventory', label: 'Inventario', Icon: Package },
              { key: 'projects', label: 'Proyectos', Icon: Folder },
            ].map(p => (
              <button
                key={p.key}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${notif.notifPrefs[p.key] ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}
                onClick={() => notif.toggleNotifPref(p.key)}
              >
                <p.Icon size={11} /> {p.label}
                {notif.notifPrefs[p.key] && <Check size={10} className="stroke-current" strokeWidth={3} />}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <button
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${notif.notifSound ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}
                onClick={() => notif.setNotifSound(!notif.notifSound)}
              ><Volume2 size={12} className="inline mr-0.5" /> Sonido</button>
              <span className="text-[10px] text-[var(--af-text3)]">
                {notif.notifPermission === 'granted' ? <><CheckCircle size={10} className="inline mr-0.5 text-emerald-400" /> OS activas</> : notif.notifPermission === 'denied' ? <><XCircle size={10} className="inline mr-0.5 text-red-400" /> OS bloqueadas</> : <><Loader size={10} className="inline mr-0.5 animate-spin" /> Sin activar OS</>}
              </span>
            </div>
            <span className="text-[10px] text-[var(--af-text3)]">
              {notif.notifHistory.length} total
            </span>
          </div>
        </div>
      </div>
    </>
  );
});
