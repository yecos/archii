// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { decryptIntegrationConfig, encryptIntegrationConfig } from './integration-crypto';

const originalKey = process.env.INTEGRATIONS_ENCRYPTION_KEY;
const validKey = Buffer.alloc(32, 7).toString('base64');

afterEach(() => {
  if (originalKey === undefined) delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
  else process.env.INTEGRATIONS_ENCRYPTION_KEY = originalKey;
});

describe('integration config encryption', () => {
  it('round-trips credentials without storing plaintext', () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = validKey;
    const plaintext = { apiToken: 'jira-secret', channel: '#alerts' };
    const encrypted = encryptIntegrationConfig(plaintext);

    expect(encrypted.apiToken).toMatch(/^enc:v1:/);
    expect(encrypted.apiToken).not.toContain(plaintext.apiToken);
    expect(decryptIntegrationConfig(encrypted)).toEqual(plaintext);
  });

  it('uses a fresh nonce for each encryption', () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = validKey;
    const first = encryptIntegrationConfig({ apiToken: 'same-secret' });
    const second = encryptIntegrationConfig({ apiToken: 'same-secret' });

    expect(first.apiToken).not.toBe(second.apiToken);
  });

  it('keeps legacy plaintext records readable during migration', () => {
    delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    expect(decryptIntegrationConfig({ channel: '#alerts' })).toEqual({ channel: '#alerts' });
  });

  it('fails closed when an encrypted record has no valid server key', () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = validKey;
    const encrypted = encryptIntegrationConfig({ apiToken: 'jira-secret' });
    delete process.env.INTEGRATIONS_ENCRYPTION_KEY;

    expect(() => decryptIntegrationConfig(encrypted)).toThrow('INTEGRATIONS_ENCRYPTION_KEY');
  });
});
