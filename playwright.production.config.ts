import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',testMatch:'**/pwa.spec.ts',workers:1,timeout:45_000,
 outputDir:'./test-results/pwa',
 use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:3200',trace:'retain-on-failure'},
 webServer:{command:'npx tsx scripts/e2e-server.ts --production',url:'http://127.0.0.1:3200/api/health',reuseExistingServer:false,timeout:120_000},
 reporter:[['list']],
});
