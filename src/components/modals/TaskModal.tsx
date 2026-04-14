'use client';
import React, { useState } from 'react';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useChat } from '@/hooks/useDomain';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import CenterModal from '@/components/common/CenterModal';
import { X, Users, Plus, Check, Square, Trash2 } from 'lucide-react';
import type { Subtask } from '@/lib/types';

export default function TaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const chat = useChat();

  const assignees: string[] = Array.isArray(ui.forms.taskAssignees) ? ui.forms.taskAssignees : [];
  const subtasks: Subtask[] = Array.isArray(ui.forms.taskSubtasks) ? ui.forms.taskSubtasks : [];
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;

  const toggleAssignee = (uid: string) => {
    ui.setForms((p: any) => {
      const current = Array.isArray(p.taskAssignees) ? p.taskAssignees : [];
      const updated = current.includes(uid) ? current.filter((id: string) => id !== uid) : [...current, uid];
      return { ...p, taskAssignees: updated, taskAssignee: updated[0] || '' };
    });
  };

  const removeAssignee = (uid: string) => {
    ui.setForms((p: any) => {
      const current = Array.isArray(p.taskAssignees) ? p.taskAssignees : [];
      const updated = current.filter((id: string) => id !== uid);
      return { ...p, taskAssignees: updated, taskAssignee: updated[0] || '' };
    });
  };

  const addSubtask = () => {
    const text = newSubtaskText.trim();
    if (!text) return;
    const newSubtask: Subtask = {
      id: 'st_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      text,
      completed: false,
    };
    ui.setForms((p: any) => ({
      ...p,
      taskSubtasks: [...(Array.isArray(p.taskSubtasks) ? p.taskSubtasks : []), newSubtask],
    }));
    setNewSubtaskText('');
  };

  const removeSubtask = (subtaskId: string) => {
    ui.setForms((p: any) => ({
      ...p,
      taskSubtasks: (Array.isArray(p.taskSubtasks) ? p.taskSubtasks : []).filter((s: Subtask) => s.id !== subtaskId),
    }));
  };

  const toggleSubtaskCheckbox = (subtaskId: string) => {
    ui.setForms((p: any) => ({
      ...p,
      taskSubtasks: (Array.isArray(p.taskSubtasks) ? p.taskSubtasks : []).map((s: Subtask) =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      ),
    }));
  };

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={520}>
      <h2 className="text-lg font-semibold mb-4">{ui.editingId ? 'Editar tarea' : 'Nueva tarea'}</h2>

      <div className="space-y-3">
        <FormField label="Titulo" required>
          <FormInput
            value={ui.forms.taskTitle || ''}
            onChange={(e) => ui.setForms((p: any) => ({ ...p, taskTitle: e.target.value }))}
            placeholder="Titulo de la tarea"
          />
        </FormField>

        <FormField label="Descripcion">
          <FormTextarea
            value={ui.forms.taskDescription || ''}
            onChange={(e) => ui.setForms((p: any) => ({ ...p, taskDescription: e.target.value }))}
            placeholder="Descripcion de la tarea"
            rows={3}
          />
        </FormField>

        {/* Subtasks / Checklist */}
        <FormField label="Lista de verificacion">
          <div className="space-y-2">
            {/* Progress indicator */}
            {totalCount > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1.5 bg-[var(--af-bg4)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${completedCount === totalCount ? 'bg-emerald-500' : 'bg-[var(--af-accent)]'}`}
                    style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-[var(--muted-foreground)] whitespace-nowrap">
                  {completedCount}/{totalCount} completadas
                </span>
              </div>
            )}

            {/* Subtask list */}
            {subtasks.length > 0 && (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {subtasks.map((s: Subtask) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2.5 px-3 py-2 border-b border-[var(--border)] last:border-0 group/st transition-colors hover:bg-[var(--af-bg3)] ${s.completed ? 'bg-emerald-500/5' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubtaskCheckbox(s.id)}
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center cursor-pointer border transition-all bg-transparent ${
                        s.completed
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-[var(--input)] hover:border-[var(--af-accent)]'
                      }`}
                    >
                      {s.completed && <Check size={11} className="text-white" strokeWidth={3} />}
                    </button>
                    <span className={`text-[12px] flex-1 leading-snug ${s.completed ? 'line-through text-[var(--af-text3)]' : 'text-[var(--foreground)]'}`}>
                      {s.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSubtask(s.id)}
                      className="opacity-0 group-hover/st:opacity-100 text-[var(--af-text3)] hover:text-red-400 cursor-pointer bg-transparent border-none p-0 transition-opacity flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                placeholder="Agregar sub-tarea..."
                className="flex-1 text-[12px] bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]/50 placeholder:text-[var(--af-text3)]"
              />
              <button
                type="button"
                onClick={addSubtask}
                disabled={!newSubtaskText.trim()}
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-none transition-colors flex-shrink-0 ${
                  newSubtaskText.trim()
                    ? 'bg-[var(--af-accent)] text-background hover:bg-[var(--af-accent2)]'
                    : 'bg-[var(--af-bg3)] text-[var(--af-text3)] cursor-not-allowed'
                }`}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </FormField>

        <FormField label="Proyecto">
          <FormSelect
            value={ui.forms.taskProject || ''}
            onChange={(e) => ui.setForms((p: any) => ({ ...p, taskProject: e.target.value }))}
          >
            <option value="">— Sin proyecto —</option>
            {fs.projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.data?.name || p.name}</option>
            ))}
          </FormSelect>
        </FormField>

        {/* Responsables multiples */}
        <FormField label="Responsables">
          <div className="space-y-2">
            {/* Chips de responsables seleccionados */}
            {assignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg min-h-[36px]">
                {assignees.map((uid: string) => {
                  const user = auth.teamUsers.find((u: any) => u.id === uid);
                  const name = user?.data?.name || uid;
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--af-accent)]/15 text-[var(--af-accent)] border border-[var(--af-accent)]/20"
                    >
                      {name}{uid === auth.authUser?.uid ? ' (Tu)' : ''}
                      <button
                        type="button"
                        className="ml-0.5 hover:text-red-400 cursor-pointer bg-transparent border-none p-0"
                        onClick={() => removeAssignee(uid)}
                      >
                        <X size={11} className="stroke-current" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Lista de checkbox para seleccionar */}
            <div className="border border-[var(--border)] rounded-lg overflow-hidden max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <div className="px-2.5 py-2 bg-[var(--af-bg3)] border-b border-[var(--border)] flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] font-medium">
                <Users size={12} />
                {assignees.length === 0 ? 'Seleccionar responsables' : `${assignees.length} responsable${assignees.length > 1 ? 's' : ''} seleccionado${assignees.length > 1 ? 's' : ''}`}
              </div>
              {auth.teamUsers.length === 0 && (
                <div className="px-3 py-3 text-[12px] text-[var(--muted-foreground)] text-center">
                  No hay miembros en el equipo
                </div>
              )}
              {auth.teamUsers.map((u: any) => {
                const uid = u.id;
                const name = u.data?.name || u.name || 'Sin nombre';
                const isChecked = assignees.includes(uid);
                return (
                  <label
                    key={uid}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--af-bg3)] transition-colors border-b border-[var(--border)] last:border-0 ${isChecked ? 'bg-[var(--af-accent)]/5' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAssignee(uid)}
                      className="w-3.5 h-3.5 rounded border-[var(--input)] text-[var(--af-accent)] cursor-pointer accent-[var(--af-accent)]"
                    />
                    <span className="text-[12px] text-[var(--foreground)] flex-1">{name}{uid === auth.authUser?.uid ? ' (Tu)' : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Prioridad">
            <FormSelect
              value={ui.forms.taskPriority || 'Media'}
              onChange={(e) => ui.setForms((p: any) => ({ ...p, taskPriority: e.target.value }))}
            >
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </FormSelect>
          </FormField>

          <FormField label="Estado">
            <FormSelect
              value={ui.forms.taskStatus || 'Por hacer'}
              onChange={(e) => ui.setForms((p: any) => ({ ...p, taskStatus: e.target.value }))}
            >
              <option value="Por hacer">Por hacer</option>
              <option value="En progreso">En progreso</option>
              <option value="Revision">Revision</option>
              <option value="Completado">Completado</option>
            </FormSelect>
          </FormField>
        </div>

        <FormField label="Fecha limite">
          <FormInput
            type="date"
            value={ui.forms.taskDue || ''}
            onChange={(e) => ui.setForms((p: any) => ({ ...p, taskDue: e.target.value }))}
          />
        </FormField>
      </div>

      <ModalFooter
        onCancel={() => ui.closeModal('task')}
        onSubmit={fs.saveTask}
        submitLabel={chat.isSavingTask ? 'Guardando...' : ui.editingId ? 'Actualizar' : 'Crear tarea'}
        submitDisabled={chat.isSavingTask}
      />
    </CenterModal>
  );
}
