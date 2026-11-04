/** Server-only encryption for integration configuration at rest.
 * Set INTEGRATIONS_ENCRYPTION_KEY to a base64-encoded random 32-byte key.
 * Legacy plaintext records remain readable until re-saved or migrated.
 */
import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';
function key(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) throw new Error('INTEGRATIONS_ENCRYPTION_KEY is not configured');
  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== raw.trim()) {
    throw new Error('INTEGRATIONS_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return decoded;
}
export function encryptIntegrationConfig(config: Record<string, string>): Record<string, string> {
  const k = key();
  const result: Record<string, string> = {};
  for (const [field, value] of Object.entries(config)) {
    if (typeof value !== 'string') throw new Error('Invalid integration configuration');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', k, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    result[field] = PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
  }
  return result;
}
export function decryptIntegrationConfig(config: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, value] of Object.entries(config || {})) {
    if (typeof value !== 'string') continue;
    if (!value.startsWith(PREFIX)) { result[field] = value; continue; } // legacy record
    const bytes = Buffer.from(value.slice(PREFIX.length), 'base64');
    if (bytes.length < 28) throw new Error('Invalid integration ciphertext');
    const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    result[field] = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
  }
  return result;
}
