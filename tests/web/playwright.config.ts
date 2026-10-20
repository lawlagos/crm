import { fileURLToPath } from "node:url";
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: '.', outputDir:'../../test-results/web', testMatch: '*.spec.ts', timeout: 45_000, workers: 1, use: { baseURL: 'http://127.0.0.1:4174/crm/', screenshot: 'only-on-failure', trace: 'retain-on-failure' }, projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }], webServer: { cwd: fileURLToPath(new URL("../..", import.meta.url)), command: 'npx vite --config vite.config.mts --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174/crm/', reuseExistingServer: false, timeout: 120_000 } });


