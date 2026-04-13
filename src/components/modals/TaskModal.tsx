'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';

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

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={480}>
      <h2 className="text-lg font-semibold mb-4">{editingId ? 'Editar tarea' : 'Nueva tarea'}</h2>

      <div className="space-y-3">
        <FormField label="Título" required>
          <FormInput
            value={forms.taskTitle || ''}
            onChange={(e) => setForms(p => ({ ...p, taskTitle: e.target.value }))}
            placeholder="Título de la tarea"
          />
        </FormField>

        <FormField label="Descripción">
          <FormTextarea
            value={forms.taskDescription || ''}
            onChange={(e) => setForms(p => ({ ...p, taskDescription: e.target.value }))}
            placeholder="Descripción de la tarea"
            rows={3}
          />
        </FormField>

        <FormField label="Proyecto">
          <FormSelect
            value={forms.taskProject || ''}
            onChange={(e) => setForms(p => ({ ...p, taskProject: e.target.value }))}
          >
            <option value="">— Sin proyecto —</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.data?.name || p.name}</option>
            ))}
          </FormSelect>
        </FormField>

        <FormField label="Responsable">
          <FormSelect
            value={forms.taskAssignee || ''}
            onChange={(e) => setForms(p => ({ ...p, taskAssignee: e.target.value }))}
          >
            <option value="">— Sin asignar —</option>
            {teamUsers.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.data?.name || u.name}{u.id === authUser?.uid ? ' (Tú)' : ''}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Prioridad">
            <FormSelect
              value={forms.taskPriority || 'Media'}
              onChange={(e) => setForms(p => ({ ...p, taskPriority: e.target.value }))}
            >
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </FormSelect>
          </FormField>

          <FormField label="Estado">
            <FormSelect
              value={forms.taskStatus || 'Por hacer'}
              onChange={(e) => setForms(p => ({ ...p, taskStatus: e.target.value }))}
            >
              <option value="Por hacer">Por hacer</option>
              <option value="En progreso">En progreso</option>
              <option value="Revision">Revisión</option>
              <option value="Completado">Completado</option>
            </FormSelect>
          </FormField>
        </div>

        <FormField label="Fecha límite">
          <FormInput
            type="date"
            value={forms.taskDue || ''}
            onChange={(e) => setForms(p => ({ ...p, taskDue: e.target.value }))}
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
