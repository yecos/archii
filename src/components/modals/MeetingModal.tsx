'use client';
import React from 'react';
import { Drawer } from 'vaul';
import { useApp } from '@/contexts/AppContext';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { UserPlus } from 'lucide-react';

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

export default function MeetingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { forms, setForms, editingId, closeModal, saveMeeting, projects, teamUsers, authUser } = useApp();

  const toggleAttendee = (name: string) => {
    const current = (forms.meetAttendees || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const idx = current.indexOf(name);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(name);
    }
    setForms(p => ({ ...p, meetAttendees: current.join(', ') }));
  };

  const isAttendeeInList = (name: string) => {
    const current = (forms.meetAttendees || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return current.includes(name);
  };

  const quickAddUsers = teamUsers.slice(0, 8);

  return (
    <DrawerModal open={open} onClose={onClose} maxWidth={480}>
      <h2 className="text-lg font-semibold mb-4">{editingId ? 'Editar reunión' : 'Nueva reunión'}</h2>

      <div className="space-y-3">
        <FormField label="Título" required>
          <FormInput
            value={forms.meetTitle || ''}
            onChange={(e) => setForms(p => ({ ...p, meetTitle: e.target.value }))}
            placeholder="Título de la reunión"
          />
        </FormField>

        <FormField label="Proyecto">
          <FormSelect
            value={forms.meetProject || ''}
            onChange={(e) => setForms(p => ({ ...p, meetProject: e.target.value }))}
          >
            <option value="">— Sin proyecto —</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.data?.name || p.name}</option>
            ))}
          </FormSelect>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fecha" required>
            <FormInput
              type="date"
              value={forms.meetDate || ''}
              onChange={(e) => setForms(p => ({ ...p, meetDate: e.target.value }))}
            />
          </FormField>

          <FormField label="Hora">
            <FormInput
              type="time"
              value={forms.meetTime || '09:00'}
              onChange={(e) => setForms(p => ({ ...p, meetTime: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Duración">
          <FormSelect
            value={forms.meetDuration || '60'}
            onChange={(e) => setForms(p => ({ ...p, meetDuration: e.target.value }))}
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
            <option value="120">120 min</option>
          </FormSelect>
        </FormField>

        <FormField label="Participantes">
          <FormInput
            value={forms.meetAttendees || ''}
            onChange={(e) => setForms(p => ({ ...p, meetAttendees: e.target.value }))}
            placeholder="Nombres separados por coma"
          />
          {quickAddUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <UserPlus size={12} className="text-[var(--muted-foreground)] mt-0.5 mr-0.5" />
              {quickAddUsers.map((u: any) => {
                const name = u.data?.name || u.name || '';
                const inList = isAttendeeInList(name);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAttendee(name)}
                    className={`px-2 py-0.5 text-[11px] rounded-full border cursor-pointer transition-all ${
                      inList
                        ? 'bg-[var(--af-accent)]/15 text-[var(--af-accent)] border-[var(--af-accent)]/30'
                        : 'bg-[var(--af-bg3)] text-[var(--muted-foreground)] border-[var(--input)] hover:border-[var(--af-accent)]/30'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </FormField>

        <FormField label="Descripción">
          <FormTextarea
            value={forms.meetDesc || ''}
            onChange={(e) => setForms(p => ({ ...p, meetDesc: e.target.value }))}
            placeholder="Agenda o notas de la reunión"
            rows={3}
          />
        </FormField>
      </div>

      <ModalFooter
        onCancel={() => closeModal('meeting')}
        onSubmit={saveMeeting}
        submitLabel={editingId ? 'Actualizar' : 'Crear reunión'}
      />
    </DrawerModal>
  );
}
