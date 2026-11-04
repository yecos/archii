// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  collectSensitiveConfigValues,
  redactConfig,
  redactSensitiveData,
  safeErrorMessage,
  safeJson,
} from './integration-security';

describe('integration secret redaction', () => {
  const schema = [
    { key: 'webhookUrl', type: 'url' },
    { key: 'channel', type: 'text' },
    { key: 'projectKey', type: 'text' },
    { key: 'apiToken', type: 'password' },
  ];

  it('omits credential fields and unknown fields from public config', () => {
    expect(redactConfig({
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/secret',
      channel: '#alerts',
      projectKey: 'ARCH',
      apiToken: 'jira-secret',
      injectedSecret: 'must-not-appear',
    }, schema)).toEqual({ channel: '#alerts', projectKey: 'ARCH' });
  });

  it('redacts sensitive object keys and known secret values', () => {
    const secret = 'jira-secret-value';
    const redacted = redactSensitiveData({
      token: secret,
      nested: { message: `failed with ${secret}` },
      safe: 'kept',
    }, [secret]);

    expect(redacted).toEqual({
      token: '[REDACTED]',
      nested: { message: 'failed with [REDACTED]' },
      safe: 'kept',
    });
  });

  it('redacts credentials from serialized payloads and errors', () => {
    const webhook = 'https://hooks.slack.com/services/T000/B000/secret';
    const payload = safeJson({ webhookUrl: webhook, note: 'hello' }, [webhook]);
    const error = safeErrorMessage(new Error(`upstream rejected ${webhook}`), [webhook]);

    expect(payload).not.toContain(webhook);
    expect(error).not.toContain(webhook);
    expect(collectSensitiveConfigValues({ webhookUrl: webhook, channel: '#alerts' })).toEqual([webhook]);
    expect(safeErrorMessage('upstream apiToken=raw-secret')).toBe('upstream apiToken=[REDACTED]');
  });
});
