import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'task-move-queue.spec.ts',
  outputDir: '../../test-results/task-move-queue',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4177/crm/' },
  webServer: {
    ...(base.webServer as object),
    command: 'npx vite --config vite.config.mts --host 127.0.0.1 --port 4177 --strictPort',
    url: 'http://127.0.0.1:4177/crm/',
    reuseExistingServer: false,
  },
});
