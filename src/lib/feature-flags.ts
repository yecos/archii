/**
 * Runtime-aware feature flags.
 *
 * Resolution order:
 * 1. Runtime overrides loaded from Firestore.
 * 2. NEXT_PUBLIC_FLAG_* environment variable.
 * 3. Registry default.
 *
 * Client consumers can subscribe so UI updates without a redeploy.
 */

const FLAG_REGISTRY: Record<string, { envKey: string; defaultValue: boolean; description: string }> = {
  offline_queue: { envKey: 'OFFLINE_QUEUE', defaultValue: true, description: 'Activa la cola offline para writes cuando no hay conexión' },
  virtualized_lists: { envKey: 'VIRTUALIZED_LISTS', defaultValue: true, description: 'Usa virtualización para listas grandes (Kanban, Timeline, Notificaciones)' },
  audit_logs: { envKey: 'AUDIT_LOGS', defaultValue: true, description: 'Registra todas las operaciones de escritura en audit_logs' },
  rag_search: { envKey: 'RAG_SEARCH', defaultValue: true, description: 'Habilita la búsqueda RAG por tenant (IA semántica)' },
  health_score_predictive: { envKey: 'HEALTH_SCORE_PREDICTIVE', defaultValue: false, description: 'Activa el Health Score predictivo con IA' },
  sso_saml: { envKey: 'SSO_SAML', defaultValue: false, description: 'Habilita login SSO/SAML para tenants enterprise' },
  public_api: { envKey: 'PUBLIC_API', defaultValue: false, description: 'Expone la API pública /api/v1/* con rate limiting' },
  webhooks_system: { envKey: 'WEBHOOKS_SYSTEM', defaultValue: false, description: 'Activa el sistema de webhooks para integraciones' },
  realtime_collab: { envKey: 'REALTIME_COLLAB', defaultValue: false, description: 'Colaboración en tiempo real con cursores y presencia' },
  marketplace: { envKey: 'MARKETPLACE', defaultValue: false, description: 'Marketplace de integraciones (GitHub, Slack, Jira, etc.)' },
  bi_connector: { envKey: 'BI_CONNECTOR', defaultValue: false, description: 'Conector BI para Power BI / Tableau' },
  field_encryption: { envKey: 'FIELD_ENCRYPTION', defaultValue: false, description: 'Encriptación field-level para datos sensibles' },
  gdpr_tools: { envKey: 'GDPR_TOOLS', defaultValue: true, description: 'Herramientas GDPR (exportación/eliminación de datos)' },
  carnets: { envKey: 'CARNETS', defaultValue: true, description: 'Módulo de Carnets corporativos (CRUD, QR, PDF/PNG export)' },
  feedback_widget: { envKey: 'FEEDBACK_WIDGET', defaultValue: true, description: 'Muestra el widget de feedback flotante para reportes de usuarios' },
  error_reporting: { envKey: 'ERROR_REPORTING', defaultValue: true, description: 'Envía errores de UI a Firestore para análisis de bugs' },
  telemetry: { envKey: 'TELEMETRY', defaultValue: true, description: 'Telemetría anónima de uso de features (sin datos personales)' },
  beta_mode: { envKey: 'BETA_MODE', defaultValue: true, description: 'Activa indicadores visuales de beta y badge en la UI' },
};

type FeatureFlagGlobalState = {
  state.runtimeFlags: Record<string, boolean>;
  version: number;
  listeners: Set<() => void>;
};

const globalStore = globalThis as typeof globalThis & {
  __archiiFeatureFlags?: FeatureFlagGlobalState;
};

const state: FeatureFlagGlobalState = globalStore.__archiiFeatureFlags || {
  state.runtimeFlags: {},
  version: 0,
  listeners: new Set<() => void>(),
};
globalStore.__archiiFeatureFlags = state;

function envOrDefault(flag: string): boolean {
  const registry = FLAG_REGISTRY[flag];
  if (!registry) {
    console.warn(`[FeatureFlags] Flag desconocida: ${flag}`);
    return false;
  }
  const envValue = process.env[`NEXT_PUBLIC_FLAG_${registry.envKey}`];
  if (envValue !== undefined) return envValue === 'true' || envValue === '1';
  return registry.defaultValue;
}

export function isFlagEnabled(flag: string): boolean {
  if (Object.prototype.hasOwnProperty.call(state.runtimeFlags, flag)) return state.runtimeFlags[flag];
  return envOrDefault(flag);
}

export function setRuntimeFeatureFlags(flags: Record<string, boolean>): void {
  state.runtimeFlags = { ...state.runtimeFlags, ...flags };
  state.version += 1;
  state.listeners.forEach(listener => listener());
}

export function setRuntimeFeatureFlag(flag: string, enabled: boolean): void {
  setRuntimeFeatureFlags({ [flag]: enabled });
}

export function clearRuntimeFeatureFlags(): void {
  state.runtimeFlags = {};
  state.version += 1;
  state.listeners.forEach(listener => listener());
}

export function subscribeFeatureFlags(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

export function getFeatureFlagsVersion(): number {
  return state.version;
}

export function getAllFlags(): Record<string, { enabled: boolean; defaultValue: boolean; description: string }> {
  const result: Record<string, { enabled: boolean; defaultValue: boolean; description: string }> = {};
  for (const [key, registry] of Object.entries(FLAG_REGISTRY)) {
    result[key] = {
      enabled: isFlagEnabled(key),
      defaultValue: registry.defaultValue,
      description: registry.description,
    };
  }
  return result;
}

export function getEnabledFlags(): string[] {
  return Object.keys(FLAG_REGISTRY).filter(isFlagEnabled);
}

/** Backwards-compatible alias. */
export function clearFlagCache(): void {
  clearRuntimeFeatureFlags();
}
