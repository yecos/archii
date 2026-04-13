'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { X, Users } from 'lucide-react';

const DrawerModal = ({ open, onClose, children, maxWidth = 480 }: { open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: number }) => (
  <Drawer.Root open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }} handleOnly={false} dismissible={true}>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
      <Drawer.Content className="bg-[var(--card)] border-t border-[var(--border)] rounded-t-2xl mx-auto z-[101] flex flex-col max-h-[85dvh] sm:max-h-[85vh]" style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined, width: '95vw' }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <Drawer.Handle className="w-10 h-[5px] rounded-full bg-[var(--muted-foreground)]/20 active:bg-[var(--muted-foreground)]/40 transition-colors" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);

export default function TaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, editingId, closeModal, saveTask, isSavingTask, projects, teamUsers, authUser } = useApp();

  const assignees: string[] = Array.isArray(forms.taskAssignees) ? forms.taskAssignees : [];

  const toggleAssignee = (uid: string) => {
    setForms((p: any) => {
      const current = Array.isArray(p.taskAssignees) ? p.taskAssignees : [];
      const updated = current.includes(uid) ? current.filter((id: string) => id !== uid) : [...current, uid];
      return { ...p, taskAssignees: updated, taskAssignee: updated[0] || '' };
    });
  };

  const removeAssignee = (uid: string) => {
    setForms((p: any) => {
      const current = Array.isArray(p.taskAssignees) ? p.taskAssignees : [];
      const updated = current.filter((id: string) => id !== uid);
      return { ...p, taskAssignees: updated, taskAssignee: updated[0] || '' };
    });
  };

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={520}>
      <h2 className="text-lg font-semibold mb-4">{editingId ? 'Editar tarea' : 'Nueva tarea'}</h2>

      <div className="space-y-3">
        <FormField label="Titulo" required>
          <FormInput
            value={forms.taskTitle || ''}
            onChange={(e) => setForms((p: any) => ({ ...p, taskTitle: e.target.value }))}
            placeholder="Titulo de la tarea"
          />
        </FormField>

        <FormField label="Descripcion">
          <FormTextarea
            value={forms.taskDescription || ''}
            onChange={(e) => setForms((p: any) => ({ ...p, taskDescription: e.target.value }))}
            placeholder="Descripcion de la tarea"
            rows={3}
          />
        </FormField>

        <FormField label="Proyecto">
          <FormSelect
            value={forms.taskProject || ''}
            onChange={(e) => setForms((p: any) => ({ ...p, taskProject: e.target.value }))}
          >
            <option value="">— Sin proyecto —</option>
            {projects.map((p: any) => (
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
                  const user = teamUsers.find((u: any) => u.id === uid);
                  const name = user?.data?.name || user?.name || uid;
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--af-accent)]/15 text-[var(--af-accent)] border border-[var(--af-accent)]/20"
                    >
                      {name}{uid === authUser?.uid ? ' (Tu)' : ''}
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
              {teamUsers.length === 0 && (
                <div className="px-3 py-3 text-[12px] text-[var(--muted-foreground)] text-center">
                  No hay miembros en el equipo
                </div>
              )}
              {teamUsers.map((u: any) => {
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
                    <span className="text-[12px] text-[var(--foreground)] flex-1">{name}{uid === authUser?.uid ? ' (Tu)' : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Prioridad">
            <FormSelect
              value={forms.taskPriority || 'Media'}
              onChange={(e) => setForms((p: any) => ({ ...p, taskPriority: e.target.value }))}
            >
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </FormSelect>
          </FormField>

          <FormField label="Estado">
            <FormSelect
              value={forms.taskStatus || 'Por hacer'}
              onChange={(e) => setForms((p: any) => ({ ...p, taskStatus: e.target.value }))}
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
            value={forms.taskDue || ''}
            onChange={(e) => setForms((p: any) => ({ ...p, taskDue: e.target.value }))}
          />
        </FormField>
      </div>

      <ModalFooter
        onCancel={() => closeModal('task')}
        onSubmit={saveTask}
        submitLabel={isSavingTask ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear tarea'}
        submitDisabled={isSavingTask}
      />
    </DrawerModal>
  );
}
