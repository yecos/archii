'use client';
import React, { useState, useMemo } from 'react';
import {
  Zap, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Play, Clock, CheckCircle2, XCircle, AlertTriangle, ScrollText, Info,
  ArrowRight, RefreshCw, History, Shield,
} from 'lucide-react';
import { useAutomationContext } from '@/contexts/AutomationContext';
import {
  AutomationRule,
  TriggerType,
  ActionType,
  TriggerCondition,
  ActionParams,
  ExecutionLogEntry,
  TRIGGER_LABELS,
  TRIGGER_ICONS,
  ACTION_LABELS,
  ACTION_ICONS,
  getTriggerSummary,
  getActionSummary,
  createBlankRule,
} from '@/lib/automation-engine';

export default function AutomationScreen() {
  const {
    rules,
    executionLog,
    addRule,
    removeRule,
    toggleRule,
    clearLog,
  } = useAutomationContext();

  const [showForm, setShowForm] = useState(false);
  const [expandedLog, setExpandedLog] = useState(false);
  const [form, setForm] = useState(() => ({
    ...createBlankRule(),
  }));

  const enabledCount = useMemo(() => rules.filter(r => r.enabled).length, [rules]);

  // ─── Form Handlers ───

  const resetForm = () => {
    setForm({ ...createBlankRule() });
    setShowForm(false);
  };

  const handleTriggerTypeChange = (type: TriggerType) => {
    const defaultConditions: TriggerCondition = {};
    if (type === 'task_status_change') defaultConditions.status = 'Completado';
    if (type === 'budget_threshold') defaultConditions.threshold = 90;
    if (type === 'task_overdue') defaultConditions.days = 3;
    if (type === 'phase_change') defaultConditions.phaseStatus = 'Completado';
    if (type === 'new_expense') defaultConditions.minAmount = 500000;

    setForm(prev => ({
      ...prev,
      trigger: { type, conditions: defaultConditions },
    }));
  };

  const handleActionTypeChange = (type: ActionType) => {
    const defaultParams: ActionParams = {};
    if (type === 'notify_user') defaultParams.target = 'assignees';
    if (type === 'change_status') defaultParams.newStatus = 'En progreso';
    if (type === 'create_task') defaultParams.taskTitle = '';
    if (type === 'send_whatsapp') defaultParams.phone = '';
    if (type === 'add_tag') defaultParams.tag = 'auto';

    setForm(prev => ({
      ...prev,
      action: { type, params: defaultParams },
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    addRule(form);
    resetForm();
  };

  const isValid = form.name.trim().length > 0;

  // ─── Log helpers ───

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const logResultIcon = (result: ExecutionLogEntry['result']) => {
    switch (result) {
      case 'triggered': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'skipped': return <XCircle size={14} className="text-[var(--muted-foreground)]" />;
      case 'error': return <AlertTriangle size={14} className="text-red-500" />;
    }
  };

  const displayedLog = expandedLog ? executionLog : executionLog.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--skeuo-text-primary)] flex items-center gap-2">
            <Zap size={24} className="text-amber-500" />
            Flujos Automatizados
          </h1>
          <p className="text-sm text-[var(--skeuo-text-secondary)] mt-1">
            Reglas automáticas que reaccionan a eventos del proyecto
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--af-accent)] text-background rounded-xl text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors shrink-0"
        >
          {showForm ? <XCircle size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancelar' : 'Crear Regla'}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)]">
          <div className="text-xl font-bold text-[var(--skeuo-text-primary)]">{rules.length}</div>
          <div className="text-xs text-[var(--skeuo-text-secondary)]">Reglas totales</div>
        </div>
        <div className="p-3 rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)]">
          <div className="text-xl font-bold text-green-500">{enabledCount}</div>
          <div className="text-xs text-[var(--skeuo-text-secondary)]">Activas</div>
        </div>
        <div className="p-3 rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)]">
          <div className="text-xl font-bold text-amber-500">
            {executionLog.filter(l => l.result === 'triggered').length}
          </div>
          <div className="text-xs text-[var(--skeuo-text-secondary)]">Ejecuciones</div>
        </div>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-4 animate-fadeIn">
          <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
            <Plus size={16} className="text-[var(--af-accent)]" />
            Nueva Regla Automatizada
          </h3>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--skeuo-text-secondary)]">Nombre de la regla</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Notificar al director cuando..."
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--skeuo-sunken)] border border-[var(--skeuo-edge-light)] text-sm text-[var(--skeuo-text-primary)] placeholder:text-[var(--skeuo-text-secondary)] focus:outline-none focus:border-[var(--af-accent)]/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--skeuo-text-secondary)]">Descripción (opcional)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe qué hace esta regla..."
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--skeuo-sunken)] border border-[var(--skeuo-edge-light)] text-sm text-[var(--skeuo-text-primary)] placeholder:text-[var(--skeuo-text-secondary)] focus:outline-none focus:border-[var(--af-accent)]/50 transition-colors"
            />
          </div>

          {/* Trigger */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--skeuo-text-secondary)]">
              {TRIGGER_ICONS[form.trigger.type]} Disparador (Trigger)
            </label>
            <select
              value={form.trigger.type}
              onChange={e => handleTriggerTypeChange(e.target.value as TriggerType)}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--skeuo-sunken)] border border-[var(--skeuo-edge-light)] text-sm text-[var(--skeuo-text-primary)] focus:outline-none focus:border-[var(--af-accent)]/50 transition-colors cursor-pointer"
            >
              {(Object.entries(TRIGGER_LABELS) as [TriggerType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Trigger conditions */}
            <TriggerConditionInputs
              triggerType={form.trigger.type}
              conditions={form.trigger.conditions}
              onChange={conditions => setForm(prev => ({ ...prev, trigger: { ...prev.trigger, conditions } }))}
            />
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--skeuo-text-secondary)]">
              {ACTION_ICONS[form.action.type]} Acción (Action)
            </label>
            <select
              value={form.action.type}
              onChange={e => handleActionTypeChange(e.target.value as ActionType)}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--skeuo-sunken)] border border-[var(--skeuo-edge-light)] text-sm text-[var(--skeuo-text-primary)] focus:outline-none focus:border-[var(--af-accent)]/50 transition-colors cursor-pointer"
            >
              {(Object.entries(ACTION_LABELS) as [ActionType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Action params */}
            <ActionParamsInputs
              actionType={form.action.type}
              params={form.action.params}
              onChange={params => setForm(prev => ({ ...prev, action: { ...prev.action, params } }))}
            />
          </div>

          {/* Preview */}
          {form.name && (
            <div className="p-3 rounded-lg bg-[var(--skeuo-sunken)] border border-[var(--skeuo-edge-light)]">
              <div className="text-xs font-medium text-[var(--skeuo-text-secondary)] mb-1">Vista previa</div>
              <div className="text-sm text-[var(--skeuo-text-primary)]">
                <span className="font-medium">{form.name}</span>
                <span className="mx-2 text-[var(--muted-foreground)]">→</span>
                <span className="text-xs">{getTriggerSummary(form.trigger)}</span>
                <ArrowRight size={12} className="inline mx-1 text-[var(--muted-foreground)]" />
                <span className="text-xs">{getActionSummary(form.action)}</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--af-accent)] text-background rounded-xl text-sm font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap size={16} />
            Crear Regla
          </button>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--skeuo-text-secondary)] uppercase tracking-wider">
            Reglas ({rules.length})
          </h2>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)]">
            <Zap size={32} className="text-[var(--muted-foreground)] mx-auto mb-3" />
            <div className="text-sm text-[var(--skeuo-text-secondary)]">No hay reglas configuradas</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">Crea tu primera regla para automatizar flujos de trabajo</div>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onRemove={() => removeRule(rule.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
              <History size={18} className="text-blue-500" />
              Registro de Ejecuciones
              <span className="text-xs font-normal text-[var(--skeuo-text-secondary)]">
                ({executionLog.length} total)
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={clearLog}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-500/10 cursor-pointer bg-transparent border-none transition-colors"
              >
                <Trash2 size={12} />
                Limpiar
              </button>
              {executionLog.length > 5 && (
                <button
                  onClick={() => setExpandedLog(!expandedLog)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-[var(--skeuo-text-secondary)] hover:bg-[var(--skeuo-sunken)] cursor-pointer bg-transparent border-none transition-colors"
                >
                  {expandedLog ? (
                    <>
                      <ChevronUp size={12} />
                      Menos
                    </>
                  ) : (
                    <>
                      <ChevronDown size={12} />
                      Ver más ({executionLog.length - 5})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {displayedLog.map(entry => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--skeuo-sunken)] hover:bg-[var(--skeuo-sunken)]/80 transition-colors"
              >
                {logResultIcon(entry.result)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--skeuo-text-primary)] truncate">
                    {entry.ruleName}
                  </div>
                  <div className="text-xs text-[var(--skeuo-text-secondary)] truncate mt-0.5">
                    {entry.context}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    entry.result === 'triggered'
                      ? 'bg-green-500/10 text-green-600'
                      : entry.result === 'error'
                        ? 'bg-red-500/10 text-red-600'
                        : 'bg-[var(--skeuo-raised)] text-[var(--skeuo-text-secondary)]'
                  }`}>
                    {entry.result === 'triggered' ? 'Ejecutada' : entry.result === 'error' ? 'Error' : 'Omitida'}
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mt-1">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-3">
        <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
          <Info size={18} className="text-blue-500" />
          Cómo funcionan las automatizaciones
        </h3>
        <div className="space-y-2 text-sm text-[var(--skeuo-text-secondary)]">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 text-xs font-bold text-amber-500">1</div>
            <div>
              <div className="font-medium text-[var(--skeuo-text-primary)]">Disparador (Trigger)</div>
              <div className="text-xs">Un evento que inicia la regla: cambio de estado, umbral de presupuesto, tarea vencida, etc.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-xs font-bold text-blue-500">2</div>
            <div>
              <div className="font-medium text-[var(--skeuo-text-primary)]">Condición</div>
              <div className="text-xs">Parámetros específicos que deben cumplirse: estado exacto, porcentaje, días vencidos, monto, etc.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 text-xs font-bold text-green-500">3</div>
            <div>
              <div className="font-medium text-[var(--skeuo-text-primary)]">Acción</div>
              <div className="text-xs">Lo que sucede cuando se cumple la condición: notificación, cambio de estado, crear tarea, etc.</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-[var(--skeuo-text-secondary)] p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-start gap-2">
          <Shield size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <span>Las reglas se almacenan localmente en tu dispositivo. Puedes activarlas o desactivarlas en cualquier momento.</span>
        </div>
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */

function RuleCard({ rule, onToggle, onRemove }: {
  rule: AutomationRule;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rounded-xl bg-[var(--skeuo-raised)] border transition-all ${rule.enabled ? 'border-[var(--skeuo-edge-light)]' : 'border-[var(--skeuo-edge-light)] opacity-60'}`}>
      <div className="flex items-center gap-3 p-4">
        {/* Toggle */}
        <button
          onClick={onToggle}
          className="shrink-0 bg-transparent border-none cursor-pointer p-0 hover:opacity-80 transition-opacity"
          aria-label={rule.enabled ? 'Desactivar regla' : 'Activar regla'}
        >
          {rule.enabled ? (
            <ToggleRight size={32} className="text-green-500" />
          ) : (
            <ToggleLeft size={32} className="text-[var(--muted-foreground)]" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{TRIGGER_ICONS[rule.trigger.type]}</span>
            <span className="text-sm font-semibold text-[var(--skeuo-text-primary)] truncate">
              {rule.name}
            </span>
            {rule.lastTriggeredAt && (
              <span className="text-[10px] text-[var(--muted-foreground)] shrink-0" title={new Date(rule.lastTriggeredAt).toLocaleString()}>
                <Clock size={10} className="inline mr-0.5" />
                {new Date(rule.lastTriggeredAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
          {rule.description && (
            <div className="text-xs text-[var(--skeuo-text-secondary)] mt-0.5 truncate">
              {rule.description}
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--skeuo-sunken)] text-[10px] text-[var(--skeuo-text-secondary)]">
              {TRIGGER_ICONS[rule.trigger.type]} {getTriggerSummary(rule.trigger)}
            </span>
            <ArrowRight size={10} className="text-[var(--muted-foreground)]" />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--skeuo-sunken)] text-[10px] text-[var(--skeuo-text-secondary)]">
              {ACTION_ICONS[rule.action.type]} {getActionSummary(rule.action)}
            </span>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 cursor-pointer bg-transparent border-none shrink-0 transition-colors"
          aria-label="Eliminar regla"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function TriggerConditionInputs({ triggerType, conditions, onChange }: {
  triggerType: TriggerType;
  conditions: TriggerCondition;
  onChange: (c: TriggerCondition) => void;
}) {
  const inputClass = "w-full px-3 py-2 rounded-lg bg-[var(--skeuo-sunken)] border border-[var(--skeuo-edge-light)] text-sm text-[var(--skeuo-text-primary)] placeholder:text-[var(--skeuo-text-secondary)] focus:outline-none focus:border-[var(--af-accent)]/50 transition-colors";

  switch (triggerType) {
    case 'task_status_change':
      return (
        <div className="mt-2 space-y-1.5">
          <label className="text-xs text-[var(--skeuo-text-secondary)]">Estado objetivo</label>
          <select
            value={conditions.status || ''}
            onChange={e => onChange({ ...conditions, status: e.target.value })}
            className={inputClass}
          >
            <option value="">Cualquier cambio</option>
            <option value="Por hacer">Por hacer</option>
            <option value="En progreso">En progreso</option>
            <option value="En revisión">En revisión</option>
            <option value="Completado">Completado</option>
          </select>
        </div>
      );

    case 'budget_threshold':
      return (
        <div className="mt-2 space-y-1.5">
          <label className="text-xs text-[var(--skeuo-text-secondary)]">Porcentaje del presupuesto (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={conditions.threshold ?? 90}
            onChange={e => onChange({ ...conditions, threshold: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
      );

    case 'task_overdue':
      return (
        <div className="mt-2 space-y-1.5">
          <label className="text-xs text-[var(--skeuo-text-secondary)]">Días vencida</label>
          <input
            type="number"
            min={1}
            value={conditions.days ?? 3}
            onChange={e => onChange({ ...conditions, days: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
      );

    case 'phase_change':
      return (
        <div className="mt-2 space-y-1.5">
          <label className="text-xs text-[var(--skeuo-text-secondary)]">Estado de fase requerido</label>
          <select
            value={conditions.phaseStatus || ''}
            onChange={e => onChange({ ...conditions, phaseStatus: e.target.value })}
            className={inputClass}
          >
            <option value="Completado">Completado</option>
            <option value="En progreso">En progreso</option>
            <option value="Pendiente">Pendiente</option>
          </select>
        </div>
      );

    case 'new_expense':
      return (
        <div className="mt-2 space-y-1.5">
          <label className="text-xs text-[var(--skeuo-text-secondary)]">Monto mínimo ($)</label>
          <input
            type="number"
            min={0}
            value={conditions.minAmount ?? 500000}
            onChange={e => onChange({ ...conditions, minAmount: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
      );

    default:
      return null;
  }
}

function ActionParamsInputs({ actionType, params, onChange }: {
  actionType: ActionType;
  params: ActionParams;
  onChange: (p: ActionParams) => void;
}) {
  const inputClass = "w-full px-3 py-2 rounded-lg bg-[var(--skeuo-sunken)] border border-[var(--skeuo-edge-light)] text-sm text-[var(--skeuo-text-primary)] placeholder:text-[var(--skeuo-text-secondary)] focus:outline-none focus:border-[var(--af-accent)]/50 transition-colors";

  switch (actionType) {
    case 'notify_user':
      return (
        <div className="mt-2 space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--skeuo-text-secondary)]">Destinatario</label>
            <select
              value={params.target || 'assignees'}
              onChange={e => onChange({ ...params, target: e.target.value })}
              className={inputClass}
            >
              <option value="assignees">Asignados a la tarea</option>
              <option value="admin">Administradores</option>
              <option value="director">Director</option>
              <option value="all">Todos</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--skeuo-text-secondary)]">Mensaje</label>
            <input
              type="text"
              value={params.message || ''}
              onChange={e => onChange({ ...params, message: e.target.value })}
              placeholder="Mensaje de notificación..."
              className={inputClass}
            />
          </div>
        </div>
      );

    case 'change_status':
      return (
        <div className="mt-2 space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--skeuo-text-secondary)]">Nuevo estado</label>
            <select
              value={params.newStatus || ''}
              onChange={e => onChange({ ...params, newStatus: e.target.value })}
              className={inputClass}
            >
              <option value="">No cambiar</option>
              <option value="Por hacer">Por hacer</option>
              <option value="En progreso">En progreso</option>
              <option value="En revisión">En revisión</option>
              <option value="Completado">Completado</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--skeuo-text-secondary)]">Nueva prioridad</label>
            <select
              value={params.newPriority || ''}
              onChange={e => onChange({ ...params, newPriority: e.target.value })}
              className={inputClass}
            >
              <option value="">No cambiar</option>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>
      );

    case 'create_task':
      return (
        <div className="mt-2 space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--skeuo-text-secondary)]">Título de la tarea</label>
            <input
              type="text"
              value={params.taskTitle || ''}
              onChange={e => onChange({ ...params, taskTitle: e.target.value })}
              placeholder="Título de la tarea a crear..."
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--skeuo-text-secondary)]">Descripción</label>
            <input
              type="text"
              value={params.taskDesc || ''}
              onChange={e => onChange({ ...params, taskDesc: e.target.value })}
              placeholder="Descripción opcional..."
              className={inputClass}
            />
          </div>
        </div>
      );

    case 'send_whatsapp':
      return (
        <div className="mt-2 space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--skeuo-text-secondary)]">Teléfono destino</label>
            <input
              type="text"
              value={params.phone || ''}
              onChange={e => onChange({ ...params, phone: e.target.value })}
              placeholder="+57 300 123 4567"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--skeuo-text-secondary)]">Mensaje</label>
            <input
              type="text"
              value={params.whatsappMessage || ''}
              onChange={e => onChange({ ...params, whatsappMessage: e.target.value })}
              placeholder="Mensaje de WhatsApp..."
              className={inputClass}
            />
          </div>
        </div>
      );

    case 'add_tag':
      return (
        <div className="mt-2 space-y-1.5">
          <label className="text-xs text-[var(--skeuo-text-secondary)]">Etiqueta</label>
          <input
            type="text"
            value={params.tag || ''}
            onChange={e => onChange({ ...params, tag: e.target.value })}
            placeholder="Nombre de la etiqueta..."
            className={inputClass}
          />
        </div>
      );

    default:
      return null;
  }
}
