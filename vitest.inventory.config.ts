import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'node',
    env: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-archii' },
    include: ['src/lib/inventory*.test.ts', 'src/app/api/inventory/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
