'use client';
import { Pencil, Trash2, CheckSquare } from 'lucide-react';
import { fmtDate, prioColor, taskStColor } from '@/lib/helpers';
import type { Task, Subtask } from '@/lib/types';

interface ProjectTareasProps {
  projectTasks: Array<{ id: string; data: Record<string, any> }>;
  selectedProjectId: string | null;
  getUserName: (userId: string) => string;
  toggleTask: (taskId: string, status: string) => void;
  openEditTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  setForms: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  openModal: (modal: string) => void;
}

export default function ProjectTareas({ projectTasks, selectedProjectId, getUserName, toggleTask, openEditTask, deleteTask, setForms, openModal }: ProjectTareasProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-[var(--muted-foreground)]">{projectTasks.length} tareas en este proyecto</div>
        <button className="flex items-center gap-1.5 bg-[var(--af-accent)] text-background px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" onClick={() => { setForms(p => ({ ...p, taskTitle: '', taskProject: selectedProjectId, taskDue: new Date().toISOString().split('T')[0] })); openModal('task'); }}>+ Nueva tarea</button>
      </div>
      {projectTasks.length === 0 ? <div className="text-center py-12 text-[var(--af-text3)]"><div className="text-3xl mb-2">✅</div><div className="text-sm">Sin tareas en este proyecto</div></div> :
      projectTasks.map(t => {
        const subs = t.data?.subtasks;
        const subtaskInfo = Array.isArray(subs) && subs.length > 0 ? { total: subs.length, completed: subs.filter((s: Subtask) => s.completed).length } : null;
        return (
        <div key={t.id} className="flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0">
          <div className={`w-2 h-2 rounded-full mt-1.5 ${t.data.priority === 'Alta' ? 'bg-red-500' : t.data.priority === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <div className={`w-4 h-4 rounded border border-[var(--input)] flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center hover:border-[var(--af-accent)] ${t.data.status === 'Completado' ? 'bg-emerald-500 border-emerald-500' : ''}`} onClick={() => toggleTask(t.id, t.data.status)}>{t.data.status === 'Completado' && <span className="text-white text-[10px] font-bold">✓</span>}</div>
          <div className="flex-1 min-w-0">
            <div className={`text-[13.5px] font-medium ${t.data.status === 'Completado' ? 'line-through text-[var(--af-text3)]' : ''}`}>{t.data.title}</div>
            <div className="text-[11px] text-[var(--af-text3)] mt-1 flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioColor(t.data.priority)}`}>{t.data.priority}</span>
              {subtaskInfo && (
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${subtaskInfo.completed === subtaskInfo.total ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'}`}>
                  <CheckSquare size={9} />
                  {subtaskInfo.completed}/{subtaskInfo.total}
                </span>
              )}
              {t.data.dueDate && <span>📅 {fmtDate(t.data.dueDate)}</span>}
              {t.data.assigneeId && <span>👤 {getUserName(t.data.assigneeId)}</span>}
            </div>
            {subtaskInfo && subtaskInfo.total > 0 && (
              <div className="mt-1.5 w-24 h-1 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${subtaskInfo.completed === subtaskInfo.total ? 'bg-emerald-500' : 'bg-[var(--af-accent)]'}`} style={{ width: `${(subtaskInfo.completed / subtaskInfo.total) * 100}%` }} />
              </div>
            )}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${taskStColor(t.data.status)}`}>{t.data.status}</span>
          <button className="text-xs px-1.5 py-0.5 rounded bg-[var(--af-accent)]/10 text-[var(--af-accent)] cursor-pointer hover:bg-[var(--af-accent)]/20" onClick={() => openEditTask(t as unknown as Task)}><Pencil className="w-3 h-3" /></button>
          <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 cursor-pointer hover:bg-red-500/20" onClick={() => deleteTask(t.id)}><Trash2 className="w-3 h-3" /></button>
        </div>
        );
      })}
    </div>
  );
}
