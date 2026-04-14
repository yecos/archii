'use client';
import React from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useOneDrive } from '@/hooks/useDomain';
import { useGallery } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import { fmtCOP, statusColor } from '@/lib/helpers';
import ProjectResumen from '@/components/features/project/ProjectResumen';
import ProjectTareas from '@/components/features/project/ProjectTareas';
import ProjectPresupuesto from '@/components/features/project/ProjectPresupuesto';
import ProjectArchivos from '@/components/features/project/ProjectArchivos';
import ProjectObra from '@/components/features/project/ProjectObra';
import ProjectPortal from '@/components/features/project/ProjectPortal';

export default function ProjectDetailScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const od = useOneDrive();
  const gal = useGallery();
  const cmt = useComments();

  if (!fs.currentProject) return null;

  const tabs = ['Resumen', 'Tareas', 'Presupuesto', 'Archivos', 'Obra', 'Portal'] as const;
  const { detailTab, workView } = ui.forms;

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Project header card */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor(fs.currentProject.data.status)}`}>{fs.currentProject.data.status}</span>
            <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl mt-2">{fs.currentProject.data.name}</div>
            <div className="text-sm text-[var(--muted-foreground)] mt-1">{fs.currentProject.data.location && '📍 ' + fs.currentProject.data.location}{fs.currentProject.data.client ? ' · ' + fs.currentProject.data.client : ''}</div>
            {fs.currentProject.data.description && <div className="text-sm text-[var(--muted-foreground)] mt-3 max-w-xl">{fs.currentProject.data.description}</div>}
          </div>
          <div className="flex gap-3">
            <div className="text-center"><div className="text-lg font-semibold text-[var(--af-accent)]">{fmtCOP(fs.currentProject.data.budget)}</div><div className="text-[10px] text-[var(--af-text3)]">Presupuesto</div></div>
            <div className="text-center"><div className="text-lg font-semibold text-emerald-400">{fmtCOP(fs.projectSpent)}</div><div className="text-[10px] text-[var(--af-text3)]">Gastado</div></div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${(fs.currentProject.data.progress || 0) >= 80 ? 'bg-emerald-500' : (fs.currentProject.data.progress || 0) >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`} style={{ width: (fs.currentProject.data.progress || 0) + '%' }} /></div>
          <input type="number" min="0" max="100" className="w-14 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--foreground)] outline-none text-center focus:border-[var(--af-accent)]" value={fs.currentProject.data.progress || 0} onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value) || 0)); fs.updateProjectProgress(v); }} />
          <span className="text-sm font-medium text-[var(--muted-foreground)]">%</span>
        </div>
        {fs.projectBudget > 0 && <div className="mt-3 text-xs text-[var(--muted-foreground)]">{fs.projectSpent > fs.projectBudget ? <span className="text-red-400 font-medium">⚠️ Excedido por {fmtCOP(fs.projectSpent - fs.projectBudget)}</span> : `Restante: ${fmtCOP(fs.projectBudget - fs.projectSpent)} (${Math.round((fs.projectSpent / fs.projectBudget) * 100)}% del presupuesto)`}</div>}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-[var(--af-bg3)] rounded-lg p-1 w-fit overflow-x-auto -mx-1 px-1 scrollbar-none">
        {tabs.map(tab => (
          <button key={tab} className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-all ${detailTab === tab ? 'bg-[var(--card)] text-[var(--foreground)] font-medium shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} onClick={() => ui.setForms(p => ({ ...p, detailTab: tab }))}>{tab}</button>
        ))}
      </div>

      {/* Tab content */}
      {detailTab === 'Resumen' && (
        <ProjectResumen
          project={fs.currentProject}
          projectTasks={fs.projectTasks}
          approvals={fs.approvals}
          selectedProjectId={ui.selectedProjectId}
          setForms={ui.setForms}
          openModal={ui.openModal}
        />
      )}

      {detailTab === 'Tareas' && (
        <ProjectTareas
          projectTasks={fs.projectTasks}
          selectedProjectId={ui.selectedProjectId}
          getUserName={auth.getUserName}
          toggleTask={fs.toggleTask}
          openEditTask={fs.openEditTask}
          deleteTask={fs.deleteTask}
          setForms={ui.setForms}
          openModal={ui.openModal}
        />
      )}

      {detailTab === 'Presupuesto' && (
        <ProjectPresupuesto
          projectExpenses={fs.projectExpenses}
          projectBudget={fs.projectBudget}
          projectSpent={fs.projectSpent}
          selectedProjectId={ui.selectedProjectId}
          deleteExpense={fs.deleteExpense}
          setForms={ui.setForms}
          openModal={ui.openModal}
        />
      )}

      {detailTab === 'Archivos' && (
        <ProjectArchivos
          projectName={fs.currentProject.data.name}
          msConnected={od.msConnected}
          doMicrosoftLogin={auth.doMicrosoftLogin}
          od={od}
          projectFiles={fs.projectFiles}
          selectedProjectId={ui.selectedProjectId}
          uploadFile={fs.uploadFile}
          deleteFile={fs.deleteFile}
          setForms={ui.setForms}
          openModal={ui.openModal}
          gal={gal}
        />
      )}

      {detailTab === 'Obra' && (
        <ProjectObra
          workView={workView}
          workPhases={fs.workPhases}
          cmt={cmt}
          initDefaultPhases={fs.initDefaultPhases}
          updatePhaseStatus={fs.updatePhaseStatus}
          calcGanttDays={fs.calcGanttDays}
          calcGanttOffset={fs.calcGanttOffset}
          setForms={ui.setForms}
        />
      )}

      {detailTab === 'Portal' && (
        <ProjectPortal
          project={fs.currentProject}
          workPhases={fs.workPhases}
          projectFiles={fs.projectFiles}
          approvals={fs.approvals}
          setForms={ui.setForms}
          openModal={ui.openModal}
          updateApproval={fs.updateApproval}
          deleteApproval={fs.deleteApproval}
        />
      )}
    </div>
  );
}
