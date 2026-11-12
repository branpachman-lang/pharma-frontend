import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['S14_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 70_000,
  expect: { timeout: 12_000 },
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/resumen.json' }]],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], channel: process.env['S14_BROWSER_CHANNEL'] ?? undefined },
  }],
  webServer: process.env['S14_BASE_URL'] ? undefined : {
    command: 'npm start',
    url: baseURL,
    reuseExistingServer: true,
  },
});
