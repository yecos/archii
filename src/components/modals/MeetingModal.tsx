'use client';
import React from 'react';
import CenterModal from '@/components/common/CenterModal';
import { useUI } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useCalendar } from '@/hooks/useDomain';
import { FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '@/components/common/FormField';
import { UserPlus } from 'lucide-react';

export default function MeetingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI();
  const auth = useAuth();
  const fs = useFirestore();
  const calendar = useCalendar();

  const toggleAttendee = (name: string) => {
    const current = (ui.forms.meetAttendees || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const idx = current.indexOf(name);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(name);
    }
    ui.setForms(p => ({ ...p, meetAttendees: current.join(', ') }));
  };

  const isAttendeeInList = (name: string) => {
    const current = (ui.forms.meetAttendees || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return current.includes(name);
  };

  const quickAddUsers = auth.teamUsers.slice(0, 8);

  return (
    <CenterModal open={open} onClose={onClose} maxWidth={480}>
      <h2 className="text-lg font-semibold mb-4">{ui.editingId ? 'Editar reunión' : 'Nueva reunión'}</h2>

      <div className="space-y-3">
        <FormField label="Título" required>
          <FormInput
            value={ui.forms.meetTitle || ''}
            onChange={(e) => ui.setForms(p => ({ ...p, meetTitle: e.target.value }))}
            placeholder="Título de la reunión"
          />
        </FormField>

        <FormField label="Proyecto">
          <FormSelect
            value={ui.forms.meetProject || ''}
            onChange={(e) => ui.setForms(p => ({ ...p, meetProject: e.target.value }))}
          >
            <option value="">— Sin proyecto —</option>
            {fs.projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.data?.name || p.name}</option>
            ))}
          </FormSelect>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fecha" required>
            <FormInput
              type="date"
              value={ui.forms.meetDate || ''}
              onChange={(e) => ui.setForms(p => ({ ...p, meetDate: e.target.value }))}
            />
          </FormField>

          <FormField label="Hora">
            <FormInput
              type="time"
              value={ui.forms.meetTime || '09:00'}
              onChange={(e) => ui.setForms(p => ({ ...p, meetTime: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Duración">
          <FormSelect
            value={ui.forms.meetDuration || '60'}
            onChange={(e) => ui.setForms(p => ({ ...p, meetDuration: e.target.value }))}
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
            value={ui.forms.meetAttendees || ''}
            onChange={(e) => ui.setForms(p => ({ ...p, meetAttendees: e.target.value }))}
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
            value={ui.forms.meetDesc || ''}
            onChange={(e) => ui.setForms(p => ({ ...p, meetDesc: e.target.value }))}
            placeholder="Agenda o notas de la reunión"
            rows={3}
          />
        </FormField>
      </div>

      <ModalFooter
        onCancel={() => ui.closeModal('meeting')}
        onSubmit={calendar.saveMeeting}
        submitLabel={ui.editingId ? 'Actualizar' : 'Crear reunión'}
      />
    </CenterModal>
  );
}
