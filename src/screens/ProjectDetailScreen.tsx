'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import { fmtCOP, fmtDate, fmtSize, statusColor, prioColor, taskStColor } from '@/lib/helpers';
import { PROJECT_PHASES, PHASE_GROUP_ICONS } from '@/lib/constants';
import type { PhaseEntry } from '@/lib/types';

export default function ProjectDetailScreen() {
  const {
    screen,
    currentProject,
    projectSpent,
    projectBudget,
    updateProjectProgress,
    forms,
    setForms,
    selectedProjectId,
    projectTasks,
    projectExpenses,
    openModal,
    toggleTask,
    deleteTask,
    openEditTask,
    deleteExpense,
    getUserName,
    workPhases,
    initDefaultPhases,
    deletePhase,
    togglePhaseActive,
    toggleGroupActive,
    updatePhaseStatus,
    addPhaseEntry,
    toggleEntryConfirmed,
    deletePhaseEntry,
    msConnected,
    showOneDrive,
    setShowOneDrive,
    msLoading,
    oneDriveFiles,
    odProjectFolder,
    openOneDriveForProject,
    uploadToOneDrive,
    deleteFromOneDrive,
    projectFiles,
    deleteFile,
    uploadFile,
    approvals,
    updateApproval,
    deleteApproval,
    showToast,
  } = useApp();

  if (screen !== 'projectDetail' || !currentProject) return null;

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(currentProject.data.status)}`}>{currentProject.data.status}</span>
            <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl mt-2">{currentProject.data.name}</div>
            <div className="text-sm text-[var(--muted-foreground)] mt-1">{currentProject.data.location && '📍 ' + currentProject.data.location}{currentProject.data.client ? ' · ' + currentProject.data.client : ''}</div>
            {currentProject.data.description && <div className="text-sm text-[var(--muted-foreground)] mt-3 max-w-xl">{currentProject.data.description}</div>}
          </div>
          <div className="flex gap-3">
            <div className="text-center"><div className="text-lg font-semibold text-[var(--af-accent)]">{fmtCOP(currentProject.data.budget)}</div><div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div></div>
            <div className="text-center"><div className="text-lg font-semibold text-emerald-400">{fmtCOP(projectSpent)}</div><div className="text-[10px] text-[var(--af-text3)]">Gastado</div></div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${(currentProject.data.progress || 0) >= 80 ? 'bg-emerald-500' : (currentProject.data.progress || 0) >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: (currentProject.data.progress || 0) + '%' }} /></div>
          <input type="number" min="0" max="100" className="w-14 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--foreground)] outline-none text-center focus:border-[var(--af-accent)]" value={currentProject.data.progress || 0} onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value) || 0)); updateProjectProgress(v); }} />
          <span className="text-sm font-medium text-[var(--muted-foreground)]">%</span>
        </div>
        {projectBudget > 0 && <div className="mt-3 text-xs text-[var(--muted-foreground)]">{projectSpent > projectBudget ? <span className="text-red-400 font-medium">⚠️ Excedido por {fmtCOP(projectSpent - projectBudget)}</span> : `Restante: ${fmtCOP(projectBudget - projectSpent)} (${Math.round((projectSpent / projectBudget) * 100)}% del presupuesto)`}</div>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 w-fit overflow-x-auto -mx-1 px-1 scrollbar-none">
        {['Resumen', 'Tareas', 'Presupuesto', 'Archivos', 'Obra', 'Portal'].map(tab => (
          <button key={tab} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${forms.detailTab === tab ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => setForms(p => ({ ...p, detailTab: tab }))}>{tab}</button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {forms.detailTab === 'Resumen' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-4">Información</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Cliente</span><span>{currentProject.data.client || '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Ubicación</span><span>{currentProject.data.location || '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Inicio</span><span>{currentProject.data.startDate || '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Entrega</span><span>{currentProject.data.endDate || '—'}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Presupuesto</span><span className="text-[var(--af-accent)] font-semibold">{fmtCOP(currentProject.data.budget)}</span></div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-4">Actividad reciente</div>
          {projectTasks.filter(t => t.data.status !== 'Completado').slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
              <div className={`w-2 h-2 rounded-full ${t.data.priority === 'Alta' ? 'bg-red-500' : t.data.priority === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <div className="flex-1 text-sm truncate">{t.data.title}</div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
            </div>
          ))}
          {projectTasks.filter(t => t.data.status !== 'Completado').length === 0 && <div className="text-center py-6 text-[var(--af-text3)] text-sm">Sin tareas pendientes</div>}
        </div>
      </div>)}

      {/* Tab: Tareas */}
      {forms.detailTab === 'Tareas' && (<div>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-[var(--muted-foreground)]">{projectTasks.length} tareas en este proyecto</div>
          <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskProject: selectedProjectId, taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}>+ Nueva tarea</button>
        </div>
        {projectTasks.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">✅</div><div className="text-sm">Sin tareas en este proyecto</div></div> :
        projectTasks.map(t => (
          <div key={t.id} className="flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0">
            <div className={`w-2 h-2 rounded-full mt-1.5 ${t.data.priority === 'Alta' ? 'bg-red-500' : t.data.priority === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <div className="w-4 h-4 rounded border border-[var(--input)] flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center hover:border-[var(--af-accent)] ${t.data.status === 'Completado' ? 'bg-emerald-500 border-emerald-500' : ''}" onClick={() => toggleTask(t.id, t.data.status)}>{t.data.status === 'Completado' && <span className="text-white text-[10px] font-bold">✓</span>}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13.5px] font-medium ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>{t.data.title}</div>
              <div className="text-[11px] text-[var(--af-text3)] mt-1 flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
                {t.data.dueDate && <span>📅 {fmtDate(t.data.dueDate)}</span>}
                {t.data.assigneeId && <span>👤 {getUserName(t.data.assigneeId)}</span>}
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
            <button className="text-xs px-1.5 py-0.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20" onClick={() => openEditTask(t)}>✎</button>
            <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20" onClick={() => deleteTask(t.id)}>✕</button>
          </div>
        ))}
      </div>)}

      {/* Tab: Presupuesto */}
      {forms.detailTab === 'Presupuesto' && (<div>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-[var(--muted-foreground)]">{projectExpenses.length} gastos · Total: <span className="text-[var(--af-accent)] font-semibold">{fmtCOP(projectSpent)}</span> {projectBudget > 0 && <span>de {fmtCOP(projectBudget)}</span>}</div>
          <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, expConcept: '', expProject: selectedProjectId, expAmount: '', expDate: new Date().toISOString().split('T')[0], expCategory: 'Materiales' })); openModal('expense'); }}>+ Registrar gasto</button>
        </div>
        {projectBudget > 0 && <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
          <div className="flex justify-between text-sm mb-2"><span className="text-[var(--muted-foreground)]">Presupuesto utilizado</span><span className="font-semibold">{Math.min(100, Math.round((projectSpent / projectBudget) * 100))}%</span></div>
          <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${projectSpent > projectBudget ? 'bg-red-500' : projectSpent > projectBudget * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: Math.min(100, (projectSpent / projectBudget) * 100) + '%' }} /></div>
        </div>}
        {projectExpenses.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">💰</div><div className="text-sm">Sin gastos registrados</div></div> :
        <div className="space-y-2">
          {projectExpenses.map(e => (
            <div key={e.id} className="flex items-center gap-3 py-2.5 px-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              <div className="flex-1 min-w-0"><div className="text-sm font-medium">{e.data.concept}</div><div className="text-[11px] text-[var(--af-text3)]">{e.data.category} · {e.data.date}</div></div>
              <div className="text-sm font-semibold text-[var(--af-accent)]">{fmtCOP(e.data.amount)}</div>
              <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer" onClick={() => deleteExpense(e.id)}>✕</button>
            </div>
          ))}
        </div>}
      </div>)}

      {/* Tab: Archivos */}
      {forms.detailTab === 'Archivos' && (<div>
        {/* OneDrive Section */}
        {msConnected && (
          <div className="mb-4">
            {!showOneDrive ? (
              <button className="w-full bg-gradient-to-r from-[#00a4ef] to-[#7fba00] text-white border-none rounded-xl py-3 text-sm font-semibold cursor-pointer hover:opacity-90 transition-all flex items-center justify-center gap-2" onClick={() => currentProject && openOneDriveForProject(currentProject.data.name)}>
                <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#fff"/><rect x="1" y="11" width="9" height="9" fill="#fff"/><rect x="11" y="1" width="9" height="9" fill="#fff"/><rect x="11" y="11" width="9" height="9" fill="#fff"/></svg>
                Abrir en OneDrive — {currentProject?.data.name}
              </button>
            ) : (
              <div className="bg-[#00a4ef]/5 border border-[#00a4ef]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 21 21" className="w-4 h-4"><rect x="1" y="1" width="9" height="9" fill="#00a4ef"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#00a4ef"/></svg>
                    <span className="text-sm font-semibold text-[#00a4ef]">OneDrive — {currentProject?.data.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 bg-[#00a4ef] text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#0091d5] transition-colors">
                      + Subir a OneDrive
                      <input type="file" className="hidden" onChange={async (e) => {
                        const file = e.target?.files?.[0];
                        if (file && odProjectFolder) {
                          await uploadToOneDrive(file, odProjectFolder);
                          e.target.value = '';
                        }
                      }} />
                    </label>
                    <button className="text-xs px-2 py-1.5 rounded-lg bg-[var(--af-bg3)] border border-[var(--border)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => { setShowOneDrive(false); }}>✕ Cerrar</button>
                  </div>
                </div>
                {msLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#00a4ef]/30 border-t-[#00a4ef] rounded-full animate-spin mr-2" />
                    <span className="text-xs text-[var(--muted-foreground)]">Cargando...</span>
                  </div>
                ) : oneDriveFiles.length === 0 ? (
                  <div className="text-center py-8 text-[var(--af-text3)]">
                    <div className="text-3xl mb-2">☁️</div>
                    <div className="text-sm">Carpeta vacía en OneDrive</div>
                    <div className="text-xs mt-1">Sube archivos para sincronizarlos con este proyecto</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {oneDriveFiles.filter((f: any) => !f.folder).map((f: any) => (
                      <div key={f.id} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 hover:border-[#00a4ef]/30 transition-all group flex items-center gap-3">
                        <div className="w-9 h-9 bg-[var(--af-bg3)] rounded-lg flex items-center justify-center text-base flex-shrink-0">
                          {f.name?.endsWith('.pdf') ? '📄' : f.name?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? '🖼️' : f.name?.match(/\.(doc|docx)$/i) ? '📝' : f.name?.match(/\.(xls|xlsx)$/i) ? '📊' : f.name?.match(/\.(dwg|dxf)$/i) ? '📐' : f.name?.match(/\.(zip|rar)$/i) ? '📦' : '📎'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{f.name}</div>
                          <div className="text-[10px] text-[var(--af-text3)]">{fmtSize(f.size || 0)}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {f.webUrl && <a href={f.webUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#00a4ef] px-1.5 py-0.5 rounded hover:underline">Abrir</a>}
                          <button className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer transition-opacity" onClick={() => odProjectFolder && deleteFromOneDrive(f.id, odProjectFolder)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-[var(--muted-foreground)]">{projectFiles.length} archivos locales</div>
          <div>
            <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={() => document.getElementById('file-upload-input')?.click()}>
              + Subir archivo
            </button>
            <input id="file-upload-input" type="file" style={{ display: 'none' }} onChange={uploadFile} />
          </div>
        </div>
        {projectFiles.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">📂</div><div className="text-sm">Sin archivos subidos</div></div> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projectFiles.map(f => (
            <div key={f.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--input)] transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-[var(--af-bg3)] rounded-lg flex items-center justify-center text-lg">
                  {f.type?.startsWith('image/') ? '🖼️' : f.type === 'application/pdf' ? '📄' : f.type?.includes('video') ? '🎬' : '📎'}
                </div>
                <button className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer transition-opacity" onClick={() => deleteFile(f)}>✕</button>
              </div>
              <div className="text-sm font-medium truncate mb-0.5">{f.name}</div>
              <div className="text-[11px] text-[var(--af-text3)]">{fmtSize(f.size)}</div>
              {f.type?.startsWith('image/') && f.data && <div className="mt-2"><img src={f.data} alt={f.name} className="w-full h-24 object-cover rounded-lg border border-[var(--border)]" /></div>}
              {f.data && <a href={f.data} download={f.name} className="text-[11px] text-[var(--af-accent)] mt-2 inline-block hover:underline">Descargar archivo</a>}
            </div>
          ))}
        </div>}
      </div>)}

      {/* Tab: Obra */}
      {forms.detailTab === 'Obra' && (() => {
        const activePhases = workPhases.filter(p => p.data.active !== false);
        const completedPhases = activePhases.filter(p => p.data.status === 'Completado');
        const phaseProgress = activePhases.length > 0 ? Math.round((completedPhases.length / activePhases.length) * 100) : 0;
        const groupedPhases = PROJECT_PHASES.map(g => ({
          ...g,
          phases: g.phases.map(name => workPhases.find(p => p.data.name === name)).filter(Boolean),
        }));
        const expandedPhase = forms.expandedPhase || null;
        const getGroupActive = (groupName: string) => {
          const gp = groupedPhases.find(g => g.group === groupName);
          return gp ? gp.phases.length > 0 && gp.phases.some(p => p.data.active !== false) : false;
        };
        const getGroupAllActive = (groupName: string) => {
          const gp = groupedPhases.find(g => g.group === groupName);
          return gp ? gp.phases.every(p => p.data.active !== false) : false;
        };
        return (<div>
          {/* Phase progress summary */}
          <div className="bg-gradient-to-r from-[var(--af-accent)]/10 to-transparent border border-[var(--af-accent)]/20 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[15px] font-semibold">Avance por fases</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[var(--af-accent)]">{phaseProgress}%</span>
                <span className="text-[11px] text-[var(--muted-foreground)]">{completedPhases.length}/{activePhases.length} fases</span>
              </div>
            </div>
            <div className="h-3 bg-[var(--af-bg4)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${phaseProgress >= 80 ? 'bg-emerald-500' : phaseProgress >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: phaseProgress + '%' }} />
            </div>
            <button className="mt-2 text-[11px] text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => { if (selectedProjectId) { (window as any).firebase.firestore().collection('projects').doc(selectedProjectId).update({ progress: phaseProgress }); showToast('Progreso sincronizado'); } }}>Sincronizar con progreso del proyecto</button>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors" onClick={initDefaultPhases}>{workPhases.length > 0 ? '🔄 Resetear fases' : '⚡ Inicializar fases'}</button>
            <button className="flex items-center gap-1.5 bg-[var(--af-bg3)] border border-[var(--border)] text-[var(--foreground)] px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-[var(--af-bg4)] transition-colors" onClick={() => openModal('customPhase')}>+ Fase personalizada</button>
            {workPhases.length > 0 && <span className="text-[11px] text-[var(--muted-foreground)] ml-auto">{activePhases.length} activas de {workPhases.length}</span>}
          </div>
          {/* Phases grouped */}
          {workPhases.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">🏗️</div><div className="text-sm">Configura las fases del proyecto</div><div className="text-xs text-[var(--muted-foreground)] mt-1">Puedes activar/desactivar según el tipo de obra</div></div> :
          <div className="space-y-6">
            {groupedPhases.map(group => {
              const groupPhases = group.phases.filter(p => p && p.data.active !== false);
              const groupCompleted = groupPhases.filter(p => p && p.data.status === 'Completado');
              const groupProg = groupPhases.length > 0 ? Math.round((groupCompleted.length / groupPhases.length) * 100) : 0;
              const isGroupOn = getGroupActive(group.group);
              const isAllOn = getGroupAllActive(group.group);
              return (
                <div key={group.group} className={`transition-opacity ${!isGroupOn ? 'opacity-40' : ''}`}>
                  {/* Group header with toggle */}
                  <div className="flex items-center justify-between mb-3 bg-[var(--af-bg3)] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{PHASE_GROUP_ICONS[group.group] || '📋'}</span>
                      <span className="text-[14px] font-semibold">{group.group}</span>
                      <span className="text-[11px] text-[var(--muted-foreground)]">{groupProg}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-16 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: groupProg + '%' }} /></div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[var(--muted-foreground)]">{isAllOn ? 'Todo ON' : 'Parcial'}</span>
                        <button className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer border-none ${isAllOn ? 'bg-emerald-500' : isGroupOn ? 'bg-amber-500' : 'bg-[var(--af-bg4)]'}`} onClick={() => toggleGroupActive(group.group, !isAllOn)}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${isAllOn ? 'left-[18px]' : 'left-[3px]'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Phases */}
                  <div className="space-y-2 ml-1">
                    {group.phases.map(phase => {
                      if (!phase) return null;
                      const isActive = phase.data.status === 'En progreso', isDone = phase.data.status === 'Completado';
                      const isEnabled = phase.data.active !== false;
                      const isExpanded = expandedPhase === phase.id;
                      const entries: PhaseEntry[] = Array.isArray(phase.data.entries) ? phase.data.entries : [];
                      const confirmedEntries = entries.filter(e => e.confirmed).length;
                      return (
                        <div key={phase.id}>
                          <div className={`bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 transition-all ${!isEnabled ? 'opacity-40' : isExpanded ? 'border-[var(--af-accent)]/40' : ''}`}>
                            {/* Phase row */}
                            <div className="flex items-center gap-3">
                              {/* Toggle */}
                              <button className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer border-none ${isEnabled ? 'bg-emerald-500' : 'bg-[var(--af-bg4)]'}`} onClick={() => togglePhaseActive(phase.id, !isEnabled)}>
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${isEnabled ? 'left-[18px]' : 'left-[3px]'}`} />
                              </button>
                              {/* Status dot */}
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 cursor-pointer ${!isEnabled ? 'bg-[var(--af-bg4)]' : isDone ? 'bg-emerald-500' : isActive ? 'bg-[var(--af-accent)] shadow-[0_0_0_3px_rgba(200,169,110,0.2)]' : 'bg-[var(--af-bg4)]'}`} onClick={() => isEnabled && setForms(p => ({ ...p, expandedPhase: isExpanded ? null : phase.id }))} />
                              {/* Name + entry count */}
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => isEnabled && setForms(p => ({ ...p, expandedPhase: isExpanded ? null : phase.id }))}>
                                <div className={`text-[13px] font-medium ${!isEnabled ? 'line-through text-[var(--af-text3)]' : ''}`}>{phase.data.name}</div>
                                {phase.data.endDate && isDone && <div className="text-[10px] text-emerald-400">Completado: {phase.data.endDate}</div>}
                              </div>
                              {/* Entry badge */}
                              {isEnabled && entries.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${confirmedEntries === entries.length ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{confirmedEntries}/{entries.length}</span>
                              )}
                              {/* Status select */}
                              {isEnabled && (
                                <select className="bg-[var(--af-bg3)] border border-[var(--input)] rounded-md px-2 py-1 text-[11px] text-[var(--foreground)] outline-none cursor-pointer flex-shrink-0" value={phase.data.status} onChange={e => updatePhaseStatus(phase.id, e.target.value)}>
                                  <option value="Pendiente">Pendiente</option><option value="En progreso">En progreso</option><option value="Completado">Completado</option>
                                </select>
                              )}
                              {/* Expand arrow */}
                              {isEnabled && (
                                <button className="text-[var(--af-text3)] cursor-pointer flex-shrink-0 p-1 hover:text-[var(--foreground)] transition-colors" onClick={() => setForms(p => ({ ...p, expandedPhase: isExpanded ? null : phase.id }))}>
                                  <svg viewBox="0 0 24 24" className={`w-4 h-4 stroke-current fill-none transition-transform ${isExpanded ? 'rotate-180' : ''}`} strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                                </button>
                              )}
                              {/* Delete */}
                              <button className="text-[var(--af-text3)] hover:text-red-400 cursor-pointer flex-shrink-0 p-1" onClick={() => deletePhase(phase.id)}>
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </div>
                            {/* Expanded entries */}
                            {isExpanded && isEnabled && (
                              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                                {/* Add entry */}
                                <div className="flex gap-2 mb-3">
                                  <input className="flex-1 bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Agregar nota o actividad..." value={forms.phaseEntryText || ''} onChange={e => setForms(p => ({ ...p, phaseEntryText: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') addPhaseEntry(phase.id); }} />
                                  <button className="px-3 py-2 bg-[var(--af-accent)] text-background rounded-lg text-xs font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors flex-shrink-0" onClick={() => addPhaseEntry(phase.id)}>Agregar</button>
                                </div>
                                {/* Entries list */}
                                {entries.length === 0 ? (
                                  <div className="text-center py-4 text-[var(--af-text3)] text-xs">Sin entradas — escribe la primera nota</div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {entries.map(entry => (
                                      <div key={entry.id} className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${entry.confirmed ? 'bg-emerald-500/5' : 'bg-[var(--af-bg3)]'}`}>
                                        <button className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${entry.confirmed ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--input)] hover:border-[var(--af-accent)]'}`} onClick={() => toggleEntryConfirmed(phase.id, entry.id)}>
                                          {entry.confirmed && <span className="text-white text-[10px] font-bold">✓</span>}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <div className={`text-[12px] ${entry.confirmed ? 'line-through text-[var(--af-text3)]' : ''}`}>{entry.text}</div>
                                          {entry.createdAt && <div className="text-[9px] text-[var(--af-text3)] mt-0.5">{typeof entry.createdAt === 'string' ? entry.createdAt.split('T')[0] : ''}</div>}
                                        </div>
                                        <button className="text-[var(--af-text3)] hover:text-red-400 cursor-pointer flex-shrink-0 p-0.5" onClick={() => deletePhaseEntry(phase.id, entry.id)}>
                                          <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        </button>
                                      </div>
                                    ))}
                                    <div className="text-[10px] text-[var(--muted-foreground)] text-right mt-1">{confirmedEntries} de {entries.length} confirmadas</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>);
      })()}

      {/* Tab: Portal */}
      {forms.detailTab === 'Portal' && (<div>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-[var(--muted-foreground)]">Vista del cliente</div>
          <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, appTitle: '', appDesc: '' })); openModal('approval'); }}>+ Nueva aprobación</button>
        </div>
        {/* Client summary */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
          <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl mb-2">{currentProject.data.name}</div>
          <div className="text-sm text-[var(--muted-foreground)] mb-3">{currentProject.data.description || 'Sin descripción'}</div>
          <div className="flex items-center gap-3 mb-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(currentProject.data.status)}`}>{currentProject.data.status}</span><span className="text-sm font-medium">{currentProject.data.progress || 0}% completado</span></div>
          <div className="h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--af-accent)]" style={{ width: (currentProject.data.progress || 0) + '%' }} /></div>
        </div>
        {/* Work phases for client */}
        {workPhases.length > 0 && (<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
          <div className="text-[15px] font-semibold mb-3">Fases del proyecto</div>
          {(() => {
            const activePhases = workPhases.filter(p => p.data.active !== false);
            const portalGroups = PROJECT_PHASES.map(g => ({ ...g, phases: g.phases.map(n => activePhases.find(p => p.data.name === n)).filter(Boolean) })).filter(g => g.phases.length > 0);
            return (<div className="space-y-3">
              {portalGroups.map(g => (
                <div key={g.group}>
                  <div className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wider">{PHASE_GROUP_ICONS[g.group]} {g.group}</div>
                  <div className="space-y-1.5">
                    {g.phases.map(ph => (
                      <div key={ph.id} className="flex items-center gap-3 py-1.5">
                        <div className={`w-3 h-3 rounded-full ${ph.data.status === 'Completado' ? 'bg-emerald-500' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]' : 'bg-[var(--af-bg4)]'}`} />
                        <span className="text-sm flex-1">{ph.data.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ph.data.status === 'Completado' ? 'bg-emerald-500/10 text-emerald-400' : ph.data.status === 'En progreso' ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)]' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>{ph.data.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>);
          })()}
        </div>)}
        {/* Files gallery */}
        {projectFiles.filter(f => f.type?.startsWith('image/')).length > 0 && (<div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4">
          <div className="text-[15px] font-semibold mb-3">Galería</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {projectFiles.filter(f => f.type?.startsWith('image/')).map(f => (
              <a key={f.id} href={f.data} download={f.name}><img src={f.data} alt={f.name} className="w-full aspect-square object-cover rounded-lg border border-[var(--border)] hover:border-[var(--af-accent)] transition-all" /></a>
            ))}
          </div>
        </div>)}
        {/* Approvals */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-[15px] font-semibold mb-3">Aprobaciones</div>
          {approvals.length === 0 ? <div className="text-center py-6 text-[var(--af-text3)] text-sm">Sin solicitudes de aprobación</div> :
          approvals.map(a => (
            <div key={a.id} className="border border-[var(--border)] rounded-lg p-3 mb-2">
              <div className="flex items-start justify-between mb-1">
                <div className="text-sm font-semibold">{a.data.title}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.data.status === 'Aprobado' ? 'bg-emerald-500/10 text-emerald-400' : a.data.status === 'Rechazado' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{a.data.status}</span>
              </div>
              {a.data.description && <div className="text-xs text-[var(--muted-foreground)] mb-2">{a.data.description}</div>}
              {a.data.status === 'Pendiente' && (
                <div className="flex gap-2 mt-2">
                  <button className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-emerald-500 hover:text-white transition-all" onClick={() => updateApproval(a.id, 'Aprobado')}>✓ Aprobar</button>
                  <button className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-red-500 hover:text-white transition-all" onClick={() => updateApproval(a.id, 'Rechazado')}>✕ Rechazar</button>
                  <button className="ml-auto text-xs text-[var(--af-text3)] cursor-pointer hover:text-red-400" onClick={() => deleteApproval(a.id)}>Eliminar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>)}
    </div>
  );
}
