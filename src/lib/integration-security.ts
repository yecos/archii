/** Shared redaction helpers for integration responses, logs, and errors. */

export type IntegrationConfigField = {
  key: string;
  type: string;
};

const SENSITIVE_KEY_PATTERN = /(?:token|secret|password|credential|authorization|cookie|webhook|api[\s_-]*key|access[\s_-]*key|private[\s_-]*key)/i;

// These patterns cover common provider credentials that may appear in a plain-text
// upstream error or response. Known values are also replaced explicitly below.
const SENSITIVE_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+/g,
  /\bgh[pousr]_[A-Za-z0-9_]+/g,
  /\bxox[baprs]-[A-Za-z0-9-]+/g,
  /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+/gi,
];

export function isSensitiveConfigKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function collectSensitiveConfigValues(
  config: Record<string, unknown> | null | undefined
): string[] {
  if (!config) return [];

  return Object.entries(config)
    .filter(([key, value]) => isSensitiveConfigKey(key) && typeof value === 'string' && value.length > 0)
    .map(([, value]) => value as string);
}

/**
 * Build a public config representation from the provider schema.
 * Unknown fields are intentionally omitted so a new credential field cannot
 * become public merely by being added to a Firestore document.
 */
export function redactConfig(
  config: Record<string, unknown> | null | undefined,
  schema: IntegrationConfigField[] | null | undefined
): Record<string, string> {
  const safeConfig: Record<string, string> = {};
  if (!config || !schema) return safeConfig;

  for (const field of schema) {
    const value = config[field.key];
    if (field.type === 'password' || isSensitiveConfigKey(field.key)) continue;
    if (typeof value === 'string' && value.length > 0) safeConfig[field.key] = value;
  }

  return safeConfig;
}

export function redactSensitiveData(
  value: unknown,
  knownSecrets: Iterable<string> = []
): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const secret of [...knownSecrets].filter(Boolean).sort((a, b) => b.length - a.length)) {
      result = result.split(secret).join('[REDACTED]');
    }
    for (const pattern of SENSITIVE_VALUE_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }
    result = result.replace(
      /((?:token|secret|password|credential|authorization|cookie|webhook|api[\s_-]*key|access[\s_-]*key|private[\s_-]*key)\s*[:=]\s*)(["']?)([^"'\s},]+)/gi,
      '$1[REDACTED]'
    );
    return result;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, knownSecrets));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = isSensitiveConfigKey(key)
        ? '[REDACTED]'
        : redactSensitiveData(item, knownSecrets);
    }
    return result;
  }

  return value;
}

export function safeJson(value: unknown, knownSecrets: Iterable<string> = []): string {
  try {
    const json = JSON.stringify(redactSensitiveData(value, knownSecrets));
    return typeof json === 'string' ? json.slice(0, 2000) : '';
  } catch {
    return '';
  }
}

export function safeErrorMessage(error: unknown, knownSecrets: Iterable<string> = []): string {
  const message = error instanceof Error ? error.message : String(error || 'Error desconocido');
  const redacted = redactSensitiveData(message, knownSecrets);
  return typeof redacted === 'string' ? redacted.slice(0, 500) : 'Error desconocido';
}
