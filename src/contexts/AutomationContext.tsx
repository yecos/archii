'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  AutomationRule,
  EvaluationContext,
  ExecutionLogEntry,
  TriggerType,
  DEFAULT_AUTOMATION_RULES,
  evaluateRule,
  executeRule,
  generateRuleId,
} from '@/lib/automation-engine';
import { useAuthContext } from './AuthContext';
import { useFirestoreContext } from './FirestoreContext';
import { useUIContext } from './UIContext';
import { useNotifContext } from './NotifContext';

const STORAGE_KEY = 'archiflow-automations';

interface AutomationContextType {
  rules: AutomationRule[];
  executionLog: ExecutionLogEntry[];
  addRule: (rule: Omit<AutomationRule, 'id' | 'createdAt'>) => void;
  removeRule: (ruleId: string) => void;
  toggleRule: (ruleId: string) => void;
  updateRule: (ruleId: string, updates: Partial<AutomationRule>) => void;
  evaluateAllRules: (context: EvaluationContext) => Promise<void>;
  clearLog: () => void;
}

const AutomationContext = createContext<AutomationContextType | null>(null);

export default function AutomationProvider({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuthContext();
  const { changeTaskStatus } = useFirestoreContext();
  const { showToast } = useUIContext();
  const { sendNotif } = useNotifContext();

  // ─── State ───
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // ─── Load from localStorage ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AutomationRule[];
        // Merge: keep default rules that don't exist yet, preserve user customizations
        const existingIds = new Set(parsed.map(r => r.id));
        const merged = [...parsed];
        for (const def of DEFAULT_AUTOMATION_RULES) {
          if (!existingIds.has(def.id)) {
            merged.push(def);
          }
        }
        setRules(merged);
      } else {
        setRules(DEFAULT_AUTOMATION_RULES);
      }
    } catch (err) {
      console.warn('[AutomationContext] Failed to load rules:', err);
      setRules(DEFAULT_AUTOMATION_RULES);
    }
    setLoaded(true);

    // Load execution log
    try {
      const logSaved = localStorage.getItem('archiflow-automation-log');
      if (logSaved) {
        setExecutionLog(JSON.parse(logSaved));
      }
    } catch {
      // ignore
    }
  }, []);

  // ─── Persist to localStorage ───
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch (err) {
      console.warn('[AutomationContext] Failed to save rules:', err);
    }
  }, [rules, loaded]);

  // ─── Persist execution log ───
  useEffect(() => {
    try {
      localStorage.setItem('archiflow-automation-log', JSON.stringify(executionLog.slice(0, 20)));
    } catch {
      // ignore
    }
  }, [executionLog]);

  // ─── Functions ───

  const addRule = useCallback((ruleData: Omit<AutomationRule, 'id' | 'createdAt'>) => {
    const newRule: AutomationRule = {
      ...ruleData,
      id: generateRuleId(),
      createdAt: new Date().toISOString(),
    };
    setRules(prev => [...prev, newRule]);
    showToast?.('✅ Regla creada');
  }, [showToast]);

  const removeRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
    showToast?.('🗑️ Regla eliminada');
  }, [showToast]);

  const toggleRule = useCallback((ruleId: string) => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<AutomationRule>) => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, ...updates } : r))
    );
  }, []);

  const addLogEntry = useCallback((entry: ExecutionLogEntry) => {
    setExecutionLog(prev => [entry, ...prev].slice(0, 20));
  }, []);

  const clearLog = useCallback(() => {
    setExecutionLog([]);
  }, []);

  // ─── Evaluate All Rules ───
  const evaluateAllRules = useCallback(async (context: EvaluationContext) => {
    for (const rule of rules) {
      if (!rule.enabled) continue;

      const matched = evaluateRule(rule, context);

      const logEntry: ExecutionLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        timestamp: new Date().toISOString(),
        result: matched ? 'triggered' : 'skipped',
        reason: matched ? 'Conditions met' : 'Conditions not met',
        context: `${context.eventType}${context.task ? ` / ${context.task.title}` : ''}${context.project ? ` / ${context.project.name}` : ''}`,
      };

      try {
        if (matched) {
          await executeRule(rule, context, {
            sendNotif: (title, body, icon) => {
              sendNotif?.(title, body, icon, `automation-${rule.id}`, {
                type: 'automation',
                screen: null,
                itemId: context.task?.id || context.project?.id || null,
              });
            },
            changeTaskStatus,
            showToast,
          });

          // Update lastTriggeredAt
          setRules(prev =>
            prev.map(r => (r.id === rule.id ? { ...r, lastTriggeredAt: new Date().toISOString() } : r))
          );
        }
        addLogEntry(logEntry);
      } catch (err) {
        addLogEntry({
          ...logEntry,
          result: 'error',
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }, [rules, changeTaskStatus, sendNotif, showToast, addLogEntry]);

  // ─── Watch for task status changes and trigger evaluation ───
  const prevTasksRef = useRef<string>('');

  // (The actual triggering is done by calling evaluateAllRules from wherever
  // relevant events happen — e.g., from the NotifContext effects or from
  // FirestoreContext task change handlers. The context exposes the function
  // for external callers.)

  const value = useMemo<AutomationContextType>(() => ({
    rules,
    executionLog,
    addRule,
    removeRule,
    toggleRule,
    updateRule,
    evaluateAllRules,
    clearLog,
  }), [rules, executionLog, addRule, removeRule, toggleRule, updateRule, evaluateAllRules, clearLog]);

  return (
    <AutomationContext.Provider value={value}>
      {children}
    </AutomationContext.Provider>
  );
}

export function useAutomationContext() {
  const ctx = useContext(AutomationContext);
  if (!ctx) throw new Error('useAutomationContext must be used within AutomationProvider');
  return ctx;
}
