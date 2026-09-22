import { getAdminDb } from '@/lib/firebase-admin';
import {
  getAllFlags,
  isFlagEnabled,
  setRuntimeFeatureFlags,
} from '@/lib/feature-flags';

const SERVER_FLAG_TTL_MS = 10_000;
let serverFlagsExpiresAt = 0;
let inflight: Promise<Record<string, boolean>> | null = null;

async function loadServerFlags(force = false): Promise<Record<string, boolean>> {
  if (!force && Date.now() < serverFlagsExpiresAt) {
    const all = getAllFlags();
    return Object.fromEntries(Object.entries(all).map(([key, value]) => [key, value.enabled]));
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const defaults = getAllFlags();
    const resolved: Record<string, boolean> = Object.fromEntries(
      Object.entries(defaults).map(([key, value]) => [key, value.enabled]),
    );

    try {
      const doc = await getAdminDb().collection('_platform_config').doc('feature_flags').get();
      if (doc.exists) {
        const data = doc.data() || {};
        for (const [key, value] of Object.entries(data) as [string, any][]) {
          if (typeof value?.enabled === 'boolean') resolved[key] = value.enabled;
        }
      }
    } catch (error) {
      console.warn('[FeatureFlags] Could not load dynamic flags, using fallback values.', error);
    }

    setRuntimeFeatureFlags(resolved);
    serverFlagsExpiresAt = Date.now() + SERVER_FLAG_TTL_MS;
    return resolved;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export async function isFlagEnabledDynamic(flag: string): Promise<boolean> {
  const flags = await loadServerFlags();
  return Object.prototype.hasOwnProperty.call(flags, flag) ? flags[flag] : isFlagEnabled(flag);
}

export async function getDynamicFeatureFlags(force = false) {
  const flags = await loadServerFlags(force);
  const registry = getAllFlags();
  return Object.entries(registry).map(([key, value]) => ({
    key,
    enabled: flags[key] ?? value.enabled,
    defaultValue: value.defaultValue,
    description: value.description,
  }));
}

export function invalidateDynamicFeatureFlagCache(): void {
  serverFlagsExpiresAt = 0;
}
