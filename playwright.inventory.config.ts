import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/inventory',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  outputDir: 'test-results/inventory',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/inventory', open: 'never' }]],
  use: {
    actionTimeout: 15_000,
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'android-emulated', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node scripts/inventory-e2e-server.mjs',
    url: 'http://127.0.0.1:3100',
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
