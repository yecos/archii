// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function policy(environment: string, project: string) {
  vi.stubEnv('NODE_ENV', environment);
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', project);
  vi.stubEnv('NEXT_PUBLIC_USE_FIREBASE_EMULATORS', 'true');
  const config = (await import('../../next.config')).default;
  const entries = await config.headers!();
  return entries.flatMap(entry => entry.headers).find(header => header.key === 'Content-Security-Policy')!.value;
}
describe('local inventory test isolation', () => {
  it('never enables local Firebase access in production even when the flag is set', async () => {
    const csp = await policy('production', 'demo-archii');
    expect(csp).not.toContain('127.0.0.1');
    expect(csp).toContain('https://firestore.googleapis.com');
  });
  it('does not enable emulators for a real project in development', async () => {
    expect(await policy('development', 'archiflow-prod-2026')).not.toContain('127.0.0.1');
  });
  it('allows only the explicit local services for a demo project in development', async () => {
    const csp = await policy('development', 'demo-archii');
    expect(csp).toContain('http://127.0.0.1:9099');
    expect(csp).toContain('http://127.0.0.1:8085');
    expect(csp).not.toContain('http://*');
  });
});
