'use client';
import { Plus, Eye, Pencil, Trash2, ChevronLeft, X } from 'lucide-react';
import { confirm } from '@/hooks/useConfirmDialog';
import type { DailyLog } from '@/lib/types';

interface WorkPhase {
  id: string;
  data: Record<string, any>;
}

interface CommentsState {
  dailyLogs: DailyLog[];
  dailyLogTab: string;
  selectedLogId: string | null;
  logForm: Record<string, any>;
  setDailyLogTab: (tab: string) => void;
  setSelectedLogId: (id: string | null) => void;
  resetLogForm: () => void;
  setLogForm: (updater: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  openEditLog: (log: DailyLog) => void;
  deleteDailyLog: (logId: string) => void;
  saveDailyLog: () => void;
}

interface ProjectObraProps {
  workView: string;
  workPhases: WorkPhase[];
  cmt: CommentsState;
  initDefaultPhases: () => void;
  updatePhaseStatus: (phaseId: string, status: string) => void;
  calcGanttDays: (startDate: string, endDate: string) => number;
  calcGanttOffset: (phaseStart: string, timelineStart: string) => number;
  setForms: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
}

export default function ProjectObra({ workView, workPhases, cmt, initDefaultPhases, updatePhaseStatus, calcGanttDays, calcGanttOffset, setForms }: ProjectObraProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 skeuo-panel rounded-lg p-1">
          <button className={`px-3 py-1.5 rounded-md text-[12px] cursor-pointer transition-all ${workView === 'timeline' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, workView: 'timeline' }))}>Timeline</button>
          <button className={`px-3 py-1.5 rounded-md text-[12px] cursor-pointer transition-all ${workView === 'gantt' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, workView: 'gantt' }))}>Gantt</button>
          <button className={`px-3 py-1.5 rounded-md text-[12px] cursor-pointer transition-all ${workView === 'bitacora' ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, workView: 'bitacora' }))}>📝 Bitácora</button>
        </div>
        <div className="flex gap-2">
          {workView !== 'bitacora' && workPhases.length === 0 && <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={initDefaultPhases}>Inicializar fases</button>}
        </div>
      </div>

      {/* Sub-tab: Timeline */}
      {workView === 'timeline' && (workPhases.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">🏗️</div><div className="text-sm">Haz clic en &quot;Inicializar fases&quot; para comenzar el seguimiento</div></div> : (
      <div className="relative pl-6">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--input)]" />
        {workPhases.map(phase => {
          const isActive = phase.data.status === 'En progreso', isDone = phase.data.status === 'Completada';
          return (<div key={phase.id} className="relative mb-5">
            <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--card)] ${isDone ? 'bg-emerald-500' : isActive ? 'bg-[var(--af-accent)] shadow-[0_0_0_3px_rgba(var(--af-accent-rgb),0.2)]' : 'bg-[var(--af-bg4)] border-[var(--input)]'}`} />
            <div className="card-elevated p-4 hover:border-[var(--input)] transition-all">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="text-sm font-semibold">{phase.data.name}</div>
                <select className="skeuo-input rounded-md px-2 py-1 text-xs" value={phase.data.status} onChange={e => updatePhaseStatus(phase.id, e.target.value)}>
                  <option value="Pendiente">Pendiente</option><option value="En progreso">En progreso</option><option value="Completada">Completada</option>
                </select>
              </div>
              {phase.data.description && <div className="text-xs text-[var(--muted-foreground)] mb-2">{phase.data.description}</div>}
              <div className="flex items-center gap-3 text-[11px] text-[var(--af-text3)]">
                {phase.data.startDate && <span>Inicio: {phase.data.startDate}</span>}
                {phase.data.endDate && <span>Fin: {phase.data.endDate}</span>}
              </div>
            </div>
          </div>);
        })}
      </div>
      ))}

      {/* Sub-tab: Gantt */}
      {workView === 'gantt' && (workPhases.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">🏗️</div><div className="text-sm">Haz clic en &quot;Inicializar fases&quot; para comenzar el seguimiento</div></div> : (
        <div className="card-elevated p-4 overflow-x-auto">
          {(() => {
            const phasesWithDates = workPhases.filter(ph => ph.data.startDate || ph.data.endDate);
            const allDates = workPhases.filter(ph => ph.data.startDate).map(ph => new Date(ph.data.startDate).getTime()).concat(workPhases.filter(ph => ph.data.endDate).map(ph => new Date(ph.data.endDate).getTime()));
            const timelineStart = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
            const timelineEnd = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date(timelineStart.getTime() + 30 * 86400000);
            const totalDays = Math.max(1, Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / 86400000) + 7);
            const dayWidth = Math.max(24, Math.min(50, 700 / totalDays));
            const ganttColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
            return phasesWithDates.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">Las fases necesitan fechas de inicio/fin para mostrar el Gantt. Edita las fases para agregar fechas.</div>
            ) : (
              <div>
                <div className="flex text-[10px] text-[var(--muted-foreground)] mb-2 ml-[140px]" style={{ width: totalDays * dayWidth }}>
                  {Array.from({ length: Math.min(totalDays, 30) }, (_, i) => {
                    const d = new Date(timelineStart.getTime() + i * 86400000);
                    return <div key={i} className="flex-shrink-0 text-center" style={{ width: dayWidth }}>{d.getDate()}/{d.getMonth() + 1}</div>;
                  })}
                </div>
                {workPhases.map((phase, idx) => {
                  const days = calcGanttDays(phase.data.startDate, phase.data.endDate);
                  const offset = calcGanttOffset(phase.data.startDate, timelineStart.toISOString());
                  const color = ganttColors[idx % ganttColors.length];
                  const isDone = phase.data.status === 'Completada';
                  const isActive = phase.data.status === 'En progreso';
                  return (
                    <div key={phase.id} className="flex items-center mb-1.5">
                      <div className="w-[130px] text-[11px] font-medium truncate pr-2 shrink-0 flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isDone ? 'bg-emerald-500' : isActive ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} />
                        {phase.data.name}
                      </div>
                      <div className="relative h-6" style={{ width: totalDays * dayWidth }}>
                        <div className={`absolute h-6 rounded-md flex items-center px-2 text-[10px] font-medium text-white ${isDone ? 'opacity-70' : ''}`} style={{ left: offset * dayWidth, width: Math.max(days * dayWidth, 20), backgroundColor: color }}>
                          {days > 2 && phase.data.name.substring(0, 12)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ))}

      {/* Sub-tab: Bitácora */}
      {workView === 'bitacora' && (
      <div>
        {/* Bitácora header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] font-medium text-[var(--muted-foreground)]">
            {cmt.dailyLogs.length} registro{cmt.dailyLogs.length !== 1 ? 's' : ''} de bitácora
          </div>
          <button
            className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity"
            onClick={() => { cmt.resetLogForm(); cmt.setSelectedLogId(null); cmt.setDailyLogTab('create'); }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Nuevo Registro
          </button>
        </div>

        {/* Bitácora: List view */}
        {cmt.dailyLogTab === 'list' && (
          <div className="space-y-3">
            {cmt.dailyLogs.length === 0 ? (
              <div className="text-center py-14 text-[var(--af-text3)]">
                <div className="text-5xl mb-3">📋</div>
                <div className="text-sm font-medium mb-1">Sin registros de bitácora</div>
                <div className="text-xs">Crea el primer registro diario con actividades, clima y personal</div>
                <button className="mt-4 text-xs px-4 py-2 rounded-lg skeuo-btn text-[var(--muted-foreground)] cursor-pointer" onClick={() => { cmt.resetLogForm(); cmt.setDailyLogTab('create'); }}>
                  Crear primer registro
                </button>
              </div>
            ) : (
              cmt.dailyLogs.map(log => {
                const d = log.data;
                const logDate = new Date(d.date + 'T12:00:00');
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = d.date === todayStr;
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                const isYesterday = d.date === yesterday.toISOString().split('T')[0];
                const dateLabel = isToday ? 'Hoy' : isYesterday ? 'Ayer' : logDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });

                return (
                  <div key={log.id} className="card-elevated overflow-hidden hover:border-[var(--input)] transition-all group">
                    {/* Log header */}
                    <div className="flex items-center justify-between px-4 py-3 skeuo-divider bg-[var(--af-bg3)]/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isToday ? 'bg-[var(--af-accent)]/15' : 'skeuo-well'}`}>
                          {d.weather ? (() => { switch(d.weather) { case 'Soleado': return '☀️'; case 'Nublado': return '☁️'; case 'Lluvioso': return '🌧️'; case 'Parcialmente nublado': return '⛅'; case 'Tormenta': return '⛈️'; default: return '🌤️'; } })() : '📅'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold capitalize">{dateLabel}</div>
                          <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-2">
                            {d.weather && <span>{d.weather}</span>}
                            {d.temperature && <span>· {d.temperature}°C</span>}
                            {d.laborCount > 0 && <span>· {d.laborCount} personas</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="skeuo-btn w-8 h-8 p-0 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] cursor-pointer" onClick={() => { cmt.setSelectedLogId(log.id); cmt.setDailyLogTab('detail'); }} title="Ver detalle">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="skeuo-btn w-8 h-8 p-0 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] cursor-pointer" onClick={() => cmt.openEditLog(log)} title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer border-none bg-transparent transition-colors" onClick={async () => { if (await confirm({ title: 'Eliminar registro', description: '¿Eliminar este registro de bitácora?', confirmText: 'Eliminar', variant: 'destructive' })) cmt.deleteDailyLog(log.id); }} title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Log summary */}
                    <div className="px-4 py-3">
                      {d.activities?.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] mb-1">Actividades</div>
                          <div className="flex flex-wrap gap-1">
                            {d.activities.map((a: string, i: number) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 rounded-md skeuo-badge text-[var(--foreground)]">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {d.observations && (
                        <div className="text-[12px] text-[var(--muted-foreground)] mt-1 line-clamp-2">{d.observations}</div>
                      )}
                      {d.photos?.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {d.photos!.slice(0, 4).map((p: string, i: number) => (
                            <img key={i} src={p} alt="" className="w-14 h-14 rounded-lg object-cover border border-[var(--border)]" loading="lazy" />
                          ))}
                          {d.photos!.length > 4 && <div className="w-14 h-14 rounded-lg skeuo-panel flex items-center justify-center text-[11px] text-[var(--muted-foreground)]">+{d.photos!.length - 4}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Bitácora: Detail view */}
        {cmt.dailyLogTab === 'detail' && cmt.selectedLogId && (() => {
          const log = cmt.dailyLogs.find((l: DailyLog) => l.id === cmt.selectedLogId);
          if (!log) return <div className="text-center py-8 text-[var(--af-text3)]">Registro no encontrado</div>;
          const d = log.data;
          return (
            <div className="space-y-4">
              <button className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer border-none bg-transparent" onClick={() => { cmt.setDailyLogTab('list'); cmt.setSelectedLogId(null); }}>
                <ChevronLeft className="w-3.5 h-3.5" />
                Volver a bitácora
              </button>

              <div className="card-elevated p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-lg font-semibold">{new Date(d.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                      {d.supervisor && <span>Supervisor: {d.supervisor}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.weather && <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg skeuo-badge text-xs">{(() => { switch(d.weather) { case 'Soleado': return '☀️'; case 'Nublado': return '☁️'; case 'Lluvioso': return '🌧️'; case 'Parcialmente nublado': return '⛅'; case 'Tormenta': return '⛈️'; default: return '🌤️'; } })()} {d.weather}</div>}
                    {d.temperature > 0 && <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg skeuo-badge text-xs">🌡️ {d.temperature}°C</div>}
                  </div>
                </div>

                {d.activities?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] mb-2">Actividades Realizadas</div>
                    <div className="space-y-1.5">
                      {d.activities!.map((a: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--af-accent)] mt-1.5 flex-shrink-0" />
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {d.laborCount > 0 && (
                    <div className="skeuo-panel rounded-lg p-3">
                      <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] mb-1">Personal en Obra</div>
                      <div className="text-xl font-semibold text-[var(--af-accent)]">{d.laborCount}</div>
                    </div>
                  )}
                  {d.equipment?.length > 0 && (
                    <div className="skeuo-panel rounded-lg p-3">
                      <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] mb-1">Equipos</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {d.equipment!.map((e: string, i: number) => <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--card)]">{e}</span>)}
                      </div>
                    </div>
                  )}
                </div>

                {d.materials?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] mb-2">Materiales Utilizados</div>
                    <div className="flex flex-wrap gap-1">
                      {d.materials!.map((m: string, i: number) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{m}</span>)}
                    </div>
                  </div>
                )}

                {d.photos?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] mb-2">Fotos del Día ({d.photos!.length})</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {d.photos!.map((p: string, i: number) => <img key={i} src={p} alt="" className="w-full h-28 rounded-lg object-cover border border-[var(--border)] cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" />)}
                    </div>
                  </div>
                )}

                {d.observations && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] mb-2">Observaciones</div>
                    <div className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap skeuo-well rounded-lg p-3">{d.observations}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Bitácora: Create/Edit form */}
        {cmt.dailyLogTab === 'create' && (
          <div className="space-y-4">
            <button className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer border-none bg-transparent" onClick={() => { cmt.setDailyLogTab('list'); cmt.setSelectedLogId(null); cmt.resetLogForm(); }}>
              <ChevronLeft className="w-3.5 h-3.5" />
              Volver a bitácora
            </button>

            <div className="card-elevated p-5">
              <div className="text-[15px] font-semibold mb-4">{cmt.selectedLogId ? '✏️ Editar Registro' : '📝 Nuevo Registro'}</div>

              {/* Date and Weather */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Fecha *</label>
                  <input type="date" className="w-full skeuo-input rounded-lg px-3 py-2 text-sm" value={cmt.logForm.date} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Clima</label>
                  <select className="w-full skeuo-input rounded-lg px-3 py-2 text-sm cursor-pointer" value={cmt.logForm.weather} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, weather: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    <option value="Soleado">☀️ Soleado</option>
                    <option value="Parcialmente nublado">⛅ Parcialmente nublado</option>
                    <option value="Nublado">☁️ Nublado</option>
                    <option value="Lluvioso">🌧️ Lluvioso</option>
                    <option value="Tormenta">⛈️ Tormenta</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Temperatura (°C)</label>
                  <input type="number" className="w-full skeuo-input rounded-lg px-3 py-2 text-sm" placeholder="25" value={cmt.logForm.temperature} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, temperature: e.target.value }))} />
                </div>
              </div>

              {/* Supervisor and Labor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Supervisor</label>
                  <input type="text" className="w-full skeuo-input rounded-lg px-3 py-2 text-sm" placeholder="Nombre del supervisor" value={cmt.logForm.supervisor} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, supervisor: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Personal en Obra</label>
                  <input type="number" className="w-full skeuo-input rounded-lg px-3 py-2 text-sm" placeholder="10" value={cmt.logForm.laborCount} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, laborCount: e.target.value }))} />
                </div>
              </div>

              {/* Activities */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2 block">Actividades Realizadas</label>
                <div className="space-y-2">
                  {(cmt.logForm.activities || ['']).map((a: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" className="flex-1 skeuo-input rounded-lg px-3 py-2 text-sm" placeholder={`Actividad ${i + 1}`} value={a} onChange={e => { const arr = [...(cmt.logForm.activities || [''])]; arr[i] = e.target.value; cmt.setLogForm((p: Record<string, any>) => ({ ...p, activities: arr })); }} />
                      {(cmt.logForm.activities || ['']).length > 1 && (
                        <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer border-none bg-transparent flex-shrink-0 transition-colors" onClick={() => { const arr = (cmt.logForm.activities || ['']).filter((_: string, idx: number) => idx !== i); cmt.setLogForm((p: Record<string, any>) => ({ ...p, activities: arr.length > 0 ? arr : [''] })); }}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/40 cursor-pointer bg-transparent transition-colors skeuo-btn" onClick={() => cmt.setLogForm((p: Record<string, any>) => ({ ...p, activities: [...(p.activities || ['']), ''] }))}>
                    + Agregar actividad
                  </button>
                </div>
              </div>

              {/* Equipment */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2 block">Equipos Utilizados</label>
                <div className="space-y-2">
                  {(cmt.logForm.equipment || ['']).map((e: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" className="flex-1 skeuo-input rounded-lg px-3 py-2 text-sm" placeholder={`Equipo ${i + 1}`} value={e} onChange={ev => { const arr = [...(cmt.logForm.equipment || [''])]; arr[i] = ev.target.value; cmt.setLogForm((p: Record<string, any>) => ({ ...p, equipment: arr })); }} />
                      {(cmt.logForm.equipment || ['']).length > 1 && (
                        <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer border-none bg-transparent flex-shrink-0 transition-colors" onClick={() => { const arr = (cmt.logForm.equipment || ['']).filter((_: string, idx: number) => idx !== i); cmt.setLogForm((p: Record<string, any>) => ({ ...p, equipment: arr.length > 0 ? arr : [''] })); }}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/40 cursor-pointer bg-transparent transition-colors skeuo-btn" onClick={() => cmt.setLogForm((p: Record<string, any>) => ({ ...p, equipment: [...(p.equipment || ['']), ''] }))}>
                    + Agregar equipo
                  </button>
                </div>
              </div>

              {/* Materials */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2 block">Materiales Utilizados</label>
                <div className="space-y-2">
                  {(cmt.logForm.materials || ['']).map((m: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" className="flex-1 skeuo-input rounded-lg px-3 py-2 text-sm" placeholder={`Material ${i + 1}`} value={m} onChange={ev => { const arr = [...(cmt.logForm.materials || [''])]; arr[i] = ev.target.value; cmt.setLogForm((p: Record<string, any>) => ({ ...p, materials: arr })); }} />
                      {(cmt.logForm.materials || ['']).length > 1 && (
                        <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 cursor-pointer border-none bg-transparent flex-shrink-0 transition-colors" onClick={() => { const arr = (cmt.logForm.materials || ['']).filter((_: string, idx: number) => idx !== i); cmt.setLogForm((p: Record<string, any>) => ({ ...p, materials: arr.length > 0 ? arr : [''] })); }}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--af-accent)]/40 cursor-pointer bg-transparent transition-colors skeuo-btn" onClick={() => cmt.setLogForm((p: Record<string, any>) => ({ ...p, materials: [...(p.materials || ['']), ''] }))}>
                    + Agregar material
                  </button>
                </div>
              </div>

              {/* Photos */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2 block">Fotos del Día</label>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {(cmt.logForm.photos || []).map((p: string, i: number) => (
                    <div key={i} className="relative flex-shrink-0 w-20 h-20">
                      <img src={p} alt="" className="w-full h-full rounded-lg object-cover border border-[var(--border)]" loading="lazy" />
                      <button className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center cursor-pointer border-none leading-none" onClick={() => { const arr = (cmt.logForm.photos || []).filter((_: string, idx: number) => idx !== i); cmt.setLogForm((pf: Record<string, any>) => ({ ...pf, photos: arr })); }}>✕</button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--border)] flex items-center justify-center cursor-pointer hover:border-[var(--af-accent)]/40 transition-colors flex-shrink-0">
                    <input type="file" accept="image/*" className="hidden" multiple onChange={e => { const files = e.target.files; if (!files) return; Array.from(files).forEach(f => { const reader = new FileReader(); reader.onload = () => cmt.setLogForm((pf: Record<string, any>) => ({ ...pf, photos: [...(pf.photos || []), reader.result as string] })); reader.readAsDataURL(f); }); }} />
                    <Plus className="w-5 h-5 text-[var(--muted-foreground)]" />
                  </label>
                </div>
              </div>

              {/* Observations */}
              <div className="mb-5">
                <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 block">Observaciones</label>
                <textarea className="w-full skeuo-input rounded-lg px-3 py-2.5 text-sm resize-none" rows={3} placeholder="Notas adicionales del día..." value={cmt.logForm.observations} onChange={e => cmt.setLogForm((p: Record<string, any>) => ({ ...p, observations: e.target.value }))} />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end">
                <button className="px-4 py-2 rounded-lg text-sm skeuo-btn text-[var(--muted-foreground)] cursor-pointer" onClick={() => { cmt.setDailyLogTab('list'); cmt.setSelectedLogId(null); cmt.resetLogForm(); }}>Cancelar</button>
                <button className="px-5 py-2 rounded-lg text-sm bg-[var(--af-accent)] text-background font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity" onClick={cmt.saveDailyLog}>{cmt.selectedLogId ? 'Actualizar' : 'Guardar Registro'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
