'use client';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useOneDrive } from '@/hooks/useDomain';
import { useGallery } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import { usePresence } from '@/hooks/useDomain';
import { fmtCOP, statusColor } from '@/lib/helpers';
import ProjectResumen from '@/components/features/project/ProjectResumen';
import ProjectDiseno from '@/components/features/project/ProjectDiseno';
import ProjectPresupuesto from '@/components/features/project/ProjectPresupuesto';
import ProjectArchivos from '@/components/features/project/ProjectArchivos';
import ProjectEjecucion from '@/components/features/project/ProjectEjecucion';
import ProjectPortal from '@/components/features/project/ProjectPortal';
import { AnimatedTabs } from '@/components/ui/AnimatedTabs';
import { PresenceViewingNow } from '@/components/ui/PresenceIndicator';
import { Copy, Edit3, Trash2 } from 'lucide-react';

export default function ProjectDetailScreen() {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const od = useOneDrive();
  const gal = useGallery();
  const cmt = useComments();
  const { usersOnSameProject } = usePresence();

  if (!fs.currentProject) return null;

  const project = fs.currentProject;
  const tabs = ['Resumen', 'Diseño', 'Presupuesto', 'Archivos', 'Ejecución', 'Portal'] as const;
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
          {/* Action buttons */}
          <div className="flex gap-1.5 flex-shrink-0">
            <button className="w-8 h-8 skeuo-btn flex items-center justify-center" title="Duplicar proyecto" onClick={() => fs.duplicateProject(project.id)}>
              <Copy className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            </button>
            <button className="w-8 h-8 skeuo-btn flex items-center justify-center" title="Editar proyecto" onClick={() => fs.openEditProject(project)}>
              <Edit3 className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center cursor-pointer hover:bg-red-500/20 transition-colors" title="Eliminar proyecto" onClick={() => { fs.deleteProject(project.id); ui.setForms(p => ({ ...p, selectedProjectId: null })); }}>
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          {/* Interactive progress slider */}
          <div
            className="flex-1 h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden cursor-pointer relative group"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.round(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)));
              fs.updateProjectProgress(pct);
            }}
            onMouseMove={e => {
              if (e.buttons === 1) {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.round(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)));
                fs.updateProjectProgress(pct);
              }
            }}
          >
            <div
              className={`h-full rounded-full transition-all duration-150 ${(fs.currentProject.data.progress || 0) >= 80 ? 'bg-emerald-500' : (fs.currentProject.data.progress || 0) >= 40 ? 'bg-[var(--af-accent)]' : 'bg-amber-500'}`}
              style={{ width: (fs.currentProject.data.progress || 0) + '%' }}
            />
            {/* Drag handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${(fs.currentProject.data.progress || 0)}% - 8px)`, background: (fs.currentProject.data.progress || 0) >= 80 ? '#10b981' : (fs.currentProject.data.progress || 0) >= 40 ? 'var(--af-accent)' : '#f59e0b' }}
            />
          </div>
          <div className="flex items-center gap-1 skeuo-panel px-1 py-0.5">
            <input type="number" min="0" max="100" className="w-10 bg-transparent text-sm text-[var(--foreground)] outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={fs.currentProject.data.progress || 0} onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value) || 0)); fs.updateProjectProgress(v); }} />
            <span className="text-[11px] text-[var(--muted-foreground)]">%</span>
          </div>
        </div>
        {fs.projectBudget > 0 && <div className="mt-3 text-xs text-[var(--muted-foreground)]">{fs.projectSpent > fs.projectBudget ? <span className="text-red-400 font-medium">⚠️ Excedido por {fmtCOP(fs.projectSpent - fs.projectBudget)}</span> : `Restante: ${fmtCOP(fs.projectBudget - fs.projectSpent)} (${Math.round((fs.projectSpent / fs.projectBudget) * 100)}% del presupuesto)`}</div>}
        {/* Presence: who else is viewing this project */}
        <PresenceViewingNow users={usersOnSameProject} projectName={fs.currentProject.data.name} variant="card" />
      </div>

      {/* Tab navigation */}
      <AnimatedTabs
        tabs={tabs.map(t => ({ id: t, label: t }))}
        activeTab={detailTab}
        onTabChange={id => ui.setForms(p => ({ ...p, detailTab: id }))}
        className="w-fit overflow-x-auto -mx-1 px-1 scrollbar-none"
      />

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

      {detailTab === 'Diseño' && (
        <ProjectDiseno
          project={fs.currentProject}
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

      {detailTab === 'Ejecución' && (
        <ProjectEjecucion
          project={fs.currentProject}
          projectTasks={fs.projectTasks}
          selectedProjectId={ui.selectedProjectId}
          getUserName={auth.getUserName}
          toggleTask={fs.toggleTask}
          openEditTask={fs.openEditTask}
          deleteTask={fs.deleteTask}
          workView={workView}
          workPhases={fs.workPhases}
          cmt={cmt}
          initDefaultPhases={fs.initDefaultPhases}
          updatePhaseStatus={fs.updatePhaseStatus}
          calcGanttDays={fs.calcGanttDays}
          calcGanttOffset={fs.calcGanttOffset}
          setForms={ui.setForms}
          openModal={ui.openModal}
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
